import { Navbar } from "@/components/layout/navbar"
import { FullscreenProvider } from "@/lib/fullscreen-context"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FullscreenProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 px-5 py-8 w-full max-w-2xl lg:max-w-5xl mx-auto">
          {children}
        </main>
      </div>
    </FullscreenProvider>
  )
}
