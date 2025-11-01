import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // No seed data required currently.
  await prisma.slot.count();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
