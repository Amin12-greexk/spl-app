import { prisma } from "./prisma"

/**
 * Legacy Department to Supervisor Role Mapping
 * Digunakan sebagai fallback jika belum ada data departemen di database.
 */
export const LEGACY_DEPARTMENT_SUPERVISOR_MAPPING: Record<string, string> = {
  "Security": "GA",
  "Teknik": "GA",
  "Driver": "GA",
  "HR": "DEPARTMENT_HEAD",
  "IT": "DEPARTMENT_HEAD",
  "Lab": "DEPARTMENT_HEAD",
}

const GA_SUPERVISED_DEPARTMENTS = new Set(["security", "teknik", "driver"])

async function getDepartmentRecord(department: string | null) {
  if (!department) return null
  const normalizedDept = department.trim()
  if (!normalizedDept) return null

  return prisma.department.findFirst({
    where: {
      name: {
        equals: normalizedDept,
        mode: "insensitive",
      },
    },
    select: {
      name: true,
      supervised: true,
    },
  })
}

function getLegacySupervisorRole(department: string | null): string | null {
  if (!department) return null
  const normalizedDept = department.trim()
  return LEGACY_DEPARTMENT_SUPERVISOR_MAPPING[normalizedDept] || null
}

function isGaSupervisedDepartment(department: string): boolean {
  return GA_SUPERVISED_DEPARTMENTS.has(department.trim().toLowerCase())
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

  const normalizedDept = department.trim()
  const departmentRecord = await getDepartmentRecord(normalizedDept)

  let supervisorRole: string | null = null

  if (departmentRecord) {
    if (!departmentRecord.supervised) {
      return null
    }
    supervisorRole = isGaSupervisedDepartment(normalizedDept) ? "GA" : "DEPARTMENT_HEAD"
  } else {
    supervisorRole = getLegacySupervisorRole(normalizedDept)
  }

  if (!supervisorRole) return null

  // Find supervisor user by role and department
  let supervisor = null

  if (supervisorRole === "GA") {
    // Find GA user (khusus untuk Security, Teknik/TEKNISI, dan Driver)
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
export async function hasSupervisorMapping(department: string | null): Promise<boolean> {
  if (!department) return false
  const departmentRecord = await getDepartmentRecord(department)
  if (departmentRecord) {
    return departmentRecord.supervised
  }
  return Boolean(getLegacySupervisorRole(department))
}

/**
 * Get supervisor role name for department
 * @param department - Department name
 * @returns Supervisor role name or null
 */
export async function getSupervisorRoleName(department: string | null): Promise<string | null> {
  if (!department) return null
  const departmentRecord = await getDepartmentRecord(department)
  if (departmentRecord) {
    if (!departmentRecord.supervised) return null
    return isGaSupervisedDepartment(departmentRecord.name) ? "GA" : "DEPARTMENT_HEAD"
  }
  return getLegacySupervisorRole(department)
}

/**
 * Get all departments that require supervisor approval
 * @returns Array of department names
 */
export async function getDepartmentsWithSupervisor(): Promise<string[]> {
  const departments = await prisma.department.findMany({
    where: { supervised: true },
    select: { name: true },
    orderBy: { name: "asc" },
  })

  if (departments.length > 0) {
    return departments.map((dept) => dept.name)
  }

  return Object.keys(LEGACY_DEPARTMENT_SUPERVISOR_MAPPING)
}
