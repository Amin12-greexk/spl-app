import React from "react"
import { Spl } from "@/types"
import { getSplStatusInfo, getSupervisorDisplayName } from "@/lib/spl-status"

interface SplProgressProps {
  spl: Partial<Spl>
  compact?: boolean
  showDetails?: boolean
  className?: string
}

const STEPS = [
  { id: "diajukan", label: "Diajukan" },
  { id: "atasan", label: "Atasan" },
  { id: "realisasi", label: "Isi Realisasi" },
  { id: "manager", label: "Manager" },
  { id: "selesai", label: "Selesai" },
]

export default function SplProgress({
  spl,
  compact = false,
  showDetails = true,
  className = "",
}: SplProgressProps) {
  const info = getSplStatusInfo(spl)
  const supervisorName = getSupervisorDisplayName(spl)
  const managerName = spl.approver?.name?.trim() || "Manager"

  // Label kustom untuk nama penanggung jawab per langkah
  const stepSublabels = [
    spl.requester?.name || "Pemohon",
    supervisorName,
    "Pemohon",
    managerName,
    "Selesai",
  ]

  return (
    <div className={`w-full ${className}`}>
      {/* ── Stepper Bar ── */}
      <div className="relative flex items-center justify-between w-full">
        {/* Garis latar belakang */}
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 bg-gray-200 z-0 rounded-full" />

        {/* Garis progress hijau aktif */}
        <div
          className="absolute top-1/2 left-0 -translate-y-1/2 h-1 bg-green-500 z-0 transition-all duration-300 rounded-full"
          style={{
            width: info.isCompleted
              ? "100%"
              : `${Math.max(0, (info.stepIndex / (STEPS.length - 1)) * 100)}%`,
          }}
        />

        {STEPS.map((step, idx) => {
          const isDone =
            info.isCompleted ||
            (!info.isRejected && idx < info.stepIndex) ||
            (idx === 0 && !info.needsSignature)

          const isCurrent = idx === info.stepIndex && !info.isCompleted
          const isRejectedHere = info.isRejected && idx === info.stepIndex

          // Tampilan lingkaran status
          let circleClasses = "bg-white border-gray-300 text-gray-400"
          let icon = <span className="text-xs font-semibold">{idx + 1}</span>

          if (isDone) {
            circleClasses = "bg-green-600 border-green-600 text-white shadow-sm"
            icon = (
              <svg className="w-3.5 h-3.5 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )
          } else if (isRejectedHere) {
            circleClasses = "bg-red-600 border-red-600 text-white shadow-sm"
            icon = (
              <svg className="w-3.5 h-3.5 stroke-current stroke-2 fill-none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )
          } else if (isCurrent) {
            if (info.needsRealization) {
              circleClasses =
                "bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100 animate-pulse shadow-sm"
            } else if (info.needsSignature) {
              circleClasses =
                "bg-amber-500 border-amber-500 text-white ring-4 ring-amber-100 shadow-sm"
            } else {
              circleClasses =
                "bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100 shadow-sm"
            }
          }

          return (
            <div
              key={step.id}
              className="relative z-10 flex flex-col items-center group"
            >
              <div
                className={`flex items-center justify-center rounded-full border-2 transition-all duration-200 ${
                  compact ? "w-6 h-6 text-[10px]" : "w-7 h-7 text-xs"
                } ${circleClasses}`}
                title={`${step.label} (${stepSublabels[idx]})`}
              >
                {icon}
              </div>

              {!compact && (
                <div className="mt-1.5 text-center">
                  <p
                    className={`text-[11px] font-medium leading-tight whitespace-nowrap ${
                      isCurrent
                        ? "text-blue-700 font-bold"
                        : isDone
                        ? "text-gray-800"
                        : isRejectedHere
                        ? "text-red-700 font-bold"
                        : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </p>
                  {idx > 0 && idx < 4 && (
                    <p
                      className="text-[9px] text-gray-500 max-w-[70px] truncate"
                      title={stepSublabels[idx]}
                    >
                      {stepSublabels[idx]}
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Kotak Informasi Status & Tindakan Berikutnya ── */}
      {showDetails && (
        <div
          className={`mt-3 rounded-lg p-2.5 text-xs transition-colors border ${
            info.isRejected
              ? "bg-red-50/70 border-red-200 text-red-900"
              : info.needsRealization
              ? "bg-blue-50/90 border-blue-200 text-blue-950 ring-1 ring-blue-200"
              : info.needsSignature
              ? "bg-amber-50/90 border-amber-200 text-amber-950"
              : info.isCompleted
              ? "bg-green-50/70 border-green-200 text-green-900"
              : "bg-gray-50 border-gray-200 text-gray-800"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
            <div className="flex items-center gap-1.5 font-medium">
              <span className={`w-2 h-2 rounded-full ${info.badgeColor.dot}`} />
              <span className="font-semibold">{info.label}</span>
            </div>

            {info.waitedPerson && (
              <span className="text-[11px] text-gray-500 font-normal">
                Menunggu: <strong className="text-gray-800">{info.waitedPerson}</strong>
              </span>
            )}
          </div>

          <p className="text-[11px] leading-relaxed text-gray-600">
            {info.description}
          </p>

          {!info.isCompleted && (
            <div className="mt-1.5 pt-1.5 border-t border-black/5 flex items-center gap-1 text-[11px]">
              <span className="font-semibold text-gray-700">Tindakan berikutnya:</span>
              <span
                className={
                  info.needsRealization
                    ? "font-semibold text-blue-700"
                    : info.needsSignature
                    ? "font-semibold text-amber-700"
                    : "text-gray-600"
                }
              >
                {info.nextAction}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
