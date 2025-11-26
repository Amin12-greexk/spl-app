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

    if (userRole === "STAFF") {
      // Staff hanya bisa melihat data miliknya
      where.requesterId = session.user.id;
    } else if (userId) {
      // HR/Manager bisa memfilter berdasarkan ID staff
      where.requesterId = userId;
    }
    // Jika HR/Manager dan tidak ada userId, mereka akan melihat semua

    const spls = await prisma.spl.findMany({
      where,
      include: {
        requester: {
          select: { id: true, name: true, email: true, pin: true, department: true }, // Hanya pilih data yang perlu
        },
        approver: {
          select: { id: true, name: true, email: true }, // Hanya pilih data yang perlu
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

    if (!session || (session.user.role as Role) !== "STAFF") {
      return NextResponse.json(
        { error: "Hanya staff yang bisa mengajukan SPL" },
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

    // Ambil minimal waktu lembur yang diset manager (default 16:30)
    const minSetting = await prisma.setting.findUnique({
      where: { key: "MIN_OVERTIME_START" },
    })
    const minTime = minSetting?.value || "16:30"
    const [minHour, minMin] = minTime.split(":").map(Number)
    const [startHour, startMin] = body.startTime.split(":").map(Number);
    const [endHour, endMin] = body.endTime.split(":").map(Number);

    // Hard stop: past cutoff time (menggunakan waktu server lokal)
    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    const minTotalMinutes = minHour * 60 + minMin
    if (nowMinutes > minTotalMinutes) {
      return NextResponse.json(
        { error: `Pengajuan hanya bisa sebelum pukul ${minTime} (atur oleh Manager)` },
        { status: 400 }
      );
    }

    // Validasi jam mulai minimal
    const startTotalMinutes = startHour * 60 + startMin
    if (Number.isNaN(startTotalMinutes) || startTotalMinutes < minTotalMinutes) {
      return NextResponse.json(
        { error: `Waktu mulai minimal ${minTime} (atur oleh Manager)` },
        { status: 400 }
      );
    }

    // Kalkulasi total jam
    const totalMinutes = endHour * 60 + endMin - (startHour * 60 + startMin);
    const totalHours = parseFloat((totalMinutes / 60).toFixed(2)); // Ubah ke 2 angka desimal

    if (totalHours <= 0) {
      return NextResponse.json(
        { error: "Waktu selesai harus lebih besar dari waktu mulai" },
        { status: 400 }
      );
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
        status: "PENDING", // Status default diatur di sini
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // --- Logika Mengirim Notifikasi (Lanjutan dari kode Anda) ---
    try {
      const managers = await prisma.user.findMany({
        where: {
          role: {
            in: ["HR", "MANAGER"],
          },
        },
        include: {
          notifications: true, // Ambil semua token FCM yang tersimpan
        },
      });

      const notificationTitle = "Pengajuan SPL Baru";
      const notificationBody = `${session.user.name} telah mengajukan lembur baru.`;
      
      const notificationPromises: Promise<any>[] = [];

      managers.forEach((manager) => {
        manager.notifications.forEach((token) => {
          // Tambahkan setiap pengiriman notifikasi ke dalam array promise
          notificationPromises.push(
            sendNotification(
              token.endpoint, // 'endpoint' adalah token FCM
              notificationTitle,
              notificationBody,
              { splId: spl.id, click_action: '/dashboard/approvals' } // Data tambahan
            )
          );
        });
      });

      // Kirim semua notifikasi secara paralel
      await Promise.allSettled(notificationPromises);
      console.log("Notifikasi telah dikirim ke HR/Manager");

    } catch (notificationError) {
        // Gagal mengirim notifikasi BUKAN berarti transaksi gagal
        // Cukup catat errornya
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

