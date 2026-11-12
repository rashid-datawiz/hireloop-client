"use client"

import * as React from "react"
import Link from "next/link"

import { AuthModeToggle } from "@/components/auth/auth-mode-toggle"
import { AuthPasswordField } from "@/components/auth/auth-password-field"
import { AuthTextField } from "@/components/auth/auth-text-field"
import { GoogleButton } from "@/components/auth/google-button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup } from "@/components/ui/field"
import {
  collectSignUpFormData,
  type SignUpFormData,
} from "@/lib/auth-form-data"

export function SignUpForm() {
  const [submitted, setSubmitted] = React.useState<SignUpFormData | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const values = collectSignUpFormData(formData)

    setSubmitted(values)

    // TODO: replace with `signUp.email(values)` from `@/lib/auth-client`.
    console.info("[auth] sign-up form data", values)
  }

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-white/[0.07] bg-[#232327]/95 p-6 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8">
        <div className="flex flex-col items-center text-center">
          <h1 className="font-display text-[26px] font-bold tracking-[-0.02em] text-white sm:text-[30px]">
            Create your account
          </h1>
          <p className="mt-2 font-display text-[14px] text-white/55">
            Join Hireloop and start finding your next opportunity.
          </p>
        </div>

        <AuthModeToggle className="mt-7" />

        <form onSubmit={handleSubmit} className="mt-7">
          <FieldGroup className="gap-5">
            <AuthTextField
              id="sign-up-name"
              name="name"
              label="Full name"
              placeholder="Your name"
              autoComplete="name"
            />

            <AuthTextField
              id="sign-up-email"
              name="email"
              type="email"
              label="Email"
              placeholder="you@example.com"
              autoComplete="email"
            />

            <AuthPasswordField
              id="sign-up-password"
              name="password"
              label="Password"
              placeholder="Create a password"
              autoComplete="new-password"
            />

            <Field orientation="horizontal" className="items-start gap-2.5">
              <Checkbox
                id="sign-up-terms"
                name="terms"
                className="mt-0.5 border-white/25 bg-white/[0.04] hover:border-white/40 data-checked:border-[#635ff4] data-checked:bg-[#635ff4] data-checked:text-white"
              />
              <label
                htmlFor="sign-up-terms"
                className="font-display text-[13px] leading-relaxed text-white/60 select-none"
              >
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="text-white/85 underline underline-offset-4 transition-colors hover:text-white"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="text-white/85 underline underline-offset-4 transition-colors hover:text-white"
                >
                  Privacy Policy
                </Link>
                .
              </label>
            </Field>

            <button
              type="submit"
              className="flex h-11 w-full items-center justify-center rounded-xl bg-[#635ff4] font-display text-[14px] font-medium text-white transition-colors outline-none hover:bg-[#5a55ee] focus-visible:ring-3 focus-visible:ring-[#635ff4]/50"
            >
              Create Account
            </button>

            <div className="flex items-center gap-4">
              <span aria-hidden="true" className="h-px flex-1 bg-white/12" />
              <span className="font-display text-[12px] tracking-[0.12em] text-white/40 uppercase">
                or continue with
              </span>
              <span aria-hidden="true" className="h-px flex-1 bg-white/12" />
            </div>

            <GoogleButton label="Sign up with Google" />
          </FieldGroup>
        </form>
      </div>

      {submitted ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="font-mono text-[11px] tracking-[0.15em] text-white/40 uppercase">
            Collected form data
          </p>
          <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 font-mono text-[12px]">
            <dt className="text-white/40">name</dt>
            <dd className="truncate text-white/85">{submitted.name}</dd>
            <dt className="text-white/40">email</dt>
            <dd className="truncate text-white/85">{submitted.email}</dd>
            <dt className="text-white/40">password</dt>
            <dd className="text-white/85">
              {"•".repeat(Math.max(submitted.password.length, 8))}
            </dd>
            <dt className="text-white/40">terms</dt>
            <dd className="text-white/85">{String(submitted.terms)}</dd>
          </dl>
        </div>
      ) : null}
    </div>
  )
}
