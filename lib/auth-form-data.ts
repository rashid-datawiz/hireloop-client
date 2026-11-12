/**
 * Helpers for reading auth form values out of a submitted form.
 *
 * The forms currently only collect their values — wiring them up to
 * `better-auth` (see `lib/auth-client.ts`) happens in a later step, so the
 * collected payload is returned in a plain, serialisable shape.
 */

export type SignInFormData = {
  email: string
  password: string
  rememberMe: boolean
}

export type SignUpFormData = {
  name: string
  email: string
  password: string
  terms: boolean
}

/**
 * Reads the sign-in form values from a submitted `FormData` object.
 */
export function collectSignInFormData(formData: FormData): SignInFormData {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    rememberMe: formData.get("rememberMe") === "on",
  }
}

/**
 * Reads the sign-up form values from a submitted `FormData` object.
 */
export function collectSignUpFormData(formData: FormData): SignUpFormData {
  return {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    terms: formData.get("terms") === "on",
  }
}
