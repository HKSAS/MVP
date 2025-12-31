'use client'

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";
import { motion } from 'framer-motion';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    // Simuler un chargement pour vérifier la session
    if (sessionId) {
      // Ici, vous pourriez vérifier la session avec Stripe
      // Pour l'instant, on simule juste un délai
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    } else {
      // Pas de session_id, rediriger vers la page de paiement
      router.push("/paiement");
    }
  }, [sessionId, router]);

  if (loading) {
    return (
      <div className="bg-[#0a0a0a] text-white min-h-screen pt-20 flex items-center justify-center p-4">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]"></div>
        </div>
        
        <Card className="max-w-md w-full text-center bg-white/5 backdrop-blur-xl border-white/10 relative z-10">
          <CardContent className="p-12">
            <Loader2 className="size-12 text-blue-400 animate-spin mx-auto mb-6" />
            <p className="text-gray-400">Vérification de votre paiement...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] text-white min-h-screen pt-20 flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]"></div>
      </div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10"
      >
        <Card className="max-w-md w-full text-center bg-white/5 backdrop-blur-xl border-white/10">
        <CardContent className="p-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
              className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 border border-green-500/30 rounded-full mb-6"
            >
              <CheckCircle2 className="size-8 text-green-400" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-white mb-4 text-2xl font-semibold"
            >
              Abonnement activé 🎉
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-gray-400 mb-8"
            >
            Votre abonnement Autoval IA Analyse est maintenant actif. Vous pouvez commencer à analyser des annonces immédiatement.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <Button asChild className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white" size="lg">
            <Link href="/dashboard">Aller au Dashboard</Link>
          </Button>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="text-sm text-gray-400 mt-4"
            >
            Un email de confirmation a été envoyé à votre adresse
            </motion.p>
        </CardContent>
      </Card>
      </motion.div>
    </div>
  );
}

