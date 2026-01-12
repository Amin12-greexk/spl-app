// Kita TIDAK mengimpor dari @prisma/client
// Sebaliknya, kita definisikan tipe-tipe itu di sini.

/**
 * Mendefinisikan peran (Role) pengguna yang valid dalam aplikasi.
 * Ini adalah "sumber kebenaran" untuk tipe data Role.
 */
export type Role = "STAFF" | "HR" | "MANAGER" | "GA" | "DEPARTMENT_HEAD" | "PRODUCTION_SUPERVISOR" | "TEKNISI" | "DRIVER" | "SUPER_ADMIN"

export type DepartmentApprovalMode = "DIRECT" | "GA" | "DEPARTMENT_HEAD"

/**
 * Mendefinisikan status (SplStatus) pengajuan lembur yang valid.
 * - PENDING_SUPERVISOR: Menunggu persetujuan supervisor/GA/Kepala Dept
 * - PENDING_MANAGER: Sudah disetujui supervisor, menunggu persetujuan manager
 * - APPROVED: Disetujui oleh manager (final)
 * - REJECTED_BY_SUPERVISOR: Ditolak oleh supervisor
 * - REJECTED_BY_MANAGER: Ditolak oleh manager
 * - PENDING: Legacy status untuk backward compatibility
 * - REJECTED: Legacy status untuk backward compatibility
 */
export type SplStatus =
  | "PENDING_SUPERVISOR"
  | "PENDING_MANAGER"
  | "APPROVED"
  | "IN_PROGRESS"
  | "DONE"
  | "REJECTED_BY_SUPERVISOR"
  | "REJECTED_BY_MANAGER"
  | "PENDING"  // Legacy
  | "REJECTED" // Legacy

// --- Interface untuk Model Database ---

export interface User {
  id: string
  email: string
  name: string
  role: Role // <-- Menggunakan tipe Role yang kita definisikan di atas
  pin?: string
  departmentId?: string | null
  departmentName?: string | null
  department?: Department | null
  position?: string | null
  regularStartTime?: string | null
  regularEndTime?: string | null
  supervisorId?: string | null
  supervisor?: User | null
  subordinates?: User[]
}

export interface Department {
  id: string
  name: string
  supervised: boolean
  approvalMode: DepartmentApprovalMode
}

export interface Spl {
  id: string
  requesterId: string
  requester: User
  date: Date
  startTime: string
  endTime: string
  totalHours: number
  reason: string
  signature?: string | null
  projectName?: string | null
  proofImage?: string | null
  actualStartAt?: Date | string | null
  actualEndAt?: Date | string | null
  actualTotalHours?: number | null
  realizationNote?: string | null
  realizationProofImage?: string | null
  overrunReason?: string | null
  regularStartAt?: Date | string | null
  regularEndAt?: Date | string | null
  plannedStartAt?: Date | string | null
  plannedEndAt?: Date | string | null
  realizedMinutes?: number | null
  realizationCounted?: boolean | null
  realizationCancelReason?: string | null
  status: SplStatus // <-- Menggunakan tipe SplStatus yang kita definisikan di atas
  isManualEntry?: boolean
  requesterSignedAt?: Date | null

  // Supervisor approval (Level 1)
  supervisorId?: string | null
  supervisor?: User | null
  supervisorApprovalDate?: Date | null
  supervisorSignature?: string | null
  supervisorRejectionReason?: string | null

  // Manager approval (Level 2)
  approverId?: string | null
  approver?: User | null
  approvalDate?: Date | null
  rejectionReason?: string | null

  createdAt: Date
  updatedAt: Date
}

// --- Interface untuk Input API ---

export interface CreateSplInput {
  date: string
  startTime: string
  endTime: string
  reason: string
  signature: string
  projectName?: string
  proofImage?: string
}

export interface UpdateSplStatusInput {
  status: SplStatus // <-- Menggunakan tipe SplStatus
  rejectionReason?: string
}

// --- Deklarasi Modul untuk NextAuth ---
// Ini memberitahu TypeScript bahwa session dan token kita
// memiliki properti kustom (id, role, department).

declare module "next-auth" {
  /**
   * TAMBAHKAN INTERFACE INI
   * Ini akan "menggabungkan" tipe Anda dengan tipe User bawaan NextAuth.
   */
  interface User {
    role: Role
    department?: string | null
    departmentId?: string | null
    pin?: string
    position?: string | null
    supervisorId?: string | null
    regularStartTime?: string | null
    regularEndTime?: string | null
  }

  interface Session {
    user: User & {
      id: string
      role: Role
      department?: string | null
      departmentId?: string | null
      pin?: string
      position?: string | null
      supervisorId?: string | null
      regularStartTime?: string | null
      regularEndTime?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: Role // <-- Menggunakan tipe Role
    department?: string | null
    departmentId?: string | null
    pin?: string
    position?: string | null
    supervisorId?: string | null
    regularStartTime?: string | null
    regularEndTime?: string | null
  }
}

