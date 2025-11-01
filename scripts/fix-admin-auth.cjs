const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });

const ENV_PATH = path.resolve(process.cwd(), ".env.local");
const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "");
const write = (p, s) => fs.writeFileSync(p, s, "utf8");

const isBcrypt = (s) => typeof s === "string" && /^\$2[aby]\$.{56}$/.test(s.trim());

const parse = (str) => {
  const obj = {};
  str.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) return;
    let [, k, v] = m;
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    obj[k] = v;
  });
  return obj;
};

const dump = (obj) =>
  Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
    .map(([k, v]) => `${k}=${v}`)
    .join("\n") + "\n";

(function main() {
  const raw = read(ENV_PATH);
  const env = parse(raw);

  const rounds = Math.min(15, Math.max(4, Number(env.ADMIN_BCRYPT_ROUNDS || 12)));
  const plain = (env.ADMIN_PASSWORD || "").trim();
  let hash = (env.ADMIN_PASSWORD_HASH || "").trim();

  if (!isBcrypt(hash)) {
    if (plain) {
      hash = bcrypt.hashSync(plain, rounds);
      env.ADMIN_PASSWORD_HASH = hash;
      console.log("[fix-admin-auth] generated bcrypt from ADMIN_PASSWORD");
    } else {
      delete env.ADMIN_PASSWORD_HASH;
      console.log(
        "[fix-admin-auth] no valid hash & no plain password -> leaving hash unset",
      );
    }
  } else {
    env.ADMIN_PASSWORD_HASH = hash;
  }

  if (isBcrypt(env.ADMIN_PASSWORD_HASH)) {
    delete env.ADMIN_USERNAME;
    delete env.ADMIN_PASSWORD;
    console.log(
      "[fix-admin-auth] removed ADMIN_USERNAME & ADMIN_PASSWORD (hash-only mode)",
    );
  }

  write(ENV_PATH, dump(env));
  console.log(`[fix-admin-auth] wrote ${ENV_PATH}`);
})();
