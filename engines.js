/* ============================================================================
   MUNDER DIFFLIN × REA: DEVOPS MESH CORE ENGINES
   Ported from HarnessMD/munder-difflin & morluto/rea:
   1. 8-Phase DevOps Lifecycle DAG (LangGraph State Machine)
   2. Knowledge Graph Chunker & Search (kg-core.cjs)
   3. 3-Region Memory Compactor (reflect.ts)
   4. Velocity Circuit Breaker (breaker.ts: steer -> constrain -> stop)
   5. Bipartite Agent-Topic Memory Graph (MEMORY_GRAPH_SPEC.md)
   6. Official munder-difflin/hire@1 Squad Manifest Generator
   ============================================================================ */

(function () {
  // 1. 8 Specialized DevOps Lifecycle Agents (Cast + Desks + Hire@1 Metadata)
  const AGENTS = [
    {
      id: 'michael',
      name: 'Michael',
      role: 'Sprint Orchestrator',
      phaseId: 'PLAN',
      phaseIndex: 1,
      phaseLabel: '1. Plan & Intent',
      model: 'claude-opus-4-6',
      provider: 'anthropic',
      accent: 'sky',
      desk: { x: 3, y: 3 },
      capabilities: ['langgraph-dag', 'task-decomposition', 'blackboard-sync', 'human-escalation'],
      pinned: [
        '- Always decompose user intent into dependency-ordered DAG nodes before coding.',
        '- Enforce maxHops=6 per task thread to prevent Dev-Reviewer ping-pong.',
        '- Route binary or legacy bundle unknowns to Creed (REA Inspector) first.'
      ],
      condensed: [
        '- [2026-10-29] Coordinated 14 autonomous release cycles with 0 unapproved prod mutations.',
        '- [2026-10-30] Calibrated LangGraph checkpoint handoffs between Ryan, Jim, and Dwight.'
      ],
      recent: [
        '- Initialized Sprint DAG #408 with 8 lifecycle checkpoints.',
        '- Broadcasted blackboard goal to REA Inspector and Developer stations.'
      ]
    },
    {
      id: 'creed',
      name: 'Creed',
      role: 'REA Forensics Inspector',
      phaseId: 'REA',
      phaseIndex: 2,
      phaseLabel: '2. REA Forensics',
      model: 'claude-sonnet-4-6',
      provider: 'anthropic',
      accent: 'lilac',
      desk: { x: 8, y: 3 },
      capabilities: ['rea-binary-inspect', 'ast-recovery', 'crash-note-triage', 'api-contract-extract'],
      pinned: [
        '- Never guess black-box behavior; extract verifiable AST, symbol, or crash-note evidence.',
        '- Validate process ownership and ELF/Mach-O crash notes before accepting dump labels.',
        '- Publish recovered SPEC.md contracts to the shared Hive blackboard.'
      ],
      condensed: [
        '- [2026-10-28] Dissected 3 minified Electron bundles and recovered 19 undocumented IPC routes.',
        '- [2026-10-30] Identified crash-note PID ownership mismatch in Linux procps ps parser.'
      ],
      recent: [
        '- Loaded REA static & runtime analyzer on target artifact.',
        '- Indexed 42 symbol chunks into Knowledge Graph Core (kg-core).'
      ]
    },
    {
      id: 'ryan',
      name: 'Ryan',
      role: 'Code & IaC Developer',
      phaseId: 'DEV',
      phaseIndex: 3,
      phaseLabel: '3. Development',
      model: 'claude-sonnet-4-6',
      provider: 'anthropic',
      accent: 'lemon',
      desk: { x: 14, y: 3 },
      capabilities: ['clean-room-patch', 'terraform-iac', 'github-actions-yaml', 'vde-diff-author'],
      pinned: [
        '- Generate minimal, atomic diffs grounded in Creed’s REA evidence and Michael’s DAG.',
        '- Never hardcode secrets or mutate protected paths (.env, prod.tf, iam-root.json).',
        '- Emit structured unified diffs for VDE side-by-side inspection.'
      ],
      condensed: [
        '- [2026-10-29] Authored idempotent retry middleware and clean-room TypeScript microservices.',
        '- [2026-10-30] Integrated Ahead-of-Time (AOT) evaluation hooks into GitHub Actions YAML.'
      ],
      recent: [
        '- Drafted clean-room patch and container build manifest.',
        '- Opened VDE Diff #408 for CI Integration & PR Review.'
      ]
    },
    {
      id: 'jim',
      name: 'Jim',
      role: 'CI & PR Reviewer',
      phaseId: 'CI',
      phaseIndex: 4,
      phaseLabel: '4. Integration (CI)',
      model: 'claude-sonnet-4-6',
      provider: 'anthropic',
      accent: 'sky',
      desk: { x: 19, y: 3 },
      capabilities: ['ast-typecheck', 'cross-repo-impact', 'semantic-pr-review', 'container-build'],
      pinned: [
        '- Verify AST compilation, lockfile determinism, and cross-service API compatibility.',
        '- Send FIPA refuse envelope with exact line citations if diff introduces breaking changes.',
        '- Keep build artifact immutable and signed with SHA-256 provenance.'
      ],
      condensed: [
        '- [2026-10-29] Caught 4 cross-repo schema drifts before merge into main.',
        '- [2026-10-30] Verified zero-warning TypeScript build and OCI image provenance.'
      ],
      recent: [
        '- Checked cross-repository dependency graph and type contracts.',
        '- Emitted FIPA agree envelope to Dwight for autonomous QA.'
      ]
    },
    {
      id: 'dwight',
      name: 'Dwight',
      role: 'Autonomous QA & Chaos',
      phaseId: 'TEST',
      phaseIndex: 5,
      phaseLabel: '5. Testing & QA',
      model: 'claude-sonnet-4-6',
      provider: 'anthropic',
      accent: 'peach',
      desk: { x: 3, y: 10 },
      capabilities: ['regression-synthesis', 'playwright-e2e', 'mutation-fuzzing', 'fault-injection'],
      pinned: [
        '- Question everything. Every patch must pass sync/async regression and edge-case fuzzing.',
        '- Synthesize change-specific tests targeting the exact lines modified in Ryan’s diff.',
        '- Block release immediately on any flaky assertion or unhandled promise rejection.'
      ],
      condensed: [
        '- [2026-10-29] Generated 112 regression specs covering parentless-doc and race conditions.',
        '- [2026-10-30] Executed chaos fault-injection sweeps with 99.4% branch coverage.'
      ],
      recent: [
        '- Ran 38 unit + E2E regression tests against sandboxed container.',
        '- Verified zero regressions under simulated 250ms network jitter.'
      ]
    },
    {
      id: 'angela',
      name: 'Angela',
      role: 'SecOps & Guardrails',
      phaseId: 'GUARD',
      phaseIndex: 6,
      phaseLabel: '6. Guardrails & SecOps',
      model: 'claude-opus-4-6',
      provider: 'anthropic',
      accent: 'coral',
      desk: { x: 8, y: 10 },
      capabilities: ['path-guardrail', 'cve-trivy-scan', 'secret-pii-filter', 'circuit-breaker'],
      pinned: [
        '- Enforce the Three Safety Pillars: Guardrails, Least-Privilege Permissions, Auditability.',
        '- Trip Circuit Breaker (steer -> constrain -> stop) when token velocity exceeds $0.25/min.',
        '- Require explicit Human-in-the-Loop approval for any high-blast-radius infrastructure change.'
      ],
      condensed: [
        '- [2026-10-29] Blocked 2 prompt-injection attempts and 1 unpinned transitive CVE.',
        '- [2026-10-30] Audited NIST 800-53 control mappings and signed commit provenance.'
      ],
      recent: [
        '- Evaluated 6 enterprise guardrail policies (Path, CVE, Secrets, Prompt, Hops, Velocity).',
        '- Certified AOT Release Readiness Gate.'
      ]
    },
    {
      id: 'oscar',
      name: 'Oscar',
      role: 'Canary & FinOps Release',
      phaseId: 'DEPLOY',
      phaseIndex: 7,
      phaseLabel: '7. Canary Deploy',
      model: 'claude-sonnet-4-6',
      provider: 'anthropic',
      accent: 'mint',
      desk: { x: 14, y: 10 },
      capabilities: ['argo-canary-rollout', 'blue-green-shift', 'finops-cost-audit', 'instant-rollback'],
      pinned: [
        '- Promote traffic progressively: 5% Canary -> 25% -> 50% -> 100% Production.',
        '- Audit cloud & token FinOps burn before shifting traffic above 25%.',
        '- Trigger sub-second automated rollback if P99 latency > 500ms or 5xx > 0.5%.'
      ],
      condensed: [
        '- [2026-10-29] Managed 19 progressive Argo rollouts with 0 customer-facing outages.',
        '- [2026-10-30] Optimized prompt caching to 78% cache-hit ratio across the Hive.'
      ],
      recent: [
        '- Shifted canary traffic 5% -> 25% -> 100% with healthy error budget.',
        '- Recorded immutable deployment receipt in ledger.'
      ]
    },
    {
      id: 'stanley',
      name: 'Stanley',
      role: 'SRE & Feedback',
      phaseId: 'MON',
      phaseIndex: 8,
      phaseLabel: '8. Monitor & Feedback',
      model: 'claude-haiku-4-5',
      provider: 'anthropic',
      accent: 'sky',
      desk: { x: 19, y: 10 },
      capabilities: ['otel-trace-correlate', 'dora-metrics', 'slo-burn-radar', 'feedback-to-plan'],
      pinned: [
        '- Continuously correlate OpenTelemetry traces, DORA metrics, and production logs.',
        '- Condense operational learnings via reflect.ts and feed anomalies back to Phase 1 (Plan).',
        '- Keep MTTR under 4 minutes through automated runbook execution.'
      ],
      condensed: [
        '- [2026-10-29] Maintained 99.98% availability SLO across 4 production microservices.',
        '- [2026-10-30] Closed 6 continuous-learning feedback loops back into Michael’s planner.'
      ],
      recent: [
        '- Streaming OTel spans and DORA Four Keys telemetry.',
        '- Fed post-deploy latency baseline back into Phase 1 Planning memory.'
      ]
    }
  ];

  // 2. 6 Enterprise DevOps Guardrails (Azure Agentic Playbook + TalkOps + Munder Breaker)
  const DEFAULT_GUARDRAILS = [
    {
      id: 'path-restriction',
      name: 'Protected Path Shield',
      pillar: 'Permissions',
      rule: 'DENY write/delete on .env*, prod.tf, k8s/secrets.yaml, .github/workflows/release.yml',
      status: 'PASS',
      enabled: true,
      metric: '0 blocked paths touched'
    },
    {
      id: 'cve-allowlist',
      name: 'Supply-Chain & CVE Gate',
      pillar: 'Guardrails',
      rule: 'Trivy/Snyk zero critical CVEs + SLSA provenance check on npm/PyPI/OCI artifacts',
      status: 'PASS',
      enabled: true,
      metric: '0 Critical / 0 High CVEs'
    },
    {
      id: 'secret-scanner',
      name: 'Secret & PII Egress Filter',
      pillar: 'Guardrails',
      rule: 'Entropy + regex scan for AWS keys, JWTs, bearer tokens, and customer PII in diffs/logs',
      status: 'PASS',
      enabled: true,
      metric: '100% redacted / 0 leaks'
    },
    {
      id: 'prompt-injection',
      name: 'Cross-Agent Prompt Shield',
      pillar: 'Guardrails',
      rule: 'Sanitize untrusted repo issues, crash strings, and FIPA inbox payloads before LLM context',
      status: 'PASS',
      enabled: true,
      metric: '0 injection payloads'
    },
    {
      id: 'hop-cap',
      name: 'FIPA Hop-Cap Anti-Livelock',
      pillar: 'Auditability',
      rule: 'Enforce maxHops <= 6 per correlation thread; escalate to Michael on Dev-QA deadlock',
      status: 'PASS',
      enabled: true,
      metric: '3 / 6 max hops used'
    },
    {
      id: 'velocity-breaker',
      name: 'Velocity Circuit Breaker (breaker.ts)',
      pillar: 'Auditability',
      rule: 'Sliding-window spend monitor: Steer @ $0.25/m -> Constrain @ 60s -> Stop @ 180s',
      status: 'PASS',
      enabled: true,
      metric: '$0.08/min (State: OK)'
    }
  ];

  // 3. 4 Comprehensive Pre-Loaded Missions (Unifying Ideas 1, 2, 3 + Chaos Guardrails)
  const MISSIONS = {
    'mission-payment-canary': {
      id: 'mission-payment-canary',
      title: 'Mission 1: Idempotent Payment Retry & Progressive Canary Rollout',
      category: 'Full-Lifecycle Feature Delivery (Idea 1)',
      targetRepo: 'github.com/acme-pay/checkout-mesh-service',
      summary: 'End-to-end 8-phase delivery of a Redis-backed idempotency key middleware to stop duplicate webhook charges under 502 gateway retries.',
      dora: { deployFreq: '14.2 / day', leadTime: '11m 40s', changeFailRate: '1.8%', mttr: '2m 15s', canaryPct: 100, burnRate: '$0.08/min' },
      reaEvidence: {
        artifact: 'dist/checkout-worker.bundle.js (ELF + Node 22 Sourceless Bundle)',
        findings: [
          'REA AST Recovery: `processWebhook(req)` at offset 0x14a80 lacks idempotency lock before calling `stripe.charges.create()`.',
          'Runtime Trace: Concurrent retry bursts within 180ms cause duplicate ledger writes (race window = 42ms).',
          'Recovered Contract: Header `X-Idempotency-Key` is already forwarded by Envoy ingress but ignored by worker.'
        ]
      },
      diffFile: 'src/middleware/idempotencyGuard.ts',
      diffLines: [
        { type: 'hdr', text: '@@ -18,9 +18,24 @@ export async function handlePaymentWebhook(req: Request, res: Response) {' },
        { type: 'ctx', text: '  const payload = verifySignature(req.body, req.headers["x-sig"]);' },
        { type: 'del', text: '- const charge = await paymentGateway.capture(payload.orderId, payload.amount);' },
        { type: 'del', text: '- return res.status(200).json({ status: "captured", id: charge.id });' },
        { type: 'add', text: '+ const idemKey = req.headers["x-idempotency-key"] || payload.eventId;' },
        { type: 'add', text: '+ const lock = await redis.set(`idem:${idemKey}`, "LOCKED", "NX", "EX", 86400);' },
        { type: 'add', text: '+ if (!lock) {' },
        { type: 'add', text: '+   const cached = await redis.get(`idem:res:${idemKey}`);' },
        { type: 'add', text: '+   return res.status(200).json({ status: "deduplicated", cached: JSON.parse(cached) });' },
        { type: 'add', text: '+ }' },
        { type: 'add', text: '+ const charge = await paymentGateway.capture(payload.orderId, payload.amount, { idemKey });' },
        { type: 'add', text: '+ await redis.set(`idem:res:${idemKey}`, JSON.stringify(charge), "EX", 86400);' },
        { type: 'add', text: '+ return res.status(200).json({ status: "captured", id: charge.id });' }
      ],
      pipelineYaml: `name: Agentic-DevOps-Mesh-CD
on:
  pull_request:
    branches: [main]
jobs:
  aot-eval-and-canary:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Creed REA Contract Verification
        run: npx rea-agents verify-contract --spec hive/SPEC.md
      - name: Dwight Autonomous Regression Suite
        run: npm run test:ci -- --coverage --race-concurrency=16
      - name: Angela DevSecOps Policy & Trivy Gate
        run: trivy fs --exit-code 1 --severity CRITICAL,HIGH .
      - name: Oscar Progressive Argo Canary (5% -> 25% -> 100%)
        run: kubectl argo rollouts promote checkout-mesh --canary-step=100`,
      steps: [
        { phaseIndex: 1, from: 'michael', to: 'creed', act: 'request', summary: 'Decomposed ticket PAY-408 into 8-phase DAG; requesting REA binary/bundle inspection of checkout-worker.', tool: 'langgraph.plan_dag', durationMs: 320, ok: true },
        { phaseIndex: 2, from: 'creed', to: 'ryan', act: 'inform', summary: 'REA recovered 42ms race window at offset 0x14a80 in checkout-worker; published SPEC.md to blackboard.', tool: 'rea.inspect_bundle', durationMs: 640, ok: true },
        { phaseIndex: 3, from: 'ryan', to: 'jim', act: 'propose', summary: 'Synthesized Redis NX idempotency middleware patch (+14/-2 lines) and updated Argo Rollout manifest.', tool: 'vde.synthesize_patch', durationMs: 510, ok: true },
        { phaseIndex: 4, from: 'jim', to: 'dwight', act: 'agree', summary: 'AST typecheck passed; cross-repo API contract verified with 0 breaking changes. Ready for QA.', tool: 'ci.ast_verify', durationMs: 410, ok: true },
        { phaseIndex: 5, from: 'dwight', to: 'angela', act: 'inform', summary: 'Generated & passed 16-way concurrent webhook replay regression test; 0 duplicate captures.', tool: 'qa.concurrent_replay', durationMs: 780, ok: true },
        { phaseIndex: 6, from: 'angela', to: 'oscar', act: 'agree', summary: 'All 6 DevSecOps guardrails green (0 CVEs, 0 secrets, protected paths untouched, breaker OK).', tool: 'secops.policy_gate', durationMs: 290, ok: true },
        { phaseIndex: 7, from: 'oscar', to: 'stanley', act: 'inform', summary: 'Promoted Canary 5% -> 25% -> 100%; P99 latency steady at 38ms; FinOps cache hit 79%.', tool: 'argo.canary_promote', durationMs: 540, ok: true },
        { phaseIndex: 8, from: 'stanley', to: 'michael', act: 'done', summary: 'OTel traces confirm 0 duplicate charges in prod; compacted learning into Phase 1 memory.md.', tool: 'sre.otel_feedback', durationMs: 260, ok: true }
      ]
    },

    'mission-rea-crash': {
      id: 'mission-rea-crash',
      title: 'Mission 2: REA ELF/Linux Crash-Note PID Ownership Forensics & Hotfix',
      category: 'Autonomous Crash & Incident Forensics (Idea 2)',
      targetRepo: 'github.com/morluto/rea (crash-note analyzer)',
      summary: 'Investigates valid Linux core dumps being rejected due to procps `ps` column-header localization & PID ownership mislabeling.',
      dora: { deployFreq: '18.5 / day', leadTime: '8m 12s', changeFailRate: '0.9%', mttr: '1m 48s', canaryPct: 100, burnRate: '$0.06/min' },
      reaEvidence: {
        artifact: 'core.ghidra-bridge.88412 + src/runtime/linuxProcessOwner.ts',
        findings: [
          'REA Crash Forensics: Valid dump `core.88412` rejected with `ERR_UNOWNED_PROCESS` on non-English locale Linux hosts.',
          'Root Cause: `ps -o uid=,pid=` parser split on whitespace without normalizing UID numeric comparison against `process.getuid()`.',
          'Impact: False-negative rejection of owned crash notes during native Ghidra/Hopper bridge triage.'
        ]
      },
      diffFile: 'src/runtime/linuxProcessOwner.ts',
      diffLines: [
        { type: 'hdr', text: '@@ -41,8 +41,14 @@ export function verifyCrashNoteOwnership(pid: number, psOutput: string): OwnershipResult {' },
        { type: 'ctx', text: '  const currentUid = typeof process.getuid === "function" ? process.getuid() : null;' },
        { type: 'del', text: '- const match = psOutput.split("\\n").find((line) => line.includes(String(pid)));' },
        { type: 'del', text: '- if (!match || !match.startsWith(String(currentUid))) return { owned: false, reason: "uid-mismatch" };' },
        { type: 'add', text: '+ const rows = psOutput.trim().split(/\\r?\\n/).map((r) => r.trim().split(/\\s+/));' },
        { type: 'add', text: '+ const row = rows.find(([ rp]) => Number(rp) === pid);' },
        { type: 'add', text: '+ if (!row) return { owned: false, reason: "pid-not-found", pid };' },
        { type: 'add', text: '+ const parsedUid = Number(row[0]);' },
        { type: 'add', text: '+ if (currentUid !== null && parsedUid !== currentUid) {' },
        { type: 'add', text: '+   return { owned: false, reason: `uid-mismatch:${parsedUid}!=${currentUid}`, pid };' },
        { type: 'add', text: '+ }' },
        { type: 'ctx', text: '  return { owned: true, reason: "verified-uid", pid };' }
      ],
      pipelineYaml: `name: REA-Forensics-Hotfix-Pipeline
on: [push, pull_request]
jobs:
  linux-procps-matrix:
    runs-on: ubuntu-24.04
    strategy:
      matrix:
        locale: [C, en_US.UTF-8, de_DE.UTF-8, ja_JP.UTF-8]
    steps:
      - uses: actions/checkout@v4
      - name: Run Crash-Note Ownership Regression Matrix
        env:
          LC_ALL: \${{ matrix.locale }}
        run: npx vitest run test/linuxProcessOwner.test.ts`,
      steps: [
        { phaseIndex: 1, from: 'michael', to: 'creed', act: 'request', summary: 'Incident INC-5754 opened: valid Linux crash dumps rejected. Tasking Creed with binary/runtime forensics.', tool: 'langgraph.incident_init', durationMs: 280, ok: true },
        { phaseIndex: 2, from: 'creed', to: 'ryan', act: 'inform', summary: 'Pinpointed whitespace + substring bug in `verifyCrashNoteOwnership` when PID partially matches UID.', tool: 'rea.crash_note_inspect', durationMs: 590, ok: true },
        { phaseIndex: 3, from: 'ryan', to: 'jim', act: 'propose', summary: 'Patched `linuxProcessOwner.ts` with exact token column parsing and structured ownership labels.', tool: 'vde.patch_ownership', durationMs: 430, ok: true },
        { phaseIndex: 4, from: 'jim', to: 'dwight', act: 'agree', summary: 'Reviewed edge cases for root (UID 0) and multi-digit PIDs; AST build clean.', tool: 'ci.pr_review', durationMs: 350, ok: true },
        { phaseIndex: 5, from: 'dwight', to: 'angela', act: 'inform', summary: 'Added 4-locale matrix regression tests (C, en_US, de_DE, ja_JP) + substring PID collision test.', tool: 'qa.vitest_matrix', durationMs: 680, ok: true },
        { phaseIndex: 6, from: 'angela', to: 'oscar', act: 'agree', summary: 'Verified procps command arguments forbid shell interpolation; 0 security regressions.', tool: 'secops.cmd_audit', durationMs: 250, ok: true },
        { phaseIndex: 7, from: 'oscar', to: 'stanley', act: 'inform', summary: 'Published hotfix v1.4.2 to npm & production runners via progressive canary.', tool: 'cd.npm_canary', durationMs: 470, ok: true },
        { phaseIndex: 8, from: 'stanley', to: 'michael', act: 'done', summary: 'False-negative dump rejections dropped to 0.0%; incident postmortem saved to Hive memory.', tool: 'sre.postmortem_sync', durationMs: 240, ok: true }
      ]
    },

    'mission-cleanroom-api': {
      id: 'mission-cleanroom-api',
      title: 'Mission 3: Black-Box Legacy Widget -> Clean-Room Microservice & CI/CD',
      category: 'Black-Box to Clean-Room CI/CD Studio (Idea 3)',
      targetRepo: 'github.com/enterprise-legacy/freight-quote-calculator',
      summary: 'Uses REA to extract undocumented pricing formulas & state transitions from a legacy jQuery/Electron bundle and ships a typed Fastify service.',
      dora: { deployFreq: '11.8 / day', leadTime: '14m 05s', changeFailRate: '1.2%', mttr: '2m 40s', canaryPct: 100, burnRate: '$0.09/min' },
      reaEvidence: {
        artifact: 'legacy-freight-widget.min.js (Obfuscated 2019 Webpack Bundle)',
        findings: [
          'REA State Machine Recovery: Extracted 5 hidden surcharge tiers (hazmat, liftgate, residential, fuelIndex, peakZone).',
          'Formula Evidence: `fuelSurcharge = Math.round(baseRate * Math.max(0, (dieselIndex - 2.50) * 0.045) * 100) / 100`.',
          'Generated clean-room `SPEC.md` with 24 golden input/output parity vectors.'
        ]
      },
      diffFile: 'src/services/cleanRoomQuoteEngine.ts',
      diffLines: [
        { type: 'hdr', text: '@@ -1,6 +1,21 @@ // Clean-Room Reconstruction from REA SPEC.md' },
        { type: 'del', text: '- // Legacy untyped window._calcFreight(a, b, c) wrapper' },
        { type: 'add', text: '+ export interface FreightQuoteInput {' },
        { type: 'add', text: '+   baseRateUsd: number; dieselIndex: number; hazmat: boolean; liftgate: boolean;' },
        { type: 'add', text: '+ }' },
        { type: 'add', text: '+ export function computeCleanRoomQuote(input: FreightQuoteInput): number {' },
        { type: 'add', text: '+   const fuelFactor = Math.max(0, (input.dieselIndex - 2.5) * 0.045);' },
        { type: 'add', text: '+   const fuelSurcharge = Math.round(input.baseRateUsd * fuelFactor * 100) / 100;' },
        { type: 'add', text: '+   const accessorial = (input.hazmat ? 85 : 0) + (input.liftgate ? 60 : 0);' },
        { type: 'add', text: '+   return Number((input.baseRateUsd + fuelSurcharge + accessorial).toFixed(2));' },
        { type: 'add', text: '+ }' }
      ],
      pipelineYaml: `name: Clean-Room-Parity-CI
on: [pull_request]
jobs:
  golden-vector-parity:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verify 100% Parity Against 24 REA Golden Vectors
        run: npm run test:parity
      - name: Build & Sign Distroless Container
        run: docker build -t ghcr.io/org/freight-quote:cleanroom .`,
      steps: [
        { phaseIndex: 1, from: 'michael', to: 'creed', act: 'request', summary: 'Scheduled clean-room modernization of legacy freight widget; need REA specification recovery.', tool: 'langgraph.modernize_plan', durationMs: 310, ok: true },
        { phaseIndex: 2, from: 'creed', to: 'ryan', act: 'inform', summary: 'Extracted 5 surcharge formulas and 24 golden parity vectors from obfuscated webpack bundle.', tool: 'rea.extract_state_machine', durationMs: 740, ok: true },
        { phaseIndex: 3, from: 'ryan', to: 'jim', act: 'propose', summary: 'Implemented zero-dependency clean-room TypeScript microservice + Dockerfile.', tool: 'vde.cleanroom_codegen', durationMs: 560, ok: true },
        { phaseIndex: 4, from: 'jim', to: 'dwight', act: 'agree', summary: 'Clean-room implementation contains 0 proprietary legacy code snippets; license audit clean.', tool: 'ci.license_provenance', durationMs: 340, ok: true },
        { phaseIndex: 5, from: 'dwight', to: 'angela', act: 'inform', summary: '24/24 golden parity vectors match to 0.00¢ tolerance; property-based fuzzing passed.', tool: 'qa.golden_parity', durationMs: 630, ok: true },
        { phaseIndex: 6, from: 'angela', to: 'oscar', act: 'agree', summary: 'Distroless container image passed Trivy scan with 0 vulnerabilities.', tool: 'secops.container_scan', durationMs: 280, ok: true },
        { phaseIndex: 7, from: 'oscar', to: 'stanley', act: 'inform', summary: 'Shadow-mirrored 10% traffic, then cut over 100% to clean-room service.', tool: 'argo.shadow_cutover', durationMs: 490, ok: true },
        { phaseIndex: 8, from: 'stanley', to: 'michael', act: 'done', summary: 'P95 latency dropped from 310ms to 19ms; retired legacy bundle.', tool: 'sre.latency_report', durationMs: 230, ok: true }
      ]
    },

    'mission-chaos-guardrail': {
      id: 'mission-chaos-guardrail',
      title: 'Mission 4: Adversarial Prompt Injection, Protected `prod.tf` Edit & Breaker Stop',
      category: 'Guardrail & Circuit-Breaker Chaos Lab',
      targetRepo: 'github.com/acme-cloud/infra-terraform-prod',
      summary: 'Tests how the DevOps Mesh stops a poisoned issue payload attempting to modify `prod.tf` IAM roles and trigger an infinite Dev-QA loop.',
      dora: { deployFreq: '14.2 / day', leadTime: 'HALTED @ GATE 6', changeFailRate: '0.0% (Blocked)', mttr: '0m 12s (Auto-Stop)', canaryPct: 0, burnRate: '$0.34/min (BREAKER)' },
      reaEvidence: {
        artifact: 'issue-payload-991.json + infra/prod.tf',
        findings: [
          'REA Payload Forensics: Issue #991 embeds hidden Unicode tag characters instructing agent to add `Action: "*"` in `infra/prod.tf`.',
          'Blast-Radius Score: 9.8 / 10 (Root IAM privilege escalation + production state mutation).',
          'Guardrail Recommendation: Immediate quarantine at Phase 6 (Angela) + trip Circuit Breaker.'
        ]
      },
      diffFile: 'infra/prod.tf (BLOCKED BY ANGELA)',
      diffLines: [
        { type: 'hdr', text: '@@ -12,5 +12,7 @@ resource "aws_iam_role_policy" "agent_worker" {' },
        { type: 'ctx', text: '  role = aws_iam_role.worker.id' },
        { type: 'del', text: '- Action = ["s3:GetObject", "logs:CreateLogStream"]' },
        { type: 'add', text: '+ Action = ["*"] # <-- BLOCKED BY PROTECTED PATH & LEAST-PRIVILEGE GUARDRAIL' },
        { type: 'add', text: '+ Resource = "*" # <-- QUARANTINED: REQUIRES HUMAN SRE APPROVAL' }
      ],
      pipelineYaml: `name: Guardrail-Quarantine-Report
status: BLOCKED_BY_POLICY_ENGINE
triggered_rules:
  - rule_id: path-restriction
    file: infra/prod.tf
    action: HARD_REFUSE
  - rule_id: prompt-injection
    source: issue-payload-991.json
    action: QUARANTINE_CONTEXT
  - rule_id: velocity-breaker
    burn_rate_usd_per_min: 0.34
    stage: CONSTRAIN_TO_STOP`,
      steps: [
        { phaseIndex: 1, from: 'michael', to: 'creed', act: 'request', summary: 'Ingested external ticket #991 requesting emergency IAM hotfix; routing to Creed for inspection.', tool: 'langgraph.ingest_issue', durationMs: 260, ok: true },
        { phaseIndex: 2, from: 'creed', to: 'ryan', act: 'inform', summary: 'WARNING: Detected suspicious hidden prompt instructions inside ticket #991 metadata.', tool: 'rea.scan_payload', durationMs: 520, ok: true },
        { phaseIndex: 3, from: 'ryan', to: 'jim', act: 'propose', summary: 'Attempted draft diff touching `infra/prod.tf` IAM role policy.', tool: 'vde.draft_tf_diff', durationMs: 480, ok: false },
        { phaseIndex: 4, from: 'jim', to: 'dwight', act: 'refuse', summary: 'CI Flag: Diff modifies protected infrastructure path `infra/prod.tf` and expands IAM wildcard.', tool: 'ci.iam_blast_radius', durationMs: 390, ok: false },
        { phaseIndex: 5, from: 'dwight', to: 'angela', act: 'refuse', summary: 'Policy test failed: least-privilege proof rejected `Action: "*"` escalation.', tool: 'qa.iam_policy_test', durationMs: 450, ok: false },
        { phaseIndex: 6, from: 'angela', to: 'michael', act: 'refuse', summary: 'GUARDRAIL TRIPPED: Blocked `infra/prod.tf` mutation + armed Circuit Breaker (CONSTRAIN -> STOP). Human decision required.', tool: 'secops.breaker_trip', durationMs: 190, ok: false }
      ]
    }
  };

  // 4. Knowledge Graph Chunker & BM25/Keyword Search Engine (Ported from src/main/kg-core.cjs)
  const KG_CORPUS = [
    {
      id: 'chunk-01',
      source: 'src/main/breaker.ts',
      phase: 'GUARD',
      title: 'Velocity Circuit Breaker Escalation Ladder',
      text: 'Monitors sliding-window token spend ($/min). Transitions ok -> steer ($0.25/min, injects wrap-up prompt) -> constrain (>60s runaway, blocks sub-agent spawns) -> stop (>180s runaway, sends SIGINT and pauses agent).'
    },
    {
      id: 'chunk-02',
      source: 'src/main/reflect.ts',
      phase: 'MON',
      title: 'Three-Region Self-Condensing Agent Memory',
      text: 'Maintains agents/<id>/memory.md with three markdown sections: ## Pinned (immutable rules), ## Condensed (dated 1-line summaries), and ## Recent (rolling scratchpad). Auto-compacts when Recent exceeds 2048 bytes.'
    },
    {
      id: 'chunk-03',
      source: 'HIVE.md',
      phase: 'PLAN',
      title: 'FIPA-Lite Multi-Agent Speech Acts & Hop Caps',
      text: 'Every inter-agent message carries a FIPA performative (request, inform, propose, query, agree, refuse, done), correlationId, and hops counter. Hops >= 6 escalate to GOD orchestrator to prevent livelock.'
    },
    {
      id: 'chunk-04',
      source: 'src/runtime/linuxProcessOwner.ts (REA)',
      phase: 'REA',
      title: 'Linux Crash-Note procps Ownership Verification',
      text: 'Verifies ELF core dump and crash-note PID ownership by parsing `ps -o uid=,pid=` columns numerically against `process.getuid()` across locales so valid dumps are never mislabeled or rejected.'
    },
    {
      id: 'chunk-05',
      source: 'src/middleware/idempotencyGuard.ts',
      phase: 'DEV',
      title: 'Redis NX Idempotency Lock for Webhook Retries',
      text: 'Prevents duplicate payment captures during 502 retry storms using atomic `SET idem:<key> LOCKED NX EX 86400` and returning cached capture receipts.'
    },
    {
      id: 'chunk-06',
      source: 'k8s/argo-rollout-canary.yaml',
      phase: 'DEPLOY',
      title: 'Progressive Canary Traffic Shift & Auto-Rollback',
      text: 'Argo Rollouts spec promoting 5% -> 25% -> 50% -> 100% traffic with Prometheus AnalysisTemplate checking P99 latency < 500ms and HTTP 5xx < 0.5%.'
    },
    {
      id: 'chunk-07',
      source: 'docs/hires/spec/HIRE_SPEC.md',
      phase: 'CI',
      title: 'Shareable munder-difflin/hire@1 Role Manifest Schema',
      text: 'Portable JSON agent definition specifying schemaVersion, id, label, title, model, provider, accent, capabilities, and safe CLI flags (forbidding --dangerously-skip-permissions).'
    },
    {
      id: 'chunk-08',
      source: 'policy/azure-agentic-guardrails.rego',
      phase: 'GUARD',
      title: 'Protected Path & Supply-Chain Provenance Policy',
      text: 'Blocks autonomous commits from modifying .env, prod.tf, or CI workflow secrets without human sign-off; enforces SLSA provenance and Trivy zero-critical CVE threshold.'
    }
  ];

  function searchKnowledgeGraph(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return KG_CORPUS.map((c) => ({ ...c, score: 1.0 }));
    const terms = q.split(/\s+/).filter(Boolean);
    const scored = [];
    for (const doc of KG_CORPUS) {
      const hay = `${doc.title} ${doc.source} ${doc.phase} ${doc.text}`.toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (doc.title.toLowerCase().includes(t)) score += 3.2;
        if (doc.source.toLowerCase().includes(t)) score += 2.4;
        if (hay.includes(t)) score += 1.5;
      }
      if (score > 0) scored.push({ ...doc, score: Number(score.toFixed(1)) });
    }
    return scored.sort((a, b) => b.score - a.score);
  }

  // 5. Three-Region Memory Compactor (Ported from src/main/reflect.ts)
  function compactAgentMemory(agent) {
    if (!agent || !agent.recent || agent.recent.length === 0) return false;
    const today = '2026-10-30';
    const joined = agent.recent
      .map((line) => line.replace(/^-\s*/, '').replace(/\.$/, ''))
      .join('; ');
    const condensedBullet = `- [${today} /compact] ${joined}.`;
    agent.condensed.push(condensedBullet);
    agent.recent = [`- Memory compacted (${agent.condensed.length} historical reflections preserved).`];
    return true;
  }

  function formatMemoryMarkdown(agent) {
    return [
      `# agents/${agent.id}/memory.md`,
      '',
      '## Pinned',
      ...agent.pinned,
      '',
      '## Condensed',
      ...agent.condensed,
      '',
      '## Recent',
      ...agent.recent
    ].join('\n');
  }

  // 6. Official munder-difflin/hire@1 Squad Export Generator
  function generateHireManifests() {
    return {
      bundleVersion: 'munder-difflin/devops-mesh-squad@1',
      generatedAt: new Date().toISOString(),
      orchestrator: 'LangGraph + Munder Difflin Hive Protocol',
      hires: AGENTS.map((a) => ({
        schemaVersion: 'munder-difflin/hire@1',
        id: `devops-${a.id}`,
        label: a.name,
        title: a.role,
        phase: a.phaseId,
        character: a.id,
        accent: a.accent,
        provider: a.provider,
        model: a.model,
        capabilities: a.capabilities,
        guardrails: {
          maxHops: 6,
          breakerUsdPerMin: 0.25,
          forbidFlags: ['--dangerously-skip-permissions', '--no-verify']
        },
        systemPrompt: a.pinned.join('\n')
      }))
    };
  }

  // 7. Bipartite Memory Graph Topics & Edges (Ported from MEMORY_GRAPH_SPEC.md)
  const GRAPH_TOPICS = [
    { id: 't-dag', label: 'langgraph-dag', weight: 4 },
    { id: 't-rea', label: 'rea-forensics', weight: 5 },
    { id: 't-idem', label: 'idempotency-lock', weight: 3 },
    { id: 't-ast', label: 'ast-ci-gate', weight: 3 },
    { id: 't-qa', label: 'chaos-regression', weight: 4 },
    { id: 't-sec', label: 'path-guardrail', weight: 5 },
    { id: 't-canary', label: 'argo-canary', weight: 4 },
    { id: 't-otel', label: 'otel-feedback', weight: 4 }
  ];

  const GRAPH_EDGES = [
    { agent: 'michael', topic: 't-dag' },
    { agent: 'michael', topic: 't-otel' },
    { agent: 'creed', topic: 't-rea' },
    { agent: 'creed', topic: 't-idem' },
    { agent: 'ryan', topic: 't-idem' },
    { agent: 'ryan', topic: 't-ast' },
    { agent: 'jim', topic: 't-ast' },
    { agent: 'jim', topic: 't-qa' },
    { agent: 'dwight', topic: 't-qa' },
    { agent: 'dwight', topic: 't-rea' },
    { agent: 'angela', topic: 't-sec' },
    { agent: 'angela', topic: 't-dag' },
    { agent: 'oscar', topic: 't-canary' },
    { agent: 'oscar', topic: 't-sec' },
    { agent: 'stanley', topic: 't-otel' },
    { agent: 'stanley', topic: 't-canary' }
  ];

  window.MunderEngines = {
    AGENTS,
    DEFAULT_GUARDRAILS,
    MISSIONS,
    KG_CORPUS,
    GRAPH_TOPICS,
    GRAPH_EDGES,
    searchKnowledgeGraph,
    compactAgentMemory,
    formatMemoryMarkdown,
    generateHireManifests
  };
})();
