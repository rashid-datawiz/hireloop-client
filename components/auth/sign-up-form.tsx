"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { AuthModeToggle } from "@/components/auth/auth-mode-toggle"
import { AuthPasswordField } from "@/components/auth/auth-password-field"
import { AuthRoleField } from "@/components/auth/auth-role-field"
import { AuthTextField } from "@/components/auth/auth-text-field"
import { GoogleButton } from "@/components/auth/google-button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup } from "@/components/ui/field"
import { authClient } from "@/lib/auth-client"
import {
  collectSignUpFormData,
  mapAuthError,
  type AuthField,
} from "@/lib/auth-form-data"
import { isUserRole } from "@/lib/auth-roles"

/** Where to send a newly registered user once their account is created. */
const POST_SIGN_UP_REDIRECT = "/"

/** better-auth enforces a minimum password length of 8 by default. */
const MIN_PASSWORD_LENGTH = 8

export function SignUpForm() {
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
    const values = collectSignUpFormData(formData)

    // Validate locally first so obvious mistakes don't cost a round trip.
    const nextErrors: Partial<Record<AuthField, string>> = {}

    if (!values.name) {
      nextErrors.name = "Enter your name."
    }

    if (!values.email) {
      nextErrors.email = "Enter your email address."
    }

    if (values.password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`
    }

    // `null` until the picked role is known to be one better-auth accepts.
    const role = isUserRole(values.role) ? values.role : null

    if (!role) {
      nextErrors.role =
        "Choose whether you're joining as a seeker, recruiter, or admin."
    }

    if (!values.terms) {
      nextErrors.terms = "You must accept the Terms of Service to continue."
    }

    if (role === null || Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    setFieldErrors({})
    setPending(true)

    const { data, error } = await authClient.signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
      role,
      callbackURL: POST_SIGN_UP_REDIRECT,
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

    // The account was created and better-auth set the session cookie.
    router.push(POST_SIGN_UP_REDIRECT)
    router.refresh()
  }

  async function handleGoogleSignUp() {
    setFormError(null)
    setFieldErrors({})

    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: POST_SIGN_UP_REDIRECT,
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
            Create your account
          </h1>
          <p className="mt-2 font-display text-[14px] text-white/55">
            Join Hireloop and start finding your next opportunity.
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
              id="sign-up-name"
              name="name"
              label="Full name"
              placeholder="Your name"
              autoComplete="name"
              error={fieldErrors.name}
            />

            <AuthTextField
              id="sign-up-email"
              name="email"
              type="email"
              label="Email"
              placeholder="you@example.com"
              autoComplete="email"
              error={fieldErrors.email}
            />

            <AuthPasswordField
              id="sign-up-password"
              name="password"
              label="Password"
              placeholder="Create a password"
              autoComplete="new-password"
              error={fieldErrors.password}
            />

            <AuthRoleField
              name="role"
              label="I am joining as a"
              error={fieldErrors.role}
            />

            <Field
              orientation="horizontal"
              className="items-start gap-2.5"
              data-invalid={fieldErrors.terms ? true : undefined}
            >
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

            {fieldErrors.terms ? (
              <p className="font-display text-[13px] text-[#f87171]">
                {fieldErrors.terms}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-[#635ff4] font-display text-[14px] font-medium text-white transition-colors outline-none hover:bg-[#5a55ee] focus-visible:ring-3 focus-visible:ring-[#635ff4]/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Creating account..." : "Create Account"}
            </button>

            <div className="flex items-center gap-4">
              <span aria-hidden="true" className="h-px flex-1 bg-white/12" />
              <span className="font-display text-[12px] tracking-[0.12em] text-white/40 uppercase">
                or continue with
              </span>
              <span aria-hidden="true" className="h-px flex-1 bg-white/12" />
            </div>

            <GoogleButton
              label="Sign up with Google"
              onClick={handleGoogleSignUp}
            />
          </FieldGroup>
        </form>
      </div>
    </div>
  )
}
