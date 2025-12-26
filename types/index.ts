// Kita TIDAK mengimpor dari @prisma/client
// Sebaliknya, kita definisikan tipe-tipe itu di sini.

/**
 * Mendefinisikan peran (Role) pengguna yang valid dalam aplikasi.
 * Ini adalah "sumber kebenaran" untuk tipe data Role.
 */
export type Role = "STAFF" | "HR" | "MANAGER"

/**
 * Mendefinisikan status (SplStatus) pengajuan lembur yang valid.
 */
export type SplStatus = "PENDING" | "APPROVED" | "REJECTED"

// --- Interface untuk Model Database ---

export interface User {
  id: string
  email: string
  name: string
  role: Role // <-- Menggunakan tipe Role yang kita definisikan di atas
  pin?: string
  department?: string | null
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
  status: SplStatus // <-- Menggunakan tipe SplStatus yang kita definisikan di atas
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
    pin?: string
  }

  interface Session {
    user: User & {
      id: string
      role: Role
      department?: string | null
      pin?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: Role // <-- Menggunakan tipe Role
    department?: string | null
    pin?: string
  }
}

