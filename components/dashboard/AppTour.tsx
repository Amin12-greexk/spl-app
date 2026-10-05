"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import Joyride, {
    CallBackProps,
    STATUS,
    Step,
    TooltipRenderProps,
} from "react-joyride"

// ─── Custom Tooltip Component ────────────────────────────────────────────────
function CustomTooltip({
    continuous,
    index,
    step,
    size,
    backProps,
    closeProps,
    primaryProps,
    skipProps,
    tooltipProps,
    isLastStep,
}: TooltipRenderProps) {
    const progress = ((index + 1) / size) * 100

    return (
        <div
            {...tooltipProps}
            style={{ animation: "tourFadeSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)", maxWidth: 380, width: "calc(100vw - 32px)" }}
        >
            <style>{`
        @keyframes tourFadeSlideIn {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes tourPulseRing {
          0%   { box-shadow: 0 0 0 0 rgba(22,163,74,0.35); }
          70%  { box-shadow: 0 0 0 8px rgba(22,163,74,0); }
          100% { box-shadow: 0 0 0 0 rgba(22,163,74,0); }
        }
        .tour-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(22,163,74,0.35); }
        .tour-btn-secondary:hover { background: #f0fdf4; }
        .tour-btn-skip:hover { color: #374151; }
        
        /* Mobile-friendly specific overrides for Joyride */
        @media (max-width: 640px) {
            .react-joyride__spotlight {
                max-width: calc(100vw - 16px) !important;
                left: 8px !important;
                border-radius: 8px !important;
            }
            .react-joyride__overlay {
                width: 100vw !important;
            }
        }
      `}</style>

            <div style={{
                background: "linear-gradient(145deg, rgba(255,255,255,0.97), rgba(240,253,244,0.95))",
                backdropFilter: "blur(20px)",
                borderRadius: 16,
                boxShadow: "0 20px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(22,163,74,0.08)",
                overflow: "hidden",
                border: "1px solid rgba(22,163,74,0.12)",
            }}>
                <div style={{ height: 3, background: "#e5e7eb" }}>
                    <div style={{
                        height: "100%", width: `${progress}%`,
                        background: "linear-gradient(90deg, #16a34a, #22c55e, #4ade80)",
                        borderRadius: "0 4px 4px 0",
                        transition: "width 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
                    }} />
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 10,
                            background: "linear-gradient(135deg, #16a34a, #22c55e)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "white", fontSize: 14, fontWeight: 700,
                            boxShadow: "0 4px 12px rgba(22,163,74,0.25)",
                            animation: "tourPulseRing 2s infinite",
                        }}>
                            {index + 1}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", letterSpacing: "0.025em" }}>
                            Langkah {index + 1} dari {size}
                        </span>
                    </div>
                    <button {...skipProps} className="tour-btn-skip"
                        style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 12, cursor: "pointer", padding: "4px 8px", borderRadius: 6, transition: "color 0.2s", fontWeight: 500 }}>
                        Lewati ✕
                    </button>
                </div>

                <div style={{ padding: "14px 18px 16px" }}>
                    {step.title && (
                        <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>
                            {step.title}
                        </h3>
                    )}
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#4b5563" }}>
                        {step.content}
                    </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px 16px", gap: 8 }}>
                    <div>
                        {index > 0 && (
                            <button {...backProps} className="tour-btn-secondary"
                                style={{ background: "white", border: "1px solid #d1d5db", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 4 }}>
                                ← Kembali
                            </button>
                        )}
                    </div>
                    {continuous ? (
                        <button {...primaryProps} className="tour-btn-primary"
                            style={{
                                background: isLastStep ? "linear-gradient(135deg, #16a34a, #15803d)" : "linear-gradient(135deg, #22c55e, #16a34a)",
                                border: "none", borderRadius: 10, padding: "8px 20px",
                                fontSize: 13, fontWeight: 600, color: "white", cursor: "pointer",
                                transition: "all 0.2s", display: "flex", alignItems: "center", gap: 4,
                                boxShadow: "0 4px 14px rgba(22,163,74,0.25)",
                            }}>
                            {isLastStep ? "Selesai ✓" : "Lanjut →"}
                        </button>
                    ) : (
                        <button {...closeProps} className="tour-btn-primary"
                            style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", border: "none", borderRadius: 10, padding: "8px 20px", fontSize: 13, fontWeight: 600, color: "white", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 14px rgba(22,163,74,0.25)" }}>
                            Tutup
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Shared Joyride Props ─────────────────────────────────────────────────────
const joyrideProps = {
    continuous: true,
    showSkipButton: true,
    showProgress: true,
    scrollToFirstStep: false,
    disableOverlayClose: true,
    spotlightPadding: 8,
    tooltipComponent: CustomTooltip,
    floaterProps: {
        styles: {
            floater: { filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.08))" },
            arrow: { length: 8, spread: 14 },
        },
        disableAnimation: false,
    },
    styles: {
        options: { primaryColor: "#16a34a", zIndex: 10000, arrowColor: "rgba(255,255,255,0.97)" },
        overlay: { backgroundColor: "rgba(0, 0, 0, 0.45)" },
        spotlight: { borderRadius: 12, boxShadow: "0 0 0 4px rgba(22,163,74,0.2), 0 0 30px rgba(22,163,74,0.15)" },
    },
    locale: { back: "Kembali", close: "Tutup", last: "Selesai", next: "Lanjut", skip: "Lewati" },
}

// ─── Phase Types & Steps ──────────────────────────────────────────────────────
type PhaseKey = "sidebar" | "dashboard" | "pengajuan" | "splTim" | "telat"

const SIDEBAR_STEPS_BY_ROLE: Record<string, Step[]> = {
    STAFF: [
        { target: ".tour-dashboard", content: "Ini adalah menu Dashboard utama. Klik di sini untuk melihat ringkasan dan riwayat SPL Anda.", title: "Menu Dashboard", disableBeacon: true },
        { target: ".tour-pengajuan-spl", content: "Gunakan menu ini untuk mengajukan Surat Perintah Lembur (SPL) baru.", title: "Menu Pengajuan SPL" },
        { target: ".tour-telat-input", content: "Jika ada SPL yang telat input dan di input oleh admin yang perlu tanda tangan Anda, tersedia di sini.", title: "Menu Telat Input" },
        { target: ".tour-data-lama", content: "Data lembur lama sebelum aplikasi ini dibuat tersedia di sini.", title: "Menu Data Lama" },
    ],
    MANAGER: [
        { target: ".tour-dashboard", content: "Dashboard Manager menampilkan ringkasan SPL dan antrian persetujuan.", title: "📊 Menu Dashboard", disableBeacon: true },
        { target: ".tour-data-laporan-spl", content: "Lihat data dan laporan SPL seluruh karyawan di sini.", title: "📈 Data & Laporan SPL" },
        { target: ".tour-persetujuan-spl", content: "Setujui atau tolak pengajuan SPL karyawan yang sudah diverifikasi.", title: "✅ Persetujuan SPL" },
        { target: ".tour-kelola-kepala-dept", content: "Kelola data Kepala Departemen di sini.", title: "👥 Kelola Kepala Dept" },
    ],
    HR: [
        { target: ".tour-dashboard", content: "Dashboard HR menampilkan ringkasan data lembur dan kehadiran karyawan.", title: "📊 Menu Dashboard", disableBeacon: true },
        { target: ".tour-data-laporan-spl", content: "Akses data dan laporan SPL seluruh karyawan di sini.", title: "📈 Data & Laporan SPL" },
        { target: ".tour-cek-absensi", content: "Periksa data absensi karyawan melalui menu ini.", title: "📋 Cek Absensi" },
        { target: ".tour-pengajuan-spl-saya", content: "Gunakan menu ini untuk mengajukan SPL untuk diri Anda sendiri.", title: "📝 Menu Pengajuan SPL" },
        { target: ".tour-telat-input", content: "SPL manual yang dibuat oleh superadmi nmenunggu tanda tangan Anda tersedia di sini.", title: "⏰ Menu Telat Input" },
    ],
    GA: [
        { target: ".tour-dashboard", content: "Dashboard GA menampilkan ringkasan SPL tim yang perlu dikelola.", title: "📊 Menu Dashboard", disableBeacon: true },
        { target: ".tour-persetujuan-spl-tim", content: "Setujui atau tolak pengajuan SPL dari anggota tim Anda.", title: "✅ Persetujuan SPL Tim" },
        { target: ".tour-data-spl-tim", content: "Lihat semua data SPL tim Anda di sini.", title: "📋 Data SPL Tim" },
        { target: ".tour-telat-input", content: "SPL manual yang dibuat oleh superadmi nmenunggu tanda tangan Anda tersedia di sini.", title: "⏰ Menu Telat Input" },
        { target: ".tour-pengajuan-spl-saya", content: "Gunakan menu ini untuk mengajukan SPL untuk diri Anda sendiri.", title: "📝 Menu Pengajuan SPL" },
    ],
    // Karyawan departemen Security — jam reguler ditentukan oleh jadwal shift
    SECURITY_DEPT: [
        { target: "body", content: "Selamat datang! Sebagai karyawan Departemen Security, jam reguler Anda ditentukan otomatis berdasarkan jadwal shift yang diatur oleh Admin setiap harinya — bukan jam kerja standar. Pastikan shift Anda sudah diisi sebelum mengajukan SPL.", title: "🛡️ Info Penting: Sistem Shift Security", placement: "center", disableBeacon: true },
        { target: ".tour-dashboard", content: "Ini adalah menu Dashboard utama. Klik di sini untuk melihat ringkasan dan riwayat SPL Anda.", title: "🏠 Menu Dashboard" },
        { target: ".tour-pengajuan-spl", content: "Gunakan menu ini untuk mengajukan SPL lembur. Sistem akan otomatis membaca jadwal shift Anda pada tanggal yang dipilih sebagai jam reguler — tidak perlu mengisi jam reguler secara manual.", title: "📝 Pengajuan SPL (Berbasis Shift)" },
        { target: ".tour-telat-input", content: "Jika Admin menginput SPL untuk Anda dan membutuhkan tanda tangan, SPL tersebut muncul di sini.", title: "⏰ Menu Telat Input" },
        { target: ".tour-data-lama", content: "Data lembur lama sebelum aplikasi ini dibuat tersedia di sini.", title: "📂 Data Lama" },
    ],
}

const DASHBOARD_STEPS: Step[] = [
    { target: "body", content: "Sekarang kita lihat isi halaman Dashboard utama. Di sini Anda bisa memantau semua aktivitas SPL Anda.", title: "🏠 Halaman Dashboard", placement: "center", disableBeacon: true },
    { target: "#dash-header", content: "Bagian ini menampilkan sambutan, nama, jabatan, dan departemen Anda.", title: "👋 Info Pengguna", placement: "bottom", disableBeacon: true },
    { target: "#dash-history", content: "Tabel ini menampilkan riwayat semua SPL yang pernah Anda ajukan beserta statusnya.", title: "📋 Riwayat SPL", placement: "top", disableBeacon: true },
]

const MANAGER_DASHBOARD_STEPS: Step[] = [
    { target: "body", content: "Ini adalah dashboard analitik Manager. Semua data SPL perusahaan tersaji dalam grafik interaktif.", title: "📊 Dashboard Analitik", placement: "center", disableBeacon: true },
    { target: "#dash-header", content: "Header ini menampilkan identitas dan peran Anda sebagai Manager yang dapat memantau seluruh aktivitas lembur.", title: "👋 Selamat Datang, Manager", placement: "bottom", disableBeacon: true },
    { target: "#manager-stats", content: "Empat kartu ini merangkum: total SPL perusahaan, jumlah karyawan yang pernah lembur, rata-rata durasi lembur per SPL, dan total SPL yang masih menunggu persetujuan.", title: "📈 Ringkasan Statistik", placement: "bottom", disableBeacon: true },
    { target: "#manager-trend", content: "Grafik area ini menunjukkan tren jumlah pengajuan SPL per bulan selama 12 bulan terakhir. Gunakan untuk mendeteksi pola lembur musiman.", title: "📉 Tren SPL Bulanan", placement: "bottom", disableBeacon: true },
    { target: "#manager-status", content: "Donut chart ini memperlihatkan distribusi status SPL: Menunggu GA (belum disetujui supervisor), Menunggu Manager (sudah di GA, siap review Anda), Disetujui, dan Ditolak.", title: "🍩 Distribusi Status", placement: "bottom", disableBeacon: true },
    { target: "#manager-dept", content: "Grafik horizontal ini menampilkan 5 departemen dengan pengajuan SPL terbanyak. Berguna untuk memantau beban lembur per divisi.", title: "🏢 Top 5 Departemen", placement: "top", disableBeacon: true },
    { target: "#manager-daily", content: "Grafik batang ini menunjukkan total jam lembur yang diajukan setiap hari dalam 7 hari terakhir.", title: "⏱️ Jam Lembur Harian", placement: "top", disableBeacon: true },
]

const PENGAJUAN_STEPS: Step[] = [
    { target: "body", content: "Ini adalah halaman Pengajuan SPL. Isi semua kolom yang diperlukan untuk mengajukan lembur.", title: "📝 Form Pengajuan SPL", placement: "center", disableBeacon: true },
    { target: "#spl-tanggal", content: "Pilih tanggal lembur yang akan dilaksanakan. Jika tanggal sudah lewat, pengajuan akan masuk review Super Admin terlebih dahulu.", title: "📅 Tanggal Lembur", placement: "bottom", disableBeacon: true },
    { target: "#spl-waktu", content: "Isi jam mulai dan jam selesai lembur. Klik kolom waktu untuk membuka picker jam.", title: "🕐 Waktu Lembur", placement: "top", disableBeacon: true },
    { target: "#spl-alasan", content: "Jelaskan alasan lembur secara detail agar mudah dipertimbangkan oleh atasan.", title: "📋 Alasan Lembur", placement: "top", disableBeacon: true },
    { target: "#spl-foto", content: "Lampirkan foto bukti lembur jika diperlukan. Klik section untuk membuka upload.", title: "📸 Foto Bukti", placement: "top", disableBeacon: true },
    { target: "#spl-ttd", content: "Tanda tangani formulir di kanvas ini menggunakan mouse atau sentuhan. Wajib diisi sebelum mengirim.", title: "✍️ Tanda Tangan", placement: "top", disableBeacon: true },
]

const TELAT_STEPS: Step[] = [
    { target: "body", content: "Ini adalah halaman Telat Input SPL. Di sini Anda bisa menandatangani SPL yang dibuat oleh Super Admin.", title: "⏰ Halaman Telat Input", placement: "center", disableBeacon: true },
    { target: "#telat-header", content: "Halaman ini menampilkan SPL yang sudah diinputkan Admin dan menunggu tanda tangan Anda.", title: "📋 Daftar SPL Tertunda", placement: "bottom", disableBeacon: true },
    { target: "#telat-info", content: "Setelah Anda menandatangani, SPL akan otomatis diteruskan ke atasan untuk persetujuan.", title: "ℹ️ Informasi Penting", placement: "bottom", disableBeacon: true },
]

const GA_SPL_TIM_STEPS: Step[] = [
    { target: "body", content: "Ini adalah halaman Data SPL Tim. Di sini Anda bisa memantau semua pengajuan lembur dari anggota tim Anda.", title: "👥 Data SPL Tim", placement: "center", disableBeacon: true },
    { target: "#ga-header", content: "Header ini menampilkan ringkasan total SPL tim Anda secara keseluruhan.", title: "📊 Ringkasan SPL Tim", placement: "bottom", disableBeacon: true },
    { target: "#ga-stats", content: "Kartu statistik ini menunjukkan jumlah SPL berdasarkan status: Menunggu Anda, Di Manager, Disetujui, dan Ditolak.", title: "📈 Statistik Status", placement: "bottom", disableBeacon: true },
    { target: "#ga-filter", content: "Gunakan filter ini untuk mencari SPL berdasarkan nama karyawan, PIN, status, atau periode tanggal tertentu.", title: "🔍 Filter & Pencarian", placement: "bottom", disableBeacon: true },
]

function getStepsByPhase(phase: PhaseKey, role: string, sidebarKey?: string): Step[] {
    if (phase === "sidebar") return SIDEBAR_STEPS_BY_ROLE[sidebarKey ?? role] || SIDEBAR_STEPS_BY_ROLE["STAFF"]
    if (phase === "dashboard") return role === "MANAGER" ? MANAGER_DASHBOARD_STEPS : DASHBOARD_STEPS
    if (phase === "pengajuan") return PENGAJUAN_STEPS
    if (phase === "splTim") return GA_SPL_TIM_STEPS
    if (phase === "telat") return TELAT_STEPS
    return []
}

// ─── Path Helpers ─────────────────────────────────────────────────────────────
const isDashboardHome = (p: string | null) =>
    !!p && (p === "/dashboard" || p === "/dashboard/")

const isPengajuanPage = (p: string | null) =>
    !!p && (p === "/dashboard/staff/pengajuan" || p === "/dashboard/ga/pengajuan")

const isTelatPage = (p: string | null) =>
    !!p && p.includes("/telat-input")

const isGaSplTimPage = (p: string | null) =>
    !!p && p === "/dashboard/ga"

const PENGAJUAN_HREF: Record<string, string> = {
    STAFF: "/dashboard/staff/pengajuan",
    HR: "/dashboard/ga/pengajuan",
    GA: "/dashboard/ga/pengajuan",
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────
const TOUR_SEEN_KEY = (id: string) => `spl_tour_seen_${id}`
const TOUR_PHASE_KEY = (id: string) => `spl_tour_phase_${id}`

const safeStorage = {
    getItem: (key: string) => {
        if (typeof window === "undefined") return null
        try { return window.localStorage.getItem(key) } catch (e) { return null }
    },
    setItem: (key: string, value: string) => {
        if (typeof window === "undefined") return
        try { window.localStorage.setItem(key, value) } catch (e) { }
    },
    removeItem: (key: string) => {
        if (typeof window === "undefined") return
        try { window.localStorage.removeItem(key) } catch (e) { }
    }
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AppTour() {
    const { data: session } = useSession()
    const pathname = usePathname()
    const router = useRouter()

    const userId = session?.user?.id
    const userRole = (session?.user?.role as string) || "STAFF"

    // Detect security department — these users have shift-based regular hours
    const userDept = (
        (session?.user as any)?.department?.name ||
        (session?.user as any)?.departmentName ||
        ""
    ).toString().trim().toLowerCase()
    const sidebarKey = userDept === "security" ? "SECURITY_DEPT" : undefined

    const [tourPhase, setTourPhase] = useState<PhaseKey | null>(null)
    const [steps, setSteps] = useState<Step[]>([])
    const [run, setRun] = useState(false)

    // Refs for safe use inside callbacks without stale closures
    const tourPhaseRef = useRef<PhaseKey | null>(null)
    const pendingPhaseRef = useRef<PhaseKey | null>(null)  // Phase waiting for navigation
    const hasStartedRef = useRef(false) // Prevent double-init (React StrictMode)
    const isTransitioningRef = useRef(false) // Guard concurrent phase starts

    // Sync tourPhase state → ref
    useEffect(() => { tourPhaseRef.current = tourPhase }, [tourPhase])

    // ── Core: start a phase ───────────────────────────────────────────────────
    const doStartPhase = (phase: PhaseKey, delay = 600) => {
        if (isTransitioningRef.current) return

        // Skip sidebar phase on mobile since it's hidden under hamburger menu
        if (phase === "sidebar" && typeof window !== "undefined" && window.innerWidth < 1024) {
            transitionTo("dashboard", "/dashboard")
            return
        }

        isTransitioningRef.current = true

        const phaseSteps = getStepsByPhase(phase, userRole, sidebarKey)
        setRun(false)
        setTourPhase(phase)
        tourPhaseRef.current = phase
        setSteps(phaseSteps)
        pendingPhaseRef.current = null

        setTimeout(() => {
            setRun(true)
            isTransitioningRef.current = false
        }, delay)
    }

    // ── Core: transition to next phase ────────────────────────────────────────
    // Checks if already on target page → start directly; otherwise navigate first
    const transitionTo = (next: PhaseKey, targetPath: string) => {
        const alreadyThere =
            (next === "dashboard" && isDashboardHome(pathname)) ||
            (next === "pengajuan" && isPengajuanPage(pathname)) ||
            (next === "splTim" && isGaSplTimPage(pathname)) ||
            (next === "telat" && isTelatPage(pathname))

        if (alreadyThere) {
            // Already on target page — start directly without navigation
            doStartPhase(next, 400)
        } else {
            // Navigate first; pathname useEffect will start the phase on arrival
            pendingPhaseRef.current = next
            if (userId) safeStorage.setItem(TOUR_PHASE_KEY(userId), next)
            router.push(targetPath)
        }
    }

    // ── Init: run once when userId is available ───────────────────────────────
    useEffect(() => {
        if (!userId) return
        if (hasStartedRef.current) return
        if (safeStorage.getItem(TOUR_SEEN_KEY(userId))) return

        const savedPhase = safeStorage.getItem(TOUR_PHASE_KEY(userId)) as PhaseKey | null

        hasStartedRef.current = true

        if (savedPhase) {
            // Resuming from a saved phase (e.g. after page refresh mid-tour)
            pendingPhaseRef.current = savedPhase
            // Pathname useEffect will detect matching path and start the phase
            if (savedPhase === "sidebar" && !isDashboardHome(pathname)) {
                router.replace("/dashboard")
            }
        } else {
            // Brand new tour: always start from dashboard home for consistent order
            if (!isDashboardHome(pathname)) {
                pendingPhaseRef.current = "sidebar"
                safeStorage.setItem(TOUR_PHASE_KEY(userId), "sidebar")
                router.replace("/dashboard")
                return
            }

            doStartPhase("sidebar", 1000)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId])

    // ── Pathname change: start pending phase when on the right page ───────────
    useEffect(() => {
        if (!userId) return
        if (safeStorage.getItem(TOUR_SEEN_KEY(userId))) return
        if (run) return // A phase is already running
        if (!pendingPhaseRef.current) return

        const pending = pendingPhaseRef.current
        const isMatch =
            (pending === "sidebar" && isDashboardHome(pathname)) ||
            (pending === "dashboard" && isDashboardHome(pathname)) ||
            (pending === "pengajuan" && isPengajuanPage(pathname)) ||
            (pending === "splTim" && isGaSplTimPage(pathname)) ||
            (pending === "telat" && isTelatPage(pathname))

        if (!isMatch) return

        // We arrived at the right page — clear pending and start
        if (userId) safeStorage.removeItem(TOUR_PHASE_KEY(userId))
        doStartPhase(pending, 700)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, run])

    // ── Joyride Callback ──────────────────────────────────────────────────────
    const handleCallback = (data: CallBackProps) => {
        const { status } = data

        // Guard: ignore any callbacks that fire during a phase transition
        // (e.g. spurious STATUS.FINISHED Joyride fires when its steps prop changes)
        if (isTransitioningRef.current) return

        if (status === STATUS.SKIPPED) {
            setRun(false)
            if (userId) {
                safeStorage.setItem(TOUR_SEEN_KEY(userId), "true")
                safeStorage.removeItem(TOUR_PHASE_KEY(userId))
            }
            return
        }

        if (status !== STATUS.FINISHED) return

        setRun(false)
        const phase = tourPhaseRef.current

        if (phase === "sidebar") {
            transitionTo("dashboard", "/dashboard")
        } else if (phase === "dashboard") {
            // Manager has no pengajuan SPL step — end tour after dashboard
            if (userRole === "MANAGER") {
                if (userId) {
                    safeStorage.setItem(TOUR_SEEN_KEY(userId), "true")
                    safeStorage.removeItem(TOUR_PHASE_KEY(userId))
                }
                return
            }
            transitionTo("pengajuan", PENGAJUAN_HREF[userRole] || "/dashboard/staff/pengajuan")
        } else if (phase === "pengajuan") {
            // GA gets a special SPL Tim tour; others skip straight to telat
            if (userRole === "GA") {
                transitionTo("splTim", "/dashboard/ga")
            } else {
                transitionTo("telat", "/dashboard/telat-input")
            }
        } else if (phase === "splTim") {
            transitionTo("telat", "/dashboard/telat-input")
        } else if (phase === "telat") {
            // All done!
            if (userId) {
                safeStorage.setItem(TOUR_SEEN_KEY(userId), "true")
                safeStorage.removeItem(TOUR_PHASE_KEY(userId))
            }
        }
    }

    if (!userId) return null

    return (
        <>
            {/* Always inject fixed-position override so overlay covers the full viewport on all pages/devices */}
            <style>{`
                .react-joyride__overlay {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    z-index: 9998 !important;
                }
                .react-joyride__spotlight {
                    position: fixed !important;
                    z-index: 9999 !important;
                    box-sizing: border-box !important;
                }
                .__floater {
                    z-index: 10000 !important;
                }
            `}</style>
            <Joyride
                {...joyrideProps}
                steps={steps}
                run={run}
                callback={handleCallback}
                disableScrolling={tourPhase === "sidebar"}
                disableScrollParentFix={tourPhase !== "sidebar"}
            />
        </>
    )
}
