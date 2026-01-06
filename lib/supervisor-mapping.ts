import { prisma } from "./prisma"

export type ApprovalMode = "DIRECT" | "GA" | "DEPARTMENT_HEAD"

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

async function getDepartmentById(departmentId: string | null) {
  if (!departmentId) return null
  return prisma.department.findUnique({
    where: { id: departmentId },
    select: {
      id: true,
      name: true,
      supervised: true,
      approvalMode: true,
    },
  })
}

async function getDepartmentByName(department: string | null) {
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
      id: true,
      name: true,
      supervised: true,
      approvalMode: true,
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

function resolveApprovalMode(departmentName: string, supervised: boolean, approvalMode: string | null): ApprovalMode | null {
  if (!supervised) return null
  if (approvalMode === "GA" || approvalMode === "DEPARTMENT_HEAD" || approvalMode === "DIRECT") {
    return approvalMode === "DIRECT" ? null : approvalMode
  }
  return isGaSupervisedDepartment(departmentName) ? "GA" : "DEPARTMENT_HEAD"
}

/**
 * Get supervisor for a department
 * @param department - Department name
 * @returns User object of supervisor or null if no supervisor needed
 */
export async function getSupervisorForDepartment(params: {
  departmentId?: string | null
  departmentName?: string | null
}) {
  const departmentRecord =
    (await getDepartmentById(params.departmentId || null)) ||
    (await getDepartmentByName(params.departmentName || null))

  let supervisorRole: ApprovalMode | null = null
  let departmentName = params.departmentName || null
  let departmentId = params.departmentId || null

  if (departmentRecord) {
    departmentName = departmentRecord.name
    departmentId = departmentRecord.id
    supervisorRole = resolveApprovalMode(
      departmentRecord.name,
      departmentRecord.supervised,
      departmentRecord.approvalMode
    )
  } else if (departmentName) {
    const legacyRole = getLegacySupervisorRole(departmentName)
    supervisorRole = legacyRole === "GA" || legacyRole === "DEPARTMENT_HEAD" ? legacyRole : null
  }

  if (!supervisorRole || !departmentName) return null

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
        departmentName: true,
        departmentId: true,
        position: true,
      },
    })
  } else if (supervisorRole === "DEPARTMENT_HEAD") {
    // Find Department Head for this specific department
    supervisor = await prisma.user.findFirst({
      where: {
        role: "DEPARTMENT_HEAD",
        OR: [
          departmentId ? { departmentId } : undefined,
          {
            departmentName: {
              equals: departmentName,
              mode: "insensitive",
            },
          },
        ].filter(Boolean) as any,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentName: true,
        departmentId: true,
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
export async function hasSupervisorMapping(params: {
  departmentId?: string | null
  departmentName?: string | null
}): Promise<boolean> {
  const departmentRecord =
    (await getDepartmentById(params.departmentId || null)) ||
    (await getDepartmentByName(params.departmentName || null))
  if (departmentRecord) {
    return Boolean(resolveApprovalMode(departmentRecord.name, departmentRecord.supervised, departmentRecord.approvalMode))
  }
  return Boolean(getLegacySupervisorRole(params.departmentName || null))
}

/**
 * Get supervisor role name for department
 * @param department - Department name
 * @returns Supervisor role name or null
 */
export async function getSupervisorRoleName(params: {
  departmentId?: string | null
  departmentName?: string | null
}): Promise<string | null> {
  const departmentRecord =
    (await getDepartmentById(params.departmentId || null)) ||
    (await getDepartmentByName(params.departmentName || null))
  if (departmentRecord) {
    return resolveApprovalMode(departmentRecord.name, departmentRecord.supervised, departmentRecord.approvalMode)
  }
  return getLegacySupervisorRole(params.departmentName || null)
}

/**
 * Get all departments that require supervisor approval
 * @returns Array of department names
 */
export async function getDepartmentsWithSupervisor(): Promise<string[]> {
  const departments = await prisma.department.findMany({
    where: { supervised: true },
    select: { name: true, approvalMode: true },
    orderBy: { name: "asc" },
  })

  if (departments.length > 0) {
    return departments
      .filter((dept) => resolveApprovalMode(dept.name, true, dept.approvalMode) !== null)
      .map((dept) => dept.name)
  }

  return Object.keys(LEGACY_DEPARTMENT_SUPERVISOR_MAPPING)
}
