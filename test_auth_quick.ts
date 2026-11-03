import { describe, it, expect, vi } from "vitest"
import { authClient } from "@/lib/auth-client"

describe("Quick auth test", () => {
  it("test signup flow", async () => {
    const result = await authClient.signUp.email({
      email: `test${Date.now()}@exemplo.com`,
      password: "1234567890a",
      name: "Teste Quick"
    })
    if (result.error) {
      console.log("Signup error:", result.error.status, result.error.message)
    } else {
      console.log("Signup success", result.data)
    }
  })
})
