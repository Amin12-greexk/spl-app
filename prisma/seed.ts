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
    update: {},
    create: {
      email: "sabrina@tunasestaindonesia.com",
      name: "Hayyu Sabrina",
      password: hashedPassword,
      pin: "1001",
      role: "HR",
      department: "Human Resources",
      position: "HR Manager",
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
      department: "Human Resources",
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

  // ========== DEPARTMENT HEADS ==========

  // IT Department Head
  const itHead = await prisma.user.upsert({
    where: { email: "kepala.it@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "kepala.it@tunasestaindonesia.com",
      name: "Ahmad Fauzi",
      password: hashedPassword,
      pin: "4001",
      role: "DEPARTMENT_HEAD",
      department: "IT",
      position: "IT Manager",
      supervisorId: null, // Department Head langsung ke Manager
    },
  });

  // Production Department Head
  const productionHead = await prisma.user.upsert({
    where: { email: "kepala.production@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "kepala.production@tunasestaindonesia.com",
      name: "Siti Nurhaliza",
      password: hashedPassword,
      pin: "4002",
      role: "DEPARTMENT_HEAD",
      department: "Production",
      position: "Production Manager",
      supervisorId: null,
    },
  });

  // Finance Department Head
  const financeHead = await prisma.user.upsert({
    where: { email: "kepala.finance@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "kepala.finance@tunasestaindonesia.com",
      name: "Dewi Lestari",
      password: hashedPassword,
      pin: "4003",
      role: "DEPARTMENT_HEAD",
      department: "Finance",
      position: "Finance Manager",
      supervisorId: null,
    },
  });

  // Marketing Department Head
  const marketingHead = await prisma.user.upsert({
    where: { email: "kepala.marketing@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "kepala.marketing@tunasestaindonesia.com",
      name: "Rudi Hartono",
      password: hashedPassword,
      pin: "4004",
      role: "DEPARTMENT_HEAD",
      department: "Marketing",
      position: "Marketing Manager",
      supervisorId: null,
    },
  });

  // Logistics Department Head
  const logisticsHead = await prisma.user.upsert({
    where: { email: "kepala.logistics@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "kepala.logistics@tunasestaindonesia.com",
      name: "Agus Prasetyo",
      password: hashedPassword,
      pin: "4005",
      role: "DEPARTMENT_HEAD",
      department: "Logistics",
      position: "Logistics Manager",
      supervisorId: null,
    },
  });

  // Quality Control Department Head
  const qcHead = await prisma.user.upsert({
    where: { email: "kepala.qc@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "kepala.qc@tunasestaindonesia.com",
      name: "Linda Wijaya",
      password: hashedPassword,
      pin: "4006",
      role: "DEPARTMENT_HEAD",
      department: "Quality Control",
      position: "QC Manager",
      supervisorId: null,
    },
  });

  // Purchasing Department Head
  const purchasingHead = await prisma.user.upsert({
    where: { email: "kepala.purchasing@tunasestaindonesia.com" },
    update: {},
    create: {
      email: "kepala.purchasing@tunasestaindonesia.com",
      name: "Eko Saputra",
      password: hashedPassword,
      pin: "4007",
      role: "DEPARTMENT_HEAD",
      department: "Purchasing",
      position: "Purchasing Manager",
      supervisorId: null,
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
      pin: "5001",
      role: "STAFF",
      department: "Security",
      position: "Security",
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
      pin: "5002",
      role: "STAFF",
      department: "Security",
      position: "Security",
      supervisorId: gaUser.id,
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

  // ========== STAFF - PRODUCTION ==========

  const productionStaff1 = await prisma.user.upsert({
    where: { email: "production1@tunasestaindonesia.com" },
    update: { supervisorId: productionHead.id },
    create: {
      email: "production1@tunasestaindonesia.com",
      name: "Andi Setiawan",
      password: hashedPassword,
      pin: "5201",
      role: "STAFF",
      department: "Production",
      position: "Production Staff",
      supervisorId: productionHead.id,
    },
  });

  const productionStaff2 = await prisma.user.upsert({
    where: { email: "production2@tunasestaindonesia.com" },
    update: { supervisorId: productionHead.id },
    create: {
      email: "production2@tunasestaindonesia.com",
      name: "Sri Wahyuni",
      password: hashedPassword,
      pin: "5202",
      role: "STAFF",
      department: "Production",
      position: "Production Operator",
      supervisorId: productionHead.id,
    },
  });

  // ========== STAFF - FINANCE ==========

  const financeStaff1 = await prisma.user.upsert({
    where: { email: "finance1@tunasestaindonesia.com" },
    update: { supervisorId: financeHead.id },
    create: {
      email: "finance1@tunasestaindonesia.com",
      name: "Maya Sari",
      password: hashedPassword,
      pin: "5301",
      role: "STAFF",
      department: "Finance",
      position: "Accountant",
      supervisorId: financeHead.id,
    },
  });

  const financeStaff2 = await prisma.user.upsert({
    where: { email: "finance2@tunasestaindonesia.com" },
    update: { supervisorId: financeHead.id },
    create: {
      email: "finance2@tunasestaindonesia.com",
      name: "Dimas Prakoso",
      password: hashedPassword,
      pin: "5302",
      role: "STAFF",
      department: "Finance",
      position: "Finance Staff",
      supervisorId: financeHead.id,
    },
  });

  // ========== STAFF - MARKETING ==========

  const marketingStaff1 = await prisma.user.upsert({
    where: { email: "marketing1@tunasestaindonesia.com" },
    update: { supervisorId: marketingHead.id },
    create: {
      email: "marketing1@tunasestaindonesia.com",
      name: "Putri Ayu",
      password: hashedPassword,
      pin: "5401",
      role: "STAFF",
      department: "Marketing",
      position: "Marketing Staff",
      supervisorId: marketingHead.id,
    },
  });

  const marketingStaff2 = await prisma.user.upsert({
    where: { email: "marketing2@tunasestaindonesia.com" },
    update: { supervisorId: marketingHead.id },
    create: {
      email: "marketing2@tunasestaindonesia.com",
      name: "Fajar Ramadan",
      password: hashedPassword,
      pin: "5402",
      role: "STAFF",
      department: "Marketing",
      position: "Sales Executive",
      supervisorId: marketingHead.id,
    },
  });

  // ========== STAFF - LOGISTICS ==========

  const logisticsStaff1 = await prisma.user.upsert({
    where: { email: "logistics1@tunasestaindonesia.com" },
    update: { supervisorId: logisticsHead.id },
    create: {
      email: "logistics1@tunasestaindonesia.com",
      name: "Hendra Gunawan",
      password: hashedPassword,
      pin: "5501",
      role: "STAFF",
      department: "Logistics",
      position: "Warehouse Staff",
      supervisorId: logisticsHead.id,
    },
  });

  const logisticsStaff2 = await prisma.user.upsert({
    where: { email: "logistics2@tunasestaindonesia.com" },
    update: { supervisorId: logisticsHead.id },
    create: {
      email: "logistics2@tunasestaindonesia.com",
      name: "Irfan Hakim",
      password: hashedPassword,
      pin: "5502",
      role: "STAFF",
      department: "Logistics",
      position: "Delivery Driver",
      supervisorId: logisticsHead.id,
    },
  });

  // ========== STAFF - QUALITY CONTROL ==========

  const qcStaff1 = await prisma.user.upsert({
    where: { email: "qc1@tunasestaindonesia.com" },
    update: { supervisorId: qcHead.id },
    create: {
      email: "qc1@tunasestaindonesia.com",
      name: "Nurul Hidayah",
      password: hashedPassword,
      pin: "5601",
      role: "STAFF",
      department: "Quality Control",
      position: "QC Inspector",
      supervisorId: qcHead.id,
    },
  });

  const qcStaff2 = await prisma.user.upsert({
    where: { email: "qc2@tunasestaindonesia.com" },
    update: { supervisorId: qcHead.id },
    create: {
      email: "qc2@tunasestaindonesia.com",
      name: "Tono Sudarso",
      password: hashedPassword,
      pin: "5602",
      role: "STAFF",
      department: "Quality Control",
      position: "QC Staff",
      supervisorId: qcHead.id,
    },
  });

  // ========== STAFF - PURCHASING ==========

  const purchasingStaff1 = await prisma.user.upsert({
    where: { email: "purchasing1@tunasestaindonesia.com" },
    update: { supervisorId: purchasingHead.id },
    create: {
      email: "purchasing1@tunasestaindonesia.com",
      name: "Vina Marlina",
      password: hashedPassword,
      pin: "5701",
      role: "STAFF",
      department: "Purchasing",
      position: "Purchasing Staff",
      supervisorId: purchasingHead.id,
    },
  });

  const purchasingStaff2 = await prisma.user.upsert({
    where: { email: "purchasing2@tunasestaindonesia.com" },
    update: { supervisorId: purchasingHead.id },
    create: {
      email: "purchasing2@tunasestaindonesia.com",
      name: "Wahyu Hidayat",
      password: hashedPassword,
      pin: "5702",
      role: "STAFF",
      department: "Purchasing",
      position: "Procurement Officer",
      supervisorId: purchasingHead.id,
    },
  });

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
  console.log("- Department Heads: 7 (IT, Production, Finance, Marketing, Logistics, QC, Purchasing)");
  console.log("- Staff: 16 (2 per department)");
  console.log("- Total Users: 27");

  console.log("\n👥 User Structure:");
  console.log("┌─ Manager: Tiyas Indah Setyowuri");
  console.log("├─ HR: Hayyu Sabrina, Zhallila");
  console.log("├─ GA: Budi Santoso");
  console.log("│  └─ Security: Joko Widodo, Bambang Sutrisno");
  console.log("├─ IT Head: Ahmad Fauzi");
  console.log("│  └─ IT Staff: Abdul Wahid Amin, Rizki Maulana");
  console.log("├─ Production Head: Siti Nurhaliza");
  console.log("│  └─ Production Staff: Andi Setiawan, Sri Wahyuni");
  console.log("├─ Finance Head: Dewi Lestari");
  console.log("│  └─ Finance Staff: Maya Sari, Dimas Prakoso");
  console.log("├─ Marketing Head: Rudi Hartono");
  console.log("│  └─ Marketing Staff: Putri Ayu, Fajar Ramadan");
  console.log("├─ Logistics Head: Agus Prasetyo");
  console.log("│  └─ Logistics Staff: Hendra Gunawan, Irfan Hakim");
  console.log("├─ QC Head: Linda Wijaya");
  console.log("│  └─ QC Staff: Nurul Hidayah, Tono Sudarso");
  console.log("└─ Purchasing Head: Eko Saputra");
  console.log("   └─ Purchasing Staff: Vina Marlina, Wahyu Hidayat");

  console.log("\n🔑 Default password untuk SEMUA user: password123");
  console.log("\n📧 Semua email menggunakan domain: @tunasestaindonesia.com");
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
