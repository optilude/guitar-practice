import { cn } from "@/lib/utils"

const base = "rounded-md font-medium transition-colors disabled:opacity-50"
const sm = "text-xs px-3 py-1.5"
const md = "text-sm px-4 py-2"

const variants = {
  primary:     "bg-accent text-accent-foreground hover:opacity-90",
  secondary:   "border border-accent text-accent hover:bg-accent/10",
  destructive: "border border-destructive text-destructive hover:bg-destructive/10",
  standalone:  "border border-border text-foreground hover:bg-muted",
}

export function btn(variant: keyof typeof variants, size: "sm" | "md" = "md") {
  return cn(base, size === "sm" ? sm : md, variants[variant])
}
