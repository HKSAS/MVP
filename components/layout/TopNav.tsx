'use client'

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X, User, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { UserStatusBadgeCompact } from "@/components/dashboard/UserStatusBadge";

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error('Erreur lors de la vérification de la session:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Écouter les changements d'authentification
    const supabase = getSupabaseBrowserClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (event === 'SIGNED_OUT') {
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      setUser(null);
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  // Liens de base (toujours visibles)
  const baseLinks = [
    { href: "/", label: "Accueil" },
    { href: "/recherche", label: "Recherche" },
    { href: "/analyser", label: "Analyser" },
    { href: "/tarif", label: "Tarifs" },
    { href: "/faq", label: "FAQ" },
  ];
  
  // Lien Dashboard (seulement si connecté)
  const dashboardLink = { href: "/dashboard", label: "Dashboard" };
  
  // Construire la liste des liens selon l'état d'authentification
  const links = user 
    ? [...baseLinks, dashboardLink] 
    : baseLinks;

  return (
    <motion.nav 
      className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-white/5"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
            <motion.div
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.3 }}
              className="relative h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20"
            >
              <Image
                src="/logo.png"
                alt="Autoval IA Logo"
                width={96}
                height={96}
                className="h-full w-full object-contain"
                priority
                style={{ 
                  filter: 'brightness(2) saturate(1.5) drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))'
                }}
              />
            </motion.div>
            <span className="text-lg sm:text-xl md:text-2xl font-light text-white group-hover:text-blue-400 transition-colors tracking-wide hidden sm:inline">Autoval IA</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-base font-light tracking-wide transition-colors ${
                  pathname === link.href
                    ? "text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {loading ? (
              <div className="w-20 h-9 bg-gray-800 animate-pulse rounded-md"></div>
            ) : user ? (
              <>
                <UserStatusBadgeCompact />
                <Button 
                  variant="ghost"
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-white hover:bg-white/5 rounded-full"
                >
                  <LogOut className="size-4 mr-2" />
                  Déconnexion
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  asChild 
                  className="text-gray-400 hover:text-white hover:bg-white/5 rounded-full"
                >
                  <Link href="/login">Se connecter</Link>
                </Button>
                <Button 
                  asChild
                  className="bg-white text-black hover:bg-gray-200 rounded-full px-6"
                >
                  <Link href="/signup">Commencer</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="size-6" />
            ) : (
              <Menu className="size-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              className="md:hidden py-4 space-y-2 border-t border-white/10"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {links.map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-2 rounded-full text-sm transition-all ${
                      pathname === link.href
                        ? "text-white bg-white/10"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div 
                className="flex flex-col gap-2 pt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: links.length * 0.05 }}
              >
                {loading ? (
                  <div className="h-10 bg-gray-800 animate-pulse rounded-md"></div>
                ) : user ? (
                  <>
                    <div className="w-full flex justify-center mb-2">
                      <UserStatusBadgeCompact />
                    </div>
                    <Button 
                      variant="ghost"
                      onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                      className="text-gray-400 hover:text-white hover:bg-white/5 rounded-full w-full"
                    >
                      <LogOut className="size-4 mr-2" />
                      Déconnexion
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="ghost" 
                      asChild 
                      className="text-gray-400 hover:text-white hover:bg-white/5 rounded-full w-full"
                    >
                      <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                        Se connecter
                      </Link>
                    </Button>
                    <Button 
                      asChild
                      className="bg-white text-black hover:bg-gray-200 rounded-full w-full"
                    >
                      <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                        Commencer
                      </Link>
                    </Button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}
