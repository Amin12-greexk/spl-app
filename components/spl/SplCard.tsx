import { Spl } from "@/types"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import Image from "next/image"

interface SplCardProps {
  spl: Spl
  onView?: (id: string) => void
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onDelete?: (id: string) => void
  showActions?: boolean
  userRole?: string
  compact?: boolean
}

export default function SplCard({
  spl,
  onView,
  onApprove,
  onReject,
  onDelete,
  showActions = true,
  userRole,
  compact = false,
}: SplCardProps) {
  const getStatusBadge = (status: string, isCompact = false) => {
    const statusConfig = {
      PENDING: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        label: "Menunggu",
        shortLabel: "Menunggu",
      },
      PENDING_SUPERVISOR: {
        bg: "bg-orange-100",
        text: "text-orange-800",
        label: "Menunggu Supervisor",
        shortLabel: "Supervisor",
      },
      PENDING_MANAGER: {
        bg: "bg-blue-100",
        text: "text-blue-800",
        label: "Menunggu Manager",
        shortLabel: "Manager",
      },
      APPROVED: {
        bg: "bg-green-100",
        text: "text-green-800",
        label: "Disetujui",
        shortLabel: "Disetujui",
      },
      REJECTED: {
        bg: "bg-red-100",
        text: "text-red-800",
        label: "Ditolak",
        shortLabel: "Ditolak",
      },
      REJECTED_BY_SUPERVISOR: {
        bg: "bg-red-100",
        text: "text-red-800",
        label: "Ditolak Supervisor",
        shortLabel: "Ditolak",
      },
      REJECTED_BY_MANAGER: {
        bg: "bg-red-100",
        text: "text-red-800",
        label: "Ditolak Manager",
        shortLabel: "Ditolak",
      },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || {
      bg: "bg-gray-100",
      text: "text-gray-800",
      label: status,
      shortLabel: status,
    }

    const displayLabel = isCompact && config.shortLabel ? config.shortLabel : config.label

    return (
      <span
        className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap flex-shrink-0 ${config.bg} ${config.text}`}
      >
        {displayLabel}
      </span>
    )
  }

  // Compact version for HR view with many records
  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow transition-shadow text-gray-900">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {spl.requester.name}
            </h3>
            <p className="text-xs text-gray-500 truncate">PIN: {spl.requester.pin || "-"}</p>
          </div>
          {getStatusBadge(spl.status, true)}
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
            <span className="font-semibold text-green-600">{spl.totalHours} jam</span>
          </div>

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
              <p className="text-gray-500 text-xs mb-1">Foto Bukti:</p>
              <div className="relative w-full h-20 bg-gray-100 rounded overflow-hidden">
                <Image
                  src={spl.proofImage}
                  alt="Foto bukti lembur"
                  fill
                  sizes="(max-width: 768px) 100vw, 300px"
                  className="object-cover"
                  unoptimized
                />
              </div>
            </div>
          )}

          {spl.approver && (
            <div className="pt-1.5 mt-1.5 border-t border-gray-100">
              <p className="text-gray-500 text-xs">
                Diproses: {spl.approver.name}
              </p>
            </div>
          )}
        </div>

        {/* Actions for compact card */}
        {showActions && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
            {(userRole === "HR" || userRole === "MANAGER") &&
              (spl.status === "PENDING" || spl.status === "PENDING_MANAGER") && (
                <>
                  {onApprove && (
                    <button
                      onClick={() => onApprove(spl.id)}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
                    >
                      ✓ Setujui
                    </button>
                  )}
                  {onReject && (
                    <button
                      onClick={() => onReject(spl.id)}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
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
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
                    >
                      ✓ Setujui
                    </button>
                  )}
                  {onReject && (
                    <button
                      onClick={() => onReject(spl.id)}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
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
                className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
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
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow text-gray-900">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900 truncate">
            {spl.requester.name}
          </h3>
          <p className="text-sm text-gray-600 truncate">{spl.requester.email}</p>
        </div>
        {getStatusBadge(spl.status, false)}
      </div>

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
          <span className="font-medium">{spl.totalHours} jam</span>
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
                  unoptimized
                  priority={false}
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
                  unoptimized
                  priority={false}
                />
              </div>
            </div>
          </div>
        )}

        {spl.rejectionReason && (
          <div className="mt-3 pt-3 border-t border-gray-100 bg-red-50 p-3 rounded">
            <p className="text-sm text-red-700 font-medium mb-1">
              Alasan Penolakan:
            </p>
            <p className="text-sm text-red-600">{spl.rejectionReason}</p>
          </div>
        )}

        {spl.approver && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Diproses oleh: {spl.approver.name}
            </p>
          </div>
        )}
      </div>

      {showActions && (
        <div className="flex gap-2 flex-wrap">
          {onView && (
            <button
              onClick={() => onView(spl.id)}
              className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
            >
              Lihat Detail
            </button>
          )}

          {userRole === "STAFF" &&
            (spl.status === "PENDING" || spl.status === "PENDING_SUPERVISOR" || spl.status === "PENDING_MANAGER") &&
            onDelete && (
            <button
              onClick={() => onDelete(spl.id)}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
            >
              Hapus
            </button>
          )}

          {(userRole === "HR" || userRole === "MANAGER") &&
            (spl.status === "PENDING" || spl.status === "PENDING_MANAGER") && (
              <>
                {onApprove && (
                  <button
                    onClick={() => onApprove(spl.id)}
                    className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-colors"
                  >
                    Setujui
                  </button>
                )}
                {onReject && (
                  <button
                    onClick={() => onReject(spl.id)}
                    className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
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
