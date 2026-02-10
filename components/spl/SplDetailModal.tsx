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
    // Jika durasi kurang dari atau sama dengan 30 menit, tidak dihitung
    if (totalMinutes <= 30) return "0 menit"
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
    }

    switch (spl.status) {
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
    const statusConfig = {
      PENDING: {
        bg: "bg-yellow-50",
        text: "text-yellow-700",
        border: "border-yellow-200",
      },
      PENDING_SUPERVISOR: {
        bg: "bg-orange-50",
        text: "text-orange-700",
        border: "border-orange-200",
      },
      PENDING_MANAGER: {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
      },
      APPROVED: {
        bg: "bg-green-50",
        text: "text-green-700",
        border: "border-green-200",
      },
      IN_PROGRESS: {
        bg: "bg-yellow-50",
        text: "text-yellow-700",
        border: "border-yellow-200",
      },
      DONE: {
        bg: "bg-green-50",
        text: "text-green-700",
        border: "border-green-200",
      },
      REJECTED: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
      },
      REJECTED_BY_SUPERVISOR: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
      },
      REJECTED_BY_MANAGER: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
      },
    }

    const config = statusConfig[spl.status as keyof typeof statusConfig] || {
      bg: "bg-gray-50",
      text: "text-gray-700",
      border: "border-gray-200",
    }

    return (
      <span
        className={`px-3 py-1.5 text-sm font-bold rounded-lg border ${config.bg} ${config.text} ${config.border} shadow-sm flex items-center gap-2 whitespace-nowrap`}
      >
        <span className="text-base">{statusInfo.icon}</span>
        {statusInfo.label}
      </span>
    )
  }

  const getApprovalFlow = () => {
    const supervisorRole = spl.supervisor?.role || "DEPARTMENT_HEAD"
    const supervisorLabel = supervisorRole === "GA" ? "GA" : "Kepala Dept"

    if (spl.status === "PENDING_SUPERVISOR" || spl.supervisorApprovalDate) {
      return [
        { label: "Staff", done: true, current: false },
        { label: supervisorLabel, done: !!spl.supervisorApprovalDate, current: spl.status === "PENDING_SUPERVISOR" },
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detail SPL"
      size="large"
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Header Info */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 truncate">
              {spl.requester.name}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {requesterDepartmentName} • {spl.requester.email}
            </p>
            {spl.requester.pin && (
              <p className="text-sm text-gray-500 mt-0.5">
                PIN: {spl.requester.pin}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {(spl.source === "MANUAL" || spl.isManualEntry) && (
              <span className="px-2.5 py-1 text-xs font-semibold rounded-md border bg-red-50 text-red-700 border-red-200">
                Telat Input
              </span>
            )}
            {spl.source === "LEGACY" && (
              <span className="px-2.5 py-1 text-xs font-semibold rounded-md border bg-blue-50 text-blue-700 border-blue-200">
                Data Lama
              </span>
            )}
            {showMorningBadge && (
              <span className="px-2.5 py-1 text-xs font-semibold rounded-md border bg-orange-50 text-orange-700 border-orange-200">
                Lembur Pagi
              </span>
            )}
            {getStatusBadge()}
          </div>
        </div>

        {/* Approval Flow Progress */}
        {!["REJECTED_BY_SUPERVISOR", "REJECTED_BY_MANAGER"].includes(spl.status) && (
          <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
            <p className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Alur Persetujuan
            </p>
            <div className="flex items-center gap-2">
              {getApprovalFlow().map((step, index) => (
                <div key={index} className="flex items-center gap-2 flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${step.done
                        ? "bg-green-500 border-green-600 text-white shadow-md"
                        : step.current
                          ? "bg-blue-500 border-blue-600 text-white shadow-md animate-pulse"
                          : "bg-gray-100 border-gray-300 text-gray-400"
                        }`}
                    >
                      {step.done ? "✓" : index + 1}
                    </div>
                    <span
                      className={`text-xs font-semibold mt-1.5 ${step.current ? "text-blue-700" : step.done ? "text-green-700" : "text-gray-500"
                        }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < getApprovalFlow().length - 1 && (
                    <div
                      className={`h-0.5 flex-1 ${step.done ? "bg-green-500" : "bg-gray-300"
                        }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rejection Notice */}
        {["REJECTED_BY_SUPERVISOR", "REJECTED_BY_MANAGER"].includes(spl.status) && (
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm font-semibold text-red-700 mb-1.5 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {statusInfo.label}
            </p>
            <p className="text-sm text-red-600">
              {statusInfo.description}
            </p>
          </div>
        )}

        {/* Main Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 font-medium">📅 Tanggal:</span>
              <span className="font-semibold text-gray-900">
                {format(new Date(spl.date), "dd MMMM yyyy", { locale: id })}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 font-medium">⏰ Waktu:</span>
              <span className="font-semibold text-gray-900">
                {spl.startTime} - {spl.endTime}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 font-medium">⏱️ Total Jam:</span>
              <span className="font-semibold text-green-600">{displayHoursText}</span>
            </div>
          </div>

          <div className="space-y-3">
            {spl.projectName && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 font-medium">📁 Proyek:</span>
                <span className="font-semibold text-gray-900">{spl.projectName}</span>
              </div>
            )}

            {realizationRange() && (
              <div className="flex flex-col gap-1 text-sm">
                <span className="text-gray-500 font-medium">🎯 Realisasi:</span>
                <span className="font-semibold text-gray-900">
                  {realizationRange()}
                  {realizationHoursText ? ` (${realizationHoursText})` : ""}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Reason */}
        <div className="pt-3 border-t border-gray-100">
          <p className="text-sm text-gray-500 font-medium mb-2">📝 Alasan Lembur:</p>
          <p className="text-sm text-gray-900 leading-relaxed">{spl.reason}</p>
        </div>

        {/* Realization Note */}
        {spl.realizationNote && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-500 font-medium mb-2">✍️ Catatan Realisasi:</p>
            <p className="text-sm text-gray-900 leading-relaxed">{spl.realizationNote}</p>
          </div>
        )}

        {/* Realization Reason */}
        {spl.overrunReason && (
          <div className="pt-3 border-t border-red-100 bg-red-50 p-3 rounded-lg">
            <p className="text-sm text-red-700 font-semibold mb-2 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Alasan Realisasi:
            </p>
            <p className="text-sm text-red-600 leading-relaxed">{spl.overrunReason}</p>
          </div>
        )}

        {/* Proof Images */}
        {spl.proofImage && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-500 font-medium mb-2">Foto Bukti Pengerjaan (sebelum):</p>
            <div className="bg-gray-50 border rounded-lg p-3">
              <div className="relative w-full h-64">
                <Image
                  src={spl.proofImage}
                  alt="Foto bukti pengerjaan lembur"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain rounded"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        )}

        {spl.realizationProofImage && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-500 font-medium mb-2">📸 Foto Bukti Realisasi:</p>
            <div className="bg-gray-50 border rounded-lg p-3">
              <div className="relative w-full h-64">
                <Image
                  src={spl.realizationProofImage}
                  alt="Foto bukti realisasi lembur"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-contain rounded"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        )}

        {/* Signature */}
        {spl.signature && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-500 font-medium mb-2">✍️ Tanda Tangan Pemohon:</p>
            <div className="bg-gray-50 border rounded-lg p-3">
              <div className="relative w-full h-32">
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
          </div>
        )}

        {/* Supervisor Approval */}
        {spl.supervisorApprovalDate && (
          <div className="pt-3 border-t border-gray-100 bg-green-50 p-3 rounded-lg">
            <p className="text-sm text-green-700 font-semibold mb-1.5 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Disetujui Supervisor:
            </p>
            <p className="text-sm text-green-600">
              {spl.supervisor?.name || "Supervisor"} · {format(new Date(spl.supervisorApprovalDate), "dd MMM yyyy HH:mm", { locale: id })}
            </p>
          </div>
        )}

        {/* Rejection Reasons */}
        {spl.rejectionReason && (
          <div className="pt-3 border-t border-gray-100 bg-red-50 p-3 rounded-lg border border-red-200">
            <p className="text-sm text-red-700 font-semibold mb-2 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Alasan Penolakan:
            </p>
            <p className="text-sm text-red-600 leading-relaxed">{spl.rejectionReason}</p>
          </div>
        )}

        {spl.supervisorRejectionReason && (
          <div className="pt-3 border-t border-gray-100 bg-red-50 p-3 rounded-lg border border-red-200">
            <p className="text-sm text-red-700 font-semibold mb-2 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Alasan Penolakan (Supervisor):
            </p>
            <p className="text-sm text-red-600 leading-relaxed">{spl.supervisorRejectionReason}</p>
          </div>
        )}

        {/* Approver Info */}
        {spl.approver && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Diproses oleh: {spl.approver.name}
              {spl.approvalDate && ` · ${format(new Date(spl.approvalDate), "dd MMM yyyy HH:mm", { locale: id })}`}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
        <button
          onClick={onClose}
          className="px-6 py-2.5 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
        >
          Tutup
        </button>
      </div>
    </Modal>
  )
}


