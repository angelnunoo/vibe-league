import { type EmailOtpType } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const tokenHash = url.searchParams.get("token_hash")
  const type = url.searchParams.get("type") as EmailOtpType | null
  const next = url.searchParams.get("next") ?? "/home"
  const redirectTo = new URL(next, url.origin)

  if (tokenHash && type && isSupabaseConfigured()) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(redirectTo)
  }

  redirectTo.pathname = "/"
  redirectTo.searchParams.set("error", "confirm")
  return NextResponse.redirect(redirectTo)
}
