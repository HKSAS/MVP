'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

const ADMIN_PASSWORD = 'Kamel2804'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Vérifier le mot de passe
    if (password === ADMIN_PASSWORD) {
      // Stocker l'authentification admin dans sessionStorage
      sessionStorage.setItem('admin_authenticated', 'true')
      sessionStorage.setItem('admin_auth_time', Date.now().toString())
      toast.success('Connexion réussie')
      router.push('/admin')
      router.refresh()
    } else {
      toast.error('Mot de passe incorrect')
      setPassword('')
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#0a0a0a] text-white min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Enhanced Gradient Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-gradient-to-r from-blue-600/30 via-blue-500/20 to-transparent rounded-full blur-[140px] animate-pulse"></div>
        <div className="absolute top-1/2 right-1/4 w-[600px] h-[600px] bg-gradient-to-l from-purple-600/25 via-purple-500/15 to-transparent rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-t from-blue-900/20 via-purple-900/15 to-transparent rounded-full blur-[100px]"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <Card className="bg-gradient-to-br from-blue-500/20 to-purple-600/10 backdrop-blur-sm border border-blue-500/30 shadow-lg shadow-blue-500/10">
          <CardHeader className="space-y-4 text-center pb-6">
            <div className="flex justify-center">
              <div className="p-4 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-2xl border border-blue-500/50">
                <Shield className="h-12 w-12 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-medium text-white">
              Administration AUTOIA
            </CardTitle>
            <p className="text-gray-400">
              Accès réservé aux administrateurs
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Mot de passe
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Entrez le mot de passe"
                  className="bg-white/5 border-white/20 text-white placeholder:text-gray-500 focus:border-blue-500/50 focus:ring-blue-500/50"
                  required
                  autoFocus
                  disabled={loading}
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !password}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 rounded-full py-6 text-base font-medium transition-all"
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

