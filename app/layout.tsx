import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import { Toaster } from "react-hot-toast"
import dynamic from "next/dynamic"

const ServiceWorkerRegistration = dynamic(() => import("@/components/ServiceWorkerRegistration"), { ssr: false })

const inter = Inter({ subsets: ["latin"], display: "swap" })

export const metadata = {
  title: "Aplikasi SPL - Sistem Pengajuan Surat Perintah Lembur",
  description: "Aplikasi untuk mengelola pengajuan surat perintah lembur",
  manifest: "/manifest.json",
}

export const viewport = {
  themeColor: "#3B82F6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <link rel="manifest" href="/manifest.json" />
      <body className={inter.className}>
        <Providers>
          <ServiceWorkerRegistration />
          {children}
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  )
}