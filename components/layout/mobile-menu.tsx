"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string
  label: string
}

interface MobileMenuProps {
  items: NavItem[]
}

export function MobileMenu({ items }: MobileMenuProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    setOpen(false)
    await signOut({ redirect: false })
    router.push("/login")
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </SheetTrigger>
      <SheetContent side="left" className="w-60 bg-background border-border">
        <div className="mt-8 flex flex-col gap-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors",
                pathname === item.href
                  ? "text-accent font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-4 border-t border-border pt-4">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className={cn(
                "block rounded-md px-3 py-2 text-sm transition-colors",
                pathname === "/settings"
                  ? "text-accent font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full text-left rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
