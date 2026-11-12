import type { Metadata } from "next"

import { SignUpForm } from "@/components/auth/sign-up-form"

export const metadata: Metadata = {
  title: "Sign Up | Hireloop",
  description:
    "Create a Hireloop account to find jobs, apply, and track your applications.",
}

export default function SignUpPage() {
  return <SignUpForm />
}
