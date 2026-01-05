import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// GET - Get all users
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      include: {
        supervisor: {
          select: {
            id: true,
            name: true,
            role: true,
            position: true,
          },
        },
        _count: {
          select: {
            splRequests: true,
            subordinates: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Remove passwords from response
    const usersWithoutPasswords = users.map(({ password, ...user }) => user)

    return NextResponse.json(usersWithoutPasswords)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

// POST - Create new user
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await req.json()
    const { email, password, name, pin, role, department, position, supervisorId } = body

    // Validation
    if (!email || !password || !name || !pin || !role) {
      return NextResponse.json(
        { error: "Email, password, name, pin, dan role wajib diisi" },
        { status: 400 }
      )
    }

    // Check if email already exists
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

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        pin,
        role,
        department,
        position,
        supervisorId: supervisorId || null,
      },
      include: {
        supervisor: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json(userWithoutPassword, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
