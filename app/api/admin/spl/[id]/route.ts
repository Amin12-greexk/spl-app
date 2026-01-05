import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// DELETE - Delete SPL (by Super Admin)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Check if SPL exists
    const spl = await prisma.spl.findUnique({
      where: { id: params.id },
      include: {
        requester: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    if (!spl) {
      return NextResponse.json({ error: "SPL tidak ditemukan" }, { status: 404 })
    }

    // Delete SPL
    await prisma.spl.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      message: "SPL berhasil dihapus",
      deleted: {
        id: spl.id,
        requester: spl.requester.name,
        date: spl.date,
      },
    })
  } catch (error) {
    console.error("Error deleting SPL:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
