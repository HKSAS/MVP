'use client'

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { LogIn, ArrowLeft, Loader2 } from "lucide-react";
import { motion } from 'framer-motion';
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/dashboard';
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Vérifier les paramètres de l'URL pour les messages
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('message') === 'email-confirmation-required') {
        setInfoMessage('Un email de confirmation a été envoyé. Veuillez vérifier votre boîte mail et confirmer votre email avant de vous connecter.');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // LOG EXPLICITE POUR DIAGNOSTIC
    console.log("LOGIN_SUBMIT");
    
    setError(null);
    setLoading(true);

    try {
      // Logs de diagnostic DEV uniquement
      if (process.env.NODE_ENV === 'development') {
        console.log('🔵 [DEV] Tentative de connexion:', {
          origin: window.location.origin,
          email: email.trim(),
          supabaseUrlPresent: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          // Ne jamais logger les keys
        });
      }

      // Obtenir le client Supabase (throw si config manquante)
      const supabase = getSupabaseBrowserClient();

      // Tentative de connexion
      console.log("LOGIN_SUBMIT: Appel à supabase.auth.signInWithPassword");
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      console.log("LOGIN_SUBMIT: Réponse reçue", { hasData: !!data, hasError: !!authError });

      if (authError) {
        // Logs dev pour débogage détaillé
        if (process.env.NODE_ENV === 'development') {
          console.error('🔴 [DEV] Erreur Supabase complète:', {
            status: authError.status,
            message: authError.message,
            name: authError.name,
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            origin: window.location.origin,
          });
        }

        // Messages d'erreur utilisateur-friendly basés sur le message Supabase
        let errorMessage = authError.message;

        // Traductions et messages plus clairs
        if (authError.message.includes('Invalid login credentials') || 
            authError.message.includes('Invalid credentials') ||
            authError.message.includes('Email not confirmed')) {
          errorMessage = 'Email ou mot de passe incorrect. Vérifiez vos identifiants et réessayez.';
        } else if (authError.message.includes('Invalid email')) {
          errorMessage = 'Adresse email invalide.';
        } else if (authError.message.includes('fetch') || 
                   authError.message.includes('Failed to fetch') || 
                   authError.message.includes('NetworkError') ||
                   authError.message.includes('Network request failed')) {
          // Message détaillé pour les erreurs réseau
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'NON DÉFINI';
          errorMessage = `Erreur de connexion réseau.\n\nDiagnostic:\n- URL Supabase: ${supabaseUrl}\n- Origin: ${window.location.origin}\n\nSolutions:\n1. Vérifiez votre connexion internet\n2. Redémarrez le serveur: npm run dev\n3. Vérifiez .env.local contient NEXT_PUBLIC_SUPABASE_URL`;
        } else if (authError.message.includes('JWT') || 
                   authError.message.includes('token') || 
                   authError.message.includes('Invalid API key')) {
          errorMessage = 'Erreur de configuration Supabase. Vérifiez NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local';
        }

        throw new Error(errorMessage);
      }

      // Succès - vérifier que l'utilisateur est bien connecté
      if (data.user && data.session) {
        // Logs dev
        console.log('✅ [LOGIN] Connexion réussie:', {
          userId: data.user.id,
          email: data.user.email,
          hasSession: !!data.session,
        });
        
        // Attendre un peu pour que la session soit bien persistée
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Vérifier à nouveau la session pour être sûr
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          console.log('✅ [LOGIN] Session confirmée, redirection vers', redirectUrl);
          // Rediriger vers l'URL spécifiée ou le dashboard par défaut
          window.location.href = redirectUrl;
        } else {
          throw new Error('La session n\'a pas pu être établie. Veuillez réessayer.');
        }
      } else {
        console.error('❌ [LOGIN] Pas de session après connexion:', { hasUser: !!data.user, hasSession: !!data.session });
        throw new Error('Erreur lors de la connexion. Veuillez réessayer.');
      }
    } catch (err: any) {
      console.error('❌ Erreur connexion:', err);
      console.error('❌ Stack trace:', err.stack);
      
      // Afficher le message d'erreur à l'utilisateur
      const errorMessage = err.message || 'Une erreur est survenue lors de la connexion. Veuillez réessayer.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0a0a0a] text-white min-h-screen pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Logo */}
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link href="/" className="inline-flex flex-col items-center gap-4 mb-6">
            <Image
              src="/logo.png"
              alt="Autoval IA Logo"
                width={96}
                height={96}
                className="h-24 w-24 object-contain"
              style={{ 
                  filter: 'brightness(2) saturate(1.5) drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))'
              }}
            />
              <span className="text-3xl font-light text-white tracking-wide">Autoval IA</span>
          </Link>
            <h1 className="text-4xl font-medium text-white mb-2">
              Bon retour parmi nous
            </h1>
            <p className="text-gray-400">
            Content de vous revoir ! Connectez-vous à votre compte.
          </p>
          </motion.div>

        {/* Login Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl">
          <CardContent className="p-8">
            {infoMessage && (
              <div className="mb-4 rounded-lg border border-blue-500/50 bg-blue-500/10 p-3 text-sm text-blue-400">
                {infoMessage}
              </div>
            )}
            {error && (
                  <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400 whitespace-pre-line">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                    <Label htmlFor="email" className="text-white">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre.email@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-white">Mot de passe</Label>
                      <a href="#" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                    Mot de passe oublié ?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  id="remember"
                  type="checkbox"
                      className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                />
                    <label htmlFor="remember" className="ml-2 text-sm text-gray-400">
                  Se souvenir de moi
                </label>
              </div>

              <Button
                type="submit"
                size="lg"
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-5 mr-2 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  <>
                    <LogIn className="size-5 mr-2" />
                    Se connecter
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sign Up Link */}
        <div className="mt-6 text-center">
              <p className="text-gray-400">
            Pas encore de compte ?{" "}
                <Link href="/signup" className="text-blue-400 hover:text-blue-300 transition-colors">
              Créer un compte gratuit
            </Link>
          </p>
        </div>

        {/* Back to Home */}
        <div className="mt-4 text-center">
              <Link href="/" className="text-sm text-gray-500 hover:text-white transition-colors inline-flex items-center gap-2">
                <ArrowLeft className="size-4" />
                Retour à l&apos;accueil
          </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-blue-500" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
