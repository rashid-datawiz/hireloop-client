"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { AuthModeToggle } from "@/components/auth/auth-mode-toggle"
import { AuthPasswordField } from "@/components/auth/auth-password-field"
import { AuthTextField } from "@/components/auth/auth-text-field"
import { GoogleButton } from "@/components/auth/google-button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup } from "@/components/ui/field"
import { authClient } from "@/lib/auth-client"
import {
  collectSignInFormData,
  mapAuthError,
  type AuthField,
} from "@/lib/auth-form-data"

/** Where to send a user once they are signed in. */
const POST_SIGN_IN_REDIRECT = "/"

export function SignInForm() {
  const router = useRouter()

  const [pending, setPending] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<
    Partial<Record<AuthField, string>>
  >({})

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setFormError(null)

    const formData = new FormData(event.currentTarget)
    const values = collectSignInFormData(formData)

    // Validate locally first so obvious mistakes don't cost a round trip.
    const nextErrors: Partial<Record<AuthField, string>> = {}

    if (!values.email) {
      nextErrors.email = "Enter your email address."
    }

    if (!values.password) {
      nextErrors.password = "Enter your password."
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    setFieldErrors({})
    setPending(true)

    const { data, error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      rememberMe: values.rememberMe,
      callbackURL: POST_SIGN_IN_REDIRECT,
    })

    if (error) {
      const mapped = mapAuthError(error.code, error.message)

      if (mapped.field) {
        setFieldErrors({ [mapped.field]: mapped.message })
      } else {
        setFormError(mapped.message)
      }

      setPending(false)
      return
    }

    if (!data) {
      setFormError("Something went wrong. Please try again.")
      setPending(false)
      return
    }

    // better-auth set the session cookie.
    router.push(POST_SIGN_IN_REDIRECT)
    router.refresh()
  }

  async function handleGoogleSignIn() {
    setFormError(null)
    setFieldErrors({})

    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: POST_SIGN_IN_REDIRECT,
    })

    if (error) {
      setFormError(mapAuthError(error.code, error.message).message)
    }
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

        {formError ? (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-[#f87171]/30 bg-[#f87171]/10 px-4 py-3 font-display text-[13px] text-[#fca5a5]"
          >
            {formError}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-7">
          <FieldGroup className="gap-5">
            <AuthTextField
              id="sign-in-email"
              name="email"
              type="email"
              label="Email"
              placeholder="you@example.com"
              autoComplete="email"
              error={fieldErrors.email}
            />

            <div className="flex flex-col gap-2">
              <AuthPasswordField
                id="sign-in-password"
                name="password"
                label="Password"
                placeholder="Enter your password"
                autoComplete="current-password"
                error={fieldErrors.password}
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
              disabled={pending}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-[#635ff4] font-display text-[14px] font-medium text-white transition-colors outline-none hover:bg-[#5a55ee] focus-visible:ring-3 focus-visible:ring-[#635ff4]/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Signing in..." : "Sign In"}
            </button>

            <div className="flex items-center gap-4">
              <span aria-hidden="true" className="h-px flex-1 bg-white/12" />
              <span className="font-display text-[12px] tracking-[0.12em] text-white/40 uppercase">
                or continue with
              </span>
              <span aria-hidden="true" className="h-px flex-1 bg-white/12" />
            </div>

            <GoogleButton onClick={handleGoogleSignIn} />
          </FieldGroup>
        </form>
      </div>
    </div>
  )
}
