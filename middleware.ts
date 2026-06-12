import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const isSignIn = url.pathname === "/signin"
  const isProtected =
    url.pathname.startsWith("/budget") ||
    url.pathname.startsWith("/diary") ||
    url.pathname.startsWith("/workout") ||
    url.pathname === "/"

  // 비로그인 → 보호 경로 접근 시 /signin 리다이렉트
  if (!user && isProtected) {
    url.pathname = "/signin"
    url.searchParams.set(
      "next",
      request.nextUrl.pathname + request.nextUrl.search
    )
    return NextResponse.redirect(url)
  }

  // 로그인 → /signin 접근 시 /diary로
  if (user && isSignIn) {
    url.pathname = "/diary"
    url.searchParams.delete("next")
    url.searchParams.delete("error")
    return NextResponse.redirect(url)
  }

  // user 이메일을 헤더로 전달 → layout에서 재호출 불필요
  supabaseResponse.headers.set("x-user-email", user?.email ?? "")

  return supabaseResponse
}

export const config = {
  matcher: ["/", "/budget/:path*", "/diary/:path*", "/workout/:path*", "/signin"],
}
