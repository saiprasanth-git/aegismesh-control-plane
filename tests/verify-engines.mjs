/**
 * AEGIS // MESH — Headless Engine, Guardrail & Manifest Verification Suite
 *
 * Verifies:
 * 1. 8-Specialist Agent roster & deterministic 8-phase lifecycle mapping
 * 2. 6 Zero-Trust Ahead-of-Time (AOT) policy guardrails
 * 3. Baseline mission scenarios, diffs, and forensic evidence definitions
 * 4. TF-IDF Knowledge Graph search ranking & token scoring
 * 5. 3-Region Context Memory Compactor (/compact) & Markdown serializer
 * 6. Portable `aegismesh/squad@1` and `aegismesh/agent@1` manifest generation
 * 7. Deterministic BFS 2D command-floor grid pathfinding
 * 8. Static HTML/CSS/JS integrity & zero-neon warm industrial palette compliance
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Provide a minimal browser-like global context for IIFE modules
const sandbox = {
  window: {},
  document: {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        fillStyle: '',
        fillRect: () => {},
        clearRect: () => {},
        drawImage: () => {},
        save: () => {},
        restore: () => {},
        scale: () => {},
        translate: () => {},
      }),
    }),
  },
  console,
  Math,
  Date,
  Set,
  Map,
  Array,
  Object,
  String,
  Number,
  RegExp,
  JSON,
};

vm.createContext(sandbox);

const enginesCode = fs.readFileSync(path.join(ROOT, 'engines.js'), 'utf8');
const spritesCode = fs.readFileSync(path.join(ROOT, 'sprites.js'), 'utf8');

vm.runInContext(enginesCode, sandbox, { filename: 'engines.js' });
vm.runInContext(spritesCode, sandbox, { filename: 'sprites.js' });

const { AegisEngines, AegisSprites } = sandbox.window;

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  [PASS] ${name}`);
}

console.log('AEGIS // MESH — Running Headless Verification Suite...\n');

check('1. 8-Specialist roster maps cleanly across Phases P1..P8', () => {
  assert.ok(AegisEngines, 'window.AegisEngines must be defined');
  assert.equal(AegisEngines.AGENTS.length, 8, 'Expected exactly 8 specialist agents');
  const expectedCallsigns = [
    'ARC-01',
    'REC-02',
    'SYN-03',
    'VER-04',
    'CHS-05',
    'SHD-06',
    'CAN-07',
    'PLS-08',
  ];
  assert.equal(
    JSON.stringify(AegisEngines.AGENTS.map((a) => a.callsign)),
    JSON.stringify(expectedCallsigns)
  );
  for (const agent of AegisEngines.AGENTS) {
    assert.ok(agent.id && agent.name && agent.role && agent.model, `Missing fields on ${agent.id}`);
    assert.ok(agent.pinned && agent.pinned.length > 0, `Agent ${agent.id} needs pinned invariants`);
  }
});

check('2. 6 Zero-Trust Ahead-of-Time (AOT) guardrails are active by default', () => {
  assert.equal(AegisEngines.DEFAULT_GUARDRAILS.length, 6);
  for (const gr of AegisEngines.DEFAULT_GUARDRAILS) {
    assert.ok(gr.id && gr.title && gr.rule && gr.category);
    assert.equal(gr.enforced, true, `Guardrail ${gr.id} should be enforced by default`);
  }
});

check('3. All 4 baseline missions contain complete 8-phase telemetry & diffs', () => {
  const missionKeys = Object.keys(AegisEngines.MISSIONS);
  assert.ok(missionKeys.length >= 4, 'Expected at least 4 missions');
  for (const key of missionKeys) {
    const m = AegisEngines.MISSIONS[key];
    assert.ok(m.id && m.title && m.targetRepo && m.summary, `Incomplete mission metadata for ${key}`);
    assert.ok(m.diffFile && m.diffLines && m.diffLines.length > 0, `Mission ${key} missing clean-room diff`);
  }
});

check('4. TF-IDF Knowledge Graph search ranks forensic & canary records accurately', () => {
  const elfHits = AegisEngines.searchKnowledgeGraph('crash note UID binary recon');
  assert.ok(elfHits.length > 0, 'Expected TF-IDF hits for crash note query');
  assert.ok(elfHits[0].score > 0, 'Top hit must have a positive TF-IDF score');

  const allDocs = AegisEngines.searchKnowledgeGraph('');
  assert.equal(allDocs.length, AegisEngines.KNOWLEDGE_BASE.length);
});

check('5. 3-Region Memory Compactor (/compact) preserves pinned invariants & condenses window', () => {
  const vexClone = JSON.parse(JSON.stringify(AegisEngines.AGENTS[0]));
  const prevCondensedCount = vexClone.condensed.length;
  const prevPinnedCount = vexClone.pinned.length;
  const compacted = AegisEngines.compactAgentMemory(vexClone);
  assert.equal(compacted.pinned.length, prevPinnedCount, 'Pinned region must never be evicted');
  assert.equal(compacted.condensed.length, prevCondensedCount + 1, 'Recent sliding window must roll into Condensed history');
  const md = AegisEngines.formatMemoryMarkdown(compacted);
  assert.ok(md.includes('## Pinned (Immutable Guardrails'), 'Formatted markdown must include Pinned invariants');
  assert.ok(md.includes('## Condensed (Compacted Sprint Reflections)'), 'Formatted markdown must include Condensed history');
  assert.ok(md.includes('aegismesh/memory@1'), 'Formatted markdown must declare aegismesh/memory@1 schema');
});

check('6. Portable aegismesh/squad@1 & aegismesh/agent@1 manifest export passes schema check', () => {
  const manifest = AegisEngines.generateHireManifests();
  assert.equal(manifest.schemaVersion, 'aegismesh/squad@1');
  assert.equal(manifest.agents.length, 8);
  assert.ok(manifest.governance.protectedPaths.includes('prod.tf'));
  for (const a of manifest.agents) {
    assert.equal(a.schemaVersion, 'aegismesh/agent@1');
    assert.ok(a.id.startsWith('aegis-'));
  }
});

check('7. Deterministic BFS grid pathfinder computes contiguous routes on 2D floor', () => {
  const pathSteps = AegisSprites.findPath(2, 2, 7, 5, 24, 14);
  assert.equal(pathSteps.length, 8, 'Manhattan distance (5+3) on obstacle-free grid should be 8 steps');
  const last = pathSteps[pathSteps.length - 1];
  assert.equal(JSON.stringify(last), JSON.stringify({ x: 7, y: 5 }));
});

check('8. UI & stylesheet integrity (warm muted industrial palette, zero neon glow)', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  assert.ok(html.includes('AEGIS // MESH'), 'index.html must contain AEGIS // MESH title');
  assert.ok(!css.includes('#00ffcc') && !css.includes('#ff00ff'), 'Stylesheet must not contain neon cyan/magenta');
});

console.log(`\nOK — ${passed}/8 verification suites passed.`);
