const keys = [
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
  'ADMIN_PASSWORD_HASH',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
];

for (const key of keys) {
  const value = process.env[key] ?? '<undefined>';
  const length = value === '<undefined>' ? 0 : value.length;
  const codes =
    value === '<undefined>'
      ? ''
      : value
          .split('')
          .slice(0, 6)
          .map((ch) => ch.charCodeAt(0).toString(16).padStart(2, '0'))
          .join(' ');

  console.log(`${key} = ${value}`);
  console.log(`  length=${length}  firstBytes(hex)=${codes}\n`);
}
