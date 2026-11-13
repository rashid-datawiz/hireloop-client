import { createAuthClient } from "better-auth/react"
import { inferAdditionalFields } from "better-auth/client/plugins"
// Type-only import: the server module must never end up in the browser bundle.
import type { auth } from "@/lib/auth"

export const authClient = createAuthClient({
  /**
   * The browser must talk to the same origin that serves `/api/auth`, so the
   * base URL has to be a public env var. `NEXT_PUBLIC_BETTER_AUTH_URL` is
   * inlined into the client bundle, while `BETTER_AUTH_URL` is only available
   * on the server. When neither is set, better-auth falls back to the current
   * origin, which is correct for local development and same-origin deploys.
   */
  baseURL:
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? process.env.BETTER_AUTH_URL,
  /**
   * Teaches the client about the additional user fields (currently `role`) so
   * they can be sent to better-auth with type checking.
   */
  plugins: [inferAdditionalFields<typeof auth>()],
})

export const { signIn, signUp, useSession } = authClient
