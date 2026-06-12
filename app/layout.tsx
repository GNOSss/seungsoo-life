import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { GlobalHeader } from "@/components/common/GlobalHeader"
import { Toaster } from "@/components/ui/sonner"
import { headers } from "next/headers"
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
  // middleware가 x-user-email 헤더로 user 정보 전달 — DB 재호출 불필요
  const headersList = await headers()
  const email = headersList.get("x-user-email") ?? ""

  return (
    <html lang="ko">
      <body className={inter.className}>
        <GlobalHeader user={email ? { email } : null} />
        <main>{children}</main>
        <Toaster />
      </body>
    </html>
  )
}
