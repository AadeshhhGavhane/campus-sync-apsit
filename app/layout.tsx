import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { MainProviders } from "@/components/providers/main-providers" 
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
    <html lang="en" suppressHydrationWarning>
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
        <MainProviders>
          {children}
        </MainProviders>
      </body>
    </html>
  )
}

