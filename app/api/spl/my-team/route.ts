import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only GA, DEPARTMENT_HEAD, MANAGER, or SUPER_ADMIN can view team SPLs
    if (!["GA", "DEPARTMENT_HEAD", "MANAGER", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Hanya GA, Kepala Departemen, Manager, atau Super Admin yang dapat melihat SPL tim" },
        { status: 403 }
      )
    }

    const isSuperAdmin = session.user.role === "SUPER_ADMIN"

    // Get all SPLs from subordinates (users who have this user as supervisor)
    const andFilters: any[] = [
      {
        NOT: {
          OR: [
            { isManualEntry: true, requesterSignedAt: null },
            { source: "LEGACY", requesterSignedAt: null },
          ],
        },
      },
    ]

    if (session.user.role === "MANAGER") {
      andFilters.push({
        NOT: { AND: [{ status: "PENDING_MANAGER" }, { actualEndAt: null }] },
      })
    }

    const { searchParams } = new URL(req.url)
    const statusParam = searchParams.get("status")
    const search = searchParams.get("search")?.trim()
    const lite =
      searchParams.get("lite") === "1" ||
      searchParams.get("lite") === "true"
    const skipCount =
      searchParams.get("skipCount") === "1" ||
      searchParams.get("skipCount") === "true"
    const pageParam = Number(searchParams.get("page"))
    const limitParam = Number(searchParams.get("limit"))
    const usePagination =
      Number.isFinite(pageParam) &&
      pageParam > 0 &&
      Number.isFinite(limitParam) &&
      limitParam > 0

    const where: any = isSuperAdmin
      ? {
          AND: [...andFilters],
        }
      : {
          OR: [
            { supervisorId: session.user.id },
            { supervisorId: null, requester: { supervisorId: session.user.id } },
          ],
          AND: [...andFilters],
        }

    if (statusParam) {
      const statusList = statusParam
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
      if (statusList.length === 1) {
        where.status = statusList[0]
      } else if (statusList.length > 1) {
        where.status = { in: statusList }
      }
    }

    if (search) {
      where.AND.push({
        OR: [
          { reason: { contains: search, mode: "insensitive" } },
          { requester: { name: { contains: search, mode: "insensitive" } } },
          { requester: { email: { contains: search, mode: "insensitive" } } },
        ],
      })
    }

    const includeConfig = {
      requester: {
        select: {
          id: true,
          name: true,
          email: true,
          pin: true,
          departmentId: true,
          departmentName: true,
          department: { select: { id: true, name: true } },
          position: true,
        },
      },
      supervisor: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
      approver: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    }

    const liteSelect = {
      id: true,
      requesterId: true,
      date: true,
      startTime: true,
      endTime: true,
      totalHours: true,
      reason: true,
      projectName: true,
      actualStartAt: true,
      actualEndAt: true,
      actualTotalHours: true,
      realizationNote: true,
      overrunReason: true,
      regularStartAt: true,
      regularEndAt: true,
      plannedStartAt: true,
      plannedEndAt: true,
      realizedMinutes: true,
      realizationCounted: true,
      status: true,
      source: true,
      isManualEntry: true,
      requesterSignedAt: true,
      supervisorId: true,
      supervisorApprovalDate: true,
      supervisorRejectionReason: true,
      approverId: true,
      approvalDate: true,
      rejectionReason: true,
      createdAt: true,
      updatedAt: true,
      requester: includeConfig.requester,
      supervisor: includeConfig.supervisor,
      approver: includeConfig.approver,
    }

    if (!usePagination) {
      const spls = lite
        ? await prisma.spl.findMany({
            where,
            select: liteSelect,
            orderBy: {
              createdAt: "desc",
            },
          })
        : await prisma.spl.findMany({
            where,
            include: includeConfig,
            orderBy: {
              createdAt: "desc",
            },
          })
      return NextResponse.json(spls)
    }

    const limit = Math.min(Math.floor(limitParam), 50)
    const page = Math.floor(pageParam)
    const skip = (page - 1) * limit

    if (skipCount) {
      const rows = lite
        ? await prisma.spl.findMany({
            where,
            select: liteSelect,
            orderBy: { createdAt: "desc" },
            take: limit + 1,
            skip,
          })
        : await prisma.spl.findMany({
            where,
            include: includeConfig,
            orderBy: { createdAt: "desc" },
            take: limit + 1,
            skip,
          })

      const hasMore = rows.length > limit
      const data = hasMore ? rows.slice(0, limit) : rows

      return NextResponse.json({
        data,
        pagination: {
          page,
          limit,
          hasMore,
          total: null,
          totalPages: null,
        },
      })
    }

    const [total, spls] = await prisma.$transaction([
      prisma.spl.count({ where }),
      lite
        ? prisma.spl.findMany({
            where,
            select: liteSelect,
            orderBy: { createdAt: "desc" },
            take: limit,
            skip,
          })
        : prisma.spl.findMany({
            where,
            include: includeConfig,
            orderBy: { createdAt: "desc" },
            take: limit,
            skip,
          }),
    ])

    return NextResponse.json({
      data: spls,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    })
  } catch (error) {
    console.error("Error fetching team SPLs:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data SPL" },
      { status: 500 }
    )
  }
}
