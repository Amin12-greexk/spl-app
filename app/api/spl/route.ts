import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
// Path impor di bawah ini diperbaiki untuk menunjuk ke lokasi definisi authOptions yang benar
import { authOptions } from "@/lib/auth"; // <-- PATH DIPERBAIKI
import { prisma } from "@/lib/prisma";
import { CreateSplInput, SplStatus, Role } from "@/types"; // <-- IMPORT DIPERBAIKI
import { sendNotificationToUser } from "@/lib/notification-utils";
import { getSupervisorForDepartment } from "@/lib/supervisor-mapping";
import {
  getJakartaDayOfWeek,
  getJakartaTimeMinutes,
  JAKARTA_TIME_ZONE,
  makeWindow,
  parseDateOnly,
  parseTimeToMinutes,
  SECURITY_SHIFT_DEFINITIONS,
  SecurityShiftCode,
  startOfDay,
} from "@/lib/spl-time"
import {
  makeRegularOverrideKey,
  parseRegularOverrideValue,
  windowsOverlap,
} from "@/lib/regular-hours"

/**
 * GET /api/spl
 * Mengambil daftar SPL.
 * - STAFF/TEKNISI/DRIVER hanya bisa melihat SPL miliknya sendiri.
 * - HR/MANAGER/SUPER_ADMIN bisa melihat semua SPL atau memfilter berdasarkan userId.
 * - SPL manual yang belum ditandatangani disembunyikan untuk selain SUPER_ADMIN.
 * - Bisa memfilter berdasarkan status.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    // Menggunakan tipe SplStatus dari @/types
    const statusParam = searchParams.get("status");
    const userId = searchParams.get("userId");
    const lite =
      searchParams.get("lite") === "1" ||
      searchParams.get("lite") === "true";
    const skipStats =
      searchParams.get("skipStats") === "1" ||
      searchParams.get("skipStats") === "true";

    // Tipe any untuk where clause agar dinamis
    const baseWhere: any = {};

    const userRole = session.user.role as Role;
    const selfOnlyRoles: Role[] = [
      "STAFF",
      "TEKNISI",
      "DRIVER",
      "GA",
      "DEPARTMENT_HEAD",
      "PRODUCTION_SUPERVISOR",
    ];
    const canViewAllRoles: Role[] = ["HR", "MANAGER", "SUPER_ADMIN"];
    const hideUnsignedManual = !["SUPER_ADMIN", "HR"].includes(userRole);
    const hideUnrealizedForManager = userRole === "MANAGER";
    const notConditions: any[] = [];

    if (hideUnsignedManual) {
      notConditions.push(
        { isManualEntry: true, requesterSignedAt: null },
        { source: "LEGACY", requesterSignedAt: null }
      );
    }

    if (hideUnrealizedForManager) {
      notConditions.push({ status: "PENDING_MANAGER", actualEndAt: null });
    }

    if (notConditions.length > 0) {
      baseWhere.NOT = { OR: notConditions };
    }

    if (selfOnlyRoles.includes(userRole)) {
      // Staff/TEKNISI/DRIVER/GA/Department Head/Pengawas Produksi hanya bisa melihat data miliknya
      baseWhere.requesterId = session.user.id;
    } else if (canViewAllRoles.includes(userRole)) {
      // HR/Manager/Super Admin bisa lihat SPL mereka sendiri ATAU semua SPL
      // Jika ada userId parameter, filter by userId
      if (userId) {
        baseWhere.requesterId = userId;
      }
      // Jika tidak ada userId, tidak ada filter (lihat semua)
    } else {
      // Fallback: batasi ke data milik sendiri
      baseWhere.requesterId = session.user.id;
    }

    const where: any = { ...baseWhere };

    const statusList = statusParam
      ? statusParam
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : [];
    if (statusList.length === 1) {
      where.status = statusList[0];
    } else if (statusList.length > 1) {
      where.status = { in: statusList as SplStatus[] };
    }

    const search = searchParams.get("search")?.trim();
    if (search) {
      where.OR = [
        { reason: { contains: search, mode: "insensitive" } },
        { requester: { name: { contains: search, mode: "insensitive" } } },
        { requester: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const pageParam = Number(searchParams.get("page"));
    const limitParam = Number(searchParams.get("limit"));
    const usePagination =
      Number.isFinite(pageParam) &&
      pageParam > 0 &&
      Number.isFinite(limitParam) &&
      limitParam > 0;

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
          regularStartTime: true,
          regularEndTime: true,
        },
      },
      supervisor: {
        select: { id: true, name: true, email: true, role: true },
      },
      approver: {
        select: { id: true, name: true, email: true, role: true },
      },
    };

    const liteSelect = {
      id: true,
      requesterId: true,
      date: true,
      startTime: true,
      endTime: true,
      totalHours: true,
      reason: true,
      projectName: true,
      status: true,
      source: true,
      isManualEntry: true,
      requesterSignedAt: true,
      actualStartAt: true,
      actualEndAt: true,
      actualTotalHours: true,
      realizationNote: true,
      overrunReason: true,
      realizedMinutes: true,
      realizationCounted: true,
      regularStartAt: true,
      regularEndAt: true,
      plannedStartAt: true,
      plannedEndAt: true,
      supervisorApprovalDate: true,
      supervisorRejectionReason: true,
      rejectionReason: true,
      approverId: true,
      approvalDate: true,
      createdAt: true,
      updatedAt: true,
      requester: includeConfig.requester,
      supervisor: includeConfig.supervisor,
      approver: includeConfig.approver,
    };

    if (!usePagination) {
      if (lite) {
        const spls = await prisma.spl.findMany({
          where,
          select: liteSelect,
          orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(spls);
      }

      const spls = await prisma.spl.findMany({
        where,
        include: includeConfig,
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(spls);
    }

    const limit = Math.min(Math.floor(limitParam), 50);
    const page = Math.floor(pageParam);
    const skip = (page - 1) * limit;
    const toStatusCountMap = (
      grouped: Array<{ status: string; _count?: { _all?: number } | true }>
    ) => {
      const map = new Map<string, number>()
      for (const item of grouped) {
        const count =
          typeof item._count === "object" && item._count
            ? item._count._all || 0
            : 0
        map.set(item.status, count)
      }
      return map
    }

    const sumStatuses = (map: Map<string, number>, statuses: string[]) =>
      statuses.reduce((acc, status) => acc + (map.get(status) || 0), 0)

    if (usePagination && skipStats) {
      if (lite) {
        const [total, spls] = await prisma.$transaction([
          prisma.spl.count({ where }),
          prisma.spl.findMany({
            where,
            select: liteSelect,
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
          stats: null,
        })
      }

      const [total, spls] = await prisma.$transaction([
        prisma.spl.count({ where }),
        prisma.spl.findMany({
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
        stats: null,
      })
    }

    if (lite) {
      const [total, groupedStats, spls] =
        await prisma.$transaction([
          prisma.spl.count({ where }),
          prisma.spl.groupBy({
            by: ["status"],
            where: baseWhere,
            orderBy: { status: "asc" },
            _count: { _all: true },
          }),
          prisma.spl.findMany({
            where,
            select: liteSelect,
            orderBy: { createdAt: "desc" },
            take: limit,
            skip,
          }),
        ]);
      const statusCount = toStatusCountMap(groupedStats)
      const approved = statusCount.get("APPROVED") || 0
      const pending = sumStatuses(statusCount, ["PENDING_SUPERVISOR", "PENDING_MANAGER"])
      const rejected = sumStatuses(statusCount, [
        "REJECTED",
        "REJECTED_BY_SUPERVISOR",
        "REJECTED_BY_MANAGER",
      ])
      const totalAll = Array.from(statusCount.values()).reduce(
        (acc, count) => acc + count,
        0
      )

      return NextResponse.json({
        data: spls,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
        stats: {
          total: totalAll,
          approved,
          pending,
          rejected,
        },
      });
    }

    const [total, groupedStats, spls] =
      await prisma.$transaction([
        prisma.spl.count({ where }),
        prisma.spl.groupBy({
          by: ["status"],
          where: baseWhere,
          orderBy: { status: "asc" },
          _count: { _all: true },
        }),
        prisma.spl.findMany({
          where,
          include: includeConfig,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip,
        }),
      ]);
    const statusCount = toStatusCountMap(groupedStats)
    const approved = statusCount.get("APPROVED") || 0
    const pending = sumStatuses(statusCount, ["PENDING_SUPERVISOR", "PENDING_MANAGER"])
    const rejected = sumStatuses(statusCount, [
      "REJECTED",
      "REJECTED_BY_SUPERVISOR",
      "REJECTED_BY_MANAGER",
    ])
    const totalAll = Array.from(statusCount.values()).reduce(
      (acc, count) => acc + count,
      0
    )

    return NextResponse.json({
      data: spls,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      stats: {
        total: totalAll,
        approved,
        pending,
        rejected,
      },
    });
  } catch (error) {
    console.error("Error fetching SPLs:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/spl
 * Membuat pengajuan SPL baru.
 * - Hanya untuk STAFF.
 * - Mengirim notifikasi ke HR dan MANAGER.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["STAFF", "TEKNISI", "DRIVER", "GA", "DEPARTMENT_HEAD", "PRODUCTION_SUPERVISOR", "HR"].includes(session.user.role as Role)) {
      return NextResponse.json(
        { error: "Hanya STAFF, TEKNISI, DRIVER, GA, DEPARTMENT_HEAD, PRODUCTION_SUPERVISOR, atau HR yang bisa mengajukan SPL" },
        { status: 403 }
      );
    }

    const body: CreateSplInput = await req.json();

    // Validasi input dasar
    if (!body.date || !body.startTime || !body.endTime || !body.reason || !body.signature) {
        return NextResponse.json({ error: "Semua field wajib diisi termasuk tanda tangan" }, { status: 400 });
    }

    if (typeof body.signature !== "string" || body.signature.trim().length < 30) {
      return NextResponse.json({ error: "Tanda tangan tidak valid" }, { status: 400 });
    }

    const requestedDate = parseDateOnly(body.date)
    if (!requestedDate) {
      return NextResponse.json({ error: "Tanggal lembur tidak valid" }, { status: 400 })
    }

    const today = startOfDay(new Date())
    if (requestedDate < today) {
      return NextResponse.json(
        { error: "Tanggal lembur tidak boleh sebelum hari ini" },
        { status: 400 }
      )
    }

    const userRecord = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        role: true,
        supervisorId: true,
        departmentId: true,
        departmentName: true,
        department: { select: { name: true } },
        regularStartTime: true,
        regularEndTime: true,
      },
    })

    if (!userRecord) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 })
    }

    const currentDepartmentName =
      userRecord.department?.name || userRecord.departmentName || null

    const departmentKey = (currentDepartmentName || "").toLowerCase()
    const isSecurityDepartment = departmentKey === "security"
    const isGaSupervisedDepartment = ["security", "teknik", "driver"].includes(
      departmentKey
    )

    if (isGaSupervisedDepartment) {
      if (
        !body.proofImage ||
        typeof body.proofImage !== "string" ||
        body.proofImage.trim().length < 30
      ) {
        return NextResponse.json(
          { error: "Foto bukti wajib diunggah untuk departemen ini" },
          { status: 400 }
        )
      }
    }

    // Validasi waktu pengajuan (tidak berlaku untuk Security)
    if (!isSecurityDepartment) {
      // Ambil batas maksimal waktu pengajuan yang diset manager (default 16:30)
      const minSetting = await prisma.setting.findUnique({
        where: { key: "MIN_OVERTIME_START" },
      })
      const minTime = minSetting?.value || "16:30"
      const [minHour, minMin] = minTime.split(":").map(Number)

      // Hard stop: jika waktu pengajuan (saat ini) melewati batas maksimal
      const nowMinutes = getJakartaTimeMinutes(new Date())
      const minTotalMinutes = minHour * 60 + minMin
      if (nowMinutes > minTotalMinutes) {
        return NextResponse.json(
          { error: `Pengajuan hanya bisa sebelum pukul ${minTime} (atur oleh Manager)` },
          { status: 400 }
        );
      }
    }

    const startMinutes = parseTimeToMinutes(body.startTime)
    const endMinutes = parseTimeToMinutes(body.endTime)

    if (startMinutes === null || endMinutes === null) {
      return NextResponse.json(
        { error: "Format jam lembur tidak valid (HH:MM)" },
        { status: 400 }
      )
    }
    if (startMinutes === endMinutes) {
      return NextResponse.json(
        { error: "Jam lembur akhir harus > jam lembur mulai" },
        { status: 400 }
      )
    }

    let regularStartAt: Date | null = null
    let regularEndAt: Date | null = null
    let isSecurityWeeklyHoliday = false

    if (isSecurityDepartment) {
      const dayOfWeek = getJakartaDayOfWeek(requestedDate)
      const shiftAssignment = await prisma.securityShiftAssignment.findUnique({
        where: {
          userId_workDate: {
            userId: userRecord.id,
            workDate: requestedDate,
          },
        },
        select: { shiftCode: true },
      })

      if (shiftAssignment?.shiftCode) {
        const shiftDefinition =
          SECURITY_SHIFT_DEFINITIONS[
            shiftAssignment.shiftCode as SecurityShiftCode
          ]
        if (!shiftDefinition) {
          return NextResponse.json(
            { error: "Shift security tidak valid" },
            { status: 400 }
          )
        }
        const regularWindow = makeWindow(
          requestedDate,
          shiftDefinition.start,
          shiftDefinition.end
        )
        if (!regularWindow) {
          return NextResponse.json(
            { error: "Jam reguler security tidak valid" },
            { status: 400 }
          )
        }
        regularStartAt = regularWindow.start
        regularEndAt = regularWindow.end
      } else if (dayOfWeek === 6) {
        // Security 5-day rule: Saturday without assigned shift is treated as weekly holiday.
        isSecurityWeeklyHoliday = true
      } else if (userRecord.regularStartTime && userRecord.regularEndTime) {
        const regularStartMinutes = parseTimeToMinutes(
          userRecord.regularStartTime
        )
        const regularEndMinutes = parseTimeToMinutes(
          userRecord.regularEndTime
        )
        if (regularStartMinutes === null || regularEndMinutes === null) {
          return NextResponse.json(
            { error: "Jam reguler user tidak valid. Hubungi Super Admin." },
            { status: 400 }
          )
        }
        if (regularStartMinutes === regularEndMinutes) {
          return NextResponse.json(
            { error: "Jam reguler user tidak valid. Hubungi Super Admin." },
            { status: 400 }
          )
        }
        const regularWindow = makeWindow(
          requestedDate,
          userRecord.regularStartTime,
          userRecord.regularEndTime
        )
        if (!regularWindow) {
          return NextResponse.json(
            { error: "Jam reguler user tidak valid. Hubungi Super Admin." },
            { status: 400 }
          )
        }
        regularStartAt = regularWindow.start
        regularEndAt = regularWindow.end
      } else {
        return NextResponse.json(
          { error: "Shift security belum diatur untuk tanggal ini" },
          { status: 400 }
        )
      }
    } else {
      const dayOfWeek = getJakartaDayOfWeek(requestedDate)
      const overrideKey = makeRegularOverrideKey(userRecord.id, dayOfWeek)
      const overrideSetting = await prisma.setting.findUnique({
        where: { key: overrideKey },
        select: { value: true },
      })
      const overrideValue = parseRegularOverrideValue(overrideSetting?.value)

      const effectiveStartTime =
        overrideValue?.startTime || userRecord.regularStartTime
      const effectiveEndTime =
        overrideValue?.endTime || userRecord.regularEndTime

      if (!effectiveStartTime || !effectiveEndTime) {
        return NextResponse.json(
          { error: "Jam reguler user belum diatur. Hubungi Super Admin." },
          { status: 400 }
        )
      }
      const regularStartMinutes = parseTimeToMinutes(effectiveStartTime)
      const regularEndMinutes = parseTimeToMinutes(effectiveEndTime)
      if (regularStartMinutes === null || regularEndMinutes === null) {
        return NextResponse.json(
          { error: "Jam reguler user tidak valid. Hubungi Super Admin." },
          { status: 400 }
        )
      }
      if (regularStartMinutes === regularEndMinutes) {
        return NextResponse.json(
          { error: "Jam reguler user tidak valid. Hubungi Super Admin." },
          { status: 400 }
        )
      }
      const regularWindow = makeWindow(
        requestedDate,
        effectiveStartTime,
        effectiveEndTime
      )
      if (!regularWindow) {
        return NextResponse.json(
          { error: "Jam reguler user tidak valid. Hubungi Super Admin." },
          { status: 400 }
        )
      }
      regularStartAt = regularWindow.start
      regularEndAt = regularWindow.end
    }

    const hasRegularWindow = Boolean(regularStartAt && regularEndAt)

    if (!hasRegularWindow && !isSecurityWeeklyHoliday) {
      return NextResponse.json(
        { error: "Jam reguler tidak valid. Hubungi Super Admin." },
        { status: 400 }
      )
    }

    const plannedWindow = makeWindow(requestedDate, body.startTime, body.endTime)
    if (!plannedWindow) {
      return NextResponse.json(
        { error: "Waktu lembur tidak valid" },
        { status: 400 }
      )
    }

    const { start: plannedStartAt, end: plannedEndAt } = plannedWindow
    if (plannedEndAt <= plannedStartAt) {
      return NextResponse.json(
        { error: "Jam lembur akhir harus > jam lembur mulai" },
        { status: 400 }
      )
    }

    if (hasRegularWindow) {
      if (plannedEndAt <= regularStartAt!) {
        return NextResponse.json(
          { error: "Lembur pagi hanya bisa diajukan oleh Super Admin" },
          { status: 400 }
        )
      }

      const overlapsRegular = windowsOverlap(
        { start: regularStartAt!, end: regularEndAt! },
        { start: plannedStartAt, end: plannedEndAt }
      )
      if (overlapsRegular) {
        return NextResponse.json(
          { error: "Jam lembur tidak boleh bentrok dengan jam reguler" },
          { status: 400 }
        )
      }
    }

    const overlap = await prisma.spl.findFirst({
      where: {
        requesterId: session.user.id,
        actualEndAt: null,
        status: {
          notIn: ["REJECTED", "REJECTED_BY_SUPERVISOR", "REJECTED_BY_MANAGER"],
        },
        plannedStartAt: { not: null },
        plannedEndAt: { not: null },
        AND: [
          { plannedStartAt: { lt: plannedEndAt } },
          { plannedEndAt: { gt: plannedStartAt } },
        ],
      },
      select: { id: true },
    })

    if (overlap) {
      return NextResponse.json(
        { error: "Ada pengajuan lembur lain yang overlap" },
        { status: 400 }
      )
    }

    const totalMinutes = Math.max(
      0,
      Math.floor((plannedEndAt.getTime() - plannedStartAt.getTime()) / 60000)
    )

    if (totalMinutes <= 0) {
      return NextResponse.json(
        { error: "Waktu mulai dan selesai tidak valid" },
        { status: 400 }
      )
    }

    const totalHours = parseFloat((totalMinutes / 60).toFixed(2))

    // Check user's role and supervisor
    // Determine initial status based on role and department approval rules
    let initialStatus = "PENDING_MANAGER"
    let supervisorId: string | null = null
    const routingDepartmentName = currentDepartmentName || null

    if (userRecord.supervisorId) {
      initialStatus = "PENDING_SUPERVISOR"
      supervisorId = userRecord.supervisorId
    } else if (
      userRecord.role === "GA" ||
      userRecord.role === "DEPARTMENT_HEAD" ||
      userRecord.role === "PRODUCTION_SUPERVISOR" ||
      userRecord.role === "HR"
    ) {
      initialStatus = "PENDING_MANAGER"
    } else if (
      userRecord.role === "STAFF" ||
      userRecord.role === "TEKNISI" ||
      userRecord.role === "DRIVER"
    ) {
      const supervisor = await getSupervisorForDepartment({
        departmentId: userRecord.departmentId || null,
        departmentName: routingDepartmentName,
      })

      if (supervisor) {
        initialStatus = "PENDING_SUPERVISOR"
        supervisorId = supervisor.id
      } else {
        initialStatus = "PENDING_MANAGER"
      }
    } else {
      initialStatus = "PENDING_MANAGER"
    }

    const spl = await prisma.spl.create({
      data: {
        requesterId: session.user.id,
        date: requestedDate,
        startTime: body.startTime,
        endTime: body.endTime,
        totalHours,
        reason: body.reason,
        signature: body.signature.trim(),
        projectName: body.projectName,
        proofImage: body.proofImage ? body.proofImage.trim() : null,
        regularStartAt,
        regularEndAt,
        plannedStartAt,
        plannedEndAt,
        status: initialStatus,
        supervisorId,
        source: "SYSTEM",
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // --- Logika Mengirim Notifikasi (Multi-level approval) ---
    try {
      // Format tanggal untuk notifikasi
      const splDate = requestedDate;
      const formattedDate = splDate.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: JAKARTA_TIME_ZONE,
      });

      const notificationTitle = "Pengajuan SPL Baru";
      const notificationBody = `${session.user.name} mengajukan lembur pada ${formattedDate} (${body.startTime} - ${body.endTime}).`;
      if (spl.supervisorId) {
        await sendNotificationToUser(
          spl.supervisorId,
          notificationTitle,
          notificationBody,
          { splId: spl.id, click_action: "/dashboard/ga/persetujuan" } // Supervisor notification
        );
      } else {
        // Jika tanpa supervisor, manager akan diberi notifikasi setelah realisasi diinput.
      }

      console.log("Notifikasi telah dikirim");

    } catch (notificationError) {
        console.error("Gagal mengirim notifikasi:", notificationError);
    }
    // ---------------------------------------------------------

    return NextResponse.json(spl, { status: 201 });
  } catch (error) {
    console.error("Error creating SPL:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

