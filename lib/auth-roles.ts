/**
 * The account types a Hireloop user can register with.
 *
 * The values are stored on the user record in the `role` additional field
 * configured on the better-auth user model (see `lib/auth.ts`).
 */
export const USER_ROLES = ["seeker", "recruiter", "admin"] as const

export type UserRole = (typeof USER_ROLES)[number]

export type UserRoleOption = {
  value: UserRole
  label: string
  description: string
}

/** The roles offered on the sign-up form. */
export const USER_ROLE_OPTIONS: readonly UserRoleOption[] = [
  {
    value: "seeker",
    label: "Job seeker",
    description: "Find roles, apply, and track your applications.",
  },
  {
    value: "recruiter",
    label: "Recruiter",
    description: "Post openings and hire candidates.",
  },
  {
    value: "admin",
    label: "Admin",
    description: "Manage users, jobs, and the platform.",
  },
]

/** Narrows an arbitrary form value to a known role. */
export function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === "string" &&
    (USER_ROLES as readonly string[]).includes(value)
  )
}
