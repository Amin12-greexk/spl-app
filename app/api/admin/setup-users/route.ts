import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

/**
 * POST /api/admin/setup-users
 * Setup user GA, Department Heads, dan supervisor relationships
 * Hanya bisa diakses oleh MANAGER atau HR
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only MANAGER or HR can setup users
    if (!["MANAGER", "HR"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Hanya Manager atau HR yang dapat setup users" },
        { status: 403 }
      )
    }

    const hashedPassword = await bcrypt.hash("password123", 10)
    const results: any = {
      created: [],
      updated: [],
      errors: [],
    }
    const departments = await prisma.department.findMany({
      select: { id: true, name: true },
    })
    const departmentIdByName = new Map(
      departments.map((dept) => [dept.name, dept.id])
    )
    const getDepartmentId = (name: string) => departmentIdByName.get(name) || null

    // 1. Create/Update GA User
    try {
      const gaUser = await prisma.user.upsert({
        where: { email: "ga@tunasestaindonesia.com" },
        update: {
          role: "GA",
          departmentName: "General Affair",
          departmentId: getDepartmentId("General Affair"),
          position: "GA Supervisor",
          supervisorId: null,
        },
        create: {
          email: "ga@tunasestaindonesia.com",
          name: "General Affair Supervisor",
          password: hashedPassword,
          pin: "8888",
          role: "GA",
          departmentName: "General Affair",
          departmentId: getDepartmentId("General Affair"),
          position: "GA Supervisor",
          supervisorId: null,
        },
      })
      results.created.push({ type: "GA", email: gaUser.email, name: gaUser.name })

      // 2. Create Security Staff with GA as supervisor
      const security1 = await prisma.user.upsert({
        where: { email: "security1@tunasestaindonesia.com" },
        update: {
          supervisorId: gaUser.id,
          position: "Security",
          departmentName: "Security",
          departmentId: getDepartmentId("Security"),
        },
        create: {
          email: "security1@tunasestaindonesia.com",
          name: "Security Staff 1",
          password: hashedPassword,
          pin: "1001",
          role: "STAFF",
          departmentName: "Security",
          departmentId: getDepartmentId("Security"),
          position: "Security",
          supervisorId: gaUser.id,
        },
      })
      results.created.push({ type: "Security", email: security1.email, supervisor: gaUser.name })

      const security2 = await prisma.user.upsert({
        where: { email: "security2@tunasestaindonesia.com" },
        update: {
          supervisorId: gaUser.id,
          position: "Security",
          departmentName: "Security",
          departmentId: getDepartmentId("Security"),
        },
        create: {
          email: "security2@tunasestaindonesia.com",
          name: "Security Staff 2",
          password: hashedPassword,
          pin: "1002",
          role: "STAFF",
          departmentName: "Security",
          departmentId: getDepartmentId("Security"),
          position: "Security",
          supervisorId: gaUser.id,
        },
      })
      results.created.push({ type: "Security", email: security2.email, supervisor: gaUser.name })
    } catch (error: any) {
      results.errors.push({ section: "GA & Security", error: error.message })
    }

    // 3. Create/Update IT Department Head
    try {
      const itHead = await prisma.user.upsert({
        where: { email: "it.head@tunasestaindonesia.com" },
        update: {
          role: "DEPARTMENT_HEAD",
          departmentName: "IT",
          departmentId: getDepartmentId("IT"),
          position: "IT Manager",
          supervisorId: null,
        },
        create: {
          email: "it.head@tunasestaindonesia.com",
          name: "Kepala IT",
          password: hashedPassword,
          pin: "9999",
          role: "DEPARTMENT_HEAD",
          departmentName: "IT",
          departmentId: getDepartmentId("IT"),
          position: "IT Manager",
          supervisorId: null,
        },
      })
      results.created.push({ type: "Department Head", email: itHead.email, name: itHead.name })

      // 4. Update existing IT staff
      const itStaff = await prisma.user.findMany({
        where: {
          departmentName: "IT",
          role: "STAFF",
        },
      })

      for (const staff of itStaff) {
        await prisma.user.update({
          where: { id: staff.id },
          data: {
            supervisorId: itHead.id,
            position: staff.position || "IT Staff",
          },
        })
        results.updated.push({
          type: "IT Staff",
          email: staff.email,
          supervisor: itHead.name,
        })
      }
    } catch (error: any) {
      results.errors.push({ section: "IT Department", error: error.message })
    }

    // 5. Get organization structure
    const orgStructure = await prisma.user.findMany({
      where: {
        role: { in: ["GA", "DEPARTMENT_HEAD"] },
      },
      include: {
        subordinates: {
          select: {
            id: true,
            name: true,
            email: true,
            position: true,
            departmentId: true,
            departmentName: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: "User setup completed",
      results,
      organizationStructure: orgStructure,
      info: {
        defaultPassword: "password123",
        users: {
          ga: "ga@tunasestaindonesia.com",
          itHead: "it.head@tunasestaindonesia.com",
          security1: "security1@tunasestaindonesia.com",
          security2: "security2@tunasestaindonesia.com",
        },
      },
    })
  } catch (error) {
    console.error("Error setting up users:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan saat setup users" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/setup-users
 * View current organization structure
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["MANAGER", "HR"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Hanya Manager atau HR yang dapat melihat struktur organisasi" },
        { status: 403 }
      )
    }

    // Get all supervisors with their subordinates
    const supervisors = await prisma.user.findMany({
      where: {
        role: { in: ["GA", "DEPARTMENT_HEAD", "MANAGER"] },
      },
      include: {
        subordinates: {
          select: {
            id: true,
            name: true,
            email: true,
            pin: true,
            position: true,
            departmentId: true,
            departmentName: true,
            department: { select: { id: true, name: true } },
            role: true,
          },
        },
      },
      orderBy: {
        role: "asc",
      },
    })

    // Get staff without supervisors
    const staffWithoutSupervisor = await prisma.user.findMany({
      where: {
        role: "STAFF",
        supervisorId: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        pin: true,
        position: true,
        departmentId: true,
        departmentName: true,
        department: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      supervisors,
      staffWithoutSupervisor,
      summary: {
        totalSupervisors: supervisors.length,
        totalStaffWithSupervisor: supervisors.reduce(
          (sum, sup) => sum + sup.subordinates.length,
          0
        ),
        totalStaffWithoutSupervisor: staffWithoutSupervisor.length,
      },
    })
  } catch (error) {
    console.error("Error getting organization structure:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil struktur organisasi" },
      { status: 500 }
    )
  }
}
