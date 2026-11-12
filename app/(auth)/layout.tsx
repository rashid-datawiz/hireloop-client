import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Authentication | Hireloop",
  description:
    "Sign in or create an account to post jobs and find your next opportunity.",
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative isolate flex min-h-[calc(100svh-4.75rem)] items-center justify-center px-5 py-16">
      <div
        aria-hidden="true"
        className="auth-backdrop absolute inset-0 -z-10"
      />
      <div aria-hidden="true" className="auth-stars absolute inset-0 -z-10" />

      <div className="w-full max-w-[440px]">{children}</div>
    </div>
  )
}
