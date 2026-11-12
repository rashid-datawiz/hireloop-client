import { authClient } from "@/lib/auth-client"

/** Where to send a user after signing out. */
export const POST_SIGN_OUT_REDIRECT = "/"

/**
 * Signs the current user out by calling better-auth's sign-out endpoint,
 * which clears the session cookie. Returns `true` when the sign-out
 * succeeded.
 */
export async function signOut(): Promise<boolean> {
  const { error } = await authClient.signOut()

  return !error
}
