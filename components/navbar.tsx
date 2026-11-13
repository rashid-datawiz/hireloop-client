"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MenuIcon } from "lucide-react"

import logo from "@/app/images/logo.png"
import { MobileAuthActions, UserMenu } from "@/components/auth/user-menu"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const navItems = [
  { label: "Browse Jobs", href: "/jobs" },
  { label: "Company", href: "/company" },
  { label: "Pricing", href: "/pricing" },
]

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Navbar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0a0a0c] px-4 pt-3 sm:px-6 lg:px-10">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center rounded-2xl border border-white/[0.07] bg-[#232327]/95 pr-5 pl-8 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <Link
          href="/"
          aria-label="Hireloop home"
          className="flex shrink-0 items-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-[#635ff4]/60"
        >
          <Image src={logo} alt="Hireloop" priority className="h-9 w-auto" />
        </Link>

        <div className="ml-auto flex items-center">
          <NavigationMenu className="hidden flex-none md:flex">
            <NavigationMenuList className="flex-none gap-9">
              {navItems.map((item) => {
                const active = isActivePath(pathname, item.href)

                return (
                  <NavigationMenuItem key={item.href}>
                    <NavigationMenuLink
                      active={active}
                      render={<Link href={item.href} />}
                      className={cn(
                        "px-0 py-0 text-sm font-normal text-[#e5e5e5] transition-colors hover:bg-transparent hover:text-white focus:bg-transparent focus-visible:ring-0 data-active:bg-transparent data-active:hover:bg-transparent data-active:focus:bg-transparent",
                        active && "text-white"
                      )}
                    >
                      {item.label}
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                )
              })}
            </NavigationMenuList>
          </NavigationMenu>

          <span
            aria-hidden="true"
            className="mx-6 hidden h-5 w-px bg-white/15 md:block"
          />

          <UserMenu />

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2 text-white hover:bg-white/10 hover:text-white md:hidden"
                  aria-label="Open navigation menu"
                />
              }
            >
              <MenuIcon className="size-5" />
            </SheetTrigger>

            <SheetContent
              side="right"
              className="w-full max-w-xs gap-0 border-white/10 bg-[#17171a] p-0 text-white"
            >
              <SheetHeader className="border-b border-white/10 px-5 py-4">
                <SheetTitle className="sr-only">Navigation menu</SheetTitle>
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Hireloop home"
                  className="w-max rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-[#635ff4]/60"
                >
                  <Image src={logo} alt="Hireloop" className="h-9 w-auto" />
                </Link>
              </SheetHeader>

              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
                {navItems.map((item) => {
                  const active = isActivePath(pathname, item.href)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "rounded-lg px-3 py-2.5 text-sm font-medium text-[#e5e5e5] transition-colors outline-none hover:bg-white/5 hover:text-white focus-visible:ring-3 focus-visible:ring-[#635ff4]/60",
                        active && "bg-white/5 text-white"
                      )}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </nav>

              <div className="mt-auto flex flex-col gap-2 border-t border-white/10 p-4">
                <MobileAuthActions onNavigate={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
