import { prisma } from "../src/db/prisma";

async function seedPolicies() {
  // Find the client (Tomas test)
  const client = await prisma.client.findFirst({
    where: {
      firstName: "Tomas",
      lastName: "test",
    },
  });

  if (!client) {
    console.error("❌ Client 'Tomas test' not found");
    process.exit(1);
  }

  console.log(`✓ Found client: ${client.firstName} ${client.lastName}`);

  // Sample policies
  const policies = [
    {
      policyNumber: "LI-2024-001",
      policyType: "LIFE" as const,
      status: "ACTIVE" as const,
      insurer: "Lincoln National Life",
      coverageAmount: 1000000,
      premium: 85.00,
      premiumFrequency: "monthly",
      beneficiary: "Jane Doe (Spouse)",
      issueDate: new Date("2024-01-15"),
    },
    {
      policyNumber: "DI-2023-456",
      policyType: "DISABILITY" as const,
      status: "ACTIVE" as const,
      insurer: "Mutual of Omaha",
      coverageAmount: 5000,
      premium: 150.00,
      premiumFrequency: "monthly",
      beneficiary: "Self",
      issueDate: new Date("2023-06-20"),
    },
    {
      policyNumber: "LTC-2022-789",
      policyType: "LONG_TERM_CARE" as const,
      status: "ACTIVE" as const,
      insurer: "Transamerica",
      coverageAmount: 300000,
      premium: 120.00,
      premiumFrequency: "monthly",
      beneficiary: "Self / Estate",
      issueDate: new Date("2022-03-10"),
    },
    {
      policyNumber: "UMB-2024-321",
      policyType: "UMBRELLA" as const,
      status: "ACTIVE" as const,
      insurer: "Hartford Insurance",
      coverageAmount: 2000000,
      premium: 45.00,
      premiumFrequency: "annual",
      beneficiary: "Estate",
      issueDate: new Date("2024-02-01"),
    },
    {
      policyNumber: "HEALTH-2024-654",
      policyType: "HEALTH" as const,
      status: "ACTIVE" as const,
      insurer: "Blue Cross Blue Shield",
      coverageAmount: 1500000,
      premium: 350.00,
      premiumFrequency: "monthly",
      beneficiary: "Family",
      issueDate: new Date("2024-01-01"),
      expirationDate: new Date("2024-12-31"),
    },
  ];

  // Add policies
  for (const policy of policies) {
    try {
      const created = await prisma.policy.create({
        data: {
          clientId: client.id,
          ...policy,
        },
      });
      console.log(`✓ Created policy: ${policy.policyNumber} (${policy.policyType})`);
    } catch (error) {
      console.error(`✗ Failed to create policy ${policy.policyNumber}:`, error);
    }
  }

  console.log(`\n✅ Seeded ${policies.length} policies for ${client.firstName} ${client.lastName}`);
  process.exit(0);
}

seedPolicies().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
