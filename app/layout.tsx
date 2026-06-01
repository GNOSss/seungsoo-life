import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { GlobalHeader } from "@/components/common/GlobalHeader"
import { Toaster } from "@/components/ui/sonner"
import { createClient } from "@/lib/supabase/server"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "승수 라이프",
  description: "일상의 반복 작업을 모두 하나의 통합 PWA로",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <html lang="ko">
      <body className={inter.className}>
        <GlobalHeader user={user ? { email: user.email ?? "" } : null} />
        <main>{children}</main>
        <Toaster />
      </body>
    </html>
  )
}
