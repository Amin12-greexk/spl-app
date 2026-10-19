import { Spl } from "@/types"

export interface SplStatusMeta {
  key: string
  label: string
  shortLabel: string
  description: string
  nextAction: string
  waitedPerson: string | null
  badgeColor: {
    bg: string
    text: string
    border: string
    dot: string
  }
  stepIndex: number // 0: Diajukan, 1: Atasan, 2: Isi Realisasi, 3: Manager, 4: Selesai
  isRejected: boolean
  isCompleted: boolean
  needsRealization: boolean
  needsSignature: boolean
}

/**
 * Mengambil nama atasan langsung dari data penugasan SPL.
 * Menghindari label role kaku (mis. GA/Kepala Dept), menggunakan nama atasan langsung
 * atau "Super Admin" jika di-mirror.
 */
export function getSupervisorDisplayName(spl: {
  supervisor?: { name?: string | null; role?: string | null } | null
  supervisorId?: string | null
}): string {
  if (spl.supervisor?.role === "SUPER_ADMIN") {
    return "Super Admin"
  }
  if (spl.supervisor?.name && spl.supervisor.name.trim().length > 0) {
    return spl.supervisor.name.trim()
  }
  return "Atasan"
}

/**
 * Realisasi hanya wajib untuk SPL yang diajukan sendiri lewat sistem. SPL manual/telat
 * (isManualEntry atau source MANUAL/LEGACY) boleh disetujui Manager tanpa realisasi,
 * mengikuti aturan di PATCH /api/spl/[id].
 */
export function splRequiresRealization(
  spl: Pick<Partial<Spl>, "status" | "actualEndAt" | "isManualEntry" | "source">
): boolean {
  if (spl.status !== "PENDING_MANAGER" || spl.actualEndAt) return false
  if (spl.isManualEntry) return false
  if (spl.source === "MANUAL" || spl.source === "LEGACY") return false
  return true
}

/**
 * Analisis lengkap status SPL untuk menyatukan label, deskripsi, warna,
 * stepper position, serta tindakan berikutnya di seluruh aplikasi.
 */
export function getSplStatusInfo(spl: Partial<Spl>): SplStatusMeta {
  const isFinalStatus =
    spl.status === "APPROVED" ||
    spl.status === "DONE" ||
    spl.status === "REJECTED" ||
    spl.status === "REJECTED_BY_SUPERVISOR" ||
    spl.status === "REJECTED_BY_MANAGER"
  const isLateUnsigned = Boolean(
    spl.isManualEntry && !spl.requesterSignedAt && !isFinalStatus
  )
  const supervisorName = getSupervisorDisplayName(spl)
  const requesterName = spl.requester?.name?.trim() || "Pemohon"
  const managerName = spl.approver?.name?.trim() || "Manager"

  // 1. Kasus khusus: SPL manual telat yang belum ditandatangani pemohon
  if (isLateUnsigned) {
    return {
      key: "UNSIGNED_MANUAL",
      label: "Menunggu TTD Pemohon",
      shortLabel: "Menunggu TTD",
      description: "SPL dibuatkan oleh admin dan belum ditandatangani oleh pemohon.",
      nextAction: "Tanda tangani di menu Telat Input agar dapat diteruskan ke atasan.",
      waitedPerson: requesterName,
      badgeColor: {
        bg: "bg-amber-50",
        text: "text-amber-800",
        border: "border-amber-200",
        dot: "bg-amber-500",
      },
      stepIndex: 0,
      isRejected: false,
      isCompleted: false,
      needsRealization: false,
      needsSignature: true,
    }
  }

  // 2. Status spesifik berdasarkan status enum
  switch (spl.status) {
    case "PENDING_SUPERADMIN":
      return {
        key: "PENDING_SUPERADMIN",
        label: "Menunggu Super Admin",
        shortLabel: "Super Admin",
        description: "Pengajuan telat sedang direview Super Admin.",
        nextAction: "Menunggu verifikasi Super Admin sebelum diteruskan ke atasan.",
        waitedPerson: "Super Admin",
        badgeColor: {
          bg: "bg-orange-50",
          text: "text-orange-800",
          border: "border-orange-200",
          dot: "bg-orange-500",
        },
        stepIndex: 0,
        isRejected: false,
        isCompleted: false,
        needsRealization: false,
        needsSignature: false,
      }

    case "PENDING_SUPERVISOR":
    case "PENDING":
      return {
        key: "PENDING_SUPERVISOR",
        label: `Menunggu Atasan: ${supervisorName}`,
        shortLabel: `Atasan: ${supervisorName}`,
        description: `Menunggu persetujuan ${supervisorName}.`,
        nextAction: `Menunggu ${supervisorName} memeriksa dan menyetujui pengajuan ini.`,
        waitedPerson: supervisorName,
        badgeColor: {
          bg: "bg-amber-50",
          text: "text-amber-800",
          border: "border-amber-200",
          dot: "bg-amber-500",
        },
        stepIndex: 1,
        isRejected: false,
        isCompleted: false,
        needsRealization: false,
        needsSignature: false,
      }

    case "PENDING_MANAGER": {
      if (splRequiresRealization(spl)) {
        return {
          key: "PENDING_REALIZATION",
          label: "Perlu Input Realisasi",
          shortLabel: "Isi Realisasi",
          description: "Atasan telah menyetujui. Pemohon WAJIB mengisi jam realisasi lembur.",
          nextAction: "Silakan input jam mulai & selesai sebenarnya agar diteruskan ke Manager.",
          waitedPerson: requesterName,
          badgeColor: {
            bg: "bg-blue-50",
            text: "text-blue-800",
            border: "border-blue-300",
            dot: "bg-blue-600",
          },
          stepIndex: 2,
          isRejected: false,
          isCompleted: false,
          needsRealization: true,
          needsSignature: false,
        }
      }

      return {
        key: "PENDING_MANAGER",
        label: `Menunggu ${managerName}`,
        shortLabel: "Manager",
        description: spl.actualEndAt
          ? `Realisasi sudah diisi, menunggu persetujuan ${managerName}.`
          : `Menunggu persetujuan ${managerName}. Realisasi tidak wajib untuk SPL ini.`,
        nextAction: `Menunggu ${managerName} menyetujui hasil lembur.`,
        waitedPerson: managerName,
        badgeColor: {
          bg: "bg-purple-50",
          text: "text-purple-800",
          border: "border-purple-200",
          dot: "bg-purple-500",
        },
        stepIndex: 3,
        isRejected: false,
        isCompleted: false,
        needsRealization: false,
        needsSignature: false,
      }
    }

    case "IN_PROGRESS":
      return {
        key: "IN_PROGRESS",
        label: "Sedang Berjalan",
        shortLabel: "Berjalan",
        description: "Pekerjaan lembur sedang berlangsung.",
        nextAction: "Selesaikan lembur dan masukkan jam realisasi.",
        waitedPerson: requesterName,
        badgeColor: {
          bg: "bg-cyan-50",
          text: "text-cyan-800",
          border: "border-cyan-200",
          dot: "bg-cyan-500",
        },
        stepIndex: 2,
        isRejected: false,
        isCompleted: false,
        needsRealization: true,
        needsSignature: false,
      }

    case "APPROVED":
      return {
        key: "APPROVED",
        label: "Disetujui",
        shortLabel: "Disetujui",
        description: `Disetujui oleh ${managerName}.`,
        nextAction: "Pengajuan lembur telah selesai dan disetujui penuh.",
        waitedPerson: null,
        badgeColor: {
          bg: "bg-green-50",
          text: "text-green-800",
          border: "border-green-200",
          dot: "bg-green-500",
        },
        stepIndex: 4,
        isCompleted: true,
        isRejected: false,
        needsRealization: false,
        needsSignature: false,
      }

    case "DONE":
      return {
        key: "DONE",
        label: "Selesai",
        shortLabel: "Selesai",
        description: "Realisasi lembur telah selesai dan disetujui.",
        nextAction: "Proses SPL selesai.",
        waitedPerson: null,
        badgeColor: {
          bg: "bg-emerald-50",
          text: "text-emerald-800",
          border: "border-emerald-200",
          dot: "bg-emerald-500",
        },
        stepIndex: 4,
        isCompleted: true,
        isRejected: false,
        needsRealization: false,
        needsSignature: false,
      }

    case "REJECTED_BY_SUPERVISOR":
      return {
        key: "REJECTED_BY_SUPERVISOR",
        label: `Ditolak ${supervisorName}`,
        shortLabel: "Ditolak Atasan",
        description: `Ditolak oleh ${supervisorName}${
          spl.supervisorRejectionReason ? `: "${spl.supervisorRejectionReason}"` : "."
        }`,
        nextAction: "Pengajuan lembur ditolak pada tahap persetujuan atasan.",
        waitedPerson: null,
        badgeColor: {
          bg: "bg-red-50",
          text: "text-red-800",
          border: "border-red-200",
          dot: "bg-red-500",
        },
        stepIndex: 1,
        isRejected: true,
        isCompleted: false,
        needsRealization: false,
        needsSignature: false,
      }

    case "REJECTED_BY_MANAGER":
      return {
        key: "REJECTED_BY_MANAGER",
        label: `Ditolak ${managerName}`,
        shortLabel: "Ditolak Manager",
        description: `Ditolak oleh ${managerName}${
          spl.rejectionReason ? `: "${spl.rejectionReason}"` : "."
        }`,
        nextAction: "Pengajuan lembur ditolak pada tahap persetujuan Manager.",
        waitedPerson: null,
        badgeColor: {
          bg: "bg-red-50",
          text: "text-red-800",
          border: "border-red-200",
          dot: "bg-red-500",
        },
        stepIndex: 3,
        isRejected: true,
        isCompleted: false,
        needsRealization: false,
        needsSignature: false,
      }

    case "REJECTED":
      return {
        key: "REJECTED",
        label: "Ditolak",
        shortLabel: "Ditolak",
        description: `Pengajuan ditolak${
          spl.rejectionReason ? `: "${spl.rejectionReason}"` : "."
        }`,
        nextAction: "Pengajuan lembur ditolak.",
        waitedPerson: null,
        badgeColor: {
          bg: "bg-red-50",
          text: "text-red-800",
          border: "border-red-200",
          dot: "bg-red-500",
        },
        stepIndex: 1,
        isRejected: true,
        isCompleted: false,
        needsRealization: false,
        needsSignature: false,
      }

    default:
      return {
        key: "UNKNOWN",
        label: spl.status || "Pending",
        shortLabel: "Pending",
        description: "Menunggu proses selanjutnya.",
        nextAction: "Menunggu verifikasi sistem.",
        waitedPerson: null,
        badgeColor: {
          bg: "bg-gray-50",
          text: "text-gray-800",
          border: "border-gray-200",
          dot: "bg-gray-400",
        },
        stepIndex: 0,
        isRejected: false,
        isCompleted: false,
        needsRealization: false,
        needsSignature: false,
      }
  }
}
