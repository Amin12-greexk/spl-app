import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting seed...")

  // Hash password: password123
  const hashedPassword = await bcrypt.hash("password123", 10)
  const defaultRegularHours = {
    regularStartTime: "08:00",
    regularEndTime: "16:30",
  }

  const applyDefaultRegularHours = async (userId: string) => {
    await prisma.user.updateMany({
      where: {
        id: userId,
        regularStartTime: null,
        regularEndTime: null,
      },
      data: defaultRegularHours,
    })
  }

  const departments = [
    { name: "System", supervised: false, approvalMode: "DIRECT" },
    { name: "Management", supervised: false, approvalMode: "DIRECT" },
    { name: "General Affair", supervised: false, approvalMode: "DIRECT" },
    { name: "HR", supervised: true, approvalMode: "DEPARTMENT_HEAD" },
    { name: "Produksi", supervised: true, approvalMode: "DEPARTMENT_HEAD" },
    { name: "IT", supervised: true, approvalMode: "DEPARTMENT_HEAD" },
    { name: "Lab", supervised: true, approvalMode: "DEPARTMENT_HEAD" },
    { name: "Admin", supervised: false, approvalMode: "DIRECT" },
    { name: "Teknik", supervised: true, approvalMode: "GA" },
    { name: "Driver", supervised: true, approvalMode: "GA" },
    { name: "Security", supervised: true, approvalMode: "GA" },
  ]

  for (const department of departments) {
    await prisma.department.upsert({
      where: { name: department.name },
      update: {
        supervised: department.supervised,
        approvalMode: department.approvalMode,
      },
      create: department,
    })
  }
  console.log("Departments seeded")

  const departmentRecords = await prisma.department.findMany({
    select: { id: true, name: true },
  })
  const departmentIdByName = new Map(
    departmentRecords.map((dept) => [dept.name, dept.id])
  )

  // 1. Create Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "admin@tunasestaindonesia.com",
      name: "Super Administrator",
      password: hashedPassword,
      pin: "000000",
      role: "SUPER_ADMIN",
      departmentName: "System",
      departmentId: departmentIdByName.get("System") || null,
      position: "Super Admin",
    },
  })
  console.log("✅ Super Admin created")

  // 2. Create Manager
  const manager = await prisma.user.upsert({
    where: { email: "tiyas@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "tiyas@tunasestaindonesia.com",
      name: "TIYAS INDAH SETYOWURI",
      password: hashedPassword,
      pin: "210",
      role: "MANAGER",
      departmentName: "Management",
      departmentId: departmentIdByName.get("Management") || null,
      position: "General Manager",
    },
  })
  console.log("✅ Manager created")

  // 3. Create GA
  const ga = await prisma.user.upsert({
    where: { email: "nizar@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "nizar@tunasestaindonesia.com",
      name: "NIZAR NAZARUDIN",
      password: hashedPassword,
      pin: "222",
      role: "GA",
      departmentName: "General Affair",
      departmentId: departmentIdByName.get("General Affair") || null,
      position: "GA Supervisor",
      ...defaultRegularHours,
    },
  })
  await applyDefaultRegularHours(ga.id)
  console.log("✅ GA created")

  // 4. Create HR
  const hr = await prisma.user.upsert({
    where: { email: "hayyu@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "hayyu@tunasestaindonesia.com",
      name: "HAYYU SABRINA",
      password: hashedPassword,
      pin: "212",
      role: "HR",
      departmentName: "HR",
      departmentId: departmentIdByName.get("HR") || null,
      position: "HR Manager",
      ...defaultRegularHours,
    },
  })
  await applyDefaultRegularHours(hr.id)
  console.log("✅ HR created")

  // 5. Create Production Supervisor
  const productionSupervisor = await prisma.user.upsert({
    where: { email: "ganes@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "ganes@tunasestaindonesia.com",
      name: "GANES TIRZA YEMIMA",
      password: hashedPassword,
      pin: "137",
      role: "PRODUCTION_SUPERVISOR",
      departmentName: "Produksi",
      departmentId: departmentIdByName.get("Produksi") || null,
      position: "Pengawas Produksi",
      ...defaultRegularHours,
    },
  })
  await applyDefaultRegularHours(productionSupervisor.id)
  console.log("✅ Production Supervisor created")
  // 6. Create Production Department Head
  const productionHead = await prisma.user.upsert({
    where: { email: "aam@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "aam@tunasestaindonesia.com",
      name: "AAM KHUSNUN NIAM",
      password: hashedPassword,
      pin: "220",
      role: "DEPARTMENT_HEAD",
      departmentName: "Produksi",
      departmentId: departmentIdByName.get("Produksi") || null,
      position: "Kepala Departemen Produksi",
      ...defaultRegularHours,
    },
  })
  await applyDefaultRegularHours(productionHead.id)
  console.log("Production Department Head created")

  // 7. Create IT Staff (need to create IT Dept Head first if exists, or direct to manager)
  const itStaff = await prisma.user.upsert({
    where: { email: "amin@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "amin@tunasestaindonesia.com",
      name: "ABDUL WAHID AMIN",
      password: hashedPassword,
      pin: "209",
      role: "STAFF",
      departmentName: "IT",
      departmentId: departmentIdByName.get("IT") || null,
      position: "IT Staff",
      supervisorId: null, // Will be updated if IT Head exists
      ...defaultRegularHours,
    },
  })
  await applyDefaultRegularHours(itStaff.id)
  console.log("✅ IT Staff created")

  // 8. Create Lab Staff
  const labStaff = await prisma.user.upsert({
    where: { email: "hajar@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "hajar@tunasestaindonesia.com",
      name: "HAJAR ANNISA SEPTIARANI",
      password: hashedPassword,
      pin: "219",
      role: "STAFF",
      departmentName: "Lab",
      departmentId: departmentIdByName.get("Lab") || null,
      position: "Lab Analyst",
      supervisorId: null, // Will be updated if Lab Head exists
      ...defaultRegularHours,
    },
  })
  await applyDefaultRegularHours(labStaff.id)
  console.log("✅ Lab Staff created")

  // 9. Create Admin Staff (direct to manager)
  const adminStaff = await prisma.user.upsert({
    where: { email: "adinda.rahma.habibah@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "adinda.rahma.habibah@tunasestaindonesia.com",
      name: "ADINDA RAHMA HABIBAH",
      password: hashedPassword,
      pin: "218",
      role: "STAFF",
      departmentName: "Admin",
      departmentId: departmentIdByName.get("Admin") || null,
      position: "Admin",
      supervisorId: null,
      ...defaultRegularHours,
    },
  })
  await applyDefaultRegularHours(adminStaff.id)
  console.log("Admin Staff created")

  // 10. Create Teknisi (supervised by GA)
  const teknisi = await prisma.user.upsert({
    where: { email: "pandu@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "pandu@tunasestaindonesia.com",
      name: "PANDU BIRAWANTO",
      password: hashedPassword,
      pin: "221",
      role: "TEKNISI",
      departmentName: "Teknik",
      departmentId: departmentIdByName.get("Teknik") || null,
      position: "Teknisi",
      supervisorId: ga.id,
      ...defaultRegularHours,
    },
  })
  await applyDefaultRegularHours(teknisi.id)
  console.log("✅ Teknisi created")

  // 11. Create Driver (supervised by GA)
  const driver = await prisma.user.upsert({
    where: { email: "rico@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "rico@tunasestaindonesia.com",
      name: "Rico effendy",
      password: hashedPassword,
      pin: "206",
      role: "DRIVER",
      departmentName: "Driver",
      departmentId: departmentIdByName.get("Driver") || null,
      position: "Driver",
      supervisorId: ga.id,
      ...defaultRegularHours,
    },
  })
  await applyDefaultRegularHours(driver.id)
  console.log("✅ Driver created")

  // 12. Create Security Staff (supervised by GA)
  const securityStaff = [
    { email: "fina@tunasestaindonesia.com", name: "FINA OKTAVIANI", pin: "111" },
    { email: "teguh@tunasestaindonesia.com", name: "TEGUH WIYONO", pin: "198" },
    { email: "wahyu@tunasestaindonesia.com", name: "WAHYU SETYAWAHIDIN", pin: "199" },
    { email: "bibit@tunasestaindonesia.com", name: "BIBIT MUHAMMAD ABDURROHMAN", pin: "207" },
    { email: "david@tunasestaindonesia.com", name: "DAVID AIBI AMZAH", pin: "208" },
    { email: "joko@tunasestaindonesia.com", name: "JOKO BUDIONO", pin: "170" },
  ]

  for (const staff of securityStaff) {
    const securityUser = await prisma.user.upsert({
      where: { email: staff.email },
      update: {},
      create: {
        email: staff.email,
        name: staff.name,
        password: hashedPassword,
        pin: staff.pin,
        role: "STAFF",
        departmentName: "Security",
        departmentId: departmentIdByName.get("Security") || null,
        position: "Security Guard",
        supervisorId: ga.id,
        ...defaultRegularHours,
      },
    })
    await applyDefaultRegularHours(securityUser.id)
  }
  console.log("✅ Security Staff created (6 users)")

  // Summary
  console.log("\n" + "=".repeat(60))
  console.log("✅ Seed completed successfully!")
  console.log("=".repeat(60))
  console.log("\n📊 Users Created:")
  console.log("━".repeat(60))
  console.log("1. Super Admin       : admin@tunasestaindonesia.com")
  console.log("2. Manager           : tiyas@tunasestaindonesia.com")
  console.log("3. GA                : nizar@tunasestaindonesia.com")
  console.log("4. HR                : hayyu@tunasestaindonesia.com")
  console.log("5. Production Spv    : ganes@tunasestaindonesia.com")
  console.log("6. Production Head   : aam@tunasestaindonesia.com")
  console.log("7. IT Staff          : amin@tunasestaindonesia.com")
  console.log("8. Lab Staff         : hajar@tunasestaindonesia.com")
  console.log("9. Admin Staff       : adinda.rahma.habibah@tunasestaindonesia.com")
  console.log("10. Teknisi           : pandu@tunasestaindonesia.com")
  console.log("11. Driver           : rico@tunasestaindonesia.com")
  console.log("12-17. Security      : fina, teguh, wahyu, bibit, david, joko")
  console.log("━".repeat(60))
  console.log("\n🔑 Credentials:")
  console.log("━".repeat(60))
  console.log("Password (ALL)       : password123")
  console.log("PIN                  : Sesuai data (lihat tabel di atas)")
  console.log("━".repeat(60))
  console.log("\n🔄 Supervisor Hierarchy:")
  console.log("━".repeat(60))
  console.log("Manager (Tiyas)      : No supervisor")
  console.log("GA (Nizar)           : No supervisor")
  console.log("HR (Hayyu)           : No supervisor")
  console.log("Production Spv       : No supervisor (langsung ke Manager)")
  console.log("├─ Security (6)      : Supervised by GA (Nizar)")
  console.log("├─ Teknisi (1)       : Supervised by GA (Nizar)")
  console.log("└─ Driver (1)        : Supervised by GA (Nizar)")
  console.log("IT Staff             : No supervisor (langsung ke Manager)")
  console.log("Lab Staff            : No supervisor (langsung ke Manager)")
  console.log("Admin Staff          : No supervisor (langsung ke Manager)")
  console.log("━".repeat(60))
  console.log("\n💡 Next Steps:")
  console.log("━".repeat(60))
  console.log("1. npm run dev")
  console.log("2. Login dengan salah satu akun di atas")
  console.log("3. Password: password123")
  console.log("4. Mulai gunakan sistem SPL")
  console.log("━".repeat(60))
  console.log("\n")
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



