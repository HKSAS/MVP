'use client'

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, CheckCircle, Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { motion } from 'framer-motion';
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/dashboard';
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Réinitialiser les états
    setError(null);
    setSuccess(false);
    
    // Validation côté client
    if (!formData.email || !formData.email.trim()) {
      setError("Veuillez entrer une adresse email valide");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (formData.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);

    try {
      // Vérifier les variables d'environnement AVANT d'appeler Supabase
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
          'Configuration Supabase manquante. Veuillez vérifier que les variables NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont définies dans .env.local'
        );
      }

      // Logs de diagnostic DEV uniquement
      console.log('🔵 [SIGNUP] Début de l\'inscription:', {
        email: formData.email.trim(),
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey,
        origin: window.location.origin,
      });

      // Obtenir le client Supabase (throw si config manquante)
      const supabase = getSupabaseBrowserClient();

      // ========================================================================
      // VÉRIFICATION PRÉALABLE : Email déjà utilisé ?
      // ========================================================================
      console.log('🔍 [SIGNUP] Vérification si email existe déjà...', {
        email: formData.email.trim().toLowerCase(),
      });
      
      try {
        const checkResponse = await fetch('/api/check-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: formData.email.trim() }),
        });

        const checkData = await checkResponse.json();
        
        console.log('📋 [SIGNUP] Réponse vérification email:', {
          ok: checkResponse.ok,
          status: checkResponse.status,
          exists: checkData.exists,
          existsInAuth: checkData.existsInAuth,
          existsInProfiles: checkData.existsInProfiles,
          count: checkData.count,
          isDuplicate: checkData.isDuplicate,
        });

        if (checkResponse.ok && checkData.exists) {
          console.error('❌ [SIGNUP] Email déjà utilisé détecté avant signup:', {
            email: formData.email.trim().toLowerCase(),
            existsInAuth: checkData.existsInAuth,
            existsInProfiles: checkData.existsInProfiles,
            count: checkData.count,
          });
          
          // Ne pas permettre la création
          setError('Un compte existe déjà avec cette adresse email. Connectez-vous ou utilisez un autre email.');
          setLoading(false);
          return; // Arrêter ici, ne pas continuer avec signup
        }
        
        if (checkResponse.ok && !checkData.exists) {
          console.log('✅ [SIGNUP] Email disponible, on peut continuer');
        } else if (!checkResponse.ok) {
          console.warn('⚠️ [SIGNUP] Impossible de vérifier l\'email (status:', checkResponse.status, '), on continue quand même');
        }
      } catch (checkErr: any) {
        // Si c'est notre erreur personnalisée (email existe), l'afficher
        if (checkErr.message.includes('Un compte existe déjà')) {
          setError(checkErr.message);
          setLoading(false);
          return;
        }
        // Sinon, ignorer et continuer (Supabase Auth gérera)
        console.warn('⚠️ [SIGNUP] Erreur vérification email (non bloquant):', checkErr.message);
      }

      // Tentative d'inscription
      // NOTE: Supabase Auth devrait bloquer les emails dupliqués
      // Mais on vérifie aussi après pour être sûr
      console.log("🔵 [SIGNUP] Appel à supabase.auth.signUp", {
        email: formData.email.trim(),
        hasFirstName: !!formData.firstName.trim(),
        hasLastName: !!formData.lastName.trim(),
        hasPhone: !!formData.phone.trim(),
      });
      
      const signUpResult = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            full_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim(),
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
            phone: formData.phone.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      const { data, error: authError } = signUpResult;
      
      console.log("📋 [SIGNUP] Réponse Supabase:", { 
        hasData: !!data, 
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        userEmail: data?.user?.email,
        userId: data?.user?.id,
        userConfirmed: !!data?.user?.email_confirmed_at,
        hasError: !!authError,
        errorMessage: authError?.message,
        errorStatus: authError?.status,
        errorName: authError?.name,
        errorCode: authError?.code
      });
      
      // Log détaillé si erreur
      if (authError) {
        console.error('❌ [SIGNUP] Erreur détaillée:', {
          status: authError.status,
          code: authError.code,
          message: authError.message,
          name: authError.name,
        });
      }

      // Gérer les erreurs explicitement
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
        // IMPORTANT: Supabase Auth bloque les emails dupliqués avec ces messages
        if (authError.message.includes('already registered') || 
            authError.message.includes('already exists') || 
            authError.message.includes('User already registered') ||
            authError.message.includes('email address is already registered') ||
            authError.message.includes('Email already registered') ||
            authError.status === 422 && authError.message.toLowerCase().includes('email')) {
          console.error('❌ [SIGNUP] Email déjà utilisé - Supabase Auth a bloqué la création');
          errorMessage = 'Un compte existe déjà avec cette adresse email. Connectez-vous ou utilisez un autre email.';
        } else if (authError.message.includes('Invalid email')) {
          errorMessage = 'Adresse email invalide.';
        } else if (authError.message.includes('Password') || 
                   authError.message.includes('password')) {
          errorMessage = 'Le mot de passe doit contenir au moins 6 caractères.';
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
        } else if (authError.message.includes('signup_disabled') || 
                   authError.message.includes('Signup disabled')) {
          errorMessage = 'L\'inscription est désactivée. Contactez le support.';
        } else if (authError.message.includes('no account') || 
                   authError.message.includes('No account') ||
                   authError.message.includes('aucun compte')) {
          errorMessage = 'Aucun compte n\'a pu être créé. Vérifiez vos informations et réessayez.';
        }

        throw new Error(errorMessage);
      }

      // Vérifier que nous avons bien un utilisateur créé
      if (!data) {
        console.error('❌ [SIGNUP] Pas de données dans la réponse Supabase');
        throw new Error('Aucune réponse du serveur. Vérifiez votre connexion internet et réessayez.');
      }

      if (!data.user) {
        console.error('❌ [SIGNUP] Pas d\'utilisateur dans la réponse:', data);
        throw new Error('Aucun compte n\'a pu être créé. Le serveur n\'a pas créé d\'utilisateur. Veuillez réessayer ou contacter le support.');
      }

      // ========================================================================
      // VÉRIFICATION POST-SIGNUP : Vérifier qu'on n'a pas créé un doublon
      // ========================================================================
      console.log('🔍 [SIGNUP] Vérification post-signup pour détecter les doublons...');
      
      try {
        // Attendre un peu pour que le trigger crée le profil
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const verifyResponse = await fetch('/api/check-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: formData.email.trim() }),
        });

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          
          // Si on détecte un doublon (plusieurs profils avec le même email)
          if (verifyData.isDuplicate || verifyData.count > 1) {
            console.error('❌ [SIGNUP] DOUBLON DÉTECTÉ ! Plusieurs comptes avec le même email:', verifyData.count);
            console.error('❌ [SIGNUP] Profils trouvés:', verifyData.profiles);
            
            // Afficher une erreur claire
            throw new Error('Un compte existe déjà avec cette adresse email. Veuillez vous connecter avec votre compte existant au lieu de créer un nouveau compte.');
          }
          
          // Si l'email existe mais qu'on a créé le compte, c'est normal (première création)
          if (verifyData.exists && verifyData.count === 1) {
            console.log('✅ [SIGNUP] Email vérifié, un seul compte existe (normal)');
          }
        }
      } catch (verifyErr: any) {
        // Si c'est notre erreur personnalisée (doublon), la propager
        if (verifyErr.message.includes('Un compte existe déjà')) {
          // Ne pas afficher le message de succès
          setSuccess(false);
          throw verifyErr;
        }
        // Sinon, ignorer et continuer
        console.warn('⚠️ [SIGNUP] Erreur vérification post-signup (non bloquant):', verifyErr.message);
      }

      // ========================================================================
      // VÉRIFICATION CRITIQUE : Vérifier que l'email n'existe pas déjà
      // (même si Supabase Auth a retourné un succès)
      // ========================================================================
      console.log('🔍 [SIGNUP] Vérification critique post-signup...');
      
      try {
        const criticalCheckResponse = await fetch('/api/check-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: formData.email.trim() }),
        });

        if (criticalCheckResponse.ok) {
          const criticalCheckData = await criticalCheckResponse.json();
          
          // Si l'email existe déjà dans auth.users (mais pas le nôtre), c'est un problème
          if (criticalCheckData.existsInAuth && criticalCheckData.count > 1) {
            console.error('❌ [SIGNUP] DOUBLON CRITIQUE DÉTECTÉ ! Email existe déjà dans auth.users');
            
            // Ne pas afficher de succès, afficher une erreur
            setError('Un compte existe déjà avec cette adresse email. Veuillez vous connecter avec votre compte existant.');
            setSuccess(false);
            setLoading(false);
            return; // Arrêter ici
          }
        }
      } catch (criticalErr) {
        console.warn('⚠️ [SIGNUP] Erreur vérification critique (non bloquant):', criticalErr);
      }

      // Utilisateur créé avec succès !
      console.log('✅ [SIGNUP] Utilisateur créé:', {
        userId: data.user.id,
        email: data.user.email,
        emailConfirmed: !!data.user.email_confirmed_at,
        hasSession: !!data.session,
      });
      
      // Vérifier que le profil a été créé automatiquement (via trigger)
      // Note: Le trigger SQL devrait créer le profil automatiquement
      // On vérifie après un court délai pour laisser le trigger s'exécuter
      setTimeout(async () => {
        try {
          if (!data.user) return;
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, role, full_name, phone')
            .eq('id', data.user.id)
            .single();
          
          if (profileError) {
            console.warn('⚠️ [SIGNUP] Profil non trouvé après création utilisateur:', profileError.message);
            // Le profil devrait être créé par le trigger, mais si ce n'est pas le cas,
            // on peut le créer manuellement (fallback)
            if (profileError.code === 'PGRST116') {
              console.log('🔄 [SIGNUP] Création manuelle du profil (fallback)...');
              const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();
              const { error: insertError } = await supabase
                .from('profiles')
                .insert({
                  id: data.user.id,
                  email: data.user.email,
                  role: 'user',
                  full_name: fullName || null,
                  phone: formData.phone.trim() || null,
                });
              
              if (insertError) {
                console.error('❌ [SIGNUP] Erreur création profil manuelle:', insertError.message);
              } else {
                console.log('✅ [SIGNUP] Profil créé manuellement avec succès');
              }
            }
          } else {
            console.log('✅ [SIGNUP] Profil vérifié:', profile);
            // Mettre à jour le profil avec les informations supplémentaires si nécessaire
            if (profile && (!profile.full_name || !profile.phone)) {
              const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();
              const { error: updateError } = await supabase
                .from('profiles')
                .update({
                  full_name: fullName || profile.full_name,
                  phone: formData.phone.trim() || profile.phone,
                })
                .eq('id', data.user.id);
              
              if (updateError) {
                console.warn('⚠️ [SIGNUP] Erreur mise à jour profil:', updateError.message);
              } else {
                console.log('✅ [SIGNUP] Profil mis à jour avec les informations supplémentaires');
              }
            }
          }
        } catch (err) {
          console.error('❌ [SIGNUP] Erreur vérification profil:', err);
        }
      }, 1000);

      // Si une session existe, l'utilisateur est automatiquement connecté
      if (data.session) {
        console.log('✅ [SIGNUP] Session créée automatiquement, connexion réussie');
        setSuccess(true);
        setError(null);
        
        // Attendre un peu pour que la session soit bien persistée
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Vérifier à nouveau la session
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          // Forcer le rechargement de la page pour mettre à jour la navigation
          window.location.href = redirectUrl;
        } else {
          router.push(redirectUrl);
        }
        return;
      }

      // Pas de session immédiate - deux possibilités :
      // 1. Email confirmation requise
      // 2. Délai de création de session
      
      console.log('⏳ [SIGNUP] Pas de session immédiate, vérification...');
      
      // Attendre un peu et vérifier à nouveau
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('⚠️ [SIGNUP] Erreur lors de la vérification de session:', sessionError);
      }

      if (sessionData?.session) {
        console.log('✅ [SIGNUP] Session créée après attente, connexion réussie');
        setSuccess(true);
        setError(null);
        // Forcer le rechargement de la page pour mettre à jour la navigation
        window.location.href = redirectUrl;
        return;
      }

      // Pas de session - l'email confirmation est probablement requise
      console.log('📧 [SIGNUP] Email confirmation requise - compte créé mais pas encore activé');
      
      setSuccess(true);
      setError(null);
      
      // Afficher le message de succès pendant 3 secondes puis rediriger
      setTimeout(() => {
        router.push("/login?message=email-confirmation-required");
      }, 3000);
    } catch (err: any) {
      console.error('❌ [SIGNUP] Erreur lors de l\'inscription:', err);
      console.error('❌ [SIGNUP] Stack trace:', err.stack);
      console.error('❌ [SIGNUP] Erreur complète:', {
        message: err.message,
        name: err.name,
        cause: err.cause,
      });
      
      // Afficher le message d'erreur à l'utilisateur
      let errorMessage = err.message || 'Une erreur est survenue lors de l\'inscription. Veuillez réessayer.';
      
      // Messages d'erreur plus clairs
      if (errorMessage.includes('Variables d\'environnement')) {
        errorMessage = 'Erreur de configuration. Veuillez contacter le support technique.';
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network')) {
        errorMessage = 'Erreur de connexion réseau. Vérifiez votre connexion internet et réessayez.';
      } else if (errorMessage.includes('aucun compte') || errorMessage.includes('Aucun compte')) {
        errorMessage = 'Impossible de créer le compte. Vérifiez vos informations et réessayez. Si le problème persiste, contactez le support.';
      }
      
      setError(errorMessage);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0a0a0a] text-white min-h-screen pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Side - Benefits */}
            <motion.div 
              className="hidden md:block"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
            <Link href="/" className="inline-flex items-center gap-3 mb-8">
              <Image
                src="/logo.png"
                alt="Autoval IA Logo"
                  width={80}
                  height={80}
                  className="h-20 w-20 object-contain"
                style={{ 
                    filter: 'brightness(2) saturate(1.5) drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))'
                }}
              />
                <span className="text-3xl font-light text-white tracking-wide">Autoval IA</span>
            </Link>
              <Badge variant="secondary" className="bg-white/10 text-white border-white/20 rounded-full px-4 py-1 mb-6 inline-flex">
                <Sparkles className="size-4 mr-2" />
                Avantages
              </Badge>
              <h1 className="text-5xl font-medium text-white mb-6">
                Rejoignez des milliers
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                  d'utilisateurs satisfaits
                </span>
            </h1>
              <p className="text-gray-400 mb-8 text-lg">
                Créez votre compte gratuit et accédez à toutes les fonctionnalités d\'Autoval IA pour sécuriser votre prochain achat automobile.
            </p>
            <div className="space-y-4">
              {[
                "Recherche IA illimitée sur tous les sites",
                "Analyse détaillée d'annonces",
                "Sauvegarde de vos recherches favorites",
                "Alertes sur les nouvelles opportunités",
                "Accès aux experts automobiles",
                "Score de fiabilité en temps réel",
              ].map((benefit, index) => (
                  <motion.div 
                    key={index} 
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="size-4 text-white" />
                  </div>
                    <span className="text-gray-300">{benefit}</span>
                  </motion.div>
              ))}
            </div>
            </motion.div>

          {/* Right Side - Sign Up Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
            <div className="md:hidden text-center mb-8">
                <Link href="/" className="inline-flex flex-col items-center gap-4 mb-6">
                <Image
                  src="/logo.png"
                  alt="Autoval IA Logo"
                    width={80}
                    height={80}
                    className="h-20 w-20 object-contain"
                  style={{ 
                      filter: 'brightness(2) saturate(1.5) drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))'
                  }}
                />
                  <span className="text-3xl font-light text-white tracking-wide">Autoval IA</span>
              </Link>
                <Badge variant="secondary" className="bg-white/10 text-white border-white/20 rounded-full px-4 py-1 mb-4">
                  <UserPlus className="size-4 mr-2 inline" />
                  Inscription
                </Badge>
                <h1 className="text-4xl font-medium text-white mb-2">Créer un compte</h1>
                <p className="text-gray-400">
                Rejoignez Autoval IA en quelques secondes
              </p>
            </div>

              <Card className="bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl">
              <CardContent className="p-8">
                <div className="hidden md:block mb-6">
                    <Badge variant="secondary" className="bg-white/10 text-white border-white/20 rounded-full px-4 py-1 mb-4">
                      <UserPlus className="size-4 mr-2 inline" />
                      Inscription
                    </Badge>
                    <h2 className="text-3xl font-medium text-white mb-2">Créer un compte</h2>
                    <p className="text-gray-400">
                      C'est gratuit et sans engagement
                  </p>
                </div>

                {error && (
                    <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-400">
                    <div className="font-semibold mb-1">❌ Erreur lors de la création du compte</div>
                    <div className="whitespace-pre-line">{error}</div>
                    {error.includes('configuration') || error.includes('Variables') ? (
                        <div className="mt-3 text-xs text-red-300">
                        <p className="font-semibold">Vérifications à faire :</p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>Vérifiez que le fichier .env.local existe à la racine du projet</li>
                          <li>Vérifiez que NEXT_PUBLIC_SUPABASE_URL est défini</li>
                          <li>Vérifiez que NEXT_PUBLIC_SUPABASE_ANON_KEY est défini</li>
                          <li>Redémarrez le serveur après modification de .env.local</li>
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )}

                {success && (
                    <div className="mb-4 rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-sm text-green-400">
                    <div className="font-semibold mb-2">✅ Compte créé avec succès !</div>
                    <div>
                      {error === null ? (
                        <span>Connexion en cours, redirection vers votre espace...</span>
                      ) : (
                        <div>
                          <p className="mb-2">Un email de confirmation a été envoyé à <strong>{formData.email}</strong>.</p>
                            <p className="text-xs text-green-300 mt-2">
                            💡 Vérifiez votre boîte mail (et les spams) et cliquez sur le lien de confirmation pour activer votre compte.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-white">Prénom</Label>
                      <Input
                        id="firstName"
                        placeholder="Jean"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-white">Nom</Label>
                      <Input
                        id="lastName"
                        placeholder="Dupont"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                      <Label htmlFor="phone" className="text-white">Téléphone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+33 6 12 34 56 78"
                      value={formData.phone}
                      onChange={handleChange}
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                      <Label htmlFor="email" className="text-white">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="votre.email@exemple.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                      <Label htmlFor="password" className="text-white">Mot de passe</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={6}
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                    />
                    <p className="text-sm text-gray-500">
                      Minimum 6 caractères
                    </p>
                  </div>

                  <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-white">Confirmer le mot de passe</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      minLength={6}
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      id="terms"
                      type="checkbox"
                        className="h-4 w-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 mt-1 flex-shrink-0"
                      required
                    />
                      <label htmlFor="terms" className="text-sm text-gray-400 leading-relaxed">
                        J&apos;accepte les{" "}
                        <Link href="/cgu" className="text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-2">
                          conditions générales d&apos;utilisation
                        </Link>{" "}
                        et la{" "}
                        <Link href="/politique-confidentialite" className="text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-2">
                          politique de confidentialité
                        </Link>
                      </label>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-full"
                    disabled={loading || success}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="size-5 mr-2 animate-spin" />
                        Création en cours...
                      </>
                    ) : (
                      <>
                        <UserPlus className="size-5 mr-2" />
                        Créer mon compte
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Login Link */}
            <div className="mt-6 text-center">
                <p className="text-gray-400">
                Vous avez déjà un compte ?{" "}
                  <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
                  Se connecter
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
    </div>
  );
}
