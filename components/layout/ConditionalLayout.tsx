'use client'

import { usePathname } from 'next/navigation'
import TopNav from '@/components/layout/TopNav'
import Footer from '@/components/Footer'

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith('/admin')

  if (isAdminRoute) {
    // Pas de TopNav ni Footer sur les routes admin
    return <>{children}</>
  }

  // Layout normal avec TopNav et Footer
  return (
    <>
      <TopNav />
      <main className="flex-1 pt-20">
        {children}
      </main>
      <Footer />
    </>
  )
}

