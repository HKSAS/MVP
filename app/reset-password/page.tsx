'use client'

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from "lucide-react";
import { motion } from 'framer-motion';
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

function ResetPasswordForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError(null);
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();

      // Envoyer l'email de réinitialisation
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password/confirm`,
        }
      );

      if (resetError) {
        // Logs détaillés pour diagnostic
        console.error('❌ Erreur Supabase resetPasswordForEmail:', {
          message: resetError.message,
          status: resetError.status,
          name: resetError.name,
        });

        // Messages d'erreur utilisateur-friendly avec détails SMTP
        let errorMessage = resetError.message;
        
        if (resetError.message.includes('Invalid email') || resetError.message.includes('invalid email')) {
          errorMessage = 'Adresse email invalide.';
        } else if (resetError.message.includes('rate limit') || resetError.message.includes('too many')) {
          errorMessage = 'Trop de tentatives. Veuillez réessayer dans quelques minutes.';
        } else if (resetError.message.includes('fetch') || resetError.message.includes('NetworkError')) {
          errorMessage = 'Erreur de connexion réseau. Vérifiez votre connexion internet.';
        } else if (resetError.message.includes('smtp') || resetError.message.includes('SMTP') || 
                   resetError.message.includes('email') || resetError.message.includes('mail') ||
                   resetError.message.includes('sending') || resetError.message.includes('recovery')) {
          // Erreurs liées à l'envoi d'email
          errorMessage = `Erreur lors de l'envoi de l'email de réinitialisation.\n\n` +
            `Vérifiez vos paramètres SMTP dans Supabase :\n` +
            `• Host SMTP (ex: smtp.ionos.fr)\n` +
            `• Port (587 pour TLS/STARTTLS ou 465 pour SSL - évitez 585)\n` +
            `• Identifiants (email et mot de passe)\n` +
            `• Vérifiez que le protocole SMTP personnalisé est activé\n\n` +
            `Erreur technique: ${resetError.message}`;
        } else if (resetError.status === 500 || resetError.status === 503) {
          errorMessage = `Erreur serveur. Le service d'envoi d'email est temporairement indisponible.\n\n` +
            `Vérifiez vos paramètres SMTP dans le dashboard Supabase.\n` +
            `Erreur: ${resetError.message}`;
        }

        throw new Error(errorMessage);
      }

      // Succès
      setSuccess(true);
    } catch (err: any) {
      console.error('❌ Erreur réinitialisation complète:', {
        message: err.message,
        stack: err.stack,
        error: err,
      });
      
      // Si le message d'erreur n'a pas été personnalisé, utiliser un message générique
      const errorMessage = err.message || 'Une erreur est survenue lors de l\'envoi de l\'email. Veuillez vérifier vos paramètres SMTP dans Supabase et réessayer.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
                    <h2 className="text-2xl font-medium text-white">Email envoyé !</h2>
                    <p className="text-gray-400 text-center">
                      Nous avons envoyé un lien de réinitialisation à <strong className="text-white">{email}</strong>.
                      <br />
                      <br />
                      Vérifiez votre boîte de réception et cliquez sur le lien pour réinitialiser votre mot de passe.
                    </p>
                    <div className="mt-4 space-y-3 w-full">
                      <Button
                        onClick={() => router.push('/login')}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-full"
                      >
                        Retour à la connexion
                      </Button>
                      <Link
                        href="/"
                        className="block text-center text-sm text-gray-500 hover:text-white transition-colors"
                      >
                        <ArrowLeft className="inline size-4 mr-2" />
                        Retour à l&apos;accueil
                      </Link>
                    </div>
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
              Mot de passe oublié ?
            </h1>
            <p className="text-gray-400">
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
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
                    <Label htmlFor="email" className="text-white">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="votre.email@exemple.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 pl-10"
                      />
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
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Mail className="size-5 mr-2" />
                        Envoyer le lien de réinitialisation
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Links */}
            <div className="mt-6 text-center space-y-2">
              <p className="text-gray-400">
                Vous vous souvenez de votre mot de passe ?{" "}
                <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
                  Se connecter
                </Link>
              </p>
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="size-8 animate-spin text-blue-500" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}

