export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-sm font-medium text-foreground/80">
            Guitar Practice
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}
