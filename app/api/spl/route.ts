import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
// Path impor di bawah ini diperbaiki untuk menunjuk ke lokasi definisi authOptions yang benar
import { authOptions } from "@/lib/auth"; // <-- PATH DIPERBAIKI
import { prisma } from "@/lib/prisma";
import { CreateSplInput, SplStatus, Role } from "@/types"; // <-- IMPORT DIPERBAIKI
import { sendNotification } from "@/lib/firebase-admin";

/**
 * GET /api/spl
 * Mengambil daftar SPL.
 * - STAFF hanya bisa melihat SPL miliknya sendiri.
 * - HR/MANAGER bisa melihat semua SPL atau memfilter berdasarkan userId.
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

    if (["STAFF", "GA", "DEPARTMENT_HEAD", "PRODUCTION_SUPERVISOR"].includes(userRole)) {
      // Staff, GA, Department Head, dan Pengawas Produksi hanya bisa melihat data miliknya
      where.requesterId = session.user.id;
    } else if (userRole === "HR") {
      // HR bisa lihat SPL mereka sendiri ATAU semua SPL
      // Jika ada userId parameter (termasuk userId mereka sendiri), filter by userId
      // Jika tidak ada userId, lihat SEMUA SPL (untuk halaman Data & Laporan)
      if (userId) {
        where.requesterId = userId;
      }
      // Jika tidak ada userId, tidak ada filter (lihat semua)
    } else if (userRole === "MANAGER") {
      // Manager bisa memfilter berdasarkan ID staff atau lihat semua
      if (userId) {
        where.requesterId = userId;
      }
      // Jika tidak ada userId, tidak ada filter (lihat semua)
    }

    const spls = await prisma.spl.findMany({
      where,
      include: {
        requester: {
          select: { id: true, name: true, email: true, pin: true, department: true, position: true },
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

    if (!session || !["STAFF", "GA", "DEPARTMENT_HEAD", "PRODUCTION_SUPERVISOR", "HR"].includes(session.user.role as Role)) {
      return NextResponse.json(
        { error: "Hanya STAFF, GA, DEPARTMENT_HEAD, PRODUCTION_SUPERVISOR, atau HR yang bisa mengajukan SPL" },
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

    // Check user's department first
    const userDepartment = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { department: true },
    })

    // Security tidak memiliki batasan waktu karena berbeda-beda shift
    const isSecurityDepartment = userDepartment?.department === "Security"

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

    const [startHour, startMin] = body.startTime.split(":").map(Number);
    const [endHour, endMin] = body.endTime.split(":").map(Number);

    // Kalkulasi total jam
    const totalMinutes = endHour * 60 + endMin - (startHour * 60 + startMin);
    const totalHours = parseFloat((totalMinutes / 60).toFixed(2)); // Ubah ke 2 angka desimal

    if (totalHours <= 0) {
      return NextResponse.json(
        { error: "Waktu selesai harus lebih besar dari waktu mulai" },
        { status: 400 }
      );
    }

    // Check user's role and supervisor
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        supervisorId: true,
        role: true,
      },
    })

    // Determine initial status based on role and supervisor presence
    let initialStatus = "PENDING_MANAGER"

    // GA, DEPARTMENT_HEAD, PRODUCTION_SUPERVISOR, dan HR langsung ke Manager (skip supervisor approval)
    if (user?.role === "GA" || user?.role === "DEPARTMENT_HEAD" || user?.role === "PRODUCTION_SUPERVISOR" || user?.role === "HR") {
      initialStatus = "PENDING_MANAGER"
    }
    // STAFF: cek apakah ada supervisor
    else if (user?.role === "STAFF") {
      // If user has supervisor -> PENDING_SUPERVISOR
      // If no supervisor -> PENDING_MANAGER (direct to manager)
      initialStatus = user.supervisorId ? "PENDING_SUPERVISOR" : "PENDING_MANAGER"
    }
    // Role lain (HR, MANAGER): langsung ke Manager
    else {
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
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true, supervisorId: true },
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
      const notificationPromises: Promise<any>[] = [];

      if (spl.requester.supervisorId) {
        // If user has supervisor, notify supervisor
        const supervisor = await prisma.user.findUnique({
          where: { id: spl.requester.supervisorId },
          include: { notifications: true },
        });

        if (supervisor) {
          supervisor.notifications.forEach((token) => {
            notificationPromises.push(
              sendNotification(
                token.endpoint,
                notificationTitle,
                notificationBody,
                { splId: spl.id, click_action: '/dashboard/ga/persetujuan' } // Supervisor notification
              )
            );
          });
        }
      } else {
        // If no supervisor, notify managers directly
        const managers = await prisma.user.findMany({
          where: {
            role: {
              in: ["HR", "MANAGER"],
            },
          },
          include: {
            notifications: true,
          },
        });

        managers.forEach((manager) => {
          manager.notifications.forEach((token) => {
            notificationPromises.push(
              sendNotification(
                token.endpoint,
                notificationTitle,
                notificationBody,
                { splId: spl.id, click_action: '/dashboard/hr/persetujuan' } // Manager notification - FIXED ROUTE
              )
            );
          });
        });
      }

      // Send all notifications in parallel
      await Promise.allSettled(notificationPromises);
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

