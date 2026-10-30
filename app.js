/* ============================================================================
   MUNDER DIFFLIN × REA: AGENTIC DEVOPS MESH — MAIN APPLICATION CONTROLLER
   ============================================================================ */

(function () {
  const {
    AGENTS,
    DEFAULT_GUARDRAILS,
    MISSIONS,
    GRAPH_TOPICS,
    GRAPH_EDGES,
    searchKnowledgeGraph,
    compactAgentMemory,
    formatMemoryMarkdown,
    generateHireManifests
  } = window.MunderEngines;

  const {
    SCENE_W,
    SCENE_H,
    getSceneFrames,
    paintPortraitToCanvas,
    findPath
  } = window.MunderSprites;

  // Application State
  const state = {
    theme: 'dark',
    floorTheme: 'office', // 'office' | 'brooklyn99' | 'siliconvalley'
    currentMissionId: 'mission-payment-canary',
    activeTab: 'tab-vde',
    selectedAgentId: 'michael',
    currentStepIndex: -1,
    isPlaying: false,
    playTimer: null,
    breakerState: 'OK', // 'OK' | 'STEER' | 'CONSTRAIN' | 'STOP'
    burnRateUsd: 0.08,
    hopCount: 3,
    maxHops: 6,
    canaryPct: 100,
    phaseStatuses: {}, // phaseIndex (1..8) -> 'idle' | 'running' | 'passed' | 'blocked'
    guardrails: JSON.parse(JSON.stringify(DEFAULT_GUARDRAILS)),
    envelopes: [], // active flying envelopes on canvas
    envelopeLog: [], // history list
    toolSpans: [], // OTel waterfall spans
    gateAlert: null, // { badge, message, stepIndex }
    agentSprites: {}, // runtime x, y, path, bubble, status
    staplerPulse: 0,
    lastFrameTime: performance.now()
  };

  const GRID_W = 24;
  const GRID_H = 14;
  const TILE_PX = 32;

  // Initialize runtime agent sprite positions on the 24x14 floor
  function initAgentSprites() {
    AGENTS.forEach((a) => {
      state.agentSprites[a.id] = {
        id: a.id,
        x: a.desk.x,
        y: a.desk.y + 1,
        homeX: a.desk.x,
        homeY: a.desk.y + 1,
        path: [],
        walkProgress: 0,
        stepFrame: 0,
        status: 'idle', // 'idle' | 'working' | 'blocked' | 'success'
        bubbleText: a.phaseLabel,
        bubbleTimer: 0
      };
    });
  }

  // Reset phase statuses and pre-populate initial completed run of Mission 1 so cold-open is rich
  function loadMission(missionId, autoCompleteFirstLoad = false) {
    stopPlayback();
    if (!MISSIONS[missionId]) return;
    state.currentMissionId = missionId;
    const m = MISSIONS[missionId];

    for (let i = 1; i <= 8; i++) state.phaseStatuses[i] = 'idle';
    state.envelopes = [];
    state.envelopeLog = [];
    state.toolSpans = [];
    state.gateAlert = null;
    state.breakerState = 'OK';
    state.burnRateUsd = parseFloat(m.dora.burnRate) || 0.08;
    state.hopCount = 2;
    state.canaryPct = m.dora.canaryPct;
    state.guardrails = JSON.parse(JSON.stringify(DEFAULT_GUARDRAILS));

    initAgentSprites();

    if (autoCompleteFirstLoad) {
      // Execute all steps of the mission so initial dashboard has live traces, waterfall, and statuses
      for (let idx = 0; idx < m.steps.length; idx++) {
        applyMissionStep(idx, false);
      }
      // Spawn one celebratory flying envelope from Stanley -> Michael (feedback loop)
      spawnEnvelope('stanley', 'michael', 'done', false);
    } else {
      state.currentStepIndex = -1;
    }

    renderAllUI();
  }

  function applyMissionStep(stepIdx, animateWalk = true) {
    const m = MISSIONS[state.currentMissionId];
    if (!m || stepIdx < 0 || stepIdx >= m.steps.length) return;
    state.currentStepIndex = stepIdx;
    const step = m.steps[stepIdx];

    // Update phase statuses
    for (let i = 1; i < step.phaseIndex; i++) {
      if (state.phaseStatuses[i] === 'running' || state.phaseStatuses[i] === 'idle') {
        state.phaseStatuses[i] = 'passed';
      }
    }
    state.phaseStatuses[step.phaseIndex] = step.ok ? 'passed' : 'blocked';

      // Update agent statuses & bubbles
    AGENTS.forEach((a) => {
      const sp = state.agentSprites[a.id];
      if (!sp) return;
      if (a.id === step.from || a.id === step.to) {
        sp.status = step.ok ? 'working' : 'blocked';
        const shortTool = step.tool.includes('.') ? step.tool.split('.')[1] : step.tool;
        sp.bubbleText = `${step.act.toUpperCase()}:${shortTool}`;
        sp.bubbleTimer = 5.0;
      } else if (state.phaseStatuses[a.phaseIndex] === 'passed') {
        sp.status = 'success';
      }
    });

    // Walk sender partway toward recipient desk and back
    const fromSp = state.agentSprites[step.from];
    const toSp = state.agentSprites[step.to];
    if (animateWalk && fromSp && toSp) {
      const midX = Math.round((fromSp.homeX + toSp.homeX) / 2);
      const midY = Math.round((fromSp.homeY + toSp.homeY) / 2);
      const p1 = findPath(GRID_W, GRID_H, new Set(), { x: Math.round(fromSp.x), y: Math.round(fromSp.y) }, { x: midX, y: midY });
      const p2 = findPath(GRID_W, GRID_H, new Set(), { x: midX, y: midY }, { x: fromSp.homeX, y: fromSp.homeY });
      fromSp.path = [...p1, ...p2];
    }

    // Spawn flying FIPA speech-act envelope
    spawnEnvelope(step.from, step.to, step.act, !step.ok);

    // Record envelope log
    state.hopCount = Math.min(state.maxHops, stepIdx + 1);
    state.envelopeLog.unshift({
      time: `14:2${stepIdx}:${String(10 + stepIdx * 7).padStart(2, '0')}`,
      act: step.act,
      from: step.from,
      to: step.to,
      hops: `${state.hopCount}/${state.maxHops}`,
      summary: step.summary
    });

    // Record OTel Tool Waterfall span
    state.toolSpans.unshift({
      agentId: step.from,
      tool: step.tool,
      durationMs: step.durationMs,
      ok: step.ok,
      phaseIndex: step.phaseIndex
    });

    //Append to sender's Recent memory
    const senderAgent = AGENTS.find((a) => a.id === step.from);
    if (senderAgent) {
      const note = `- [Phase ${step.phaseIndex}] ${step.act.toUpperCase()} -> ${step.to}: ${step.summary}`;
      if (!senderAgent.recent.includes(note)) {
        senderAgent.recent.push(note);
        if (senderAgent.recent.length > 5) senderAgent.recent.shift();
      }
    }

    // Check if step tripped a guardrail / breaker
    if (!step.ok) {
      state.breakerState = step.phaseIndex >= 6 ? 'STOP' : 'STEER';
      state.burnRateUsd = 0.34;
      state.canaryPct = 0;
      state.guardrails.forEach((g) => {
        if (g.id === 'path-restriction' || g.id === 'prompt-injection' || g.id === 'velocity-breaker') {
          g.status = 'BLOCKED';
          g.metric = 'TRIPPED @ PHASE ' + step.phaseIndex;
        }
      });
      state.gateAlert = {
        badge: `GUARDRAIL INTERCEPT · PHASE ${step.phaseIndex}`,
        message: step.summary
      };
      if (step.phaseIndex >= 6) {
        stopPlayback();
      }
    }
  }

  function spawnEnvelope(fromId, toId, act, isAlert = false) {
    const f = state.agentSprites[fromId];
    const t = state.agentSprites[toId];
    if (!f || !t) return;
    state.envelopes.push({
      sx: (f.x + 0.5) * TILE_PX,
      sy: (f.y + 0.2) * TILE_PX,
      ex: (t.x + 0.5) * TILE_PX,
      ey: (t.y + 0.2) * TILE_PX,
      act,
      isAlert,
      elapsed: 0,
      duration: 1.15
    });
  }

  function stepNextPhase() {
    const m = MISSIONS[state.currentMissionId];
    if (!m) return;
    const nextIdx = state.currentStepIndex + 1;
    if (nextIdx >= m.steps.length) {
      // Loop back to Phase 1 (Continuous DevOps Infinity Loop)
      state.currentStepIndex = -1;
      for (let i = 1; i <= 8; i++) state.phaseStatuses[i] = 'idle';
      applyMissionStep(0, true);
    } else {
      applyMissionStep(nextIdx, true);
    }
    renderAllUI();
  }

  function startPlayback() {
    if (state.isPlaying) {
      stopPlayback();
      renderAllUI();
      return;
    }
    const m = MISSIONS[state.currentMissionId];
    if (state.currentStepIndex >= m.steps.length - 1) {
      state.currentStepIndex = -1;
      for (let i = 1; i <= 8; i++) state.phaseStatuses[i] = 'idle';
      state.envelopeLog = [];
      state.toolSpans = [];
      state.gateAlert = null;
    }
    state.isPlaying = true;
    stepNextPhase();
    state.playTimer = setInterval(() => {
      const curM = MISSIONS[state.currentMissionId];
      if (!state.isPlaying || state.currentStepIndex >= curM.steps.length - 1) {
        stopPlayback();
        renderAllUI();
        return;
      }
      stepNextPhase();
    }, 1150);
    renderAllUI();
  }

  function stopPlayback() {
    state.isPlaying = false;
    if (state.playTimer) {
      clearInterval(state.playTimer);
      state.playTimer = null;
    }
  }

  // Chaos Fault Injection Handlers
  function injectChaosFault(kind) {
    stopPlayback();
    if (kind === 'flaky-test') {
      state.phaseStatuses[5] = 'blocked';
      state.agentSprites.dwight.status = 'blocked';
      state.agentSprites.dwight.bubbleText = 'REFUSE: race flake!';
      state.agentSprites.dwight.bubbleTimer = 6;
      spawnEnvelope('dwight', 'ryan', 'refuse', true);
      state.envelopeLog.unshift({
        time: 'LIVE-CHAOS',
        act: 'refuse',
        from: 'dwight',
        to: 'ryan',
        hops: `${Math.min(6, state.hopCount + 1)}/6`,
        summary: 'CHAOS INJECTION: Concurrent webhook test flaked under 350ms packet jitter; requesting retry backoff patch.'
      });
      state.toolSpans.unshift({
        agentId: 'dwight',
        tool: 'chaos.flaky_race_inject',
        durationMs: 920,
        ok: false,
        phaseIndex: 5
      });
      state.gateAlert = {
        badge: 'CHAOS FAULT · PHASE 5 QA GATE',
        message: 'Dwight blocked release: simulated 350ms network jitter exposed a flaky assertion. Approve auto-remediation loop or rollback?'
      };
    } else if (kind === 'livelock-hops') {
      state.hopCount = 6;
      state.breakerState = 'STEER';
      state.burnRateUsd = 0.28;
      state.phaseStatuses[4] = 'blocked';
      const hopRule = state.guardrails.find((g) => g.id === 'hop-cap');
      const velRule = state.guardrails.find((g) => g.id === 'velocity-breaker');
      if (hopRule) { hopRule.status = 'BLOCKED'; hopRule.metric = '6 / 6 MAX HOPS HIT'; }
      if (velRule) { velRule.status = 'WARN'; velRule.metric = '$0.28/min (STEER)'; }
      spawnEnvelope('jim', 'michael', 'refuse', true);
      state.envelopeLog.unshift({
        time: 'LIVE-CHAOS',
        act: 'refuse',
        from: 'jim',
        to: 'michael',
        hops: '6/6',
        summary: 'HOP-CAP GUARDRAIL: Ryan <-> Jim ping-pong reached maxHops=6; escalated to Michael & armed Circuit Breaker STEER.'
      });
      state.gateAlert = {
        badge: 'ANTI-LIVELOCK · HOPS 6/6 ESCALATION',
        message: 'FIPA Hop-Cap (maxHops=6) halted a Developer-Reviewer livelock and armed breaker.ts STEER ($0.28/min).'
      };
    } else if (kind === 'canary-spike') {
      state.canaryPct = 0;
      state.phaseStatuses[7] = 'blocked';
      state.agentSprites.oscar.status = 'blocked';
      state.agentSprites.oscar.bubbleText = 'ROLLBACK -> v1.4.0!';
      state.agentSprites.oscar.bubbleTimer = 6;
      spawnEnvelope('oscar', 'stanley', 'refuse', true);
      state.envelopeLog.unshift({
        time: 'LIVE-CHAOS',
        act: 'refuse',
        from: 'oscar',
        to: 'stanley',
        hops: '5/6',
        summary: 'AUTO-ROLLBACK: Canary P99 latency spiked to 840ms (> 500ms SLO); Argo shifted traffic 25% -> 0% in 1.2s.'
      });
      state.toolSpans.unshift({
        agentId: 'oscar',
        tool: 'argo.instant_rollback',
        durationMs: 310,
        ok: false,
        phaseIndex: 7
      });
      state.gateAlert = {
        badge: 'CANARY SLO BREACH · AUTO-ROLLBACK',
        message: 'Oscar detected P99 latency = 840ms at 25% canary weight and automatically reverted 100% traffic to stable baseline.'
      };
    } else if (kind === 'prod-tf-breach') {
      loadMission('mission-chaos-guardrail', true);
      return;
    }
    renderAllUI();
  }

  // Render Top 8-Phase DevOps Lifecycle Ribbon
  function renderLifecycleRibbon() {
    const container = document.getElementById('lifecycleRibbon');
    if (!container) return;
    container.innerHTML = AGENTS.map((a) => {
      const st = state.phaseStatuses[a.phaseIndex] || 'idle';
      const isSelected = state.selectedAgentId === a.id;
      const cls = [
        'phase-node',
        st === 'running' ? 'active' : '',
        st === 'passed' ? 'completed' : '',
        st === 'blocked' ? 'blocked' : '',
        isSelected ? 'active' : ''
      ].filter(Boolean).join(' ');

      const pillClass =
        st === 'passed' ? 'status-passed' :
        st === 'blocked' ? 'status-blocked' :
        st === 'running' ? 'status-running' : 'status-idle';

      const pillText =
        st === 'passed' ? 'PASS' :
        st === 'blocked' ? 'HALT' :
        st === 'running' ? 'RUN' : 'IDLE';

      return `
        <button type="button" class="${cls}" data-phase-agent="${a.id}" data-phase-idx="${a.phaseIndex}" aria-pressed="${isSelected ? 'true' : 'false'}">
          <div class="phase-top">
            <span class="phase-index">P${a.phaseIndex} · ${a.phaseId}</span>
            <span class="phase-status-pill ${pillClass}">${pillText}</span>
          </div>
          <div class="phase-name">${a.phaseLabel.replace(/^\d+\.\s*/, '')}</div>
          <div class="phase-agent">${a.name} · ${a.model.replace('claude-', '')}</div>
        </button>
      `;
    }).join('');

    container.querySelectorAll('[data-phase-agent]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const agentId = btn.getAttribute('data-phase-agent');
        const pIdx = Number(btn.getAttribute('data-phase-idx'));
        state.selectedAgentId = agentId;
        // Also trigger an envelope preview on the floor for this phase
        const m = MISSIONS[state.currentMissionId];
        const stepIdx = m.steps.findIndex((s) => s.phaseIndex === pIdx);
        if (stepIdx !== -1) {
          applyMissionStep(stepIdx, true);
        }
        renderAllUI();
      });
    });
  }

  // Render Gate Alert Banner
  function renderGateBanner() {
    const banner = document.getElementById('gateBanner');
    if (!banner) return;
    if (!state.gateAlert) {
      banner.hidden = true;
      return;
    }
    banner.hidden = false;
    document.getElementById('gateBadgeText').textContent = state.gateAlert.badge;
    document.getElementById('gateMessageText').textContent = state.gateAlert.message;
  }

  // Render DORA & Breaker KPI Strip
  function renderKpiStrip() {
    const m = MISSIONS[state.currentMissionId];
    if (!m) return;
    document.getElementById('kpiDeployFreq').textContent = m.dora.deployFreq;
    document.getElementById('kpiLeadTime').textContent = m.dora.leadTime;
    document.getElementById('kpiChangeFail').textContent = m.dora.changeFailRate;
    document.getElementById('kpiMttr').textContent = m.dora.mttr;
    document.getElementById('kpiCanaryPct').textContent = `${state.canaryPct}%`;
    document.getElementById('kpiBreakerState').textContent = `${state.breakerState} ($${state.burnRateUsd.toFixed(2)}/m)`;

    const breakerDelta = document.getElementById('kpiBreakerDelta');
    if (breakerDelta) {
      breakerDelta.className = 'kpi-delta ' + (state.breakerState === 'OK' ? 'delta-good' : state.breakerState === 'STEER' ? 'delta-warn' : 'delta-bad');
      breakerDelta.textContent = `Hops ${state.hopCount}/${state.maxHops}`;
    }
  }

  // Render Cast Strip Below Floor Canvas
  function renderCastStrip() {
    const strip = document.getElementById('castStrip');
    if (!strip) return;
    strip.innerHTML = AGENTS.map((a) => {
      const selected = state.selectedAgentId === a.id;
      const st = state.phaseStatuses[a.phaseIndex] || 'idle';
      const dotColor =
        st === 'passed' ? 'var(--cth-mint)' :
        st === 'blocked' ? 'var(--cth-coral)' :
        st === 'running' ? 'var(--cth-lemon)' : 'var(--color-text-muted)';
      return `
        <button type="button" class="agent-chip ${selected ? 'selected' : ''}" data-select-agent="${a.id}" aria-pressed="${selected ? 'true' : 'false'}">
          <canvas class="agent-portrait-canvas" data-portrait="${a.id}" width="36" height="56"></canvas>
          <div class="agent-chip-meta">
            <div class="agent-chip-name">
              <span>${a.name}</span>
              <span style="color:${dotColor};font-family:var(--font-mono);">● P${a.phaseIndex}</span>
            </div>
            <div class="agent-chip-role">${a.role}</div>
          </div>
        </button>
      `;
    }).join('');

    strip.querySelectorAll('canvas[data-portrait]').forEach((c) => {
      paintPortraitToCanvas(c, c.getAttribute('data-portrait'));
    });

    strip.querySelectorAll('[data-select-agent]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedAgentId = btn.getAttribute('data-select-agent');
        renderAllUI();
      });
    });
  }

  // Render Tab 1: REA Forensics, VDE Diff & Pipeline YAML
  function renderVdeTab() {
    const m = MISSIONS[state.currentMissionId];
    if (!m) return;
    document.getElementById('reaArtifactLabel').textContent = m.reaEvidence.artifact;
    document.getElementById('reaFindingsList').innerHTML = m.reaEvidence.findings
      .map((f) => `<li style="margin-bottom:4px;">${f}</li>`)
      .join('');

    document.getElementById('vdeDiffFilename').textContent = m.diffFile;
    document.getElementById('vdeDiffBox').innerHTML = m.diffLines
      .map((line) => {
        const cls = line.type === 'add' ? 'diff-add' : line.type === 'del' ? 'diff-del' : line.type === 'hdr' ? 'diff-hdr' : '';
        return `<span class="diff-line ${cls}">${escapeHtml(line.text)}</span>`;
      })
      .join('');

    document.getElementById('pipelineYamlBox').textContent = m.pipelineYaml;
  }

  // Render Tab 2: Guardrails & Circuit Breaker Matrix
  function renderGuardrailsTab() {
    const grid = document.getElementById('guardrailGrid');
    if (!grid) return;
    grid.innerHTML = state.guardrails.map((g) => {
      const badgeCls = g.status === 'PASS' ? 'status-passed' : g.status === 'WARN' ? 'status-running' : 'status-blocked';
      return `
        <div class="guardrail-card">
          <div class="guardrail-head">
            <span>${g.name}</span>
            <span class="phase-status-pill ${badgeCls}">${g.status}</span>
          </div>
          <div class="guardrail-desc">${g.rule}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;font-family:var(--font-mono);font-size:var(--text-xs);">
            <span style="color:var(--cth-sky);">[${g.pillar}] ${g.metric}</span>
            <button type="button" class="btn" data-toggle-guardrail="${g.id}" aria-pressed="${g.enabled ? 'true' : 'false'}" style="padding:2px 8px;">
              ${g.enabled ? 'Enforced' : 'Bypassed'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('[data-toggle-guardrail]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const gid = btn.getAttribute('data-toggle-guardrail');
        const g = state.guardrails.find((item) => item.id === gid);
        if (g) {
          g.enabled = !g.enabled;
          g.status = g.enabled ? 'PASS' : 'WARN';
          g.metric = g.enabled ? 'Policy Active' : 'Manual Override';
          renderGuardrailsTab();
        }
      });
    });

    const breakerStatusEl = document.getElementById('breakerLadderStatus');
    if (breakerStatusEl) {
      breakerStatusEl.textContent = `Current State: ${state.breakerState} · Velocity: $${state.burnRateUsd.toFixed(2)}/min · Hops: ${state.hopCount}/${state.maxHops}`;
    }
  }

  // Render Tab 3: Knowledge Graph Search, Bipartite Memory Graph & reflect.ts Memory
  function renderMemoryTab() {
    const query = (document.getElementById('kgSearchInput')?.value || '').trim();
    const results = searchKnowledgeGraph(query);
    const listEl = document.getElementById('kgResultsList');
    if (listEl) {
      listEl.innerHTML = results.slice(0, 4).map((r) => `
        <div style="padding:8px 10px;background:var(--color-surface-2);border:1px solid var(--color-border);border-radius:var(--radius-sm);">
          <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:var(--text-xs);color:var(--cth-sky);">
            <span>${r.source} · [${r.phase}]</span>
            <span>score=${r.score}</span>
          </div>
          <div style="font-weight:700;font-size:var(--text-xs);margin-top:2px;">${r.title}</div>
          <div style="font-size:var(--text-xs);color:var(--color-text-muted);margin-top:2px;">${r.text}</div>
        </div>
      `).join('');
    }

    const agent = AGENTS.find((a) => a.id === state.selectedAgentId) || AGENTS[0];
    const memHeader = document.getElementById('selectedAgentMemoryTitle');
    if (memHeader) {
      memHeader.textContent = `agents/${agent.id}/memory.md (${agent.name} · ${agent.role})`;
    }
    const memBox = document.getElementById('agentMemoryMarkdown');
    if (memBox) {
      memBox.textContent = formatMemoryMarkdown(agent);
    }

    drawBipartiteMemoryGraph();
  }

  function drawBipartiteMemoryGraph() {
    const canvas = document.getElementById('memoryGraphCanvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(420, Math.floor(rect.width || 520));
    const h = 230;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const isDark = state.theme === 'dark';

    ctx.fillStyle = isDark ? '#1D1D25' : '#F0EAD2';
    ctx.fillRect(0, 0, w, h);

    // Left column: 8 Agents; Right column: 8 Topics
    const agentPositions = {};
    const topicPositions = {};
    AGENTS.forEach((a, i) => {
      agentPositions[a.id] = { x: 86, y: 22 + i * 26 };
    });
    GRAPH_TOPICS.forEach((t, i) => {
      topicPositions[t.id] = { x: w - 120, y: 22 + i * 26 };
    });

    // Draw edges
    GRAPH_EDGES.forEach((e) => {
      const p1 = agentPositions[e.agent];
      const p2 = topicPositions[e.topic];
      if (!p1 || !p2) return;
      const highlight = e.agent === state.selectedAgentId;
      ctx.strokeStyle = highlight ? (isDark ? '#72C2D6' : '#237082') : (isDark ? 'rgba(165,160,176,0.28)' : 'rgba(94,75,107,0.25)');
      ctx.lineWidth = highlight ? 2.2 : 1;
      ctx.beginPath();
      ctx.moveTo(p1.x + 48, p1.y);
      ctx.bezierCurveTo(w * 0.45, p1.y, w * 0.55, p2.y, p2.x - 48, p2.y);
      ctx.stroke();
    });

    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.textBaseline = 'middle';

    // Draw Agent Nodes
    AGENTS.forEach((a) => {
      const p = agentPositions[a.id];
      const selected = a.id === state.selectedAgentId;
      ctx.fillStyle = selected ? (isDark ? '#1E353D' : '#D0ECF2') : (isDark ? '#252530' : '#FCFAF0');
      ctx.strokeStyle = selected ? (isDark ? '#72C2D6' : '#237082') : (isDark ? '#787686' : '#8C7B99');
      ctx.lineWidth = selected ? 2 : 1;
      ctx.fillRect(p.x - 46, p.y - 9, 92, 18);
      ctx.strokeRect(p.x - 46, p.y - 9, 92, 18);
      ctx.fillStyle = isDark ? '#ECE9E2' : '#1A1320';
      ctx.fillText(`@${a.id}`, p.x - 40, p.y);
    });

    // Draw Topic Nodes
    GRAPH_TOPICS.forEach((t) => {
      const p = topicPositions[t.id];
      const linked = GRAPH_EDGES.some((e) => e.agent === state.selectedAgentId && e.topic === t.id);
      ctx.fillStyle = linked ? (isDark ? '#2D2742' : '#E4DEF7') : (isDark ? '#252530' : '#FCFAF0');
      ctx.strokeStyle = linked ? (isDark ? '#B5A4F0' : '#634DB0') : (isDark ? '#787686' : '#8C7B99');
      ctx.lineWidth = linked ? 2 : 1;
      ctx.fillRect(p.x - 48, p.y - 9, 154, 18);
      ctx.strokeRect(p.x - 48, p.y - 9, 154, 18);
      ctx.fillStyle = isDark ? '#ECE9E2' : '#1A1320';
      ctx.fillText(`#${t.label}`, p.x - 42, p.y);
    });
  }

  // Render Tab 4: Shareable munder-difflin/hire@1 Manifests & References
  function renderHiresTab() {
    const manifestBox = document.getElementById('hireManifestBox');
    if (!manifestBox) return;
    const bundle = generateHireManifests();
    const selectedHire = bundle.hires.find((h) => h.character === state.selectedAgentId) || bundle.hires[0];
    manifestBox.textContent = JSON.stringify(selectedHire, null, 2);
  }

  // Render Bottom FIPA Speech-Act Feed & OTel Tool Waterfall
  function renderBottomTelemetry() {
    const envFeed = document.getElementById('envelopeFeed');
    if (envFeed) {
      envFeed.innerHTML = state.envelopeLog.slice(0, 8).map((e) => `
        <div class="envelope-row">
          <span style="color:var(--color-text-muted);">${e.time}</span>
          <span class="act-tag act-${e.act}">${e.act}</span>
          <span class="env-route" style="color:var(--cth-sky);font-weight:600;">${e.from} → ${e.to} [${e.hops}]</span>
          <span>${escapeHtml(e.summary)}</span>
        </div>
      `).join('');
    }

    const wfList = document.getElementById('waterfallList');
    if (wfList) {
      const maxDur = Math.max(100, ...state.toolSpans.map((s) => s.durationMs));
      wfList.innerHTML = state.toolSpans.slice(0, 8).map((s) => {
        const pct = Math.max(8, Math.round((s.durationMs / maxDur) * 100));
        const color = s.ok ? 'var(--cth-mint)' : 'var(--cth-coral)';
        return `
          <div class="waterfall-row">
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${s.tool}">@${s.agentId}:${s.tool}</span>
            <div class="waterfall-track">
              <div class="waterfall-bar" style="width:${pct}%;background:${color};"></div>
            </div>
            <span style="text-align:right;color:var(--color-text-muted);">${s.durationMs}ms</span>
            <span style="text-align:center;color:${color};font-weight:700;">${s.ok ? '✓' : '✗'}</span>
          </div>
        `;
      }).join('');
    }
  }

  function renderAllUI() {
    const m = MISSIONS[state.currentMissionId];
    if (m) {
      const selectEl = document.getElementById('missionSelect');
      if (selectEl && selectEl.value !== state.currentMissionId) {
        selectEl.value = state.currentMissionId;
      }
      const shortCat = m.category.split('(')[0].trim();
      document.getElementById('hudMissionLabel').textContent = `${shortCat} · ${m.targetRepo.replace('github.com/', '')}`;
    }
    const runBtn = document.getElementById('runPipelineBtn');
    if (runBtn) {
      runBtn.textContent = state.isPlaying ? '⏸ Pause Loop' : '▶ Run Full Lifecycle';
    }

    renderLifecycleRibbon();
    renderGateBanner();
    renderKpiStrip();
    renderCastStrip();
    renderVdeTab();
    renderGuardrailsTab();
    renderMemoryTab();
    renderHiresTab();
    renderBottomTelemetry();
  }

  // 2D Pixel-Art Office Floor Animation Loop
  const FLOOR_THEMES = {
    office: {
      name: 'Dunder Mifflin DevOps Floor',
      bgA: '#2a2320',
      bgB: '#322a26',
      border: '#6b5a4a',
      deskTop: '#a37c52',
      deskFront: '#735436',
      aisle: '#3b332e'
    },
    brooklyn99: {
      name: '99th Precinct Incident Bullpen',
      bgA: '#1d2733',
      bgB: '#233040',
      border: '#4f759b',
      deskTop: '#5c768d',
      deskFront: '#3e5266',
      aisle: '#2c3d50'
    },
    siliconvalley: {
      name: 'Aviato Hacker Hostel',
      bgA: '#1d2b24',
      bgB: '#23342b',
      border: '#5ca97a',
      deskTop: '#7d8c6e',
      deskFront: '#536147',
      aisle: '#2b4035'
    }
  };

  function tickAndRenderFloor(now) {
    const dt = Math.min(0.1, (now - state.lastFrameTime) / 1000);
    state.lastFrameTime = now;
    state.staplerPulse += dt * 3;

    const canvas = document.getElementById('officeCanvas');
    if (!canvas) {
      requestAnimationFrame(tickAndRenderFloor);
      return;
    }

    const W = GRID_W * TILE_PX; // 768
    const H = GRID_H * TILE_PX; // 448
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const pal = FLOOR_THEMES[state.floorTheme] || FLOOR_THEMES.office;

    // 1. Checkerboard tile floor
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const isBorder = x === 0 || y === 0 || x === GRID_W - 1 || y === GRID_H - 1;
        const isCenterCorridor = y === 6 || y === 7;
        ctx.fillStyle = isBorder ? pal.border : isCenterCorridor ? pal.aisle : (x + y) % 2 === 0 ? pal.bgA : pal.bgB;
        ctx.fillRect(x * TILE_PX, y * TILE_PX, TILE_PX, TILE_PX);
      }
    }

    // 2. Central DevOps Infinity Pipeline Conduit Bus (Row 6-7)
    ctx.strokeStyle = 'rgba(114, 194, 214, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -Math.floor(now / 40);
    ctx.beginPath();
    ctx.moveTo(2 * TILE_PX, 6.5 * TILE_PX);
    ctx.lineTo((GRID_W - 2) * TILE_PX, 6.5 * TILE_PX);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Yellow Stapler Voice/Command Artifact in Center Hub
    const sx = 11.5 * TILE_PX, sy = 6.5 * TILE_PX;
    ctx.fillStyle = '#E8BE62';
    ctx.fillRect(sx - 10, sy - 6, 20, 10);
    ctx.fillStyle = '#1A1320';
    ctx.fillRect(sx - 8, sy + 1, 16, 3);

    // 4. Draw 8 Lifecycle Workstations + Agents
    AGENTS.forEach((a) => {
      const dx = a.desk.x * TILE_PX;
      const dy = a.desk.y * TILE_PX;
      const st = state.phaseStatuses[a.phaseIndex] || 'idle';
      const isSelected = state.selectedAgentId === a.id;

      // Station Floor Mat
      ctx.fillStyle = isSelected ? 'rgba(114, 194, 214, 0.22)' : 'rgba(0, 0, 0, 0.24)';
      ctx.fillRect(dx - 30, dy - 18, 92, 92);
      if (isSelected) {
        ctx.strokeStyle = '#72C2D6';
        ctx.lineWidth = 2;
        ctx.strokeRect(dx - 30, dy - 18, 92, 92);
      }

      // Desk surface + dual monitors (positioned cleanly to the left/back of character)
      ctx.fillStyle = pal.deskTop;
      ctx.fillRect(dx - 22, dy - 2, 76, 16);
      ctx.fillStyle = pal.deskFront;
      ctx.fillRect(dx - 22, dy + 14, 76, 6);

      // Dual Monitors on left & right wings of the desk so center head never occludes them
      const screenCol =
        st === 'passed' ? '#74CF9B' :
        st === 'blocked' ? '#F08A80' :
        st === 'running' ? '#E8BE62' : '#72C2D6';
      ctx.fillStyle = '#1A1320';
      ctx.fillRect(dx - 20, dy - 12, 22, 12);
      ctx.fillRect(dx + 30, dy - 12, 22, 12);
      ctx.fillStyle = screenCol;
      ctx.fillRect(dx - 18, dy - 10, 18, 8);
      ctx.fillRect(dx + 32, dy - 10, 18, 8);

      // Station Header Label
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#ECE9E2';
      ctx.textAlign = 'center';
      ctx.fillText(`P${a.phaseIndex}:${a.phaseId}`, Math.round(dx + 16), Math.round(dy - 30));
    });

    // 5. Update & Draw Walking/Standing Procedural Agent Sprites (18x32 scaled 2x -> 36x64)
    AGENTS.forEach((a) => {
      const sp = state.agentSprites[a.id];
      if (!sp) return;
      if (sp.path && sp.path.length > 0) {
        const target = sp.path[0];
        const vx = target.x - sp.x;
        const vy = target.y - sp.y;
        const dist = Math.hypot(vx, vy);
        const speed = 5.5 * dt;
        if (dist <= speed) {
          sp.x = target.x;
          sp.y = target.y;
          sp.path.shift();
        } else {
          sp.x += (vx / dist) * speed;
          sp.y += (vy / dist) * speed;
        }
        sp.walkProgress += dt * 9;
        sp.stepFrame = (Math.floor(sp.walkProgress) % 2) + 1;
      } else {
        sp.stepFrame = 0;
      }

      if (sp.bubbleTimer > 0) sp.bubbleTimer = Math.max(0, sp.bubbleTimer - dt);

      const frames = getSceneFrames(a.id);
      const frameCanvas = frames[sp.stepFrame] || frames[0];
      const px = Math.round(sp.x * TILE_PX - 2);
      const py = Math.round(sp.y * TILE_PX - 24);

      // Feet shadow
      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ctx.fillRect(px + 6, py + 58, 24, 6);

      // Draw 18x32 sprite at 2x scale (36x64)
      ctx.drawImage(frameCanvas, 0, 0, SCENE_W, SCENE_H, px, py, SCENE_W * 2, SCENE_H * 2);

      // Agent nameplate
      ctx.font = '700 10px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(20, 20, 26, 0.92)';
      ctx.fillRect(px - 10, py + 63, 56, 14);
      ctx.fillStyle = state.selectedAgentId === a.id ? '#E8BE62' : '#ECE9E2';
      ctx.fillText(a.name, px + 18, py + 73);

      // Overhead Speech/Tool Bubble (cleanly above monitors)
      if (sp.bubbleText) {
        ctx.font = '700 9px "JetBrains Mono", monospace';
        const label = sp.bubbleText.length > 22 ? sp.bubbleText.slice(0, 21) + '…' : sp.bubbleText;
        const textW = Math.ceil(Math.max(76, ctx.measureText(label).width + 10));
        const bx = Math.round(px + 18 - textW / 2);
        const by = Math.round(py - 24);
        ctx.fillStyle = sp.status === 'blocked' ? '#3D2422' : '#162830';
        ctx.strokeStyle = sp.status === 'blocked' ? '#F08A80' : '#72C2D6';
        ctx.lineWidth = 1;
        ctx.fillRect(bx, by, textW, 13);
        ctx.strokeRect(bx, by, textW, 13);
        ctx.fillStyle = '#ECE9E2';
        ctx.fillText(label, Math.round(px + 18), by + 10);
      }
    });

    // 6. Update & Draw Flying FIPA Speech-Act Envelopes (MessageEnvelope.ts port)
    const ACT_HEX = {
      request: '#72C2D6',
      inform: '#ECE9E2',
      propose: '#E8BE62',
      query: '#B5A4F0',
      agree: '#74CF9B',
      done: '#74CF9B',
      refuse: '#F08A80'
    };

    state.envelopes = state.envelopes.filter((env) => {
      env.elapsed += dt;
      const t = Math.min(1, env.elapsed / env.duration);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const x = Math.round(env.sx + (env.ex - env.sx) * e);
      const lift = -42 * Math.sin(Math.PI * e);
      const y = Math.round(env.sy + (env.ey - env.sy) * e + lift);

      const col = env.isAlert ? '#F08A80' : (ACT_HEX[env.act] || '#E8BE62');
      // 16x11 Pixel Envelope + Flap
      ctx.fillStyle = col;
      ctx.fillRect(x - 9, y - 6, 18, 12);
      ctx.strokeStyle = '#1A1320';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - 9, y - 6, 18, 12);
      ctx.beginPath();
      ctx.moveTo(x - 9, y - 6);
      ctx.lineTo(x, y + 1);
      ctx.lineTo(x + 9, y - 6);
      ctx.stroke();

      return env.elapsed < env.duration + 0.15;
    });

    requestAnimationFrame(tickAndRenderFloor);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Wire DOM Events on Initialization
  function initEvents() {
    // Mission Selector
    const missionSelect = document.getElementById('missionSelect');
    if (missionSelect) {
      missionSelect.addEventListener('change', (e) => {
        loadMission(e.target.value, true);
      });
    }

    // Floor World Theme Selector
    const floorThemeSelect = document.getElementById('floorThemeSelect');
    if (floorThemeSelect) {
      floorThemeSelect.addEventListener('change', (e) => {
        state.floorTheme = e.target.value;
        const pal = FLOOR_THEMES[state.floorTheme];
        if (pal) document.getElementById('hudFloorThemeLabel').textContent = pal.name;
      });
    }

    // Run / Step / Reset Controls
    document.getElementById('runPipelineBtn')?.addEventListener('click', startPlayback);
    document.getElementById('stepPhaseBtn')?.addEventListener('click', stepNextPhase);
    document.getElementById('resetPipelineBtn')?.addEventListener('click', () => {
      loadMission(state.currentMissionId, true);
    });

    // Dark / Light Theme Toggle
    document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', state.theme);
      document.getElementById('themeToggleBtn').textContent = state.theme === 'dark' ? '☀ Cream Mode' : '☾ Dark Mode';
      renderMemoryTab();
    });

    // Workbench Tabs
    document.querySelectorAll('[data-tab-target]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab-target');
        state.activeTab = target;
        document.querySelectorAll('[data-tab-target]').forEach((b) => {
          const active = b.getAttribute('data-tab-target') === target;
          b.classList.toggle('active', active);
          b.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        document.querySelectorAll('.tab-pane').forEach((pane) => {
          pane.hidden = pane.id !== target;
        });
        if (target === 'tab-memory') {
          setTimeout(drawBipartiteMemoryGraph, 20);
        }
      });
    });

    // Canvas Click -> Hit Test Agent Station
    const officeCanvas = document.getElementById('officeCanvas');
    if (officeCanvas) {
      officeCanvas.addEventListener('click', (e) => {
        const rect = officeCanvas.getBoundingClientRect();
        const scaleX = officeCanvas.width / rect.width;
        const scaleY = officeCanvas.height / rect.height;
        const cx = (e.clientX - rect.left) * scaleX;
        const cy = (e.clientY - rect.top) * scaleY;

        for (const a of AGENTS) {
          const sp = state.agentSprites[a.id];
          const ax = (sp.x + 0.5) * TILE_PX;
          const ay = (sp.y + 0.5) * TILE_PX;
          if (Math.hypot(cx - ax, cy - ay) < 48) {
            state.selectedAgentId = a.id;
            spawnEnvelope('michael', a.id, 'query', false);
            renderAllUI();
            break;
          }
        }
      });
    }

    // Gate Banner Actions
    document.getElementById('approveGateBtn')?.addEventListener('click', () => {
      state.gateAlert = null;
      state.breakerState = 'OK';
      state.burnRateUsd = 0.08;
      Object.keys(state.phaseStatuses).forEach((k) => {
        if (state.phaseStatuses[k] === 'blocked') state.phaseStatuses[k] = 'passed';
      });
      state.guardrails.forEach((g) => { g.status = 'PASS'; });
      spawnEnvelope('angela', 'oscar', 'agree', false);
      state.envelopeLog.unshift({
        time: 'HUMAN-GATE',
        act: 'agree',
        from: 'angela',
        to: 'oscar',
        hops: `${state.hopCount}/6`,
        summary: 'Human SRE approved quarantined remediation & reset Circuit Breaker to OK.'
      });
      renderAllUI();
    });

    document.getElementById('rollbackGateBtn')?.addEventListener('click', () => {
      state.gateAlert = null;
      state.breakerState = 'OK';
      state.canaryPct = 100;
      loadMission('mission-payment-canary', true);
    });

    // Chaos Fault Buttons
    document.querySelectorAll('[data-chaos-fault]').forEach((btn) => {
      btn.addEventListener('click', () => {
        injectChaosFault(btn.getAttribute('data-chaos-fault'));
      });
    });

    // Knowledge Graph Live Search
    document.getElementById('kgSearchInput')?.addEventListener('input', () => {
      renderMemoryTab();
    });

    // Memory /compact Reflection Button (reflect.ts)
    document.getElementById('compactMemoryBtn')?.addEventListener('click', () => {
      const agent = AGENTS.find((a) => a.id === state.selectedAgentId) || AGENTS[0];
      compactAgentMemory(agent);
      renderMemoryTab();
    });

    // Approve VDE Patch Button
    document.getElementById('approvePatchBtn')?.addEventListener('click', () => {
      spawnEnvelope('jim', 'oscar', 'agree', false);
      state.phaseStatuses[4] = 'passed';
      state.phaseStatuses[6] = 'passed';
      state.phaseStatuses[7] = 'passed';
      state.envelopeLog.unshift({
        time: 'VDE-SIGN',
        act: 'agree',
        from: 'jim',
        to: 'oscar',
        hops: '4/6',
        summary: 'Signed off VDE diff with SHA-256 provenance and promoted to Canary Release.'
      });
      renderAllUI();
    });

    // Download Squad .hire.json Bundle
    document.getElementById('downloadHireBtn')?.addEventListener('click', () => {
      const bundle = generateHireManifests();
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `munder-devops-mesh-squad.hire.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

    // Custom Mission Modal
    const modal = document.getElementById('customMissionModal');
    document.getElementById('newMissionBtn')?.addEventListener('click', () => {
      if (modal) modal.hidden = false;
    });
    document.getElementById('closeModalBtn')?.addEventListener('click', () => {
      if (modal) modal.hidden = true;
    });
    document.getElementById('launchCustomMissionForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const repo = document.getElementById('customRepoInput').value.trim() || 'github.com/org/custom-service';
      const title = document.getElementById('customTitleInput').value.trim() || 'Custom Autonomous DevOps Lifecycle Run';
      const artifact = document.getElementById('customArtifactInput').value.trim() || 'dist/app.bundle.js + crash.log';

      const customId = 'mission-custom';
      MISSIONS[customId] = {
        id: customId,
        title: `Custom: ${title}`,
        category: 'User-Defined REA + DevOps Mesh Pipeline',
        targetRepo: repo,
        summary: title,
        dora: { deployFreq: '16.0 / day', leadTime: '9m 30s', changeFailRate: '0.8%', mttr: '1m 55s', canaryPct: 100, burnRate: '$0.07/min' },
        reaEvidence: {
          artifact,
          findings: [
            `REA Target Analysis: Dissected ${artifact} in ${repo} and extracted call-graph & route contracts.`,
            'Published clean-room specification to Hive blackboard (`hive/SPEC.md`).',
            'Verified 0 protected path violations and synthesized regression matrix.'
          ]
        },
        diffFile: `src/remediation/autoFixPatch.ts (${repo})`,
        diffLines: [
          { type: 'hdr', text: `@@ -1,5 +1,12 @@ // Auto-remediated by Munder Difflin × REA DevOps Mesh` },
          { type: 'del', text: `- // Unverified legacy handler in ${artifact}` },
          { type: 'add', text: `+ export async function executeVerifiedHandler(ctx: MeshContext) {` },
          { type: 'add', text: `+   await enforceGuardrailPolicy(ctx, { maxHops: 6, pathShield: true });` },
          { type: 'add', text: `+   return runWithOtelSpan("${title.slice(0, 28)}", () => ctx.dispatch());` },
          { type: 'add', text: `+ }` }
        ],
        pipelineYaml: `name: Custom-Agentic-DevOps-Mesh\non: [push]\njobs:\n  rea-and-canary:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npx rea-agents inspect "${artifact}"\n      - run: npm test && kubectl argo rollouts promote app`,
        steps: MISSIONS['mission-payment-canary'].steps.map((s) => ({
          ...s,
          summary: `[${repo}] ${s.summary}`
        }))
      };

      const sel = document.getElementById('missionSelect');
      if (sel && !sel.querySelector(`option[value="${customId}"]`)) {
        const opt = document.createElement('option');
        opt.value = customId;
        opt.textContent = MISSIONS[customId].title;
        sel.appendChild(opt);
      }
      if (modal) modal.hidden = true;
      loadMission(customId, true);
    });

    window.addEventListener('resize', () => {
      if (state.activeTab === 'tab-memory') drawBipartiteMemoryGraph();
    });
  }

  // Boot
  window.addEventListener('DOMContentLoaded', () => {
    document.documentElement.setAttribute('data-theme', state.theme);
    initAgentSprites();
    initEvents();
    loadMission('mission-payment-canary', true);
    requestAnimationFrame(tickAndRenderFloor);
    window.appReady = true;
  });
})();
