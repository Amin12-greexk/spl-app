import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting seed...")

  // Hash password: password123
  const hashedPassword = await bcrypt.hash("password123", 10)

  const departments = [
    { name: "System", supervised: false },
    { name: "Management", supervised: false },
    { name: "General Affair", supervised: false },
    { name: "HR", supervised: true },
    { name: "Produksi", supervised: false },
    { name: "IT", supervised: true },
    { name: "Lab", supervised: true },
    { name: "Admin", supervised: false },
    { name: "Teknik", supervised: true },
    { name: "Driver", supervised: true },
    { name: "Security", supervised: true },
  ]

  for (const department of departments) {
    await prisma.department.upsert({
      where: { name: department.name },
      update: { supervised: department.supervised },
      create: department,
    })
  }
  console.log("Departments seeded")

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
      department: "System",
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
      department: "Management",
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
      department: "General Affair",
      position: "GA Supervisor",
    },
  })
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
      department: "HR",
      position: "HR Manager",
    },
  })
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
      department: "Produksi",
      position: "Pengawas Produksi",
    },
  })
  console.log("✅ Production Supervisor created")

  // 6. Create IT Staff (need to create IT Dept Head first if exists, or direct to manager)
  const itStaff = await prisma.user.upsert({
    where: { email: "amin@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "amin@tunasestaindonesia.com",
      name: "ABDUL WAHID AMIN",
      password: hashedPassword,
      pin: "209",
      role: "STAFF",
      department: "IT",
      position: "IT Staff",
      supervisorId: null, // Will be updated if IT Head exists
    },
  })
  console.log("✅ IT Staff created")

  // 7. Create Lab Staff
  const labStaff = await prisma.user.upsert({
    where: { email: "hajar@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "hajar@tunasestaindonesia.com",
      name: "HAJAR ANNISA SEPTIARANI",
      password: hashedPassword,
      pin: "219",
      role: "STAFF",
      department: "Lab",
      position: "Lab Analyst",
      supervisorId: null, // Will be updated if Lab Head exists
    },
  })
  console.log("✅ Lab Staff created")

  // 8. Create Admin Staff (direct to manager)
  const adminStaff = await prisma.user.upsert({
    where: { email: "adinda.rahma.habibah@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "adinda.rahma.habibah@tunasestaindonesia.com",
      name: "ADINDA RAHMA HABIBAH",
      password: hashedPassword,
      pin: "218",
      role: "STAFF",
      department: "Admin",
      position: "Admin",
      supervisorId: null,
    },
  })
  console.log("Admin Staff created")

  // 9. Create Teknisi (supervised by GA)
  const teknisi = await prisma.user.upsert({
    where: { email: "pandu@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "pandu@tunasestaindonesia.com",
      name: "PANDU BIRAWANTO",
      password: hashedPassword,
      pin: "221",
      role: "TEKNISI",
      department: "Teknik",
      position: "Teknisi",
      supervisorId: ga.id,
    },
  })
  console.log("✅ Teknisi created")

  // 10. Create Driver (supervised by GA)
  const driver = await prisma.user.upsert({
    where: { email: "rico@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "rico@tunasestaindonesia.com",
      name: "Rico effendy",
      password: hashedPassword,
      pin: "206",
      role: "DRIVER",
      department: "Driver",
      position: "Driver",
      supervisorId: ga.id,
    },
  })
  console.log("✅ Driver created")

  // 11. Create Security Staff (supervised by GA)
  const securityStaff = [
    { email: "fina@tunasestaindonesia.com", name: "FINA OKTAVIANI", pin: "111" },
    { email: "teguh@tunasestaindonesia.com", name: "TEGUH WIYONO", pin: "198" },
    { email: "wahyu@tunasestaindonesia.com", name: "WAHYU SETYAWAHIDIN", pin: "199" },
    { email: "bibit@tunasestaindonesia.com", name: "BIBIT MUHAMMAD ABDURROHMAN", pin: "207" },
    { email: "david@tunasestaindonesia.com", name: "DAVID AIBI AMZAH", pin: "208" },
    { email: "joko@tunasestaindonesia.com", name: "JOKO BUDIONO", pin: "170" },
  ]

  for (const staff of securityStaff) {
    await prisma.user.upsert({
      where: { email: staff.email },
      update: {},
      create: {
        email: staff.email,
        name: staff.name,
        password: hashedPassword,
        pin: staff.pin,
        role: "STAFF",
        department: "Security",
        position: "Security Guard",
        supervisorId: ga.id,
      },
    })
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
  console.log("6. IT Staff          : amin@tunasestaindonesia.com")
  console.log("7. Lab Staff         : hajar@tunasestaindonesia.com")
  console.log("8. Admin Staff       : adinda.rahma.habibah@tunasestaindonesia.com")
  console.log("9. Teknisi           : pandu@tunasestaindonesia.com")
  console.log("10. Driver           : rico@tunasestaindonesia.com")
  console.log("11-16. Security      : fina, teguh, wahyu, bibit, david, joko")
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
