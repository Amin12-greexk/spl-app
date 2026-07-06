import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { signMobileToken } from "@/lib/mobile-auth"

/**
 * POST /api/mobile/auth/login
 *
 * Dedicated login endpoint for the verifikasi_mobile app (Flutter). The web
 * dashboard keeps using NextAuth's cookie-based session unchanged — this
 * exists purely so a plain HTTP client (no cookie jar) can authenticate and
 * get a portable Bearer token instead. See lib/mobile-auth.ts and
 * lib/api-auth.ts for how the token is verified on subsequent requests.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const email = body?.email?.toString().trim().toLowerCase()
    const password = body?.password?.toString()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json(
        { error: "Email atau password salah" },
        { status: 401 }
      )
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return NextResponse.json(
        { error: "Email atau password salah" },
        { status: 401 }
      )
    }

    const token = await signMobileToken({
      sub: user.id,
      role: user.role,
      departmentName: user.departmentName,
    })

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentName: user.departmentName,
        position: user.position,
        pin: user.pin,
      },
    })
  } catch (error) {
    console.error("Mobile login error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
