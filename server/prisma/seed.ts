import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const PHASE_1_CATEGORIES = [
  { key: "pay_stubs", label: "Pay stubs", hint: "Most recent two", sortOrder: 1 },
  { key: "tax_returns", label: "Tax returns — last two years", hint: null, sortOrder: 2 },
  { key: "auto_insurance", label: "Auto declaration page", hint: null, sortOrder: 3 },
  { key: "home_insurance", label: "Home insurance declaration page", hint: null, sortOrder: 4 },
  { key: "liability_insurance", label: "Liability insurance declaration page", hint: null, sortOrder: 5 },
  { key: "disability_insurance", label: "Disability insurance policy", hint: "Group or individual — the full policy", sortOrder: 6 },
  { key: "savings_money_market", label: "Savings and money market statements", hint: null, sortOrder: 7 },
  { key: "retirement_accounts", label: "Retirement account statements", hint: null, sortOrder: 8 },
  { key: "investment_accounts", label: "Investment account statements", hint: null, sortOrder: 9 },
  { key: "life_insurance", label: "Life insurance statements", hint: null, sortOrder: 10 },
  { key: "debt_statements", label: "Debt statements", hint: "Mortgage, auto loans, credit cards", sortOrder: 11 },
];

const PHASE_2_ITEMS = [
  { key: "download_currents", label: "Download Currence", sortOrder: 1, completedBy: "CLIENT" as const },
  { key: "connect_bank_accounts", label: "Connect bank accounts to Currence", sortOrder: 2, completedBy: "CLIENT" as const },
  { key: "setup_direct_deposit", label: "Set up direct deposit for Currence", sortOrder: 3, completedBy: "CLIENT" as const },
  { key: "fund_reservoir", label: "Fund your reservoir", sortOrder: 4, completedBy: "CLIENT" as const },
  { key: "spending_baseline", label: "Set up your spending baseline", sortOrder: 5, completedBy: "CLIENT" as const },
];

const PHASE_3_ITEMS = [
  { key: "application", label: "Application", sortOrder: 1, completedBy: "CLIENT" as const },
  { key: "health_approval", label: "Health Approval", sortOrder: 2, completedBy: "ADMIN" as const },
  { key: "underwriting", label: "Underwriting", sortOrder: 3, completedBy: "ADMIN" as const },
  { key: "approval", label: "Approval", sortOrder: 4, completedBy: "ADMIN" as const },
  { key: "closing_docs", label: "Closing Docs", sortOrder: 5, completedBy: "ADMIN" as const },
];

async function main() {
  for (const cat of PHASE_1_CATEGORIES) {
    await prisma.documentCategory.upsert({
      where: { key: cat.key },
      update: { label: cat.label, hint: cat.hint, sortOrder: cat.sortOrder, phase: 1 },
      create: { ...cat, phase: 1 },
    });
  }

  for (const item of [...PHASE_2_ITEMS.map((i) => ({ ...i, phase: 2 })), ...PHASE_3_ITEMS.map((i) => ({ ...i, phase: 3 }))]) {
    await prisma.checklistItem.upsert({
      where: { key: item.key },
      update: { label: item.label, sortOrder: item.sortOrder, phase: item.phase, completedBy: item.completedBy },
      create: item,
    });
  }

  // Phases are no longer sequentially gated — every phase is accessible from day one.
  // Existing clients created before this change may still have LOCKED rows; unlock them.
  const { count: unlockedCount } = await prisma.onboardingProgress.updateMany({
    where: { status: "LOCKED" },
    data: { status: "IN_PROGRESS" },
  });
  if (unlockedCount > 0) {
    console.log(`Unlocked ${unlockedCount} previously-locked phase(s) for existing clients.`);
  }

  const adminEmail = "admin@stonecenturyfinancial.com";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("changeme123", 10);
    await prisma.user.create({
      data: { email: adminEmail, passwordHash, role: "ADMIN" },
    });
    console.log(`Seeded admin user: ${adminEmail} / changeme123 (change this immediately)`);
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
