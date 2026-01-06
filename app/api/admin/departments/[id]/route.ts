import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PUT - Update department (Super Admin)
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
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const supervised =
      typeof body.supervised === "boolean"
        ? body.supervised
        : String(body.supervised).toLowerCase() === "true"
    const approvalModeInput = typeof body.approvalMode === "string" ? body.approvalMode : null
    const approvalMode =
      supervised && approvalModeInput && ["GA", "DEPARTMENT_HEAD", "DIRECT"].includes(approvalModeInput)
        ? approvalModeInput
        : supervised
        ? "DEPARTMENT_HEAD"
        : "DIRECT"

    if (!name) {
      return NextResponse.json({ error: "Nama departemen wajib diisi" }, { status: 400 })
    }

    const existing = await prisma.department.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Departemen tidak ditemukan" }, { status: 404 })
    }

    if (existing.name.toLowerCase() !== name.toLowerCase()) {
      const nameTaken = await prisma.department.findFirst({
        where: {
          name: {
            equals: name,
            mode: "insensitive",
          },
        },
        select: { id: true },
      })

      if (nameTaken) {
        return NextResponse.json({ error: "Nama departemen sudah digunakan" }, { status: 400 })
      }
    }

    const department = await prisma.department.update({
      where: { id: params.id },
      data: {
        name,
        supervised,
        approvalMode,
      },
    })

    if (existing.name.toLowerCase() !== name.toLowerCase()) {
      await prisma.user.updateMany({
        where: {
          departmentName: {
            equals: existing.name,
            mode: "insensitive",
          },
        },
        data: {
          departmentName: name,
        },
      })
    }

    return NextResponse.json(department)
  } catch (error) {
    console.error("Error updating department:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

// DELETE - Delete department (Super Admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const department = await prisma.department.findUnique({
      where: { id: params.id },
      select: { id: true, name: true },
    })

    if (!department) {
      return NextResponse.json({ error: "Departemen tidak ditemukan" }, { status: 404 })
    }

    const userCount = await prisma.user.count({
      where: {
        departmentName: {
          equals: department.name,
          mode: "insensitive",
        },
      },
    })

    if (userCount > 0) {
      return NextResponse.json(
        { error: `Tidak bisa menghapus departemen yang masih dipakai ${userCount} user` },
        { status: 400 }
      )
    }

    await prisma.department.delete({
      where: { id: department.id },
    })

    return NextResponse.json({ message: "Departemen berhasil dihapus" })
  } catch (error) {
    console.error("Error deleting department:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
