import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import { Toaster } from "react-hot-toast"
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Aplikasi SPL - Sistem Pengajuan Surat Perintah Lembur",
  description: "Aplikasi untuk mengelola pengajuan surat perintah lembur",
  manifest: "/manifest.json",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3B82F6" />
      </head>
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