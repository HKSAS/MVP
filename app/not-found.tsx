'use client'

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { Home, Search, AlertCircle } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="bg-[#0a0a0a] text-white min-h-screen pt-20 flex items-center justify-center px-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]"></div>
      </div>

      <motion.div 
        className="text-center relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mb-8 shadow-lg shadow-blue-500/20">
          <AlertCircle className="size-12 text-white" />
        </div>
        <div className="text-9xl font-medium mb-6 bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">404</div>
        <h1 className="text-5xl font-medium text-white mb-4">Page introuvable</h1>
        <p className="text-xl text-gray-400 mb-12 max-w-md mx-auto">
          Oups ! La page que vous cherchez n'existe pas ou a été déplacée.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild className="bg-white text-black hover:bg-gray-200 px-8 py-6 text-base rounded-full">
            <Link href="/" className="flex items-center gap-2">
              <Home className="size-5" />
              Retour à l'accueil
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="border border-white/20 bg-white/5 hover:bg-white/10 text-white px-8 py-6 text-base rounded-full backdrop-blur-sm">
            <Link href="/recherche" className="flex items-center gap-2">
              <Search className="size-5" />
              Rechercher une voiture
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
