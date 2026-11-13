import { betterAuth } from "better-auth"
import { APIError } from "better-auth/api"
import { MongoClient } from "mongodb"
import { mongodbAdapter } from "@better-auth/mongo-adapter"

import { isUserRole, USER_ROLES } from "@/lib/auth-roles"

// The client is lazy — it does not connect until the first operation, so this
// is safe to evaluate at build time even without a reachable database.
const client = new MongoClient(
  process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017"
)
const db = client.db("hireloopdb")

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: [...USER_ROLES],
        // The sign-up form lets people pick the role they are signing up for.
        input: true,
        defaultValue: "seeker",
        transform: {
          // `type` only drives typing and SQL enum columns, so the value that
          // arrives over the wire is validated here instead.
          input: (value) => {
            if (!isUserRole(value)) {
              throw APIError.from("BAD_REQUEST", {
                code: "INVALID_ROLE",
                message: "Choose a valid account type.",
              })
            }

            return value
          },
        },
      },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  database: mongodbAdapter(db, {
    client,
  }),
})
