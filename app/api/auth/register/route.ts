import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name, department } = body

    // Validasi input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, dan nama harus diisi" },
        { status: 400 }
      )
    }

    // Cek apakah email sudah terdaftar
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Email sudah terdaftar" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Buat user baru
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        department,
        role: "STAFF", // Default role untuk user baru
      },
    })

    // Return user tanpa password
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json(userWithoutPassword, { status: 201 })
  } catch (error) {
    console.error("Error during registration:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}