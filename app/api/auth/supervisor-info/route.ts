import { NextRequest, NextResponse } from "next/server"
import { getSupervisorForDepartment, hasSupervisorMapping } from "@/lib/supervisor-mapping"

/**
 * GET /api/auth/supervisor-info?department=Security
 * Get supervisor information for a department
 * Used for preview in registration form
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const department = searchParams.get("department")

    if (!department) {
      return NextResponse.json(
        { error: "Parameter 'department' diperlukan" },
        { status: 400 }
      )
    }

    // Special handling for Produksi (PRODUCTION_SUPERVISOR) - no supervisor, direct to Manager
    if (department.toLowerCase().includes("produksi")) {
      return NextResponse.json({
        hasSupervisor: false,
        message: "Sebagai Pengawas Produksi, SPL Anda akan langsung diajukan ke Manager",
        approvalFlow: ["Pengawas Produksi (Anda)", "Manager", "Approved"],
      })
    }

    // Check if department has supervisor mapping
    const hasMapping = await hasSupervisorMapping(department)

    if (!hasMapping) {
      return NextResponse.json({
        hasSupervisor: false,
        message: "SPL Anda akan langsung diajukan ke Manager",
        approvalFlow: ["Staff (Anda)", "Manager", "Approved"],
      })
    }

    // Get supervisor for department
    const supervisor = await getSupervisorForDepartment(department)

    if (!supervisor) {
      return NextResponse.json({
        hasSupervisor: false,
        message: `Supervisor untuk department ${department} belum tersedia. SPL akan langsung ke Manager.`,
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
        department: supervisor.department,
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
