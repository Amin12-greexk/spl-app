/**
 * Fase 5 — local integration scenarios for SPL dual-mode (Auto + Manual).
 * Drives the REAL HTTP endpoints on the dev server (auth via minted NextAuth JWT cookies),
 * uses the mock ABSEN API for fingerprint, and asserts against the local DB via Prisma.
 *
 * Run with local env (matching .env.development.local):
 *   DATABASE_URL=... NEXTAUTH_SECRET=local-test-secret-32chars-minimum-xyz npx tsx scripts/test-scenarios.ts
 */
import { encode } from "next-auth/jwt"
import fs from "fs"
import path from "path"
import { prisma } from "../lib/prisma"

const BASE = "http://127.0.0.1:3010"
const SECRET = process.env.NEXTAUTH_SECRET || "local-test-secret-32chars-minimum-xyz"
const CRON_SECRET = process.env.CRON_SECRET || "local-cron-secret"
const MOCK_FILE = path.join(__dirname, "_mock_scans.json")
const SIG = "x".repeat(40)

const results: Array<{ name: string; pass: boolean; detail: string }> = []
const check = (name: string, pass: boolean, detail = "") => {
  results.push({ name, pass, detail })
  console.log(`${pass ? "PASS" : "FAIL"} — ${name}${detail ? ` :: ${detail}` : ""}`)
}

const scanStr = (d: Date) => d.toLocaleString("sv-SE", { timeZone: "Asia/Jakarta" })
const setMock = (pin: string, scans: string[]) =>
  fs.writeFileSync(MOCK_FILE, JSON.stringify({ [pin]: scans }))

async function cookieFor(user: any) {
  const token = await encode({
    secret: SECRET,
    maxAge: 60 * 60,
    token: {
      sub: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.departmentName ?? null,
      departmentId: user.departmentId ?? null,
      pin: user.pin,
      position: user.position ?? null,
      supervisorId: user.supervisorId ?? null,
      regularStartTime: user.regularStartTime ?? null,
      regularEndTime: user.regularEndTime ?? null,
      image: user.image ?? null,
    },
  })
  return `next-auth.session-token=${token}`
}

async function api(
  pathname: string,
  opts: { method?: string; cookie?: string; body?: any; bearer?: string } = {}
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (opts.cookie) headers["cookie"] = opts.cookie
  if (opts.bearer) headers["authorization"] = `Bearer ${opts.bearer}`
  const res = await fetch(BASE + pathname, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  let json: any = null
  try {
    json = await res.json()
  } catch {
    /* ignore */
  }
  return { status: res.status, json }
}

const todayJakarta = () => {
  const s = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Jakarta" })
  return s.slice(0, 10)
}

/** Shift an SPL's planned/regular/date fields back by N days (time-travel to the past). */
async function travelBack(splId: string, days: number) {
  const spl = await prisma.spl.findUnique({
    where: { id: splId },
    select: { date: true, plannedStartAt: true, plannedEndAt: true, regularStartAt: true, regularEndAt: true },
  })
  if (!spl) return
  const shift = (d: Date | null) => (d ? new Date(d.getTime() - days * 86400000) : null)
  await prisma.spl.update({
    where: { id: splId },
    data: {
      date: shift(spl.date)!,
      plannedStartAt: shift(spl.plannedStartAt),
      plannedEndAt: shift(spl.plannedEndAt),
      regularStartAt: shift(spl.regularStartAt),
      regularEndAt: shift(spl.regularEndAt),
    },
  })
}

async function createAutoApproved(staffCookie: string, gaCookie: string, travelDays: number) {
  const created = await api("/api/spl", {
    method: "POST",
    cookie: staffCookie,
    body: { date: todayJakarta(), reason: "Uji auto", signature: SIG, mode: "AUTO" },
  })
  if (created.status !== 201) throw new Error("create auto failed: " + JSON.stringify(created))
  const splId = created.json.id
  const appr = await api("/api/spl/approve-supervisor", {
    method: "POST",
    cookie: gaCookie,
    body: { splId, signature: SIG },
  })
  if (appr.status !== 200) throw new Error("approve failed: " + JSON.stringify(appr))
  await travelBack(splId, travelDays)
  return splId
}

async function main() {
  const staff = await prisma.user.findUnique({ where: { email: "staff@local.test" } })
  const ga = await prisma.user.findUnique({ where: { email: "ga@local.test" } })
  const manager = await prisma.user.findUnique({ where: { email: "manager@local.test" } })
  if (!staff || !ga || !manager) throw new Error("seed users missing")

  // Clean prior test SPLs/audit for a deterministic run
  const old = await prisma.spl.findMany({ where: { requesterId: staff.id }, select: { id: true } })
  await prisma.splAuditLog.deleteMany({ where: { splId: { in: old.map((s) => s.id) } } })
  await prisma.spl.deleteMany({ where: { requesterId: staff.id } })

  const staffCookie = await cookieFor(staff)
  const gaCookie = await cookieFor(ga)
  const managerCookie = await cookieFor(manager)
  const pin = staff.pin

  // ---- Sanity: auth cookie works ----
  const stats = await api("/api/spl/stats", { cookie: staffCookie })
  check("Auth: minted JWT cookie accepted", stats.status === 200, `status=${stats.status}`)

  // ================= S1: Auto submission + fingerprint success (via CRON poller) =================
  {
    const created = await api("/api/spl", {
      method: "POST",
      cookie: staffCookie,
      body: { date: todayJakarta(), reason: "S1 auto", signature: SIG, mode: "AUTO" },
    })
    check("S1: auto create -> 201 PENDING_SUPERVISOR", created.status === 201 && created.json.status === "PENDING_SUPERVISOR", `status=${created.json?.status}`)
    check("S1: auto derived startTime=17:00 endTime=19:00 (+2h default)", created.json?.startTime === "17:00" && created.json?.endTime === "19:00", `${created.json?.startTime}-${created.json?.endTime}`)
    check("S1: inputMode=AUTO persisted", created.json?.inputMode === "AUTO", `inputMode=${created.json?.inputMode}`)
    const splId = created.json.id

    const appr = await api("/api/spl/approve-supervisor", { method: "POST", cookie: gaCookie, body: { splId, signature: SIG } })
    check("S1: GA approve -> PENDING_MANAGER", appr.status === 200 && appr.json?.spl?.status === "PENDING_MANAGER", `status=${appr.json?.spl?.status}`)

    await travelBack(splId, 1)
    const planned = await prisma.spl.findUnique({ where: { id: splId }, select: { plannedStartAt: true } })
    const departure = new Date(planned!.plannedStartAt!.getTime() + 90 * 60000) // +1h30 (within 2h plan)
    setMock(pin, [scanStr(departure)])

    const cron = await api("/api/cron/fingerprint-finalize", { bearer: CRON_SECRET })
    check("S1: cron finalize ran (enabled)", cron.status === 200 && cron.json?.enabled === true, JSON.stringify(cron.json?.finalized))
    const after = await prisma.spl.findUnique({ where: { id: splId } })
    check("S1: realizationSource=AUTO_FINGER", after?.realizationSource === "AUTO_FINGER", `${after?.realizationSource}`)
    check("S1: realizedMinutes=90, no overrun", after?.realizedMinutes === 90 && !after?.overrunReason, `min=${after?.realizedMinutes} overrun=${after?.overrunReason}`)
    check("S1: actualEndAt set, status still PENDING_MANAGER", !!after?.actualEndAt && after?.status === "PENDING_MANAGER", `status=${after?.status}`)

    const mgr = await api(`/api/spl/${splId}`, { method: "PATCH", cookie: managerCookie, body: { status: "APPROVED" } })
    check("S1: manager approve -> APPROVED", mgr.status === 200 && mgr.json?.status === "APPROVED", `status=${mgr.json?.status}`)

    const audits = await prisma.splAuditLog.findMany({ where: { splId }, select: { action: true } })
    const actions = audits.map((a) => a.action).sort()
    check("S1: audit trail complete", ["CREATE", "MANAGER_APPROVE", "REALIZATION_AUTO_FINGER", "SUPERVISOR_APPROVE"].every((a) => actions.includes(a)), actions.join(","))
  }

  // ================= S2: Auto submission, NO fingerprint =================
  let s2Id = ""
  {
    s2Id = await createAutoApproved(staffCookie, gaCookie, 2)
    setMock(pin, []) // no scans
    const auto = await api(`/api/spl/${s2Id}/realization/auto`, { method: "POST", cookie: staffCookie })
    check("S2: no fingerprint -> 409", auto.status === 409, `status=${auto.status}`)
    const after = await prisma.spl.findUnique({ where: { id: s2Id } })
    check("S2: actualEndAt remains null (awaiting data / fallback)", after?.actualEndAt === null, `actualEndAt=${after?.actualEndAt}`)
  }

  // ================= S3: Fingerprint arrives LATE (retry succeeds) =================
  {
    const planned = await prisma.spl.findUnique({ where: { id: s2Id }, select: { plannedStartAt: true } })
    const departure = new Date(planned!.plannedStartAt!.getTime() + 60 * 60000)
    setMock(pin, [scanStr(departure)]) // scan now available
    const auto = await api(`/api/spl/${s2Id}/realization/auto`, { method: "POST", cookie: staffCookie })
    check("S3: late fingerprint retry -> finalized", auto.status === 200, `status=${auto.status}`)
    const after = await prisma.spl.findUnique({ where: { id: s2Id } })
    check("S3: realizationSource=AUTO_FINGER, realizedMinutes=60", after?.realizationSource === "AUTO_FINGER" && after?.realizedMinutes === 60, `src=${after?.realizationSource} min=${after?.realizedMinutes}`)
  }

  // ================= S4: Realization LONGER than plan (overrun) =================
  {
    const splId = await createAutoApproved(staffCookie, gaCookie, 3)
    const planned = await prisma.spl.findUnique({ where: { id: splId }, select: { plannedStartAt: true, plannedEndAt: true } })
    const departure = new Date(planned!.plannedEndAt!.getTime() + 90 * 60000) // 1.5h past plan end
    setMock(pin, [scanStr(departure)])
    const auto = await api(`/api/spl/${splId}/realization/auto`, { method: "POST", cookie: staffCookie })
    check("S4: overrun finalize -> 200", auto.status === 200, `status=${auto.status}`)
    const after = await prisma.spl.findUnique({ where: { id: splId } })
    check("S4: realizedMinutes clamped to plan (120)", after?.realizedMinutes === 120, `min=${after?.realizedMinutes}`)
    check("S4: overrunReason auto-populated", !!after?.overrunReason, `${after?.overrunReason}`)
  }

  // ================= S5: Fallback to MANUAL (device problem) =================
  let s5Id = ""
  {
    s5Id = await createAutoApproved(staffCookie, gaCookie, 4)
    setMock(pin, []) // fingerprint unavailable
    const manualRes = await api(`/api/spl/${s5Id}/realization/manual`, {
      method: "POST",
      cookie: staffCookie,
      body: { startTime: "17:00", endTime: "18:30", endDayOffset: 0, note: "manual fallback", overrunReason: "device finger rusak" },
    })
    check("S5: manual fallback realization -> 200", manualRes.status === 200, `status=${manualRes.status}`)
    const after = await prisma.spl.findUnique({ where: { id: s5Id } })
    check("S5: realizationSource=MANUAL", after?.realizationSource === "MANUAL", `src=${after?.realizationSource}`)

    // Now a late fingerprint must NOT overwrite the manual realization (idempotent)
    const planned = await prisma.spl.findUnique({ where: { id: s5Id }, select: { plannedStartAt: true } })
    setMock(pin, [scanStr(new Date(planned!.plannedStartAt!.getTime() + 110 * 60000))])
    const auto = await api(`/api/spl/${s5Id}/realization/auto`, { method: "POST", cookie: staffCookie })
    const afterAuto = await prisma.spl.findUnique({ where: { id: s5Id } })
    check("S5: auto does not overwrite manual (idempotent)", afterAuto?.realizationSource === "MANUAL", `src=${afterAuto?.realizationSource} httpStatus=${auto.status}`)
  }

  // ================= S6: Approval REJECTED (supervisor + manager) =================
  {
    const c = await api("/api/spl", { method: "POST", cookie: staffCookie, body: { date: todayJakarta(), reason: "S6 reject", signature: SIG, mode: "AUTO" } })
    const splId = c.json.id
    const rej = await api("/api/spl/reject-supervisor", { method: "POST", cookie: gaCookie, body: { splId, rejectionReason: "tidak perlu lembur" } })
    check("S6a: supervisor reject -> REJECTED_BY_SUPERVISOR", rej.status === 200 && rej.json?.spl?.status === "REJECTED_BY_SUPERVISOR", `status=${rej.json?.spl?.status}`)
    const audit = await prisma.splAuditLog.findFirst({ where: { splId, action: "SUPERVISOR_REJECT" } })
    check("S6a: reject audited", !!audit, "")

    // manager reject path
    const splId2 = await createAutoApproved(staffCookie, gaCookie, 5)
    const planned = await prisma.spl.findUnique({ where: { id: splId2 }, select: { plannedStartAt: true } })
    setMock(pin, [scanStr(new Date(planned!.plannedStartAt!.getTime() + 80 * 60000))])
    await api(`/api/spl/${splId2}/realization/auto`, { method: "POST", cookie: staffCookie })
    const mrej = await api(`/api/spl/${splId2}`, { method: "PATCH", cookie: managerCookie, body: { status: "REJECTED_BY_MANAGER", rejectionReason: "data tidak sesuai" } })
    check("S6b: manager reject -> REJECTED_BY_MANAGER", mrej.status === 200 && mrej.json?.status === "REJECTED_BY_MANAGER", `status=${mrej.json?.status}`)
  }

  // ================= S7: DOUBLE fingerprint event =================
  {
    const splId = await createAutoApproved(staffCookie, gaCookie, 6)
    const planned = await prisma.spl.findUnique({ where: { id: splId }, select: { plannedStartAt: true } })
    const dep1 = new Date(planned!.plannedStartAt!.getTime() + 60 * 60000) // 18:00
    const dep2 = new Date(planned!.plannedStartAt!.getTime() + 105 * 60000) // 18:45 (latest)
    setMock(pin, [scanStr(dep1), scanStr(dep2)])
    const first = await api(`/api/spl/${splId}/realization/auto`, { method: "POST", cookie: staffCookie })
    const afterFirst = await prisma.spl.findUnique({ where: { id: splId } })
    check("S7: first event finalizes using LATEST scan (105 min)", first.status === 200 && afterFirst?.realizedMinutes === 105, `min=${afterFirst?.realizedMinutes}`)
    const endFirst = afterFirst?.actualEndAt?.getTime()

    // duplicate/second event
    const second = await api(`/api/spl/${splId}/realization/auto`, { method: "POST", cookie: staffCookie })
    const afterSecond = await prisma.spl.findUnique({ where: { id: splId } })
    check("S7: duplicate event is idempotent (no overwrite, not 200-finalized)", second.status !== 200 && afterSecond?.actualEndAt?.getTime() === endFirst, `status=${second.status}`)
    const fingerAudits = await prisma.splAuditLog.count({ where: { splId, action: "REALIZATION_AUTO_FINGER" } })
    check("S7: exactly one AUTO_FINGER audit entry", fingerAudits === 1, `count=${fingerAudits}`)
  }

  const passed = results.filter((r) => r.pass).length
  const total = results.length
  console.log(`\n==== ${passed}/${total} checks passed ====`)

  fs.writeFileSync(
    path.join(__dirname, "_test_results.json"),
    JSON.stringify({ passed, total, results }, null, 2)
  )

  await prisma.$disconnect()
  if (passed !== total) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
