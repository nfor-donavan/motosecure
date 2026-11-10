"use strict";
/**
 * Test runner: executes each *.test.js in tests/unit and tests/integration
 * in its own Node process (portable across Node versions and shells) and
 * writes a machine-readable summary to tests/last-results.json.
 *   node tests/run.js            # unit + integration
 *   node tests/run.js unit       # pure-logic tests only (no dependencies needed)
 *   node tests/run.js integration
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const only = process.argv[2];
const suites = only ? [only] : ["unit", "integration"];
const summary = { generatedAt: new Date().toISOString(), node: process.version, suites: {} };
let failed = false;

for (const suite of suites) {
  if (suite === "integration") {
    for (const mod of ["express", "mongoose", "supertest"]) {
      try { require.resolve(mod, { paths: [path.join(__dirname, "..")] }); }
      catch {
        console.error(`\n[tests] Integration tests need dependencies that are not installed (missing: ${mod}).\n[tests] Run "npm install" in backend/ first.`);
        summary.suites.integration = { status: "NOT RUN (dependencies missing)" };
        failed = true;
        continue;
      }
    }
    if (summary.suites.integration) continue;
  }
  const dir = path.join(__dirname, suite);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".test.js")).sort();
  const totals = { tests: 0, pass: 0, fail: 0, skipped: 0, files: {} };
  for (const f of files) {
    const r = spawnSync(process.execPath, ["--test", "--test-reporter=tap", path.join(dir, f)], {
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "test" },
    });
    process.stdout.write(r.stdout || "");
    process.stderr.write(r.stderr || "");
    const grab = (k) => Number((new RegExp(`^# ${k} (\\d+)`, "m").exec(r.stdout || "") || [0, 0])[1]);
    const t = { tests: grab("tests"), pass: grab("pass"), fail: grab("fail"), skipped: grab("skipped") };
    if (r.status !== 0 && t.fail === 0) t.fail = 1;
    totals.files[f] = t;
    for (const k of ["tests", "pass", "fail", "skipped"]) totals[k] += t[k];
    if (t.fail > 0) failed = true;
  }
  summary.suites[suite] = totals;
}
fs.writeFileSync(path.join(__dirname, "last-results.json"), JSON.stringify(summary, null, 2));
console.log("\n==== MotoSecure test summary ====");
for (const [name, s] of Object.entries(summary.suites)) {
  console.log(s.status ? `${name}: ${s.status}` : `${name}: ${s.pass}/${s.tests} passed, ${s.fail} failed, ${s.skipped} skipped`);
}
process.exit(failed ? 1 : 0);
