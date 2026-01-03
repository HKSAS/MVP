import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { ConditionalLayout } from '@/components/layout/ConditionalLayout'
import { Toaster } from '@/components/ui/sonner'
import ChatBotWrapper from '@/components/ChatBot/ChatBotWrapper'
import { QueryProvider } from '@/components/providers/QueryProvider'

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
        <QueryProvider>
          {/* Calendly embed script */}
          <Script
            src="https://assets.calendly.com/assets/external/widget.js"
            strategy="afterInteractive"
          />
          <ConditionalLayout>
            {children}
          </ConditionalLayout>
          <Toaster />
          {/* Chatbot accessible sur toutes les pages (uniquement pour utilisateurs connectés) */}
          <ChatBotWrapper />
        </QueryProvider>
      </body>
    </html>
  )
}

