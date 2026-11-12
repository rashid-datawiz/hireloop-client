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
  collectSignInFormData,
  type SignInFormData,
} from "@/lib/auth-form-data"

export function SignInForm() {
  const [submitted, setSubmitted] = React.useState<SignInFormData | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const values = collectSignInFormData(formData)

    setSubmitted(values)

    // TODO: replace with `signIn.email(values)` from `@/lib/auth-client`.
    console.info("[auth] sign-in form data", values)
  }

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-white/[0.07] bg-[#232327]/95 p-6 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8">
        <div className="flex flex-col items-center text-center">
          <h1 className="font-display text-[26px] font-bold tracking-[-0.02em] text-white sm:text-[30px]">
            Welcome back
          </h1>
          <p className="mt-2 font-display text-[14px] text-white/55">
            Sign in to continue to your Hireloop account.
          </p>
        </div>

        <AuthModeToggle className="mt-7" />

        <form onSubmit={handleSubmit} className="mt-7">
          <FieldGroup className="gap-5">
            <AuthTextField
              id="sign-in-email"
              name="email"
              type="email"
              label="Email"
              placeholder="you@example.com"
              autoComplete="email"
            />

            <div className="flex flex-col gap-2">
              <AuthPasswordField
                id="sign-in-password"
                name="password"
                label="Password"
                placeholder="Enter your password"
                autoComplete="current-password"
              />

              <div className="flex items-center justify-between gap-4">
                <Field
                  orientation="horizontal"
                  className="w-auto items-center gap-2 text-white/60"
                >
                  <Checkbox
                    id="sign-in-remember-me"
                    name="rememberMe"
                    className="border-white/25 bg-white/[0.04] hover:border-white/40 data-checked:border-[#635ff4] data-checked:bg-[#635ff4] data-checked:text-white"
                  />
                  <label
                    htmlFor="sign-in-remember-me"
                    className="font-display text-[13px] select-none"
                  >
                    Remember me
                  </label>
                </Field>

                <Link
                  href="/forgot-password"
                  className="font-display text-[13px] text-white/55 transition-colors outline-none hover:text-white focus-visible:ring-3 focus-visible:ring-[#635ff4]/60"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              className="flex h-11 w-full items-center justify-center rounded-xl bg-[#635ff4] font-display text-[14px] font-medium text-white transition-colors outline-none hover:bg-[#5a55ee] focus-visible:ring-3 focus-visible:ring-[#635ff4]/50"
            >
              Sign In
            </button>

            <div className="flex items-center gap-4">
              <span aria-hidden="true" className="h-px flex-1 bg-white/12" />
              <span className="font-display text-[12px] tracking-[0.12em] text-white/40 uppercase">
                or continue with
              </span>
              <span aria-hidden="true" className="h-px flex-1 bg-white/12" />
            </div>

            <GoogleButton />
          </FieldGroup>
        </form>
      </div>

      {submitted ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="font-mono text-[11px] tracking-[0.15em] text-white/40 uppercase">
            Collected form data
          </p>
          <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 font-mono text-[12px]">
            <dt className="text-white/40">email</dt>
            <dd className="truncate text-white/85">{submitted.email}</dd>
            <dt className="text-white/40">password</dt>
            <dd className="text-white/85">
              {"•".repeat(Math.max(submitted.password.length, 8))}
            </dd>
            <dt className="text-white/40">rememberMe</dt>
            <dd className="text-white/85">{String(submitted.rememberMe)}</dd>
          </dl>
        </div>
      ) : null}
    </div>
  )
}
