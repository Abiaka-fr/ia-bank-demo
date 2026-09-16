// Parité des clés FR/EN des dictionnaires next-intl — même règle que src/messages/messages.test.ts
// (qui vérifie en plus les traductions vides). Usage : node scripts/check-messages.mjs [fr.json] [en.json]
import { readFileSync } from "node:fs";

const [frPath = new URL("../src/messages/fr.json", import.meta.url), enPath = new URL("../src/messages/en.json", import.meta.url)] =
  process.argv.slice(2);

const flattenKeys = (value, prefix = "") =>
  typeof value !== "object" || value === null || Array.isArray(value)
    ? [prefix]
    : Object.entries(value).flatMap(([key, child]) => flattenKeys(child, prefix ? `${prefix}.${key}` : key));

const load = (path) => new Set(flattenKeys(JSON.parse(readFileSync(path, "utf8"))));
const fr = load(frPath);
const en = load(enPath);
const onlyFr = [...fr].filter((key) => !en.has(key));
const onlyEn = [...en].filter((key) => !fr.has(key));

for (const key of onlyFr) console.error(`FR uniquement : ${key}`);
for (const key of onlyEn) console.error(`EN uniquement : ${key}`);
if (onlyFr.length || onlyEn.length) process.exit(1);
console.log(`check:i18n OK — ${fr.size} clés identiques en FR et EN`);
