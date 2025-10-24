import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UpdateSplStatusInput, Role, SplStatus } from "@/types"; // Impor semua tipe yang dibutuhkan
import { sendNotification } from "@/lib/firebase-admin"; // Impor fungsi pengirim notifikasi

/**
 * GET /api/spl/[id]
 * Mengambil detail satu SPL.
 * - STAFF hanya bisa melihat detail SPL miliknya.
 * - HR/MANAGER bisa melihat detail SPL siapa pun.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const spl = await prisma.spl.findUnique({
      where: {
        id: params.id,
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true },
        },
        approver: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!spl) {
      return NextResponse.json({ error: "SPL not found" }, { status: 404 });
    }

    // Periksa hak akses
    const userRole = session.user.role as Role;
    if (userRole === "STAFF" && spl.requesterId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(spl);
  } catch (error) {
    console.error("Error fetching SPL:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/spl/[id]
 * Mengubah status SPL (Approve/Reject).
 * - Hanya untuk HR/MANAGER.
 * - Mengirim notifikasi balasan ke staff yang mengajukan.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = session?.user?.role as Role;

    if (!session || !["HR", "MANAGER"].includes(userRole)) {
      return NextResponse.json(
        { error: "Hanya HR/Manager yang bisa mengubah status SPL" },
        { status: 403 }
      );
    }

    const body: UpdateSplStatusInput = await req.json();

    // Validasi input
    if (!body.status || (body.status === "REJECTED" && !body.rejectionReason)) {
        return NextResponse.json({ error: "Status dan alasan penolakan (jika ditolak) wajib diisi." }, { status: 400 });
    }

    const spl = await prisma.spl.update({
      where: {
        id: params.id,
      },
      data: {
        status: body.status,
        approverId: session.user.id, // Catat siapa yang memproses
        approvalDate: new Date(),
        rejectionReason: body.status === "REJECTED" ? body.rejectionReason : null,
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true },
        },
        approver: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // --- Logika Mengirim Notifikasi Balasan ---
    try {
      // Dapatkan data requester (termasuk token notifikasinya)
      const requester = await prisma.user.findUnique({
        where: { id: spl.requesterId },
        include: { notifications: true }, // Ambil semua token FCM
      });

      if (requester && requester.notifications.length > 0) {
        const statusText = spl.status === "APPROVED" ? "Disetujui" : "Ditolak";
        const notificationTitle = `Pengajuan SPL Anda ${statusText}`;
        const notificationBody = `Pengajuan lembur Anda telah ${statusText} oleh ${session.user.name}.`;

        const notificationPromises: Promise<any>[] = [];
        requester.notifications.forEach((token) => {
          notificationPromises.push(
            sendNotification(
              token.endpoint,
              notificationTitle,
              notificationBody,
              { splId: spl.id, click_action: '/dashboard/history' } // Arahkan ke halaman riwayat
            )
          );
        });

        await Promise.allSettled(notificationPromises);
        console.log(`Notifikasi status ${statusText} telah dikirim ke ${requester.name}`);
      }
    } catch (notificationError) {
      console.error("Gagal mengirim notifikasi balasan:", notificationError);
    }
    // ------------------------------------------------

    return NextResponse.json(spl);
  } catch (error) {
    console.error("Error updating SPL:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/spl/[id]
 * Menghapus pengajuan SPL.
 * - Hanya bisa dilakukan oleh staff yang mengajukan.
 * - Hanya bisa jika status masih PENDING.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const spl = await prisma.spl.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!spl) {
      return NextResponse.json({ error: "SPL not found" }, { status: 404 });
    }

    // Hanya izinkan penghapusan oleh requester dan HANYA jika status PENDING
    if (
      spl.requesterId !== session.user.id ||
      spl.status !== "PENDING"
    ) {
      return NextResponse.json(
        { error: "Hanya bisa dihapus oleh pembuat saat status masih PENDING" },
        { status: 403 }
      );
    }

    await prisma.spl.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({ message: "SPL deleted successfully" });
  } catch (error) {
    console.error("Error deleting SPL:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
