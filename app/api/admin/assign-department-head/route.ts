import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/types";

/**
 * POST /api/admin/assign-department-head
 * Assign atau unassign user sebagai Department Head
 * - Hanya MANAGER atau HR yang bisa akses
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["MANAGER", "HR"].includes(session.user.role as string)) {
      return NextResponse.json(
        { error: "Unauthorized. Only Manager/HR can assign department heads." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userId, action } = body; // action: 'assign' | 'unassign'

    if (!userId || !action) {
      return NextResponse.json(
        { error: "userId and action are required" },
        { status: 400 }
      );
    }

    // Validasi action
    if (!["assign", "unassign"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'assign' or 'unassign'" },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
        departmentName: true,
        department: { select: { id: true, name: true } },
        position: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Update role based on action
    const newRole: Role = action === "assign" ? "DEPARTMENT_HEAD" : "STAFF";

    // Validasi: hanya bisa assign STAFF ke DEPARTMENT_HEAD atau sebaliknya
    if (action === "assign" && user.role !== "STAFF") {
      return NextResponse.json(
        { error: "Only STAFF can be assigned as Department Head" },
        { status: 400 }
      );
    }

    if (action === "unassign" && user.role !== "DEPARTMENT_HEAD") {
      return NextResponse.json(
        { error: "User is not a Department Head" },
        { status: 400 }
      );
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role: newRole,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
        departmentName: true,
        department: { select: { id: true, name: true } },
        position: true,
      },
    });

    return NextResponse.json({
      message: action === "assign"
        ? `${user.name} has been assigned as Department Head`
        : `${user.name} has been unassigned from Department Head`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error assigning department head:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/assign-department-head
 * Get list of staff yang bisa di-assign sebagai department head
 * - Hanya MANAGER atau HR yang bisa akses
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["MANAGER", "HR"].includes(session.user.role as string)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Get all staff and department heads
    // EXCLUDE Security department karena Security masuk ke GA
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ["STAFF", "DEPARTMENT_HEAD"],
        },
        OR: [
          { department: { name: { not: "Security" } } },
          { departmentName: { not: "Security" } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
        departmentName: true,
        department: { select: { id: true, name: true } },
        position: true,
        pin: true,
      },
      orderBy: [
        { departmentName: "asc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
