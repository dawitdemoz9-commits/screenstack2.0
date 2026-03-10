import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const { count } = await prisma.assessment.updateMany({
    data: { monitoringEnabled: true },
  });
  console.log(`Updated ${count} assessments.`);
}
main().then(() => prisma.$disconnect());
