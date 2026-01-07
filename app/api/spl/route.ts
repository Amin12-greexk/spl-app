import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
// Path impor di bawah ini diperbaiki untuk menunjuk ke lokasi definisi authOptions yang benar
import { authOptions } from "@/lib/auth"; // <-- PATH DIPERBAIKI
import { prisma } from "@/lib/prisma";
import { CreateSplInput, SplStatus, Role } from "@/types"; // <-- IMPORT DIPERBAIKI
import { sendNotificationToRoles, sendNotificationToUser } from "@/lib/notification-utils";
import { getSupervisorForDepartment } from "@/lib/supervisor-mapping";

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
    const status = searchParams.get("status") as SplStatus | null;
    const userId = searchParams.get("userId");

    // Tipe any untuk where clause agar dinamis
    const where: any = {};

    if (status) {
      where.status = status;
    }

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
    const hideUnsignedManual = userRole !== "SUPER_ADMIN";

    if (hideUnsignedManual) {
      where.NOT = { isManualEntry: true, requesterSignedAt: null };
    }

    if (selfOnlyRoles.includes(userRole)) {
      // Staff/TEKNISI/DRIVER/GA/Department Head/Pengawas Produksi hanya bisa melihat data miliknya
      where.requesterId = session.user.id;
    } else if (canViewAllRoles.includes(userRole)) {
      // HR/Manager/Super Admin bisa lihat SPL mereka sendiri ATAU semua SPL
      // Jika ada userId parameter, filter by userId
      if (userId) {
        where.requesterId = userId;
      }
      // Jika tidak ada userId, tidak ada filter (lihat semua)
    } else {
      // Fallback: batasi ke data milik sendiri
      where.requesterId = session.user.id;
    }

    const spls = await prisma.spl.findMany({
      where,
      include: {
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(spls);
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

    const datePart = body.date.split("T")[0]
    const requestedDate = new Date(`${datePart}T00:00:00`)
    if (Number.isNaN(requestedDate.getTime())) {
      return NextResponse.json({ error: "Tanggal lembur tidak valid" }, { status: 400 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (requestedDate < today) {
      return NextResponse.json(
        { error: "Tanggal lembur tidak boleh sebelum hari ini" },
        { status: 400 }
      )
    }

    const parseTimeToMinutes = (value: string) => {
      if (typeof value !== "string") return null
      const trimmed = value.trim()
      if (!/^\d{2}:\d{2}$/.test(trimmed)) return null
      const [hour, minute] = trimmed.split(":").map(Number)
      if (
        Number.isNaN(hour) ||
        Number.isNaN(minute) ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
      ) {
        return null
      }
      return hour * 60 + minute
    }

    const userRecord = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        departmentId: true,
        departmentName: true,
        department: { select: { name: true } },
        regularEndTime: true,
      },
    })

    if (!userRecord) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 })
    }

    const currentDepartmentName =
      userRecord.department?.name || userRecord.departmentName || null

    // Security tidak memiliki batasan waktu karena berbeda-beda shift
    const isSecurityDepartment = (currentDepartmentName || "").toLowerCase() === "security"

    // Validasi waktu pengajuan (tidak berlaku untuk Security)
    if (!isSecurityDepartment) {
      // Ambil batas maksimal waktu pengajuan yang diset manager (default 16:30)
      const minSetting = await prisma.setting.findUnique({
        where: { key: "MIN_OVERTIME_START" },
      })
      const minTime = minSetting?.value || "16:30"
      const [minHour, minMin] = minTime.split(":").map(Number)

      // Hard stop: jika waktu pengajuan (saat ini) melewati batas maksimal
      const now = new Date()
      const nowMinutes = now.getHours() * 60 + now.getMinutes()
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

    if (userRecord.regularEndTime) {
      const regularEndMinutes = parseTimeToMinutes(userRecord.regularEndTime)
      if (regularEndMinutes === null) {
        return NextResponse.json(
          { error: "Jam reguler user tidak valid. Hubungi Super Admin." },
          { status: 400 }
        )
      }
      if (startMinutes <= regularEndMinutes) {
        return NextResponse.json(
          { error: "Waktu mulai lembur harus lebih besar dari jam kerja reguler" },
          { status: 400 }
        )
      }
    }

    // Kalkulasi total jam (handle overnight shifts)
    let totalMinutes = endMinutes - startMinutes;

    // If negative, it's an overnight shift - add 24 hours (1440 minutes)
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60;
    }

    const totalHours = parseFloat((totalMinutes / 60).toFixed(2)); // Ubah ke 2 angka desimal

    if (totalHours <= 0) {
      return NextResponse.json(
        { error: "Waktu mulai dan selesai tidak boleh sama" },
        { status: 400 }
      );
    }

    // Check user's role and supervisor
    // Determine initial status based on role and department approval rules
    let initialStatus = "PENDING_MANAGER"
    let supervisorId: string | null = null
    const routingDepartmentName = currentDepartmentName || null

    // GA, DEPARTMENT_HEAD, PRODUCTION_SUPERVISOR, dan HR langsung ke Manager (skip supervisor approval)
    if (
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
        date: new Date(body.date),
        startTime: body.startTime,
        endTime: body.endTime,
        totalHours,
        reason: body.reason,
        signature: body.signature.trim(),
        projectName: body.projectName,
        proofImage: body.proofImage || null,
        status: initialStatus,
        supervisorId,
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
      const splDate = new Date(body.date);
      const formattedDate = splDate.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
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
        // If no supervisor, notify managers directly
        await sendNotificationToRoles(
          ["HR", "MANAGER"],
          notificationTitle,
          notificationBody,
          { splId: spl.id, click_action: "/dashboard/hr/persetujuan" } // Manager notification - FIXED ROUTE
        );
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

