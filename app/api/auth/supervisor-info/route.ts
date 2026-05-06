import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getSupervisorForDepartment, hasSupervisorMapping } from "@/lib/supervisor-mapping"

/**
 * GET /api/auth/supervisor-info?department=Security
 * Get supervisor information for a department
 * Used for preview in registration form
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(req.url)
    const departmentId = searchParams.get("departmentId")
    const departmentName = searchParams.get("department")

    if (!departmentId && !departmentName) {
      return NextResponse.json(
        { error: "Parameter 'departmentId' atau 'department' diperlukan" },
        { status: 400 }
      )
    }

    if (session?.user?.supervisorId) {
      const assignedSupervisor = await prisma.user.findUnique({
        where: { id: session.user.supervisorId },
        select: {
          id: true,
          name: true,
          role: true,
          position: true,
          departmentName: true,
        },
      })

      if (assignedSupervisor) {
        return NextResponse.json({
          hasSupervisor: true,
          supervisor: {
            id: assignedSupervisor.id,
            name: assignedSupervisor.name,
            position: assignedSupervisor.position || assignedSupervisor.role,
            department: assignedSupervisor.departmentName || null,
          },
          message: `Atasan Anda: ${assignedSupervisor.name}`,
          approvalFlow: [
            "Staff (Anda)",
            `${assignedSupervisor.position || assignedSupervisor.role} (${assignedSupervisor.name})`,
            "Manager",
            "Approved",
          ],
        })
      }
    }

    // Check if department has supervisor mapping
    const hasMapping = await hasSupervisorMapping({ departmentId, departmentName })

    if (!hasMapping) {
      return NextResponse.json({
        hasSupervisor: false,
        message: "SPL Anda akan langsung diajukan ke Manager",
        approvalFlow: ["Staff (Anda)", "Manager", "Approved"],
      })
    }

    // Get supervisor for department
    const supervisor = await getSupervisorForDepartment({ departmentId, departmentName })

    if (!supervisor) {
      const departmentLabel = departmentName || "departemen ini"
      return NextResponse.json({
        hasSupervisor: false,
        message: `Supervisor untuk department ${departmentLabel} belum tersedia. SPL akan langsung ke Manager.`,
        warning: "Hubungi HR untuk setup supervisor department Anda.",
        approvalFlow: ["Staff (Anda)", "Manager", "Approved"],
      })
    }

    return NextResponse.json({
      hasSupervisor: true,
      supervisor: {
        id: supervisor.id,
        name: supervisor.name,
        position: supervisor.position || supervisor.role,
        department: supervisor.departmentName || null,
      },
      message: `Atasan Anda: ${supervisor.name}`,
      approvalFlow: [
        "Staff (Anda)",
        `${supervisor.position || supervisor.role} (${supervisor.name})`,
        "Manager",
        "Approved",
      ],
    })
  } catch (error) {
    console.error("Error getting supervisor info:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil info supervisor" },
      { status: 500 }
    )
  }
}
