import type { Metadata, Viewport } from "next"
import { ThemeProvider } from "next-themes"
import { SessionProvider } from "@/components/session-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "Guitar Practice",
  description: "Organised guitar practice routines",
  manifest: "/manifest.webmanifest",
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#d97706" },
    { media: "(prefers-color-scheme: light)", color: "#b45309" },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
