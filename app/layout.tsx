import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import TopNav from '@/components/layout/TopNav'
import Footer from '@/components/Footer'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Autoval IA - Recherche intelligente de véhicules',
  description: 'Recherche intelligente de véhicules avec IA',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={`${inter.className} min-h-screen flex flex-col bg-[#0a0a0a]`}>
        {/* Calendly embed script */}
        <Script
          src="https://assets.calendly.com/assets/external/widget.js"
          strategy="afterInteractive"
        />
        <TopNav />
        <main className="flex-1 pt-20">
          {children}
        </main>
        <Footer />
        <Toaster />
      </body>
    </html>
  )
}

