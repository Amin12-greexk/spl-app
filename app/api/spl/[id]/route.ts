import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UpdateSplStatusInput, Role, SplStatus } from "@/types"; // Impor semua tipe yang dibutuhkan
import { sendNotificationToUser } from "@/lib/notification-utils"; // Impor fungsi pengirim notifikasi
import { JAKARTA_TIME_ZONE } from "@/lib/spl-time";

/**
 * GET /api/spl/[id]
 * Mengambil detail satu SPL.
 * - STAFF/TEKNISI/DRIVER hanya bisa melihat detail SPL miliknya.
 * - HR/MANAGER/SUPER_ADMIN bisa melihat detail SPL siapa pun.
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
          select: {
            id: true,
            name: true,
            email: true,
            pin: true,
            departmentId: true,
            departmentName: true,
            department: { select: { id: true, name: true } },
          },
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
    const isUnsignedManual = spl.isManualEntry && !spl.requesterSignedAt;

    if (
      isUnsignedManual &&
      userRole !== "SUPER_ADMIN" &&
      spl.requesterId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (
      ["STAFF", "TEKNISI", "DRIVER", "GA", "DEPARTMENT_HEAD", "PRODUCTION_SUPERVISOR"].includes(userRole) &&
      spl.requesterId !== session.user.id
    ) {
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

    if (!session || !["MANAGER"].includes(userRole)) {
      return NextResponse.json(
        { error: "Hanya Manager yang bisa mengubah status SPL" },
        { status: 403 }
      );
    }

    const body: UpdateSplStatusInput = await req.json();

    // Validasi input
    if (!body.status || ((body.status === "REJECTED" || body.status === "REJECTED_BY_MANAGER") && !body.rejectionReason)) {
        return NextResponse.json({ error: "Status dan alasan penolakan (jika ditolak) wajib diisi." }, { status: 400 });
    }

    const existingSpl = await prisma.spl.findUnique({
      where: { id: params.id },
      select: { isManualEntry: true, requesterSignedAt: true },
    });

    if (!existingSpl) {
      return NextResponse.json({ error: "SPL not found" }, { status: 404 });
    }

    if (existingSpl.isManualEntry && !existingSpl.requesterSignedAt) {
      return NextResponse.json(
        { error: "SPL manual belum ditandatangani oleh pemohon" },
        { status: 400 }
      );
    }

    const spl = await prisma.spl.update({
      where: {
        id: params.id,
      },
      data: {
        status: body.status,
        approverId: session.user.id, // Catat siapa yang memproses
        approvalDate: new Date(),
        rejectionReason: (body.status === "REJECTED" || body.status === "REJECTED_BY_MANAGER") ? body.rejectionReason : null,
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
      // Format tanggal SPL
      const splDate = new Date(spl.date);
      const formattedDate = splDate.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: JAKARTA_TIME_ZONE,
      });

      const statusText = spl.status === "APPROVED" ? "Disetujui" : "Ditolak";
      const notificationTitle = `Pengajuan SPL Anda ${statusText}`;
      const notificationBody = `SPL tanggal ${formattedDate} (${spl.startTime}-${spl.endTime}) telah ${statusText.toLowerCase()} oleh ${session.user.name}.`;

      await sendNotificationToUser(
        spl.requesterId,
        notificationTitle,
        notificationBody,
        { splId: spl.id, click_action: '/dashboard/history' } // Arahkan ke halaman riwayat
      );
      console.log(`Notifikasi status ${statusText} telah dikirim ke requester`);
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
 * - Hanya bisa dilakukan oleh user yang mengajukan (STAFF/GA/DEPARTMENT_HEAD).
 * - Hanya bisa jika status masih pending (belum diapprove/reject).
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

    // Hanya izinkan penghapusan oleh requester dan HANYA jika status masih pending
    const pendingStatuses = ["PENDING", "PENDING_SUPERVISOR", "PENDING_MANAGER"];
    if (
      spl.requesterId !== session.user.id ||
      !pendingStatuses.includes(spl.status)
    ) {
      return NextResponse.json(
        { error: "Hanya bisa dihapus oleh pembuat saat status masih pending" },
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
