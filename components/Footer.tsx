'use client'

import Link from "next/link";
import Image from "next/image";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

export default function Footer() {
  return (
    <>
      <footer className="bg-[#0a0a0a] text-gray-300 border-t border-blue-600/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo & Description */}
            <div className="col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <Image
                  src="/logo.png"
                  alt="Autoval IA Logo"
                  width={128}
                  height={128}
                  className="h-32 w-32 object-contain"
                  style={{ 
                    filter: 'brightness(2.2) contrast(1.8) saturate(2.2) drop-shadow(0 0 25px rgba(59, 130, 246, 1))'
                  }}
                />
                <span className="text-xl text-white">Autoval IA</span>
              </div>
              <p className="text-sm text-gray-400">
                L&apos;IA qui sécurise et simplifie votre recherche de voiture.
              </p>
            </div>

            {/* Navigation */}
            <div>
              <h3 className="text-white mb-4">Navigation</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/" className="hover:text-blue-400 transition-colors">
                    Accueil
                  </Link>
                </li>
                <li>
                  <Link href="/recherche" className="hover:text-blue-400 transition-colors">
                    Recherche IA
                  </Link>
                </li>
                <li>
                  <Link href="/analyser" className="hover:text-blue-400 transition-colors">
                    Analyser une annonce
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-blue-400 transition-colors">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-white mb-4">Support</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/faq" className="hover:text-blue-400 transition-colors">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-blue-400 transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/a-propos" className="hover:text-blue-400 transition-colors">
                    À propos
                  </Link>
                </li>
              <li>
                <a 
                  href="https://calendly.com/autoval/call" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 transition-colors flex items-center gap-1"
                >
                  Réserver un appel
                  <span className="text-xs">↗</span>
                </a>
              </li>
              </ul>
            </div>

            {/* Légal */}
            <div>
              <h3 className="text-white mb-4">Légal</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/mentions-legales" className="hover:text-blue-400 transition-colors">
                    Mentions légales
                  </Link>
                </li>
                <li>
                  <Link href="/cgu" className="hover:text-blue-400 transition-colors">
                    CGU
                  </Link>
                </li>
                <li>
                  <Link href="/politique-confidentialite" className="hover:text-blue-400 transition-colors">
                    Politique de confidentialité
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="mt-12 pt-8 border-t border-blue-600/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
              © 2025 Autoval IA. Tous droits réservés.
            </p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-blue-400 transition-colors" aria-label="Facebook">
                <Facebook className="size-5" />
              </a>
              <a href="#" className="hover:text-blue-400 transition-colors" aria-label="Twitter">
                <Twitter className="size-5" />
              </a>
              <a href="#" className="hover:text-blue-400 transition-colors" aria-label="Instagram">
                <Instagram className="size-5" />
              </a>
              <a href="#" className="hover:text-blue-400 transition-colors" aria-label="LinkedIn">
                <Linkedin className="size-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>

    </>
  );
}
