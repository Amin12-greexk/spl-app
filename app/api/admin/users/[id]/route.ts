import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// GET - Get single user
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            supervised: true,
            approvalMode: true,
          },
        },
        supervisor: {
          select: {
            id: true,
            name: true,
            role: true,
            position: true,
          },
        },
        subordinates: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            splRequests: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 })
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user

    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

// PUT - Update user
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await req.json()
    const { email, password, name, pin, role, departmentId, departmentName, department, position, supervisorId } = body

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    })

    if (!existingUser) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 })
    }

    // Check if email is taken by another user
    if (email && email !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email },
      })

      if (emailTaken) {
        return NextResponse.json(
          { error: "Email sudah digunakan oleh user lain" },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const departmentRecord = departmentId
      ? await prisma.department.findUnique({
          where: { id: departmentId },
          select: { id: true, name: true },
        })
      : typeof departmentName === "string" || typeof department === "string"
      ? await prisma.department.findFirst({
          where: {
            name: {
              equals: (departmentName || department || "").toString().trim(),
              mode: "insensitive",
            },
          },
          select: { id: true, name: true },
        })
      : null

    if (departmentId && !departmentRecord) {
      return NextResponse.json(
        { error: "Departemen tidak ditemukan" },
        { status: 400 }
      )
    }

    const resolvedDepartmentName = departmentRecord?.name || departmentName || department || null

    const updateData: any = {
      email,
      name,
      pin,
      role,
      departmentId: departmentRecord?.id || null,
      departmentName: resolvedDepartmentName,
      position,
      supervisorId: supervisorId || null,
    }

    // Hash password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

// DELETE - Delete user
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            subordinates: true,
            splRequests: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 })
    }

    // Prevent deleting user with supervised users
    if (user._count.subordinates > 0) {
      return NextResponse.json(
        { error: `Tidak bisa menghapus user yang masih menjadi supervisor untuk ${user._count.subordinates} user lain` },
        { status: 400 }
      )
    }

    // Delete user
    await prisma.user.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: "User berhasil dihapus" })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
