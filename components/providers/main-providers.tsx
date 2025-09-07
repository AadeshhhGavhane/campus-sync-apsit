"use client"

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import QueryProvider from '@/components/providers/query-provider'
import AppInitializer from '@/components/app-initializer'
import { Toaster } from '@/components/ui/sonner'

// This component wraps all the providers into a single client component
export function MainProviders({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryProvider>
        <AppInitializer>
          {children}
        </AppInitializer>
        <Toaster />
      </QueryProvider>
    </NextThemesProvider>
  )
}

