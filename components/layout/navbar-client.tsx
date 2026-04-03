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
  { href: "/reference", label: "Reference" },
  { href: "/history", label: "History" },
]

interface NavbarClientProps {
  activeGoalTitle: string | null
}

export function NavbarClient({ activeGoalTitle }: NavbarClientProps) {
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
        <div className="md:hidden">
          <MobileMenu items={NAV_ITEMS} />
        </div>

        <span className="text-sm font-medium text-foreground/85 md:mr-3">Guitar Practice</span>

        <div className="hidden md:flex items-center gap-5">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <div key={item.href} className="flex flex-col items-center justify-center">
                <Link
                  href={item.href}
                  className={cn(
                    "text-[13px] transition-colors pb-px",
                    isActive
                      ? "text-accent border-b-[1.5px] border-accent"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
                {item.href === "/goals" && activeGoalTitle && (
                  <span className="text-[10px] text-muted-foreground truncate max-w-[80px] leading-none">
                    {activeGoalTitle}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={handleSignOut}
            className="hidden md:block text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
          <Link
            href="/"
            className="bg-accent text-accent-foreground text-xs font-semibold px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            <span className="hidden md:inline">Start Practice</span>
            <span className="md:hidden">▶</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
