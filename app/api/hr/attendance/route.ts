import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = "force-dynamic"

const EXTERNAL_ATTENDANCE_TIMEOUT_MS = 15000

const getApiConfig = () => {
  const baseUrl = process.env.ABSEN_API_URL
  const token = process.env.ABSEN_API_TOKEN
  return { baseUrl, token }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !["HR", "MANAGER", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const pin = searchParams.get("pin")?.trim()
    if (!pin) {
      return NextResponse.json({ error: "PIN wajib diisi" }, { status: 400 })
    }

    const { baseUrl, token } = getApiConfig()
    if (!baseUrl || !token) {
      return NextResponse.json(
        { error: "Konfigurasi absensi belum tersedia" },
        { status: 500 }
      )
    }

    const rawUrl = `${baseUrl}?pin=${encodeURIComponent(pin)}`
    const url = rawUrl.replace(/^http:\/\//i, 'https://')
    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(),
      EXTERNAL_ATTENDANCE_TIMEOUT_MS
    )

    let response: Response
    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
        signal: controller.signal,
      })
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return NextResponse.json(
          { error: "Timeout saat mengambil data absensi" },
          { status: 504 }
        )
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { 
          error: "Gagal mengambil data absensi", 
          detail: errorText,
          upstreamStatus: response.status,
          upstreamStatusText: response.statusText,
          requestUrl: url
        },
        { status: 502 }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching attendance:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
