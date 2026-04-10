"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { UserCircle } from "lucide-react"
import { Popover } from "@base-ui/react/popover"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { MobileMenu } from "@/components/layout/mobile-menu"

const BASE_NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/goals", label: "Goals" },
  { href: "/history", label: "History" },
  { href: "/library", label: "Library" },
  { href: "/reference", label: "Reference" },
  { href: "/tools", label: "Tools" },
]

export function NavbarClient({
  isAdmin = false,
  userName = null,
}: {
  isAdmin?: boolean
  userName?: string | null
}) {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = isAdmin
    ? [...BASE_NAV_ITEMS, { href: "/admin/users", label: "Admin" }]
    : BASE_NAV_ITEMS

  async function handleSignOut() {
    await signOut({ redirect: false })
    router.push("/login")
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-50 h-11 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="flex h-full items-center gap-5 px-5">
        <div className="md:hidden">
          <MobileMenu items={navItems} />
        </div>

        <Link href="/" className="text-sm font-medium text-foreground/85 md:mr-3 hover:text-foreground transition-colors">
          Guitar Practice
        </Link>

        <div className="hidden md:flex items-center gap-5">
          {navItems.map((item) => {
            const isActive = item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
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
            )
          })}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <Popover.Root>
            <Popover.Trigger className="hidden md:flex items-center text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded">
              <UserCircle className="size-5" />
              <span className="sr-only">User menu</span>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner side="bottom" align="end" sideOffset={8}>
                <Popover.Popup className="z-50 min-w-[160px] rounded-md border border-border bg-background shadow-md py-1 focus:outline-none">
                  {userName && (
                    <>
                      <div className="px-3 py-2 text-xs font-medium text-muted-foreground truncate">
                        {userName}
                      </div>
                      <div className="my-1 border-t border-border" />
                    </>
                  )}
                  <Link
                    href="/settings"
                    className="block px-3 py-1.5 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-3 py-1.5 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    Sign out
                  </button>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </div>
    </nav>
  )
}
