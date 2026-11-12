"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LogOutIcon, UserIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { authClient } from "@/lib/auth-client"
import { POST_SIGN_OUT_REDIRECT, signOut } from "@/lib/auth-sign-out"

function initials(name: string | undefined, email: string | undefined) {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
  }

  return (email?.trim() || "?").slice(0, 2).toUpperCase()
}

function useAuthSession() {
  const { data: session, isPending } = authClient.useSession()

  return { user: session?.user, isPending }
}

/**
 * Account control for the desktop navbar. Shows a dropdown with the signed-in
 * user and a sign-out action, or the sign-in / get-started links when there is
 * no session.
 */
export function UserMenu() {
  const router = useRouter()
  const { user, isPending } = useAuthSession()
  const [signingOut, setSigningOut] = React.useState(false)

  async function handleSignOut() {
    setSigningOut(true)

    const ok = await signOut()

    if (!ok) {
      setSigningOut(false)
      return
    }

    // better-auth cleared the session cookie; drop the user on a public page.
    router.push(POST_SIGN_OUT_REDIRECT)
    router.refresh()
  }

  // While the session is loading there is no reliable way to know whether to
  // show the auth links or the user menu, so render a placeholder rather than
  // flashing the wrong control.
  if (isPending) {
    return <div className="h-10 w-24" aria-hidden="true" />
  }

  if (!user) {
    return (
      <>
        <Link
          href="/sign-in"
          className="hidden rounded-md text-sm font-normal text-[#8b87b3] transition-colors outline-none hover:text-white focus-visible:ring-3 focus-visible:ring-[#635ff4]/60 md:block"
        >
          Sign In
        </Link>
        <Link
          href="/sign-up"
          className="ml-10 hidden h-10 items-center justify-center rounded-lg bg-[#635ff4] px-5 text-sm font-medium text-white transition-colors outline-none hover:bg-[#5a55ee] focus-visible:ring-3 focus-visible:ring-[#635ff4]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#232327] md:inline-flex"
        >
          Get Started
        </Link>
      </>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="ml-4 h-10 gap-2 rounded-lg px-2.5 text-white hover:bg-white/10 hover:text-white"
            aria-label="Open account menu"
          />
        }
      >
        <span
          aria-hidden="true"
          className="grid size-7 shrink-0 place-items-center rounded-full bg-[#635ff4] font-display text-[12px] font-semibold text-white"
        >
          {initials(user.name, user.email)}
        </span>
        <span className="hidden max-w-[140px] truncate font-display text-[13px] sm:block">
          {user.name || user.email}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-[220px] border border-white/10 bg-[#17171a] text-white"
      >
        {/* `DropdownMenuLabel` renders base-ui's `Menu.GroupLabel`, which must
            live inside a `Menu.Group`. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2.5 py-2 font-display text-[13px] text-white/85">
            {user.name || "Signed in"}
            <span className="mt-0.5 block font-mono text-[11px] font-normal text-white/45">
              {user.email}
            </span>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="bg-white/10" />

          <DropdownMenuItem
            render={<Link href="/dashboard/seeker/jobs" />}
            className="px-2.5 py-2 font-display text-[13px] focus:bg-white/10 focus:text-white"
          >
            <UserIcon aria-hidden="true" className="size-4" />
            My dashboard
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleSignOut}
            disabled={signingOut}
            variant="destructive"
            className="px-2.5 py-2 font-display text-[13px] focus:bg-[#f87171]/10 focus:text-[#fca5a5] data-[variant=destructive]:text-[#fca5a5]"
          >
            <LogOutIcon aria-hidden="true" className="size-4" />
            {signingOut ? "Signing out..." : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Account controls for the mobile navigation sheet. Uses the same session
 * state as the navbar, laid out as full-width rows instead of a dropdown.
 */
export function MobileAuthActions({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter()
  const { user, isPending } = useAuthSession()
  const [signingOut, setSigningOut] = React.useState(false)

  async function handleSignOut() {
    setSigningOut(true)

    const ok = await signOut()

    if (!ok) {
      setSigningOut(false)
      return
    }

    onNavigate?.()
    router.push(POST_SIGN_OUT_REDIRECT)
    router.refresh()
  }

  if (isPending) {
    return <div className="h-20" aria-hidden="true" />
  }

  if (!user) {
    return (
      <>
        <Link
          href="/sign-in"
          onClick={onNavigate}
          className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-white/15 text-sm font-medium text-[#c9c6e4] transition-colors hover:bg-white/5 hover:text-white"
        >
          Sign In
        </Link>
        <Link
          href="/sign-up"
          onClick={onNavigate}
          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#635ff4] text-sm font-medium text-white transition-colors hover:bg-[#5a55ee]"
        >
          Get Started
        </Link>
      </>
    )
  }

  return (
    <>
      <div className="flex items-center gap-3 px-1 pb-1">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-[#635ff4] font-display text-[13px] font-semibold text-white"
        >
          {initials(user.name, user.email)}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-display text-[14px] font-medium text-white">
            {user.name || "Signed in"}
          </span>
          <span className="block truncate font-mono text-[11px] text-white/45">
            {user.email}
          </span>
        </span>
      </div>

      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/15 text-sm font-medium text-[#c9c6e4] transition-colors hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogOutIcon aria-hidden="true" className="size-4" />
        {signingOut ? "Signing out..." : "Sign out"}
      </button>
    </>
  )
}
