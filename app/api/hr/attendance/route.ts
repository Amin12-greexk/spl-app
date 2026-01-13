import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const getApiConfig = () => {
  const baseUrl = process.env.ABSEN_API_URL
  const token = process.env.ABSEN_API_TOKEN
  return { baseUrl, token }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !["HR", "MANAGER"].includes(session.user.role)) {
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

    const url = `${baseUrl}?pin=${encodeURIComponent(pin)}`
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: "Gagal mengambil data absensi", detail: errorText },
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
