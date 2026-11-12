/**
 * Helpers for reading auth form values out of a submitted form and mapping
 * better-auth errors onto the fields they belong to.
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

export type AuthField = "name" | "email" | "password" | "terms"

export type AuthError = {
  /** Human readable message to show the user. */
  message: string
  /** The field the error belongs to, when it can be attributed to one. */
  field?: AuthField
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

/**
 * Maps a better-auth error code onto a message and, where possible, the field
 * that caused it. better-auth returns `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`
 * for a duplicate sign-up, `INVALID_EMAIL_OR_PASSWORD` for a failed sign-in,
 * and `PASSWORD_TOO_SHORT` / `PASSWORD_TOO_LONG` for passwords outside the
 * allowed length.
 */
export function mapAuthError(
  code: string | undefined,
  fallbackMessage?: string
): AuthError {
  switch (code) {
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return {
        field: "email",
        message: "An account with this email already exists.",
      }
    case "INVALID_EMAIL":
      return { field: "email", message: "Enter a valid email address." }
    case "INVALID_EMAIL_OR_PASSWORD":
      return {
        message: "That email and password combination is incorrect.",
      }
    case "INVALID_PASSWORD":
      return { field: "password", message: "Invalid password." }
    case "PASSWORD_TOO_SHORT":
      return {
        field: "password",
        message: "Password must be at least 8 characters long.",
      }
    case "PASSWORD_TOO_LONG":
      return {
        field: "password",
        message: "Password must be 128 characters or fewer.",
      }
    case "USER_NOT_FOUND":
      return {
        message: "No account was found with that email address.",
      }
    case "FAILED_TO_CREATE_USER":
      return { message: "We couldn't create your account. Please try again." }
    case "FAILED_TO_CREATE_SESSION":
    case "FAILED_TO_GET_SESSION":
      return { message: "We couldn't sign you in. Please try again." }
    case "TOO_MANY_REQUESTS":
      return { message: "Too many attempts. Please wait a moment and retry." }
    default:
      return {
        message:
          fallbackMessage?.trim() || "Something went wrong. Please try again.",
      }
  }
}
