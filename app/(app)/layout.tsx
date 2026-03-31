import { Navbar } from "@/components/layout/navbar"
import { FullscreenProvider } from "@/lib/fullscreen-context"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FullscreenProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 px-5 py-8 max-w-2xl mx-auto w-full">
          {children}
        </main>
      </div>
    </FullscreenProvider>
  )
}
