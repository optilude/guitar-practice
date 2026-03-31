"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { MobileMenu } from "@/components/layout/mobile-menu"

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/goals", label: "Goals" },
  { href: "/library", label: "Library" },
  { href: "/history", label: "History" },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await signOut({ redirect: false })
    router.push("/login")
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-50 h-11 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="flex h-full items-center gap-5 px-5">
        {/* Mobile: hamburger (hidden on md+) */}
        <div className="md:hidden">
          <MobileMenu items={NAV_ITEMS} />
        </div>

        {/* App name */}
        <span className="text-[12px] font-medium text-foreground/85 md:mr-3">
          Guitar Practice
        </span>

        {/* Desktop nav links (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-[11px] transition-colors pb-px",
                pathname === item.href
                  ? "text-accent border-b-[1.5px] border-accent"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />

          {/* Desktop: sign out link (hidden on mobile — accessible via drawer) */}
          <button
            onClick={handleSignOut}
            className="hidden md:block text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>

          {/* Start Practice CTA */}
          <Link
            href="/"
            className="bg-accent text-accent-foreground text-[10px] font-semibold px-3 py-[5px] rounded-md hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            <span className="hidden md:inline">Start Practice</span>
            <span className="md:hidden">▶</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
