import { NextRequest, NextResponse } from "next/server";
import { verifyMobileToken } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid Bearer token" }, { status: 401 });
    }

    const token = authHeader.slice("Bearer ".length).trim();
    const decoded = await verifyMobileToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Tampilkan data SPL berdasarkan user yang login
    const spls = await prisma.spl.findMany({
      where: {
        requesterId: user.id
      },
      orderBy: [
        { date: "desc" },
        { createdAt: "desc" }
      ],
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        totalHours: true,
        reason: true,
        status: true,
        isManualEntry: true,
        actualStartAt: true,
        actualEndAt: true,
        actualTotalHours: true,
        projectName: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      success: true,
      data: spls
    });
  } catch (error) {
    console.error("Error in /api/mobile/spl GET:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
