import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { GlobalHeader } from "@/components/common/GlobalHeader"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "승수 라이프",
  description: "일상의 반복 작업을 모두 하나의 통합 PWA로",
  manifest: "/manifest.json",
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <GlobalHeader />
        <main>{children}</main>
      </body>
    </html>
  )
}
