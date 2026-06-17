import { Spl } from "@/types"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import Image from "next/image"
import Modal from "@/components/ui/Modal"
import { getEffectiveHours, getRealizationMinutes } from "@/lib/spl-hours"
import { isMorningOvertime } from "@/lib/spl-labels"

interface SplDetailModalProps {
  spl: Spl | null
  isOpen: boolean
  onClose: () => void
}

export default function SplDetailModal({ spl, isOpen, onClose }: SplDetailModalProps) {
  if (!spl) return null

  const requesterDepartmentName =
    spl.requester?.department?.name || spl.requester?.departmentName || "-"

  const formatRealizationTime = (value?: string | Date | null) => {
    if (!value) return "-"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "-"
    return format(date, "HH:mm", { locale: id })
  }

  const realizationRange = () => {
    if (spl.actualStartAt && spl.actualEndAt) {
      return `${formatRealizationTime(spl.actualStartAt)} - ${formatRealizationTime(spl.actualEndAt)}`
    }
    if (spl.actualStartAt) {
      return `${formatRealizationTime(spl.actualStartAt)} - Berjalan`
    }
    return null
  }

  const formatTotalHours = (value?: number | string | null) => {
    if (value === null || value === undefined) return "-"
    const numericValue = typeof value === "number" ? value : Number(value)
    if (!Number.isFinite(numericValue)) return "-"
    const totalMinutes = Math.round(numericValue * 60)
    if (totalMinutes < 30) return "0 menit"
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours === 0) return `${minutes} menit`
    if (minutes === 0) return `${hours} jam`
    return `${hours} jam ${minutes} menit`
  }

  const effectiveHours = getEffectiveHours(spl)
  const displayHours = effectiveHours ?? spl.totalHours
  const displayHoursText = formatTotalHours(displayHours)
  const realizationMinutes = getRealizationMinutes(spl)
  const realizationHours =
    realizationMinutes !== null ? realizationMinutes / 60 : spl.actualTotalHours
  const realizationHoursText =
    realizationHours === null || realizationHours === undefined
      ? null
      : formatTotalHours(realizationHours)

  const getDetailedStatus = () => {
    const supervisorRole = spl.supervisor?.role || requesterDepartmentName
    let supervisorLabel = "Supervisor"

    if (supervisorRole === "GA") {
      supervisorLabel = "GA"
    } else if (supervisorRole === "DEPARTMENT_HEAD") {
      supervisorLabel = "Kepala Dept"
    } else if (supervisorRole === "SUPER_ADMIN") {
      supervisorLabel = "Super Admin"
    }

    switch (spl.status) {
      case "PENDING_SUPERADMIN":
        return {
          icon: "⏳",
          label: "Menunggu Super Admin",
          description: "Pengajuan telat sedang direview Super Admin",
        }
      case "PENDING_SUPERVISOR":
        return {
          icon: "⏳",
          label: `Menunggu ${supervisorLabel}`,
          description: `Menunggu persetujuan ${supervisorLabel}`,
        }
      case "PENDING_MANAGER":
        return {
          icon: "⏳",
          label: "Menunggu Manager",
          description: "Menunggu persetujuan Manager",
        }
      case "APPROVED":
        const approver = spl.approver?.name || "Manager"
        return {
          icon: "✅",
          label: "Disetujui",
          description: `Disetujui oleh ${approver}`,
        }
      case "IN_PROGRESS":
        return {
          icon: "⏳",
          label: "Sedang Berjalan",
          description: "Realisasi lembur sedang berjalan",
        }
      case "DONE":
        return {
          icon: "✅",
          label: "Selesai",
          description: "Realisasi lembur telah selesai",
        }
      case "REJECTED_BY_SUPERVISOR":
        return {
          icon: "❌",
          label: `Ditolak ${supervisorLabel}`,
          description: `Ditolak oleh ${supervisorLabel}`,
        }
      case "REJECTED_BY_MANAGER":
        return {
          icon: "❌",
          label: "Ditolak Manager",
          description: "Ditolak oleh Manager",
        }
      default:
        return {
          icon: "📝",
          label: "Pending",
          description: "Menunggu proses",
        }
    }
  }

  const statusInfo = getDetailedStatus()
  const showMorningBadge = isMorningOvertime(spl)

  const getStatusBadge = () => {
    const isApproved = ["APPROVED", "DONE"].includes(spl.status)
    const isRejected = ["REJECTED_BY_SUPERVISOR", "REJECTED_BY_MANAGER"].includes(spl.status)
    const isPending = [
      "PENDING",
      "PENDING_SUPERVISOR",
      "PENDING_MANAGER",
      "PENDING_SUPERADMIN",
      "IN_PROGRESS",
    ].includes(spl.status)

    const cls = isApproved
      ? "bg-green-50 text-green-700 border-green-200"
      : isRejected
        ? "bg-red-50 text-red-700 border-red-200"
        : isPending
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-gray-50 text-gray-600 border-gray-200"

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border ${cls}`}
      >
        <span className="text-sm leading-none">{statusInfo.icon}</span>
        {statusInfo.label}
      </span>
    )
  }

  const getApprovalFlow = () => {
    const supervisorRole =
      spl.supervisor?.role ||
      (spl.status === "PENDING_SUPERADMIN" ? "SUPER_ADMIN" : "DEPARTMENT_HEAD")
    const supervisorLabel =
      supervisorRole === "GA"
        ? "GA"
        : supervisorRole === "SUPER_ADMIN"
          ? "Super Admin"
          : "Kepala Dept"

    if (
      spl.status === "PENDING_SUPERVISOR" ||
      spl.status === "PENDING_SUPERADMIN" ||
      spl.supervisorApprovalDate
    ) {
      return [
        { label: "Pemohon", done: true, current: false },
        {
          label: supervisorLabel,
          done: !!spl.supervisorApprovalDate,
          current: spl.status === "PENDING_SUPERADMIN" || spl.status === "PENDING_SUPERVISOR",
        },
        {
          label: "Manager",
          done: spl.status === "APPROVED",
          current: ["PENDING_MANAGER", "IN_PROGRESS", "DONE"].includes(spl.status),
        },
      ]
    }

    return [
      { label: "Pemohon", done: true, current: false },
      {
        label: "Manager",
        done: spl.status === "APPROVED",
        current: ["PENDING_MANAGER", "IN_PROGRESS", "DONE"].includes(spl.status),
      },
    ]
  }

  const approvalFlow = getApprovalFlow()
  const isRejected = ["REJECTED_BY_SUPERVISOR", "REJECTED_BY_MANAGER"].includes(spl.status)
  const isManual = spl.source === "MANUAL" || spl.isManualEntry

  // Inisial nama untuk avatar approver
  const approverInitials = spl.approver?.name
    ? spl.approver.name
      .split(" ")
      .slice(0, 2)
      .map((w: string) => w[0])
      .join("")
      .toUpperCase()
    : "?"

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detail SPL" size="large">
      <div>

        {/* ── Header: identitas + badge ── */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-gray-100">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900 truncate">
              {spl.requester.name}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {requesterDepartmentName} · {spl.requester.email}
            </p>
            {spl.requester.pin && (
              <p className="text-xs text-gray-400 mt-0.5">PIN: {spl.requester.pin}</p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {isManual && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border bg-amber-50 text-amber-700 border-amber-200">
                ⚠️ Telat input
              </span>
            )}
            {spl.source === "LEGACY" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border bg-blue-50 text-blue-700 border-blue-200">
                Data lama
              </span>
            )}
            {showMorningBadge && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border bg-amber-50 text-amber-700 border-amber-200">
                🌅 Lembur pagi
              </span>
            )}
            {getStatusBadge()}
          </div>
        </div>

        {/* ── Alur persetujuan ── */}
        {!isRejected && (
          <div className="py-4 border-b border-gray-100">
            <p className="text-xs text-gray-400 font-medium mb-3 uppercase tracking-wide">
              Alur persetujuan
            </p>
            <div className="flex items-center">
              {approvalFlow.map((step, index) => (
                <div key={index} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors ${step.done
                          ? "bg-green-500 border-green-500 text-white"
                          : step.current
                            ? "bg-blue-500 border-blue-500 text-white"
                            : "bg-white border-gray-200 text-gray-400"
                        }`}
                    >
                      {step.done ? "✓" : index + 1}
                    </div>
                    <span
                      className={`text-xs mt-1.5 font-medium ${step.done
                          ? "text-green-600"
                          : step.current
                            ? "text-blue-600"
                            : "text-gray-400"
                        }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < approvalFlow.length - 1 && (
                    <div
                      className={`flex-1 h-px mx-2 mb-5 ${step.done ? "bg-green-400" : "bg-gray-200"
                        }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Penolakan ── */}
        {isRejected && (
          <div className="mt-4 flex items-start gap-2.5 p-3 bg-red-50 border border-red-100 rounded-lg">
            <span className="text-red-400 text-base mt-0.5">❌</span>
            <div>
              <p className="text-sm font-semibold text-red-700">{statusInfo.label}</p>
              <p className="text-sm text-red-600 mt-0.5">{statusInfo.description}</p>
            </div>
          </div>
        )}

        {/* ── Info grid ── */}
        <div className="grid grid-cols-2 mt-4 border border-gray-100 rounded-lg overflow-hidden">
          <div className="p-3 border-b border-r border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Tanggal</p>
            <p className="text-sm font-medium text-gray-900">
              {format(new Date(spl.date), "dd MMM yyyy", { locale: id })}
            </p>
          </div>
          <div className="p-3 border-b border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Waktu</p>
            <p className="text-sm font-medium text-gray-900">
              {spl.startTime} – {spl.endTime}
            </p>
          </div>
          <div className={`p-3 ${spl.projectName ? "border-r border-gray-100" : "col-span-2"}`}>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total jam</p>
            <p className="text-sm font-semibold text-green-600">{displayHoursText}</p>
          </div>
          {spl.projectName && (
            <div className="p-3">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Proyek</p>
              <p className="text-sm font-medium text-gray-900 truncate">{spl.projectName}</p>
            </div>
          )}
          {realizationRange() && (
            <div className="col-span-2 p-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Realisasi</p>
              <p className="text-sm font-medium text-gray-900">
                {realizationRange()}
                {realizationHoursText && (
                  <span className="text-gray-400 font-normal ml-1.5">({realizationHoursText})</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* ── Alasan lembur ── */}
        <div className="mt-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">Alasan lembur</p>
          <p className="text-sm text-gray-700 leading-relaxed">{spl.reason}</p>
        </div>

        {/* ── Catatan realisasi ── */}
        {spl.realizationNote && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">
              Catatan realisasi
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">{spl.realizationNote}</p>
          </div>
        )}

        {/* ── Alasan overrun ── */}
        {spl.overrunReason && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1.5">
              Alasan realisasi
            </p>
            <p className="text-sm text-red-700 leading-relaxed">{spl.overrunReason}</p>
          </div>
        )}

        {/* ── Warning: telat input ── */}
        {isManual && (
          <div className="mt-4 flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-100 rounded-lg">
            <span className="text-amber-500 text-base mt-0.5">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">SPL telat input</p>
              <p className="text-sm text-amber-700 mt-0.5 leading-relaxed">
                Dibuat manual oleh IT via akun Super Admin karena batas waktu pengajuan normal
                terlewati. Karyawan telah menandatangani sebagai konfirmasi.
              </p>
            </div>
          </div>
        )}

        {/* ── Foto bukti (sebelum) ── */}
        {spl.proofImage && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
              Foto bukti pengerjaan
            </p>
            <div className="relative w-full h-52 rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
              <Image
                src={spl.proofImage}
                alt="Foto bukti pengerjaan lembur"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain"
                loading="lazy"
              />
            </div>
          </div>
        )}

        {/* ── Foto bukti realisasi ── */}
        {spl.realizationProofImage && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
              Foto bukti realisasi
            </p>
            <div className="relative w-full h-52 rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
              <Image
                src={spl.realizationProofImage}
                alt="Foto bukti realisasi lembur"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain"
                loading="lazy"
              />
            </div>
          </div>
        )}

        {/* ── Tanda tangan ── */}
        {spl.signature && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
              Tanda tangan pemohon
            </p>
            <div className="relative w-full h-28 rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
              <Image
                src={spl.signature}
                alt={`Tanda tangan ${spl.requester.name}`}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain"
                loading="lazy"
              />
            </div>
          </div>
        )}

        {/* ── Supervisor approval ── */}
        {spl.supervisorApprovalDate && (
          <div className="mt-4 flex items-center gap-2.5 p-3 bg-green-50 border border-green-100 rounded-lg">
            <span className="text-green-500 text-base">✓</span>
            <div>
              <p className="text-sm font-semibold text-green-800">
                {spl.supervisor?.role === "SUPER_ADMIN"
                  ? "Direview Super Admin"
                  : "Disetujui Kepala Dept"}
              </p>
              <p className="text-sm text-green-700 mt-0.5">
                {spl.supervisor?.name || "Supervisor"} ·{" "}
                {format(new Date(spl.supervisorApprovalDate), "dd MMM yyyy, HH:mm", {
                  locale: id,
                })}
              </p>
            </div>
          </div>
        )}

        {/* ── Alasan penolakan manager ── */}
        {spl.rejectionReason && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1.5">
              Alasan penolakan
            </p>
            <p className="text-sm text-red-700 leading-relaxed">{spl.rejectionReason}</p>
          </div>
        )}

        {/* ── Alasan penolakan supervisor ── */}
        {spl.supervisorRejectionReason && (
          <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1.5">
              Alasan penolakan (supervisor)
            </p>
            <p className="text-sm text-red-700 leading-relaxed">
              {spl.supervisorRejectionReason}
            </p>
          </div>
        )}

        {/* ── Approver info ── */}
        {spl.approver && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {approverInitials}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{spl.approver.name}</p>
              {spl.approvalDate && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Disetujui{" "}
                  {format(new Date(spl.approvalDate), "dd MMM yyyy, HH:mm", { locale: id })}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="mt-5 pt-4 border-t border-gray-100 flex justify-end">
        <button
          onClick={onClose}
          className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Tutup
        </button>
      </div>
    </Modal>
  )
}