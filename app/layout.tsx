import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Toaster } from '@/components/ui/sonner'
import QueryProvider from '@/components/providers/query-provider'
import AppInitializer from '@/components/app-initializer'
import './globals.css'

export const metadata: Metadata = {
  title: 'CampusSync - Campus Management System',
  description: 'Streamlined campus management for academic institutions',
  generator: 'CampusSync',
  manifest: '/manifest.json',
  icons: {
    icon: '/apsit.png',
    shortcut: '/apsit.png',
    apple: '/apsit.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <QueryProvider>
          <AppInitializer>
            {children}
          </AppInitializer>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  )
}
