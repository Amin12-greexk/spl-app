import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Role } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert role code to user-friendly Indonesian label
 */
export function getRoleLabel(role: Role | string): string {
  const roleMap: Record<string, string> = {
    "STAFF": "Staff",
    "HR": "HR",
    "MANAGER": "Manager",
    "GA": "GA",
    "DEPARTMENT_HEAD": "Kepala Departemen",
    "PRODUCTION_SUPERVISOR": "Pengawas Produksi",
  }

  return roleMap[role] || role
}