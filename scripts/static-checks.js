#!/usr/bin/env node
/**
 * MotoSecure static checks (dependency-free).
 *
 * A small, repeatable source scanner. It is NOT a replacement for a
 * commercial SAST tool or a penetration test; it encodes the specific
 * weakness patterns found during the engineering review so they cannot
 * silently return. It also derives the API route inventory directly
 * from the source so documentation can be generated from the code.
 *
 * Usage:  node scripts/static-checks.js [--label name] [--out file.json]
 * Exit code is 1 if any HIGH finding is present.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const argVal = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const label = argVal("--label") || "run";
const outFile = argVal("--out");

const SKIP = new Set(["node_modules", ".git", "dist", "build", ".expo", "docs", "tests"]);
function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(js|jsx|json|md|example)$/.test(e.name) || e.name === ".env") acc.push(p);
  }
  return acc;
}
const rel = (p) => path.relative(root, p).split(path.sep).join("/");
const files = walk(root);
const read = (p) => fs.readFileSync(p, "utf8");

const ROUTES = /^backend\/routes\//;
const CLIENT = /^(web|mobile)\/src\//;
const BACKEND = /^backend\//;
const RULES = [
  { id: "SA-01", severity: "high", title: "Request body spread into a database write (mass assignment)", re: /\.\.\.\s*req\.body\b/, scope: ROUTES },
  { id: "SA-02", severity: "high", title: "Record fetched or updated by ID without tenant scope", re: /\.(findById|findByIdAndUpdate|findByIdAndDelete)\(/, except: /(Tenant\.findById|\(\s*(req\.)?user\.tenant\s*\)|decoded\.id)/, scope: ROUTES },
  { id: "SA-03", severity: "medium", title: "Query-string value placed directly into a database filter", re: /filter\.\w+\s*=\s*req\.query\.\w+/, scope: ROUTES },
  { id: "SA-04", severity: "high", title: "Possible hard-coded credential or connection string", re: /(mongodb(\+srv)?:\/\/[^\s"'`<>]+:[^\s"'`<>@]+@|-----BEGIN [A-Z ]*PRIVATE KEY|AIza[0-9A-Za-z_-]{30,})/, skip: /(\.example$|README|^scripts\/|^backend\/\.env$)/ },
  { id: "SA-05", severity: "high", title: "Dynamic code execution or raw HTML injection", re: /(\beval\(|new Function\(|dangerouslySetInnerHTML)/, scope: /\.(js|jsx)$/, skip: /^scripts\// },
  { id: "SA-06", severity: "high", title: "Working demo credentials displayed in client UI", re: /(Mayor123|Syndicate123|Officer123|ChangeMe123)/, scope: CLIENT },
  { id: "SA-07", severity: "medium", title: "Permissive CORS configuration", re: /(includes\("\*"\)|origin:\s*true|origin:\s*"\*")/, scope: BACKEND },
  { id: "SA-08", severity: "low", title: "Auth token kept in unencrypted client storage", re: /(localStorage|AsyncStorage)\.setItem\(\s*"motosecure-token"/, scope: CLIENT },
  { id: "SA-09", severity: "medium", title: "Large JSON body limit on an API with no upload endpoints", re: /express\.json\(\{\s*limit:\s*"\d+mb"/, scope: BACKEND },
  { id: "SA-10", severity: "medium", title: "Unsupported statistic hard-coded in marketing UI", re: /(99\.9%|10,000\+|"15\+")/, scope: /^web\/src\/pages\/Landing\.jsx$/ },
  { id: "SA-11", severity: "medium", title: "Unbounded or unvalidated bulk input", re: /const\s*\{\s*scans\s*\}\s*=\s*req\.body/, scope: ROUTES },
];

const findings = [];
for (const f of files) {
  const r = rel(f);
  if (/package-lock\.json$/.test(r)) continue;
  const lines = read(f).split("\n");
  for (const rule of RULES) {
    if (rule.scope && !rule.scope.test(r)) continue;
    if (rule.skip && rule.skip.test(r)) continue;
    lines.forEach((line, i) => {
      if (rule.re.test(line) && !(rule.except && rule.except.test(line))) findings.push({ id: rule.id, severity: rule.severity, title: rule.title, file: r, line: i + 1, snippet: line.trim().slice(0, 140) });
    });
  }
}

// ---- Route inventory (derived from source) -------------------------------
const mounts = {};
for (const f of ["backend/server.js", "backend/app.js"]) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) continue;
  const t = read(p);
  const reqs = {};
  for (const m of t.matchAll(/const\s+(\w+)\s*=\s*require\("\.\/routes\/(\w+)"\)/g)) reqs[m[1]] = m[2];
  for (const m of t.matchAll(/app\.use\(\s*"([^"]+)"\s*,\s*(?:[\w.()]+\s*,\s*)*(\w+)\s*\)/g)) if (reqs[m[2]]) mounts[reqs[m[2]]] = m[1];
}
const routes = [];
const routesDir = path.join(root, "backend/routes");
if (fs.existsSync(routesDir)) {
  for (const file of fs.readdirSync(routesDir)) {
    const name = file.replace(".js", "");
    const t = read(path.join(routesDir, file));
    const starts = [...t.matchAll(/router\.(get|post|patch|put|delete)\(\s*"([^"]+)"/g)];
    starts.forEach((m, i) => {
      const block = t.slice(m.index, i + 1 < starts.length ? starts[i + 1].index : t.length);
      const head = block.split("asyncHandler(")[0];
      const roles = (head.match(/authorize\(([^)]*)\)/) || [null, ""])[1].replace(/["\s]/g, "").split(",").filter(Boolean);
      const auth = /\bprotect\b/.test(head) ? "required" : /\boptionalAuth\b/.test(head) ? "optional" : "none";
      const writes = /(\.save\(\)|\.create\(|updateOne\(|\$inc|findOneAndUpdate\()/.test(block);
      routes.push({ method: m[1].toUpperCase(), path: (mounts[name] || "") + (m[2] === "/" ? "" : m[2]), file: "backend/routes/" + file, auth, roles, writes });
      if (m[1] === "get" && writes && auth === "none") {
        findings.push({ id: "SA-12", severity: "high", title: "Unauthenticated or optionally-authenticated GET handler performs database writes", file: "backend/routes/" + file, line: t.slice(0, m.index).split("\n").length, snippet: `GET ${(mounts[name] || "") + m[2]}` });
      }
    });
  }
}

// ---- Server configuration checks -----------------------------------------
const appText = ["backend/app.js", "backend/server.js"].map((f) => (fs.existsSync(path.join(root, f)) ? read(path.join(root, f)) : "")).join("\n");
if (/rateLimit|Limiter/.test(appText) && !/trust proxy/.test(appText)) {
  findings.push({ id: "SA-13", severity: "medium", title: "Rate limiting used behind a proxy without 'trust proxy' (limits key on the proxy address)", file: "backend/server.js", line: 1, snippet: "no app.set('trust proxy', ...)" });
}
const envFile = path.join(root, "backend/.env");
if (fs.existsSync(envFile)) {
  findings.push({ id: "SA-14", severity: "high", title: "Local secrets file present in the project tree (must never be committed or shared in archives)", file: "backend/.env", line: 1, snippet: "(contents deliberately not shown)" });
}
const gi = fs.existsSync(path.join(root, ".gitignore")) ? read(path.join(root, ".gitignore")) : "";
const envIgnored = /^\.env$/m.test(gi);

// ---- Dependency hygiene (offline) -----------------------------------------
const deps = {};
for (const pkg of ["backend", "web", "mobile"]) {
  const pj = path.join(root, pkg, "package.json");
  if (!fs.existsSync(pj)) continue;
  const j = JSON.parse(read(pj));
  const srcFiles = files.filter((f) => rel(f).startsWith(pkg + "/") && /\.(js|jsx)$/.test(f)).map(read).join("\n");
  const declared = Object.keys(j.dependencies || {});
  const unused = declared.filter((d) => !new RegExp(`(require\\(|from\\s+)["']${d.replace("/", "\\/")}(/[^"']*)?["']`).test(srcFiles) && !["expo", "react-native", "react", "react-dom", "react-native-screens", "expo-status-bar"].includes(d));
  deps[pkg] = { declared: declared.length, runtime: j.dependencies || {}, possiblyUnused: unused };
}

const summary = { high: 0, medium: 0, low: 0 };
findings.forEach((f) => summary[f.severity]++);
const result = { label, generatedAt: new Date().toISOString(), summary, envIgnoredByGit: envIgnored, findings, routes, dependencies: deps, advisoryCheck: "NOT RUN - requires network access to the npm advisory database (run `npm audit` in each package)" };
if (outFile) fs.writeFileSync(outFile, JSON.stringify(result, null, 2));

console.log(`\nMotoSecure static checks [${label}]`);
console.log(`Findings: ${summary.high} high, ${summary.medium} medium, ${summary.low} low   (.env gitignored: ${envIgnored})`);
for (const f of findings) console.log(`  [${f.severity.toUpperCase().padEnd(6)}] ${f.id} ${f.file}:${f.line}  ${f.title}`);
console.log(`Routes discovered: ${routes.length}; unauthenticated: ${routes.filter((r) => r.auth === "none").length}`);
for (const r of routes.filter((x) => x.auth !== "required")) console.log(`  public/optional: ${r.method} ${r.path} (${r.auth})`);
for (const [k, v] of Object.entries(deps)) if (v.possiblyUnused.length) console.log(`Possibly unused deps in ${k}: ${v.possiblyUnused.join(", ")}`);
console.log(result.advisoryCheck);
process.exit(summary.high > 0 ? 1 : 0);
