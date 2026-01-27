import { Spl } from "@/types"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import Image from "next/image"
import { memo, useMemo } from "react"
import { buildOvertimeWindowFromTimes, makeWindow, startOfDay } from "@/lib/spl-time"
import { getEffectiveHours } from "@/lib/spl-hours"

interface SplCardProps {
  spl: Spl
  onView?: (id: string) => void
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onDelete?: (id: string) => void
  showActions?: boolean
  userRole?: string
  compact?: boolean
  mini?: boolean
  currentUserId?: string
  onClick?: () => void
  showExpiredBadge?: boolean
}

function SplCard({
  spl,
  onView,
  onApprove,
  onReject,
  onDelete,
  showActions = true,
  userRole,
  compact = false,
  mini = false,
  currentUserId,
  onClick,
  showExpiredBadge = false,
}: SplCardProps) {
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

  const getPlannedWindow = () => {
    if (spl.plannedStartAt && spl.plannedEndAt) {
      const plannedStart = new Date(spl.plannedStartAt)
      const plannedEnd = new Date(spl.plannedEndAt)
      if (!Number.isNaN(plannedStart.getTime()) && !Number.isNaN(plannedEnd.getTime())) {
        return { plannedStart, plannedEnd }
      }
    }

    if (spl.regularEndAt) {
      const plannedWindow = buildOvertimeWindowFromTimes(
        new Date(spl.regularEndAt),
        spl.startTime,
        spl.endTime
      )
      if (plannedWindow) {
        return { plannedStart: plannedWindow.start, plannedEnd: plannedWindow.end }
      }
    }

    const baseDay = startOfDay(new Date(spl.date))
    const fallbackWindow = makeWindow(baseDay, spl.startTime, spl.endTime)
    if (!fallbackWindow) return null
    return { plannedStart: fallbackWindow.start, plannedEnd: fallbackWindow.end }
  }

  const isOvertimeExpired = () => {
    if (spl.actualStartAt || spl.actualEndAt) return false
    const window = getPlannedWindow()
    if (!window) return false
    return new Date() >= window.plannedEnd
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

  // Determine detailed status label based on supervisor and role - memoized
  const detailedStatus = useMemo(() => {
    // Determine supervisor type
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
          shortLabel: supervisorLabel,
          description: `Menunggu persetujuan ${supervisorLabel}`,
        }
      case "PENDING_MANAGER":
        return {
          icon: "⏳",
          label: "Menunggu Manager",
          shortLabel: "Manager",
          description: "Menunggu persetujuan Manager",
        }
      case "APPROVED":
        const approver = spl.approver?.name || "Manager"
        return {
          icon: "✅",
          label: "Disetujui",
          shortLabel: "Disetujui",
          description: `Disetujui oleh ${approver}`,
        }
      case "IN_PROGRESS":
        return {
          icon: "⏳",
          label: "Sedang Berjalan",
          shortLabel: "Berjalan",
          description: "Realisasi lembur sedang berjalan",
        }
      case "DONE":
        return {
          icon: "✅",
          label: "Selesai",
          shortLabel: "Selesai",
          description: "Realisasi lembur telah selesai",
        }
      case "REJECTED_BY_SUPERVISOR":
        return {
          icon: "❌",
          label: `Ditolak ${supervisorLabel}`,
          shortLabel: "Ditolak",
          description: `Ditolak oleh ${supervisorLabel}`,
        }
      case "REJECTED_BY_MANAGER":
        return {
          icon: "❌",
          label: "Ditolak Manager",
          shortLabel: "Ditolak",
          description: "Ditolak oleh Manager",
        }
      default:
        return {
          icon: "📝",
          label: "Pending",
          shortLabel: "Pending",
          description: "Menunggu proses",
        }
    }
  }, [spl.status, spl.supervisor?.role, requesterDepartmentName, spl.approver?.name])

  const getStatusBadge = (status: string, isCompact = false) => {
    const statusInfo = detailedStatus

    const statusConfig = {
      PENDING: {
        bg: "bg-yellow-50",
        text: "text-yellow-700",
        border: "border-yellow-200",
        ring: "ring-yellow-100",
      },
      PENDING_SUPERVISOR: {
        bg: "bg-orange-50",
        text: "text-orange-700",
        border: "border-orange-200",
        ring: "ring-orange-100",
      },
      PENDING_MANAGER: {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
        ring: "ring-blue-100",
      },
      APPROVED: {
        bg: "bg-green-50",
        text: "text-green-700",
        border: "border-green-200",
        ring: "ring-green-100",
      },
      IN_PROGRESS: {
        bg: "bg-yellow-50",
        text: "text-yellow-700",
        border: "border-yellow-200",
        ring: "ring-yellow-100",
      },
      DONE: {
        bg: "bg-green-50",
        text: "text-green-700",
        border: "border-green-200",
        ring: "ring-green-100",
      },
      REJECTED: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        ring: "ring-red-100",
      },
      REJECTED_BY_SUPERVISOR: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        ring: "ring-red-100",
      },
      REJECTED_BY_MANAGER: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        ring: "ring-red-100",
      },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || {
      bg: "bg-gray-50",
      text: "text-gray-700",
      border: "border-gray-200",
      ring: "ring-gray-100",
    }

    const displayLabel = isCompact ? statusInfo.shortLabel : statusInfo.label

    return (
      <div className="flex flex-col items-end gap-1">
        <span
          className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${config.bg} ${config.text} ${config.border} shadow-sm flex items-center gap-1.5 whitespace-nowrap`}
          title={statusInfo.description}
        >
          <span className="text-sm">{statusInfo.icon}</span>
          {displayLabel}
        </span>
        {!isCompact && status.includes("PENDING") && (
          <span className="text-[10px] text-gray-500 italic">
            {statusInfo.description}
          </span>
        )}
      </div>
    )
  }

  const isManualSource = spl.source === "MANUAL" || spl.isManualEntry
  const manualBadge = isManualSource ? (
    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md border bg-red-50 text-red-700 border-red-200">
      Telat Input
    </span>
  ) : null
  const legacyBadge = spl.source === "LEGACY" ? (
    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md border bg-blue-50 text-blue-700 border-blue-200">
      Data Lama
    </span>
  ) : null
  const expiredBadge = showExpiredBadge && isOvertimeExpired() ? (
    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md border bg-amber-50 text-amber-700 border-amber-200">
      Kadaluarsa
    </span>
  ) : null

  // Get approval flow for this SPL
  const getApprovalFlow = () => {
    const hasSubordinate = Boolean(requesterDepartmentName && requesterDepartmentName !== "-")
    const supervisorRole = spl.supervisor?.role || "DEPARTMENT_HEAD"
    const supervisorLabel = supervisorRole === "GA" ? "GA" : "Kepala Dept"

    // For staff with supervisor
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

    // For GA/Dept Head (direct to manager)
    return [
      { label: "Pemohon", done: true, current: false },
      {
        label: "Manager",
        done: spl.status === "APPROVED",
        current: ["PENDING_MANAGER", "IN_PROGRESS", "DONE"].includes(spl.status),
      },
    ]
  }

  // Mini version - ultra-compact for grid views with many records
  if (mini) {
    return (
      <div
        onClick={onClick}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-2.5 hover:shadow-md hover:border-green-300 transition-all cursor-pointer group"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-bold text-gray-900 truncate group-hover:text-green-600 transition-colors">
              {spl.requester.name}
            </h3>
            <p className="text-[10px] text-gray-500 truncate">
              {requesterDepartmentName}
            </p>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            {manualBadge}
            {legacyBadge}
            {expiredBadge}
            {getStatusBadge(spl.status, true)}
          </div>
        </div>

        <div className="space-y-1 text-[10px]">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">📅</span>
            <span className="font-medium text-gray-900 text-[10px]">
              {format(new Date(spl.date), "dd/MM/yy")}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-500">⏰</span>
            <span className="font-medium text-gray-900 text-[10px]">
              {spl.startTime} - {spl.endTime}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-500">⏱️</span>
            <span className="font-semibold text-green-600 text-[10px]">
              {displayHoursText}
            </span>
          </div>

          {realizationRange() && (
            <div className="pt-1 mt-1 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-[9px]">Realisasi:</span>
                <span className="text-gray-900 text-[9px] font-medium">
                  {realizationRange()}
                </span>
              </div>
            </div>
          )}

          <div className="pt-1 mt-1 border-t border-gray-100">
            <p className="text-gray-900 text-[10px] line-clamp-2 leading-tight">
              {spl.reason}
            </p>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
          {/* Delete button for staff when SPL is pending */}
          {userRole === "STAFF" &&
            (spl.status === "PENDING" || spl.status === "PENDING_SUPERVISOR" || spl.status === "PENDING_MANAGER") &&
            onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(spl.id)
                }}
                className="px-2 py-1 text-[10px] font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors border border-red-200"
              >
                🗑 Hapus
              </button>
            )}
          <span className="text-[9px] text-gray-400 group-hover:text-green-600 transition-colors flex-1 text-center">
            Klik untuk detail
          </span>
        </div>
      </div>
    )
  }

  // Compact version for HR view with many records
  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover-lift glow-green text-gray-900">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {spl.requester.name}
            </h3>
            <p className="text-xs text-gray-500 truncate">
              {requesterDepartmentName} · PIN: {spl.requester.pin || "-"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {manualBadge}
            {legacyBadge}
            {expiredBadge}
            {getStatusBadge(spl.status, true)}
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Tanggal:</span>
            <span className="font-medium text-gray-900">
              {format(new Date(spl.date), "dd/MM/yyyy")}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-500">Waktu:</span>
            <span className="font-medium text-gray-900">
              {spl.startTime} - {spl.endTime}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-500">Total Jam:</span>
            <span className="font-semibold text-green-600">
              {displayHoursText}
            </span>
          </div>

          {realizationRange() && (
            <div className="pt-1.5 mt-1.5 border-t border-gray-100">
              <p className="text-gray-500 text-xs mb-0.5">Realisasi:</p>
              <p className="text-gray-900 text-xs">
                {realizationRange()}
                {spl.actualTotalHours ? ` (${formatTotalHours(spl.actualTotalHours)})` : ""}
              </p>
            </div>
          )}

          {spl.realizationNote && (
            <div className="pt-1.5 mt-1.5 border-t border-gray-100">
              <p className="text-gray-500 text-xs mb-0.5">Catatan Realisasi:</p>
              <p className="text-gray-900 text-xs line-clamp-2">{spl.realizationNote}</p>
            </div>
          )}

          {spl.overrunReason && (
            <div className="pt-1.5 mt-1.5 border-t border-red-100 bg-red-50 p-2 rounded">
              <p className="text-red-700 text-xs font-semibold mb-0.5">Alasan Realisasi:</p>
              <p className="text-red-600 text-xs line-clamp-2">{spl.overrunReason}</p>
            </div>
          )}

          {spl.projectName && (
            <div className="pt-1.5 mt-1.5 border-t border-gray-100">
              <p className="text-gray-500 text-xs mb-0.5">Proyek:</p>
              <p className="font-medium text-gray-900 text-xs truncate">{spl.projectName}</p>
            </div>
          )}

          <div className="pt-1.5 mt-1.5 border-t border-gray-100">
            <p className="text-gray-500 text-xs mb-0.5">Alasan:</p>
            <p className="text-gray-900 text-xs line-clamp-2">{spl.reason}</p>
          </div>

          {spl.proofImage && (
            <div className="pt-1.5 mt-1.5 border-t border-gray-100">
              <p className="text-gray-500 text-xs mb-1">Foto Sebelum:</p>
              <div className="relative w-full h-20 bg-gray-100 rounded overflow-hidden">
                <Image
                  src={spl.proofImage}
                  alt="Foto bukti lembur"
                  fill
                  sizes="(max-width: 768px) 100vw, 300px"
                  className="object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {spl.realizationProofImage && (
            <div className="pt-1.5 mt-1.5 border-t border-gray-100">
              <p className="text-gray-500 text-xs mb-1">Bukti Realisasi:</p>
              <div className="relative w-full h-20 bg-gray-100 rounded overflow-hidden">
                <Image
                  src={spl.realizationProofImage}
                  alt="Foto bukti realisasi"
                  fill
                  sizes="(max-width: 768px) 100vw, 300px"
                  className="object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* Supervisor Approval (compact) */}
          {spl.supervisorApprovalDate && (
            <div className="pt-1.5 mt-1.5 border-t border-gray-100">
              <p className="text-green-600 text-xs font-medium flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ✓ Disetujui {spl.supervisor?.role === "GA" ? "GA" : "Kepala Dept"}
              </p>
            </div>
          )}

          {/* Rejection Reason (compact) */}
          {(spl.rejectionReason || spl.supervisorRejectionReason) && (
            <div className="pt-1.5 mt-1.5 border-t border-gray-100 bg-red-50 p-2 rounded">
              <p className="text-red-700 text-xs font-semibold mb-0.5 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Alasan Ditolak:
              </p>
              <p className="text-red-600 text-xs line-clamp-2">
                {spl.supervisorRejectionReason || spl.rejectionReason}
              </p>
            </div>
          )}

          {spl.approver && (
            <div className="pt-1.5 mt-1.5 border-t border-gray-100">
              <p className="text-gray-500 text-xs">
                Disetujui: {spl.approver.name}
              </p>
            </div>
          )}
        </div>

        {/* Actions for compact card */}
        {showActions && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
            {userRole === "MANAGER" &&
              ["PENDING", "PENDING_MANAGER", "IN_PROGRESS", "DONE"].includes(spl.status) && (
                <>
                  {onApprove && (
                    <button
                      onClick={() => onApprove(spl.id)}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-micro motion-safe:hover:scale-[1.02] shadow-sm hover:shadow-md"
                    >
                      ✓ Setujui
                    </button>
                  )}
                  {onReject && (
                    <button
                      onClick={() => onReject(spl.id)}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-micro motion-safe:hover:scale-[1.02] shadow-sm hover:shadow-md"
                    >
                      ✕ Tolak
                    </button>
                  )}
                </>
              )}

            {(userRole === "GA" || userRole === "DEPARTMENT_HEAD") &&
              spl.status === "PENDING_SUPERVISOR" && (
                <>
                  {onApprove && (
                    <button
                      onClick={() => onApprove(spl.id)}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-micro motion-safe:hover:scale-[1.02] shadow-sm hover:shadow-md"
                    >
                      ✓ Setujui
                    </button>
                  )}
                  {onReject && (
                    <button
                      onClick={() => onReject(spl.id)}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-micro motion-safe:hover:scale-[1.02] shadow-sm hover:shadow-md"
                    >
                      ✕ Tolak
                    </button>
                  )}
                </>
              )}

            {userRole === "STAFF" &&
              (spl.status === "PENDING" || spl.status === "PENDING_SUPERVISOR" || spl.status === "PENDING_MANAGER") &&
              onDelete && (
                <button
                  onClick={() => onDelete(spl.id)}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-micro motion-safe:hover:scale-[1.02] shadow-sm hover:shadow-md"
                >
                  🗑 Hapus
                </button>
              )}
          </div>
        )}
      </div>
    )
  }

  // Full version for detailed view
  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4 hover-lift glow-green text-gray-900">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900 truncate">
            {spl.requester.name}
          </h3>
          <p className="text-sm text-gray-600 truncate">
            {requesterDepartmentName} · {spl.requester.email}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {manualBadge}
          {legacyBadge}
          {expiredBadge}
          {getStatusBadge(spl.status, false)}
        </div>
      </div>

      {/* Approval Flow Progress */}
      {!["REJECTED_BY_SUPERVISOR", "REJECTED_BY_MANAGER"].includes(spl.status) && (
        <div className="mb-4 p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
          <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Alur Persetujuan:
          </p>
          <div className="flex items-center gap-2">
            {getApprovalFlow().map((step, index) => (
              <div key={index} className="flex items-center gap-2 flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${step.done
                      ? "bg-green-500 border-green-600 text-white shadow-md"
                      : step.current
                        ? "bg-blue-500 border-blue-600 text-white shadow-md animate-pulse"
                        : "bg-gray-100 border-gray-300 text-gray-400"
                      }`}
                  >
                    {step.done ? "✓" : index + 1}
                  </div>
                  <span
                    className={`text-[10px] font-semibold mt-1 ${step.current ? "text-blue-700" : step.done ? "text-green-700" : "text-gray-500"
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
        <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
          <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {detailedStatus.label}
          </p>
          <p className="text-xs text-red-600">
            {detailedStatus.description}
          </p>
        </div>
      )}

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">📅 Tanggal:</span>
          <span className="font-medium">
            {format(new Date(spl.date), "dd MMMM yyyy", { locale: id })}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">⏰ Waktu:</span>
          <span className="font-medium">
            {spl.startTime} - {spl.endTime}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">⏱️ Total Jam:</span>
          <span className="font-medium">{displayHoursText}</span>
        </div>

        {spl.projectName && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">📁 Proyek:</span>
            <span className="font-medium">{spl.projectName}</span>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Alasan:</p>
          <p className="text-sm text-gray-900">{spl.reason}</p>
        </div>

        {(realizationRange() || spl.realizationNote || spl.overrunReason || spl.realizationProofImage) && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-2">Realisasi:</p>
            {realizationRange() && (
              <p className="text-sm text-gray-900">
                {realizationRange()}
                {spl.actualTotalHours ? ` (${formatTotalHours(spl.actualTotalHours)})` : ""}
              </p>
            )}
            {spl.realizationNote && (
              <p className="mt-2 text-sm text-gray-900">
                <span className="text-gray-500">Catatan:</span> {spl.realizationNote}
              </p>
            )}
            {spl.overrunReason && (
              <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2">
                <p className="text-sm text-red-700 font-semibold mb-1">
                  Alasan Realisasi:
                </p>
                <p className="text-sm text-red-600">{spl.overrunReason}</p>
              </div>
            )}
            {spl.realizationProofImage && (
              <div className="mt-3">
                <p className="text-sm text-gray-500 mb-2">Foto Bukti Realisasi:</p>
                <div className="bg-gray-50 border rounded-lg p-2">
                  <div className="relative w-full h-48">
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
              </div>
            )}
          </div>
        )}

        {spl.proofImage && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-2">Foto Bukti Pengerjaan:</p>
            <div className="bg-gray-50 border rounded-lg p-2">
              <div className="relative w-full h-48">
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
          </div>
        )}

        {spl.signature && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-2">Tanda Tangan Pemohon:</p>
            <div className="bg-gray-50 border rounded-lg p-2">
              <div className="relative w-full h-24">
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

        {/* Supervisor Approval Info */}
        {spl.supervisorApprovalDate && (
          <div className="mt-3 pt-3 border-t border-gray-100 bg-green-50 p-3 rounded-lg">
            <p className="text-xs text-green-700 font-semibold mb-1 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Disetujui Supervisor:
            </p>
            <p className="text-xs text-green-600">
              {spl.supervisor?.name || "Supervisor"} · {format(new Date(spl.supervisorApprovalDate), "dd MMM yyyy HH:mm", { locale: id })}
            </p>
          </div>
        )}

        {/* Rejection Reason */}
        {spl.rejectionReason && (
          <div className="mt-3 pt-3 border-t border-gray-100 bg-red-50 p-3 rounded-lg border border-red-200">
            <p className="text-sm text-red-700 font-semibold mb-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Alasan Penolakan:
            </p>
            <p className="text-sm text-red-600 leading-relaxed">{spl.rejectionReason}</p>
          </div>
        )}

        {spl.supervisorRejectionReason && (
          <div className="mt-3 pt-3 border-t border-gray-100 bg-red-50 p-3 rounded-lg border border-red-200">
            <p className="text-sm text-red-700 font-semibold mb-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Alasan Penolakan (Supervisor):
            </p>
            <p className="text-sm text-red-600 leading-relaxed">{spl.supervisorRejectionReason}</p>
          </div>
        )}

        {spl.approver && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Diproses oleh: {spl.approver.name}
              {spl.approvalDate && ` · ${format(new Date(spl.approvalDate), "dd MMM yyyy HH:mm", { locale: id })}`}
            </p>
          </div>
        )}
      </div>

      {showActions && (
        <div className="flex gap-2 flex-wrap">
          {onView && (
            <button
              onClick={() => onView(spl.id)}
              className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-micro motion-safe:hover:scale-[1.02]"
            >
              Lihat Detail
            </button>
          )}

          {userRole === "STAFF" &&
            (spl.status === "PENDING" || spl.status === "PENDING_SUPERVISOR" || spl.status === "PENDING_MANAGER") &&
            onDelete && (
              <button
                onClick={() => onDelete(spl.id)}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-micro motion-safe:hover:scale-[1.02]"
              >
                Hapus
              </button>
            )}

          {userRole === "MANAGER" &&
            ["PENDING", "PENDING_MANAGER", "IN_PROGRESS", "DONE"].includes(spl.status) && (
              <>
                {onApprove && (
                  <button
                    onClick={() => onApprove(spl.id)}
                    className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-micro motion-safe:hover:scale-[1.02] shadow-sm hover:shadow-md"
                  >
                    Setujui
                  </button>
                )}
                {onReject && (
                  <button
                    onClick={() => onReject(spl.id)}
                    className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-micro motion-safe:hover:scale-[1.02] shadow-sm hover:shadow-md"
                  >
                    Tolak
                  </button>
                )}
              </>
            )}
        </div>
      )}
    </div>
  )
}

export default memo(SplCard)

