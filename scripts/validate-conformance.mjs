#!/usr/bin/env node
// Conformance suite runner.
// 1. Parses every schema in schemas/ — fails on malformed JSON Schema.
// 2. For every entry in conformance/manifest.yaml, validates the fixture
//    against the listed schemas and asserts the recorded verdict.
//
// Usage: node scripts/validate-conformance.mjs

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import yaml from "js-yaml";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA_DIR = join(REPO, "schemas");
const MANIFEST = join(REPO, "conformance", "manifest.yaml");

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

const failures = [];
const passes = [];

function pass(msg) {
  passes.push(msg);
  console.log(`  ${GREEN}✓${RESET} ${msg}`);
}
function fail(msg, detail = "") {
  failures.push({ msg, detail });
  console.log(`  ${RED}✗${RESET} ${msg}${detail ? `\n      ${DIM}${detail}${RESET}` : ""}`);
}

// ─── 1. Build Ajv with every schema loaded ────────────────────────────────────
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats.default
  ? addFormats.default(ajv)
  : addFormats(ajv);

function walkSchemaFiles(dir) {
  const out = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkSchemaFiles(p));
    else if (ent.name.endsWith(".schema.json")) out.push(p);
  }
  return out;
}

console.log(`\n${BOLD}1. Schema validity${RESET}`);
const schemaFiles = walkSchemaFiles(SCHEMA_DIR);
for (const f of schemaFiles) {
  const rel = f.slice(REPO.length + 1);
  try {
    const json = JSON.parse(readFileSync(f, "utf8"));
    ajv.addSchema(json, json.$id);
    pass(`${rel} parses and registers`);
  } catch (e) {
    fail(`${rel} failed to load`, e.message);
  }
}

// ─── 2. Frontmatter extraction helper ─────────────────────────────────────────
function extractFrontmatter(text) {
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  const block = text.slice(3, end).trimStart();
  return yaml.load(block);
}

function extractAiScriptBlocks(text) {
  const re = /```ai-script\s*\n([\s\S]*?)\n```/g;
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    try {
      out.push(JSON.parse(m[1]));
    } catch (e) {
      out.push({ __parseError: e.message });
    }
  }
  return out;
}

function extractFootnoteRelationships(text) {
  // matches [^id]: { ... }
  const re = /^\[\^[^\]]+\]:\s*(\{[^\n]*\})\s*$/gm;
  const out = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    try {
      out.push(JSON.parse(m[1]));
    } catch (e) {
      out.push({ __parseError: e.message });
    }
  }
  return out;
}

function bodyHasAiScriptFence(text) {
  // strip frontmatter first
  let body = text;
  if (text.startsWith("---")) {
    const end = text.indexOf("\n---", 3);
    if (end !== -1) body = text.slice(end + 4);
  }
  return /```ai-script\b/.test(body);
}

// ─── 3. Manifest-driven conformance run ───────────────────────────────────────
console.log(`\n${BOLD}2. Conformance fixtures${RESET}`);
const manifest = yaml.load(readFileSync(MANIFEST, "utf8"));

function getValidator(schemaPath) {
  const abs = resolve(REPO, schemaPath);
  const json = JSON.parse(readFileSync(abs, "utf8"));
  // Use $id if registered, else compile fresh.
  const compiled = ajv.getSchema(json.$id) ?? ajv.compile(json);
  return compiled;
}

function runValidator(fixturePath, schemaPaths, expectedVerdict, fixtureId) {
  const text = readFileSync(fixturePath, "utf8");
  const fm = extractFrontmatter(text);

  let allOk = true;
  let firstErrors = [];

  for (const sp of schemaPaths) {
    if (sp === "body-fence-check") {
      const found = bodyHasAiScriptFence(text);
      if (found) {
        allOk = false;
        firstErrors.push("body contains ai-script fence (rule §07-4)");
      }
      continue;
    }

    let validator;
    try {
      validator = getValidator(sp);
    } catch (e) {
      fail(`[${fixtureId}] schema load: ${sp}`, e.message);
      return;
    }

    const subjectsToCheck = [];
    if (sp.endsWith("frontmatter-source.schema.json") || sp.endsWith("frontmatter-skill-md.schema.json")) {
      subjectsToCheck.push({ label: "frontmatter", value: fm ?? {} });
    } else if (sp.endsWith("ai-script.schema.json")) {
      const blocks = extractAiScriptBlocks(text);
      blocks.forEach((b, i) => subjectsToCheck.push({ label: `ai-script[${i}]`, value: b }));
    } else if (sp.endsWith("relationship-footnote.schema.json")) {
      const rels = extractFootnoteRelationships(text);
      rels.forEach((r, i) => subjectsToCheck.push({ label: `footnote[${i}]`, value: r }));
    } else {
      subjectsToCheck.push({ label: "raw", value: fm ?? {} });
    }

    for (const subj of subjectsToCheck) {
      const ok = validator(subj.value);
      if (!ok) {
        allOk = false;
        const errs = (validator.errors || []).slice(0, 3).map(e =>
          `${subj.label} ${e.instancePath || "(root)"} ${e.message}`
        );
        firstErrors.push(...errs);
      }
    }
  }

  if (expectedVerdict === "accept") {
    if (allOk) pass(`[${fixtureId}] accept: all schemas valid`);
    else fail(`[${fixtureId}] expected accept but got reject`, firstErrors.join(" | "));
  } else if (expectedVerdict === "reject") {
    if (!allOk) pass(`[${fixtureId}] reject: ${firstErrors[0] ?? "validation failed"}`);
    else fail(`[${fixtureId}] expected reject but all schemas accepted`);
  } else {
    fail(`[${fixtureId}] unknown verdict: ${expectedVerdict}`);
  }
}

function runCompileFixture(entry) {
  const id = entry.id;
  const inputPath = resolve(REPO, "conformance", entry.input);
  const expectedDir = resolve(REPO, "conformance", entry.expected_dir);

  if (!existsSync(inputPath)) {
    fail(`[${id}] input missing: ${entry.input}`);
    return;
  }
  if (!existsSync(expectedDir) || !statSync(expectedDir).isDirectory()) {
    fail(`[${id}] expected_dir missing: ${entry.expected_dir}`);
    return;
  }

  // Validate the input source frontmatter against the source schema.
  const inputText = readFileSync(inputPath, "utf8");
  const fm = extractFrontmatter(inputText);
  const sourceValidator = getValidator("schemas/frontmatter-source.schema.json");
  if (!sourceValidator(fm ?? {})) {
    fail(`[${id}] input.mda frontmatter invalid`,
      JSON.stringify(sourceValidator.errors?.[0]));
    return;
  }

  // Validate that the expected SKILL.md output passes the strict target schema.
  const expectedSkill = join(expectedDir, "SKILL.md");
  if (!existsSync(expectedSkill)) {
    fail(`[${id}] expected/SKILL.md missing`);
    return;
  }
  const expText = readFileSync(expectedSkill, "utf8");
  const expFm = extractFrontmatter(expText);
  const skillValidator = getValidator("schemas/frontmatter-skill-md.schema.json");
  if (!skillValidator(expFm ?? {})) {
    fail(`[${id}] expected/SKILL.md fails target schema`,
      (skillValidator.errors || []).slice(0, 3).map(e => `${e.instancePath} ${e.message}`).join(" | "));
    return;
  }

  // Body of expected SKILL.md MUST NOT contain ai-script fence.
  if (bodyHasAiScriptFence(expText)) {
    fail(`[${id}] expected/SKILL.md body contains forbidden ai-script fence`);
    return;
  }

  // Externalized scripts MUST validate against ai-script.schema.json.
  const scriptsDir = join(expectedDir, "scripts");
  if (existsSync(scriptsDir)) {
    const aiValidator = getValidator("schemas/ai-script.schema.json");
    for (const f of readdirSync(scriptsDir)) {
      if (!f.endsWith(".ai-script.json")) continue;
      const obj = JSON.parse(readFileSync(join(scriptsDir, f), "utf8"));
      if (!aiValidator(obj)) {
        fail(`[${id}] expected/scripts/${f} fails ai-script schema`,
          (aiValidator.errors || []).slice(0, 3).map(e => `${e.instancePath} ${e.message}`).join(" | "));
        return;
      }
    }
  }

  pass(`[${id}] compile fixture: input valid + expected SKILL.md conforms + scripts valid`);
}

for (const entry of manifest.fixtures) {
  if (entry.verdict === "equal") {
    runCompileFixture(entry);
  } else {
    const fixturePath = resolve(REPO, "conformance", entry.path);
    if (!existsSync(fixturePath)) {
      fail(`[${entry.id}] fixture missing: ${entry.path}`);
      continue;
    }
    runValidator(fixturePath, entry.against, entry.verdict, entry.id);
  }
}

// ─── 4. Examples sanity ───────────────────────────────────────────────────────
console.log(`\n${BOLD}3. Examples sanity${RESET}`);
const sourceValidator = getValidator("schemas/frontmatter-source.schema.json");
const skillValidator = getValidator("schemas/frontmatter-skill-md.schema.json");

for (const f of [
  "examples/source-only/intro.mda",
]) {
  const fm = extractFrontmatter(readFileSync(join(REPO, f), "utf8"));
  if (sourceValidator(fm ?? {})) pass(`${f} valid against source schema`);
  else fail(`${f} INVALID against source schema`,
    (sourceValidator.errors || []).slice(0, 3).map(e => `${e.instancePath} ${e.message}`).join(" | "));
}

for (const f of [
  "examples/skill-md/intro/SKILL.md",
]) {
  const text = readFileSync(join(REPO, f), "utf8");
  const fm = extractFrontmatter(text);
  if (skillValidator(fm ?? {})) pass(`${f} valid against SKILL.md target schema`);
  else fail(`${f} INVALID against SKILL.md target schema`,
    (skillValidator.errors || []).slice(0, 3).map(e => `${e.instancePath} ${e.message}`).join(" | "));
  if (bodyHasAiScriptFence(text)) {
    fail(`${f} body contains forbidden ai-script fence`);
  } else {
    pass(`${f} body free of ai-script fence`);
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${BOLD}Summary${RESET}`);
console.log(`  ${GREEN}${passes.length} passed${RESET} · ${failures.length ? RED : DIM}${failures.length} failed${RESET}`);

if (failures.length) {
  console.log(`\n${BOLD}${RED}Failures:${RESET}`);
  for (const f of failures) {
    console.log(`  · ${f.msg}`);
    if (f.detail) console.log(`    ${DIM}${f.detail}${RESET}`);
  }
  process.exit(1);
}
process.exit(0);
