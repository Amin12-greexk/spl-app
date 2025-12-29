import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { getSupervisorForDepartment } from "@/lib/supervisor-mapping"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name, department, pin } = body

    // Validasi input
    if (!email || !password || !name || !pin) {
      return NextResponse.json(
        { error: "Email, password, nama, dan pin harus diisi" },
        { status: 400 }
      )
    }

    // Validasi pin sederhana: minimal 4 karakter agar tidak kosong
    if (typeof pin !== "string" || pin.trim().length < 4) {
      return NextResponse.json(
        { error: "Pin harus berisi minimal 4 karakter" },
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

    // 🆕 AUTO-ASSIGN SUPERVISOR berdasarkan department
    const supervisor = await getSupervisorForDepartment(department)

    // Set position based on department (optional, can be customized)
    let position = null
    if (department) {
      const deptLower = department.toLowerCase()
      if (deptLower.includes("security") || deptLower.includes("satpam")) {
        position = "Security Staff"
      } else if (deptLower.includes("it")) {
        position = "IT Staff"
      } else if (deptLower.includes("cleaning")) {
        position = "Cleaning Service"
      } else {
        position = `${department} Staff`
      }
    }

    // Buat user baru dengan supervisor (jika ada)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        pin: pin.trim(),
        department,
        position,
        role: "STAFF", // Default role untuk user baru
        supervisorId: supervisor?.id || null, // 🆕 Auto-assign supervisor
      },
      include: {
        supervisor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            position: true,
          },
        },
      },
    })

    // Return user tanpa password
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      ...userWithoutPassword,
      message: supervisor
        ? `Registrasi berhasil! Atasan Anda: ${supervisor.name} (${supervisor.position || supervisor.role})`
        : "Registrasi berhasil! SPL Anda akan langsung diajukan ke Manager."
    }, { status: 201 })
  } catch (error) {
    console.error("Error during registration:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
