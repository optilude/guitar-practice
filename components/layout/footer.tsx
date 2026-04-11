import Link from "next/link"

const NAV_ITEMS = [
  { href: "/",          label: "Home" },
  { href: "/goals",     label: "Goals" },
  { href: "/history",   label: "History" },
  { href: "/library",   label: "Library" },
  { href: "/reference", label: "Reference" },
  { href: "/progressions", label: "Progressions" },
  { href: "/tools",     label: "Tools" },
]

export function Footer() {
  return (
    <footer className="border-t border-border mt-12 py-8 px-5">
      <div className="w-full max-w-2xl lg:max-w-5xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground/80">Guitar Practice</span>
          <span className="text-xs text-muted-foreground">Track your practice, build better habits.</span>
        </div>

        <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-1.5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
