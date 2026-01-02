'use client'

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2, Lock, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { motion } from 'framer-motion';
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

function ConfirmResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validating, setValidating] = useState(true);

  // Vérifier que le token est présent dans l'URL
  useEffect(() => {
    const checkToken = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        
        // Vérifier si on a une session (le token est dans l'URL)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          setError('Le lien de réinitialisation est invalide ou a expiré. Veuillez demander un nouveau lien.');
          setValidating(false);
          return;
        }

        setValidating(false);
      } catch (err) {
        console.error('Erreur vérification token:', err);
        setError('Erreur lors de la vérification du lien. Veuillez réessayer.');
        setValidating(false);
      }
    };

    checkToken();
  }, []);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Le mot de passe doit contenir au moins 8 caractères.';
    }
    if (!/(?=.*[a-z])/.test(pwd)) {
      return 'Le mot de passe doit contenir au moins une lettre minuscule.';
    }
    if (!/(?=.*[A-Z])/.test(pwd)) {
      return 'Le mot de passe doit contenir au moins une lettre majuscule.';
    }
    if (!/(?=.*\d)/.test(pwd)) {
      return 'Le mot de passe doit contenir au moins un chiffre.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError(null);

    // Validation
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();

      // Mettre à jour le mot de passe
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        let errorMessage = updateError.message;
        
        if (updateError.message.includes('session')) {
          errorMessage = 'Le lien de réinitialisation a expiré. Veuillez demander un nouveau lien.';
        } else if (updateError.message.includes('password')) {
          errorMessage = 'Le mot de passe ne respecte pas les critères de sécurité.';
        }

        throw new Error(errorMessage);
      }

      // Succès
      setSuccess(true);
      
      // Rediriger vers la page de connexion après 3 secondes
      setTimeout(() => {
        router.push('/login?message=password-reset-success');
      }, 3000);
    } catch (err: any) {
      console.error('❌ Erreur mise à jour mot de passe:', err);
      const errorMessage = err.message || 'Une erreur est survenue. Veuillez réessayer.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="bg-[#0a0a0a] text-white min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-[#0a0a0a] text-white min-h-screen pt-20">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]"></div>
        </div>

        <div className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
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

              <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl">
                <CardContent className="p-8">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-green-400" />
                    </div>
                    <h2 className="text-2xl font-medium text-white">Mot de passe réinitialisé !</h2>
                    <p className="text-gray-400 text-center">
                      Votre mot de passe a été modifié avec succès.
                      <br />
                      Vous allez être redirigé vers la page de connexion...
                    </p>
                    <Button
                      onClick={() => router.push('/login')}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-full"
                    >
                      Se connecter maintenant
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

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
              Nouveau mot de passe
            </h1>
            <p className="text-gray-400">
              Entrez votre nouveau mot de passe ci-dessous.
            </p>
          </motion.div>

          {/* Reset Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl">
              <CardContent className="p-8">
                {error && (
                  <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400 whitespace-pre-line">
                    {error}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white">Nouveau mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Au moins 8 caractères, une majuscule, une minuscule et un chiffre
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-white">Confirmer le mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                      </button>
                    </div>
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
                        Mise à jour...
                      </>
                    ) : (
                      <>
                        <Lock className="size-5 mr-2" />
                        Réinitialiser le mot de passe
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Links */}
            <div className="mt-6 text-center">
              <Link href="/login" className="text-sm text-gray-500 hover:text-white transition-colors inline-flex items-center gap-2">
                <ArrowLeft className="size-4" />
                Retour à la connexion
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="size-8 animate-spin text-blue-500" />
      </div>
    }>
      <ConfirmResetPasswordForm />
    </Suspense>
  );
}

