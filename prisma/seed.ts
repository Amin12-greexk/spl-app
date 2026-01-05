import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Inisialisasi Prisma Client
const prisma = new PrismaClient();

async function main() {
  // Hash password standar untuk semua user: password123
  const hashedPassword = await bcrypt.hash("password123", 10);

  // ========== HR USERS ==========
  const hrSabrina = await prisma.user.upsert({
    where: { email: "sabrina@tunasestaindonesia.com" },
    update: { position: "Head HR" },
    create: {
      email: "sabrina@tunasestaindonesia.com",
      name: "Hayyu Sabrina",
      password: hashedPassword,
      pin: "1001",
      role: "HR",
      department: "HR",
      position: "Head HR",
    },
  });

  const hrZhallila = await prisma.user.upsert({
    where: { email: "zhallila@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "zhallila@tunasestaindonesia.com",
      name: "Zhallila",
      password: hashedPassword,
      pin: "1002",
      role: "HR",
      department: "HR",
      position: "HR Staff",
    },
  });

  // ========== MANAGER ==========
  const managerTiyas = await prisma.user.upsert({
    where: { email: "tiyas@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "tiyas@tunasestaindonesia.com",
      name: "Tiyas Indah Setyowuri",
      password: hashedPassword,
      pin: "2001",
      role: "MANAGER",
      department: "Management",
      position: "General Manager",
    },
  });

  // ========== GA (General Affair) ==========
  const gaUser = await prisma.user.upsert({
    where: { email: "ga@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "ga@tunasestaindonesia.com",
      name: "Budi Santoso",
      password: hashedPassword,
      pin: "3001",
      role: "GA",
      department: "General Affair",
      position: "GA Supervisor",
      supervisorId: null, // GA tidak punya supervisor, langsung ke Manager
    },
  });

  // ========== DEPARTMENT HEADS & PRODUCTION SUPERVISOR ==========

  // HR Department Head
  const hrHead = await prisma.user.upsert({
    where: { email: "kepala.hr@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "kepala.hr@tunasestaindonesia.com",
      name: "Siti Aminah",
      password: hashedPassword,
      pin: "4001",
      role: "DEPARTMENT_HEAD",
      department: "HR",
      position: "HR Supervisor",
      supervisorId: null, // Department Head langsung ke Manager
    },
  });

  // IT Department Head
  const itHead = await prisma.user.upsert({
    where: { email: "kepala.it@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "kepala.it@tunasestaindonesia.com",
      name: "Ahmad Fauzi",
      password: hashedPassword,
      pin: "4002",
      role: "DEPARTMENT_HEAD",
      department: "IT",
      position: "IT Supervisor",
      supervisorId: null,
    },
  });

  // Admin Department Head
  const adminHead = await prisma.user.upsert({
    where: { email: "kepala.admin@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "kepala.admin@tunasestaindonesia.com",
      name: "Dewi Lestari",
      password: hashedPassword,
      pin: "4003",
      role: "DEPARTMENT_HEAD",
      department: "Admin",
      position: "Admin Supervisor",
      supervisorId: null,
    },
  });

  // Lab Department Head
  const labHead = await prisma.user.upsert({
    where: { email: "kepala.lab@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "kepala.lab@tunasestaindonesia.com",
      name: "Dr. Linda Wijaya",
      password: hashedPassword,
      pin: "4004",
      role: "DEPARTMENT_HEAD",
      department: "Lab",
      position: "Lab Supervisor",
      supervisorId: null,
    },
  });

  // Pengawas Produksi
  const productionSupervisor = await prisma.user.upsert({
    where: { email: "pengawas.produksi@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "pengawas.produksi@tunasestaindonesia.com",
      name: "Budi Santoso",
      password: hashedPassword,
      pin: "4005",
      role: "PRODUCTION_SUPERVISOR",
      department: "Produksi",
      position: "Pengawas Produksi",
      supervisorId: null, // Langsung ke Manager
    },
  });

  // ========== STAFF - HR ==========

  const hrStaff1 = await prisma.user.upsert({
    where: { email: "hr.staff1@tunasestaindonesia.com" },
    update: { supervisorId: hrHead.id },
    create: {
      email: "hr.staff1@tunasestaindonesia.com",
      name: "Rina Anggraini",
      password: hashedPassword,
      pin: "5001",
      role: "STAFF",
      department: "HR",
      position: "HR Staff",
      supervisorId: hrHead.id,
    },
  });

  const hrStaff2 = await prisma.user.upsert({
    where: { email: "hr.staff2@tunasestaindonesia.com" },
    update: { supervisorId: hrHead.id },
    create: {
      email: "hr.staff2@tunasestaindonesia.com",
      name: "Doni Prasetyo",
      password: hashedPassword,
      pin: "5002",
      role: "STAFF",
      department: "HR",
      position: "HR Recruitment",
      supervisorId: hrHead.id,
    },
  });

  // ========== STAFF - IT ==========

  const itStaff1 = await prisma.user.upsert({
    where: { email: "amin@tunasestaindonesia.com" },
    update: { supervisorId: itHead.id },
    create: {
      email: "amin@tunasestaindonesia.com",
      name: "Abdul Wahid Amin",
      password: hashedPassword,
      pin: "5101",
      role: "STAFF",
      department: "IT",
      position: "IT Staff",
      supervisorId: itHead.id,
    },
  });

  const itStaff2 = await prisma.user.upsert({
    where: { email: "it.staff2@tunasestaindonesia.com" },
    update: { supervisorId: itHead.id },
    create: {
      email: "it.staff2@tunasestaindonesia.com",
      name: "Rizki Maulana",
      password: hashedPassword,
      pin: "5102",
      role: "STAFF",
      department: "IT",
      position: "IT Support",
      supervisorId: itHead.id,
    },
  });

  // ========== STAFF - SECURITY (supervised by GA) ==========

  const securityStaff1 = await prisma.user.upsert({
    where: { email: "security1@tunasestaindonesia.com" },
    update: { supervisorId: gaUser.id },
    create: {
      email: "security1@tunasestaindonesia.com",
      name: "Joko Widodo",
      password: hashedPassword,
      pin: "5201",
      role: "STAFF",
      department: "Security",
      position: "Security Guard",
      supervisorId: gaUser.id, // GA adalah supervisor Security
    },
  });

  const securityStaff2 = await prisma.user.upsert({
    where: { email: "security2@tunasestaindonesia.com" },
    update: { supervisorId: gaUser.id },
    create: {
      email: "security2@tunasestaindonesia.com",
      name: "Bambang Sutrisno",
      password: hashedPassword,
      pin: "5202",
      role: "STAFF",
      department: "Security",
      position: "Security Guard",
      supervisorId: gaUser.id, // GA adalah supervisor Security
    },
  });

  // ========== TEKNISI (supervised by GA) ==========

  const teknisi1 = await prisma.user.upsert({
    where: { email: "teknisi1@tunasestaindonesia.com" },
    update: { supervisorId: gaUser.id },
    create: {
      email: "teknisi1@tunasestaindonesia.com",
      name: "Andi Setiawan",
      password: hashedPassword,
      pin: "5301",
      role: "TEKNISI",
      department: "Teknik",
      position: "Teknisi Mesin",
      supervisorId: gaUser.id, // GA adalah supervisor Teknisi
    },
  });

  const teknisi2 = await prisma.user.upsert({
    where: { email: "teknisi2@tunasestaindonesia.com" },
    update: { supervisorId: gaUser.id },
    create: {
      email: "teknisi2@tunasestaindonesia.com",
      name: "Rudi Hartono",
      password: hashedPassword,
      pin: "5302",
      role: "TEKNISI",
      department: "Teknik",
      position: "Teknisi Listrik",
      supervisorId: gaUser.id, // GA adalah supervisor Teknisi
    },
  });

  // ========== STAFF - ADMIN ==========

  // Note: Admin Head (Dewi Lestari) tidak supervise staff, hanya mengajukan SPL sendiri

  // ========== STAFF - LAB ==========

  const labStaff1 = await prisma.user.upsert({
    where: { email: "lab1@tunasestaindonesia.com" },
    update: { supervisorId: labHead.id },
    create: {
      email: "lab1@tunasestaindonesia.com",
      name: "Nurul Hidayah",
      password: hashedPassword,
      pin: "5401",
      role: "STAFF",
      department: "Lab",
      position: "Lab Analyst",
      supervisorId: labHead.id,
    },
  });

  const labStaff2 = await prisma.user.upsert({
    where: { email: "lab2@tunasestaindonesia.com" },
    update: { supervisorId: labHead.id },
    create: {
      email: "lab2@tunasestaindonesia.com",
      name: "Tono Sudarso",
      password: hashedPassword,
      pin: "5402",
      role: "STAFF",
      department: "Lab",
      position: "Lab Technician",
      supervisorId: labHead.id,
    },
  });

  // ========== STAFF - PRODUKSI ==========

  // Note: Pengawas Produksi tidak supervise staff, hanya mengajukan SPL sendiri

  // ========== SETTINGS ==========

  const minOvertimeSetting = await prisma.setting.upsert({
    where: { key: "MIN_OVERTIME_START" },
    update: { value: "16:30" },
    create: { key: "MIN_OVERTIME_START", value: "16:30" },
  });

  console.log("✅ Seed completed successfully!");
  console.log("\n📊 User Statistics:");
  console.log("- HR Users: 2");
  console.log("- Manager: 1");
  console.log("- GA: 1");
  console.log("- Department Heads: 4 (HR, IT, Admin, Lab)");
  console.log("  * HR Head & IT Head → supervise staff");
  console.log("  * Admin Head → tidak supervise (langsung ke Manager)");
  console.log("  * Lab Head → supervise staff");
  console.log("- Pengawas Produksi: 1 (tidak supervise, langsung ke Manager)");
  console.log("- Staff: 8 (HR: 2, IT: 2, Lab: 2, Security: 2)");
  console.log("- Teknisi: 2 (supervised by GA)");
  console.log("- Total Users: 19");

  console.log("\n👥 User Structure:");
  console.log("┌─ Manager: Tiyas Indah Setyowuri");
  console.log("├─ HR Manager: Hayyu Sabrina");
  console.log("├─ HR Staff: Zhallila");
  console.log("│");
  console.log("├─ GA: Budi Santoso");
  console.log("│  ├─ Security Staff: Joko Widodo, Bambang Sutrisno");
  console.log("│  └─ Teknisi: Andi Setiawan, Rudi Hartono");
  console.log("│");
  console.log("├─ HR Head: Siti Aminah (Supervisor)");
  console.log("│  └─ HR Staff: Rina Anggraini, Doni Prasetyo");
  console.log("│");
  console.log("├─ IT Head: Ahmad Fauzi (Supervisor)");
  console.log("│  └─ IT Staff: Abdul Wahid Amin, Rizki Maulana");
  console.log("│");
  console.log("├─ Admin Head: Dewi Lestari");
  console.log("│  (tidak supervise staff, SPL langsung ke Manager)");
  console.log("│");
  console.log("├─ Lab Head: Dr. Linda Wijaya (Supervisor)");
  console.log("│  └─ Lab Staff: Nurul Hidayah, Tono Sudarso");
  console.log("│");
  console.log("└─ Pengawas Produksi: Budi Santoso");
  console.log("   (tidak supervise staff, SPL langsung ke Manager)");

  console.log("\n🔑 Default password untuk SEMUA user: password123");
  console.log("\n📧 Semua email menggunakan domain: @tunasestaindonesia.com");
  console.log("\n⚠️  CATATAN:");
  console.log("   - Security & Teknisi → supervised by GA");
  console.log("   - HR & IT & Lab Staff → supervised by respective DEPARTMENT_HEAD");
  console.log("   - Admin Head & Pengawas Produksi → tidak supervise, SPL langsung ke Manager");
  console.log("   - Alur SPL:");
  console.log("     • Staff & Teknisi → Supervisor → Manager");
  console.log("     • GA/HR/Admin Head/Pengawas Produksi → Manager (skip supervisor)");
}

// Jalankan fungsi main dan tangani error
main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
