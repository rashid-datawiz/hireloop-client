"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const modes = [
  { href: "/sign-in", label: "Sign In" },
  { href: "/sign-up", label: "Sign Up" },
] as const

export function AuthModeToggle({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Authentication mode"
      className={cn(
        "grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1",
        className
      )}
    >
      {modes.map((mode) => {
        const isActive = pathname === mode.href

        return (
          <Link
            key={mode.href}
            href={mode.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-[#635ff4]/60",
              isActive
                ? "bg-[#635ff4] text-white shadow-[0_4px_16px_-6px_rgba(99,95,244,0.9)]"
                : "text-white/55 hover:bg-white/[0.06] hover:text-white"
            )}
          >
            {mode.label}
          </Link>
        )
      })}
    </nav>
  )
}
