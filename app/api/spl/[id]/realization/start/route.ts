import { NextRequest, NextResponse } from "next/server"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json(
    { error: "Realisasi sekarang diinput manual. Gunakan menu Input Realisasi." },
    { status: 400 }
  )
}
