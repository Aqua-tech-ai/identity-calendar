import bcryptjs from 'bcryptjs';

const pwd = process.argv[2];

if (!pwd) {
  console.error('Usage: npx ts-node scripts/gen-bcrypt.ts <plain_password>');
  process.exit(1);
}

async function main() {
  const saltRounds = 12;
  const hash = await bcryptjs.hash(pwd, saltRounds);
  // Paste this output into ADMIN_PASSWORD_HASH (no extra quotes or spaces).
  console.log(hash);
}

main().catch((error) => {
  console.error('Failed to generate bcrypt hash:', error);
  process.exit(1);
});
