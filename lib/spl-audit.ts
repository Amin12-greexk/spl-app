import { prisma } from "@/lib/prisma"

/**
 * Append-only audit trail for SPL lifecycle events.
 *
 * Design notes:
 * - Writes to `spl_audit_logs` (FK-less, survives hard-deletes of an Spl/User).
 * - NEVER throws: a failed audit write must not break the primary request. Errors are logged.
 * - `action` is a stable machine code (see SplAuditAction); `note` is free text.
 */

export type SplAuditAction =
  | "CREATE"
  | "SUPERVISOR_APPROVE"
  | "SUPERVISOR_REJECT"
  | "MANAGER_APPROVE"
  | "MANAGER_REJECT"
  | "REALIZATION_MANUAL"
  | "REALIZATION_AUTO_FINGER"
  | "REALIZATION_AUTOFILL"
  | "ADMIN_MANUAL_CREATE"
  | "ADMIN_EDIT"
  | "ADMIN_DELETE"
  | "DELETE"
  | "SIGN"

export interface RecordSplAuditInput {
  splId: string
  action: SplAuditAction
  actorId?: string | null
  oldStatus?: string | null
  newStatus?: string | null
  /** The SPL `source`/method involved, e.g. SYSTEM | MANUAL | LEGACY | AUTO_FINGER | SYSTEM_CRON. */
  source?: string | null
  note?: string | null
  /** Optional transaction client to keep the audit write inside the caller's tx. */
  client?: { splAuditLog: { create: (args: any) => Promise<any> } }
}

/**
 * Record one audit entry. Resolves to the created row id, or null if the write failed.
 * Safe to `await` without try/catch — it swallows its own errors.
 */
export async function recordSplAudit(
  input: RecordSplAuditInput
): Promise<string | null> {
  const db = input.client ?? prisma
  try {
    const row = await db.splAuditLog.create({
      data: {
        splId: input.splId,
        actorId: input.actorId ?? null,
        oldStatus: input.oldStatus ?? null,
        newStatus: input.newStatus ?? null,
        source: input.source ?? null,
        action: input.action,
        note: input.note ?? null,
      },
      select: { id: true },
    })
    return row.id
  } catch (error) {
    console.error(
      `[SplAudit] Failed to record audit (${input.action}) for SPL ${input.splId}:`,
      error
    )
    return null
  }
}
