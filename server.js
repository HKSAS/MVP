const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");
const { z } = require("zod");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const API_KEY = process.env.SCRAPER_API_KEY;

// Middleware d'authentification API Key
function requireApiKey(req, res, next) {
  if (!API_KEY) return next(); // si pas défini => pas de sécurité (dev)
  const apiKey = req.header("x-api-key");
  if (apiKey !== API_KEY) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  next();
}

const QuerySchema = z.object({
  brand: z.string().min(1),
  model: z.string().optional().nullable(),
  maxPrice: z.number().int().positive().optional().nullable(),
  minYear: z.number().int().optional().nullable(),
});

function buildLeboncoinUrl({ brand, model, maxPrice }) {
  const text = encodeURIComponent([brand, model].filter(Boolean).join(" "));
  const priceMax = maxPrice ? maxPrice : 9999999;
  return `https://www.leboncoin.fr/recherche?text=${text}&price=0-${priceMax}&category=2&sort=time&order=desc`;
}

async function scrapeLeboncoin(query) {
  const url = buildLeboncoinUrl(query);

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    viewport: { width: 1366, height: 768 },
  });

  const page = await context.newPage();

  // Anti-bot léger
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  const started = Date.now();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });

  // Attendre que la liste apparaisse (selector assez tolérant)
  await page.waitForTimeout(1500);

  // Scroll un peu pour charger plus
  for (let i = 0; i < 3; i++) {
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(800);
  }

  // Extraction robuste : plusieurs patterns pour éviter les sélecteurs fragiles
  const items = await page.evaluate(() => {
    const seen = new Set();
    const results = [];

    // Pattern 1 : Liens directs vers /ad/
    const anchors = Array.from(document.querySelectorAll('a[href*="/ad/"]'));
    
    // Pattern 2 : Éléments avec data-qa-id (structure LeBonCoin)
    const containers = Array.from(document.querySelectorAll('[data-qa-id="aditem_container"], [data-test-id="aditem"]'));
    
    // Pattern 3 : Recherche dans __NEXT_DATA__ (si présent)
    let nextData = null;
    try {
      const nextDataScript = document.querySelector('script#__NEXT_DATA__');
      if (nextDataScript) {
        nextData = JSON.parse(nextDataScript.textContent);
      }
    } catch (e) {
      // Ignore
    }

    // Extraire depuis les liens
    for (const a of anchors) {
      const href = a.getAttribute("href");
      if (!href) continue;

      const abs = href.startsWith("http") ? href : `https://www.leboncoin.fr${href}`;
      if (seen.has(abs)) continue;
      seen.add(abs);

      // titre (plusieurs patterns)
      const titleEl =
        a.querySelector('[data-test-id="ad-title"]') ||
        a.querySelector('[data-qa-id="aditem_title"]') ||
        a.closest('[data-qa-id="aditem_container"]')?.querySelector('[data-qa-id="aditem_title"]') ||
        a.querySelector("p") ||
        a.querySelector("span") ||
        a.closest('article')?.querySelector('h2, h3, .title');
      const title = titleEl ? titleEl.textContent.trim() : null;

      // prix (plusieurs patterns)
      let price = null;
      const priceEl =
        a.querySelector('[data-test-id="price"]') ||
        a.querySelector('[data-qa-id="aditem_price"]') ||
        a.closest('[data-qa-id="aditem_container"]')?.querySelector('[data-qa-id="aditem_price"]') ||
        a.querySelector('p:has(span)');
      if (priceEl) {
        const txt = priceEl.textContent.replace(/\s/g, "");
        const m = txt.match(/(\d[\d\.]*)€|(\d[\d\.]*)€/);
        if (m) {
          const num = (m[1] || m[2] || "").replace(/\./g, "");
          price = parseInt(num, 10);
        }
      }

      // localisation (plusieurs patterns)
      const locEl =
        a.querySelector('[data-test-id="location"]') ||
        a.querySelector('[data-qa-id="aditem_location"]') ||
        a.closest('[data-qa-id="aditem_container"]')?.querySelector('[data-qa-id="aditem_location"]');
      const location = locEl ? locEl.textContent.trim() : null;

      results.push({
        id: abs.split("/").slice(-1)[0] || abs,
        url: abs,
        title,
        price,
        location,
        source: "LeBonCoin",
      });

      if (results.length >= 40) break;
    }

    // Extraire depuis les containers
    for (const container of containers.slice(0, 40)) {
      const linkEl = container.querySelector('a[href*="/ad/"]');
      if (!linkEl) continue;

      const href = linkEl.getAttribute("href");
      if (!href) continue;

      const abs = href.startsWith("http") ? href : `https://www.leboncoin.fr${href}`;
      if (seen.has(abs)) continue;
      seen.add(abs);

      const titleEl = container.querySelector('[data-qa-id="aditem_title"], [data-test-id="ad-title"]');
      const priceEl = container.querySelector('[data-qa-id="aditem_price"], [data-test-id="price"]');
      const locEl = container.querySelector('[data-qa-id="aditem_location"], [data-test-id="location"]');

      let price = null;
      if (priceEl) {
        const txt = priceEl.textContent.replace(/\s/g, "");
        const m = txt.match(/(\d[\d\.]*)€/);
        if (m) {
          const num = m[1].replace(/\./g, "");
          price = parseInt(num, 10);
        }
      }

      results.push({
        id: abs.split("/").slice(-1)[0] || abs,
        url: abs,
        title: titleEl ? titleEl.textContent.trim() : null,
        price,
        location: locEl ? locEl.textContent.trim() : null,
        source: "LeBonCoin",
      });

      if (results.length >= 40) break;
    }

    // Extraire depuis __NEXT_DATA__ si disponible
    if (nextData && nextData.props && nextData.props.pageProps) {
      const ads = nextData.props.pageProps.ads || nextData.props.pageProps.adlist || [];
      for (const ad of ads.slice(0, 40)) {
        if (!ad.url && !ad.adId) continue;
        const url = ad.url || `https://www.leboncoin.fr/ad/${ad.adId}`;
        if (seen.has(url)) continue;
        seen.add(url);

        results.push({
          id: String(ad.adId || url.split("/").slice(-1)[0]),
          url,
          title: ad.subject || ad.title || null,
          price: ad.price ? (ad.price > 100000 ? Math.floor(ad.price / 100) : ad.price) : null,
          location: ad.city || ad.location || null,
          source: "LeBonCoin",
        });

        if (results.length >= 40) break;
      }
    }

    return results;
  });

  const ms = Date.now() - started;
  
  // Mode debug : si 0 résultats, sauvegarder screenshot + HTML
  if (items.length === 0) {
    const debugPath = `/tmp/lbc-debug-${Date.now()}`;
    try {
      await page.screenshot({ path: `${debugPath}.png`, fullPage: true });
      const html = await page.content();
      const fs = require("fs");
      fs.writeFileSync(`${debugPath}.html`, html);
      
      console.warn(`[DEBUG] 0 résultats - screenshot: ${debugPath}.png, HTML: ${debugPath}.html (${html.length} chars)`);
    } catch (debugErr) {
      console.error("[DEBUG] Erreur sauvegarde debug:", debugErr.message);
    }
  }

  await browser.close();

  return { url, ms, items };
}

app.get("/health", (req, res) => res.json({ ok: true }));

app.post("/scrape/leboncoin", requireApiKey, async (req, res) => {
  try {
    const parsed = QuerySchema.parse(req.body);
    const result = await scrapeLeboncoin(parsed);
    res.json({
      ok: true,
      strategy: "playwright",
      ...result,
    });
  } catch (err) {
    res.status(400).json({
      ok: false,
      error: err?.message || "Unknown error",
    });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`[autoia-scraper] listening on :${PORT}`);
});

