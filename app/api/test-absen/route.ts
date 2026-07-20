import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const baseUrl = process.env.ABSEN_API_URL
    const token = process.env.ABSEN_API_TOKEN
    const pin = "220"

    if (!baseUrl || !token) {
      return NextResponse.json({ error: "No env vars" })
    }

    const rawUrl = `${baseUrl}?pin=${pin}`
    const url = rawUrl.replace(/^http:\/\//i, 'https://')

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    const text = await response.text()
    
    return NextResponse.json({
      success: true,
      urlUsed: url,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: text.substring(0, 500)
    })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      errorMsg: err.message,
      errorStack: err.stack
    })
  }
}
