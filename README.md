# AEGIS // MESH — Autonomous 8-Phase DevOps & Binary Forensics Control Plane

**AEGIS // MESH** is an interactive, zero-dependency multi-agent DevOps & Binary Forensics Control Plane featuring an 8-specialist pixel-art command floor, a deterministic 8-phase software delivery DAG, live GitHub REST API probing, dynamic Zero-Trust guardrails, a searchable Knowledge Graph, and portable `aegismesh/agent@1` squad manifests.

---

## Key Capabilities

1. **8-Phase Deterministic DevOps Lifecycle DAG**
   - **P1 · PLAN (`VEX · ARC-01`)**: Decomposes feature intents, live repository targets, and incident alerts into an 8-phase execution graph with acceptance SLOs.
   - **P2 · RECON (`CIPHER · REC-02`)**: Performs pre-synthesis binary/bundle AST recovery, Linux ELF crash-note forensics, and runtime call-graph extraction before any code is modified.
   - **P3 · SYNTH (`KAEL · SYN-03`)**: Synthesizes clean-room TypeScript/C patches, Terraform IaC, and GitHub Actions + Argo Rollouts manifests.
   - **P4 · VERIFY (`LYRA · VER-04`)**: Executes independent AST type-safety, cyclomatic complexity, and contract parity reviews (strict separation of duties — zero self-approvals).
   - **P5 · CHAOS (`DRAKE · CHS-05`)**: Runs 50-way concurrency race fuzzing, property-based assertions, and multi-locale regression matrices.
   - **P6 · SHIELD (`NYX · SHD-06`)**: Enforces Ahead-of-Time (AOT) policy gates blocking unauthorized mutations to `.env*`, `prod.tf`, and IAM policies, plus high-entropy secret scrubbing.
   - **P7 · CANARY (`ORION · CAN-07`)**: Manages progressive Argo Rollouts (`5% → 25% → 100%`) with automated sub-second SLO rollback and a 3-stage FinOps velocity circuit breaker (`STEER → CONSTRAIN → STOP`).
   - **P8 · PULSE (`SORA · PLS-08`)**: Correlates OpenTelemetry tool spans with DORA Elite metrics and compacts institutional learnings into the Knowledge Graph.

2. **Live Real-Time Scenario Tester & GitHub REST API Probe (`+ Custom Target`)**
   - Connects directly to `https://api.github.com/repos/<owner>/<repo>` to pull real HEAD commit SHAs, commit authors, issue counts, and live HTTP round-trip latency.
   - Dynamically scans custom crash logs, sourceless bundle traces, and policy payloads — automatically quarantining runs at **Phase 6 (`BREAKER: STOP`)** when protected paths (`prod.tf`, `.env`) or secret tokens (`AWS_SECRET_ACCESS_KEY`) are detected.

3. **2D Pixel-Art Command Floor & 4-Mode Engineering Workbench**
   - Custom procedural 18×32 3-shade human pixel-art engine (`sprites.js`) with BFS grid pathfinding and flying FIPA speech-act envelopes (`request`, `inform`, `propose`, `agree`, `refuse`, `done`).
   - 4-mode workbench: **1. Recon & Code Diff**, **2. Guardrails & Chaos**, **3. KG & Memory Graph** (Bipartite canvas + `/compact` 3-region memory), and **4. Squad Manifest** (`aegismesh-squad.agent.json` export).

---

## Project Structure

- `index.html` — Application shell, 8-phase pipeline ribbon, DORA KPI strip, 2D floor canvas, 4-tab workbench, Live Scenario Tester modal, and Executive ROI Playbook modal.
- `styles.css` — Warm neo-brutalist dark & daylight design system.
- `sprites.js` — Procedural 18×28 portrait and 18×32 3-frame walking sprite generator for all 8 specialists.
- `engines.js` — 8-agent definitions, 6 Zero-Trust guardrails, 4 baseline missions, TF-IDF Knowledge Graph, 3-region memory compactor, and `aegismesh/agent@1` manifest generator.
- `app.js` — Lifecycle state machine, 2D canvas animation loop, live GitHub REST API probe, dynamic guardrail scanner, and interactive chaos fault injector.
- `AEGISMESH_ORG_VALUE_AND_ARCHITECTURE_PLAYBOOK.md` — Detailed executive and technical playbook covering organizational ROI, DORA impact, and production integration.

---

## Running Locally

```bash
npx serve -l 3000 .
```
Or serve with Python:
```bash
python3 -m http.server 3000
```
