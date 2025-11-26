import { Spl } from "@/types"
import { format } from "date-fns"
import { id } from "date-fns/locale"

interface SplCardProps {
  spl: Spl
  onView?: (id: string) => void
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onDelete?: (id: string) => void
  showActions?: boolean
  userRole?: string
}

export default function SplCard({
  spl,
  onView,
  onApprove,
  onReject,
  onDelete,
  showActions = true,
  userRole,
}: SplCardProps) {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        label: "Menunggu",
      },
      APPROVED: {
        bg: "bg-green-100",
        text: "text-green-800",
        label: "Disetujui",
      },
      REJECTED: {
        bg: "bg-red-100",
        text: "text-red-800",
        label: "Ditolak",
      },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || {
      bg: "bg-gray-100",
      text: "text-gray-800",
      label: status,
    }

    return (
      <span
        className={`px-3 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}
      >
        {config.label}
      </span>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:shadow-md transition-shadow text-gray-900">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {spl.requester.name}
          </h3>
          <p className="text-sm text-gray-600">{spl.requester.email}</p>
        </div>
        {getStatusBadge(spl.status)}
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

        {spl.signature && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-500 mb-2">Tanda Tangan Pemohon:</p>
            <div className="bg-gray-50 border rounded-lg p-2">
              <img
                src={spl.signature}
                alt={`Tanda tangan ${spl.requester.name}`}
                className="w-full h-24 object-contain"
              />
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

          {userRole === "STAFF" && spl.status === "PENDING" && onDelete && (
            <button
              onClick={() => onDelete(spl.id)}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
            >
              Hapus
            </button>
          )}

          {(userRole === "HR" || userRole === "MANAGER") &&
            spl.status === "PENDING" && (
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
