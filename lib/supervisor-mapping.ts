import { prisma } from "./prisma"

/**
 * Department to Supervisor Role Mapping
 * Menentukan role supervisor berdasarkan department
 *
 * Logic:
 * - "GA" = Supervised by GA user (role GA) - khusus Security dan Teknik (TEKNISI)
 * - "DEPARTMENT_HEAD" = Supervised by Department Head of that department (role DEPARTMENT_HEAD)
 * - Department yang tidak ada di mapping = langsung ke Manager (contoh: Admin, Produksi)
 */
export const DEPARTMENT_SUPERVISOR_MAPPING: Record<string, string> = {
  // Security & Teknik (TEKNISI) supervised by GA
  "Security": "GA",
  "Teknik": "GA",

  // Departemen dengan Department Head/Supervisor
  "HR": "DEPARTMENT_HEAD",
  "IT": "DEPARTMENT_HEAD",
  "Lab": "DEPARTMENT_HEAD",

  // Note: "Admin" dan "Produksi" tidak ada mapping, jadi langsung ke Manager
}

/**
 * Get supervisor for a department
 * @param department - Department name
 * @returns User object of supervisor or null if no supervisor needed
 */
export async function getSupervisorForDepartment(department: string | null) {
  if (!department) {
    return null
  }

  // Normalize department name (case-insensitive, trim whitespace)
  const normalizedDept = department.trim()

  // Find matching supervisor role from mapping
  const supervisorRole = DEPARTMENT_SUPERVISOR_MAPPING[normalizedDept]

  if (!supervisorRole) {
    // No supervisor mapping for this department
    // Staff will go directly to Manager
    return null
  }

  // Find supervisor user by role and department
  let supervisor = null

  if (supervisorRole === "GA") {
    // Find GA user (khusus untuk Security dan Teknik/TEKNISI)
    supervisor = await prisma.user.findFirst({
      where: {
        role: "GA",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        position: true,
      },
    })
  } else if (supervisorRole === "DEPARTMENT_HEAD") {
    // Find Department Head for this specific department
    supervisor = await prisma.user.findFirst({
      where: {
        role: "DEPARTMENT_HEAD",
        department: normalizedDept,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        position: true,
      },
    })
  }

  return supervisor
}

/**
 * Check if department has supervisor
 * @param department - Department name
 * @returns true if department has supervisor mapping
 */
export function hasSupervisorMapping(department: string | null): boolean {
  if (!department) return false
  const normalizedDept = department.trim()
  return normalizedDept in DEPARTMENT_SUPERVISOR_MAPPING
}

/**
 * Get supervisor role name for department
 * @param department - Department name
 * @returns Supervisor role name or null
 */
export function getSupervisorRoleName(department: string | null): string | null {
  if (!department) return null
  const normalizedDept = department.trim()
  return DEPARTMENT_SUPERVISOR_MAPPING[normalizedDept] || null
}

/**
 * Get all departments that require supervisor approval
 * @returns Array of department names
 */
export function getDepartmentsWithSupervisor(): string[] {
  return Object.keys(DEPARTMENT_SUPERVISOR_MAPPING)
}
