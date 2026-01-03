'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  BarChart3,
  Users,
  CreditCard,
  DollarSign,
  Calendar,
  LogOut,
  Menu,
  X,
  Bell,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/components/ui/utils'

const navItems = [
  { icon: BarChart3, label: 'Dashboard', href: '/admin' },
  { icon: Users, label: 'Utilisateurs', href: '/admin/utilisateurs' },
  { icon: CreditCard, label: 'Abonnements', href: '/admin/abonnements' },
  { icon: DollarSign, label: 'Transactions', href: '/admin/transactions' },
  { icon: Calendar, label: 'Calendrier', href: '/admin/calendrier' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    // Vérifier l'authentification admin (mot de passe)
    const checkAdminAuth = () => {
      if (typeof window === 'undefined') return

      // Si on est sur la page de login, on permet l'affichage
      if (pathname === '/admin/login') {
        setIsAuthenticated(false)
        setLoading(false)
        return
      }

      const isAuth = sessionStorage.getItem('admin_authenticated') === 'true'
      const authTime = sessionStorage.getItem('admin_auth_time')
      
      // Vérifier que l'authentification n'est pas expirée (24h)
      if (authTime) {
        const timeDiff = Date.now() - parseInt(authTime)
        const hours24 = 24 * 60 * 60 * 1000
        if (timeDiff > hours24) {
          sessionStorage.removeItem('admin_authenticated')
          sessionStorage.removeItem('admin_auth_time')
          router.push('/admin/login')
          setIsAuthenticated(false)
          setLoading(false)
          return
        }
      }

      if (!isAuth) {
        router.push('/admin/login')
        setIsAuthenticated(false)
        setLoading(false)
        return
      }

      setIsAuthenticated(true)
      setLoading(false)
    }

    checkAdminAuth()
  }, [router, pathname])

  const handleLogout = () => {
    sessionStorage.removeItem('admin_authenticated')
    sessionStorage.removeItem('admin_auth_time')
    router.push('/admin/login')
  }

  if (loading || isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-gradient-to-r from-blue-600/30 via-blue-500/20 to-transparent rounded-full blur-[140px] animate-pulse"></div>
          <div className="absolute top-1/2 right-1/4 w-[600px] h-[600px] bg-gradient-to-l from-purple-600/25 via-purple-500/15 to-transparent rounded-full blur-[120px]"></div>
        </div>
        <div className="space-y-4 w-full max-w-md px-4 relative z-10">
          <Skeleton className="h-12 w-full bg-white/10" />
          <Skeleton className="h-12 w-full bg-white/10" />
          <Skeleton className="h-12 w-full bg-white/10" />
        </div>
      </div>
    )
  }

  // Si on est sur la page de login, afficher les enfants directement
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  // Si pas authentifié, ne pas afficher le layout admin
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex relative overflow-hidden">
      {/* Enhanced Gradient Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-r from-blue-600/20 via-blue-500/10 to-transparent rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-l from-purple-600/20 via-purple-500/10 to-transparent rounded-full blur-[120px]"></div>
      </div>
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 relative z-20">
        <div className="flex flex-col flex-grow border-r border-white/10 bg-gradient-to-b from-blue-500/10 to-purple-600/10 backdrop-blur-md overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-6 py-6 border-b border-white/10">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              AUTOIA
            </h1>
            <span className="ml-2 text-sm text-gray-400">Admin</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || 
                (item.href !== '/admin' && pathname?.startsWith(item.href))
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all',
                    isActive
                      ? 'bg-gradient-to-r from-blue-500/30 to-purple-600/30 border border-blue-500/50 text-white shadow-lg shadow-blue-500/20'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white border border-transparent'
                  )}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Sidebar Mobile */}
      {sidebarOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-blue-500/10 to-purple-600/10 backdrop-blur-md border-r border-white/10 md:hidden">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-6 py-6 border-b border-white/10">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                  AUTOIA
                </h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                  className="text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || 
                    (item.href !== '/admin' && pathname?.startsWith(item.href))
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all',
                        isActive
                          ? 'bg-gradient-to-r from-blue-500/30 to-purple-600/30 border border-blue-500/50 text-white shadow-lg shadow-blue-500/20'
                          : 'text-gray-300 hover:bg-white/5 hover:text-white border border-transparent'
                      )}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.label}
                    </Link>
                  )
                })}
              </nav>
            </div>
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 md:pl-64 relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-4 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/10 md:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white hover:bg-white/10"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-4 ml-auto">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <Bell className="h-5 w-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 text-white hover:bg-white/10">
                  <Avatar className="h-8 w-8 border border-white/20">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500/30 to-purple-600/30 text-white">
                      A
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-sm">Admin</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#0a0a0a] border-white/10">
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-white hover:bg-white/10">
                  <LogOut className="mr-2 h-4 w-4" />
                  Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}

