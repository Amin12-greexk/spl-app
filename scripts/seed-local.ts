/**
 * Local-only seed for SPL dual-mode testing. Idempotent (upsert by email).
 * Creates: manager, GA supervisor, staff (supervised by GA, regular 08:00-17:00).
 * Also sets MIN_OVERTIME_START=23:59 so routing is deterministic regardless of wall-clock.
 */
import { prisma } from "../lib/prisma"
import bcrypt from "bcryptjs"

async function main() {
  const password = await bcrypt.hash("password123", 10)

  const manager = await prisma.user.upsert({
    where: { email: "manager@local.test" },
    update: { role: "MANAGER", password, pin: "9001", name: "Manager Lokal" },
    create: {
      email: "manager@local.test",
      name: "Manager Lokal",
      role: "MANAGER",
      password,
      pin: "9001",
    },
  })

  const ga = await prisma.user.upsert({
    where: { email: "ga@local.test" },
    update: { role: "GA", password, pin: "9002", name: "GA Supervisor" },
    create: {
      email: "ga@local.test",
      name: "GA Supervisor",
      role: "GA",
      password,
      pin: "9002",
    },
  })

  const staff = await prisma.user.upsert({
    where: { email: "staff@local.test" },
    update: {
      role: "STAFF",
      password,
      pin: "1001",
      name: "Staff Lokal",
      supervisorId: ga.id,
      regularStartTime: "08:00",
      regularEndTime: "17:00",
    },
    create: {
      email: "staff@local.test",
      name: "Staff Lokal",
      role: "STAFF",
      password,
      pin: "1001",
      supervisorId: ga.id,
      regularStartTime: "08:00",
      regularEndTime: "17:00",
    },
  })

  await prisma.setting.upsert({
    where: { key: "MIN_OVERTIME_START" },
    update: { value: "23:59" },
    create: { key: "MIN_OVERTIME_START", value: "23:59" },
  })

  console.log(JSON.stringify({ manager: manager.id, ga: ga.id, staff: staff.id, staffPin: staff.pin }))
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
