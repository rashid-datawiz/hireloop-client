import type { Metadata } from "next"

import { SignInForm } from "@/components/auth/sign-in-form"

export const metadata: Metadata = {
  title: "Sign In | Hireloop",
  description: "Sign in to your Hireloop account to continue your job search.",
}

export default function SignInPage() {
  return <SignInForm />
}
