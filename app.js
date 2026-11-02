/* ============================================================================
   AEGIS // MESH: AUTONOMOUS DEVOPS & FORENSICS CONTROL PLANE — CONTROLLER
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
  } = window.AegisEngines;

  const {
    SCENE_W,
    SCENE_H,
    getSceneFrames,
    paintPortraitToCanvas,
    findPath
  } = window.AegisSprites;

  const state = {
    theme: 'dark',
    floorTheme: 'soc', // 'soc' | 'cleanroom' | 'bridge'
    currentMissionId: 'mission-payment-canary',
    activeTab: 'tab-vde',
    selectedAgentId: 'vex',
    currentStepIndex: -1,
    isPlaying: false,
    playTimer: null,
    breakerState: 'OK',
    burnRateUsd: 0.08,
    hopCount: 4,
    maxHops: 6,
    canaryPct: 100,
    phaseStatuses: {},
    guardrails: JSON.parse(JSON.stringify(DEFAULT_GUARDRAILS)),
    envelopes: [],
    envelopeLog: [],
    toolSpans: [],
    gateAlert: null,
    agentSprites: {},
    corePulse: 0,
    lastFrameTime: performance.now()
  };

  const GRID_W = 24;
  const GRID_H = 14;
  const TILE_PX = 32;

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
        status: 'idle',
        bubbleText: a.phaseLabel,
        bubbleTimer: 0
      };
    });
  }

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
    state.burnRateUsd = parseFloat((m.dora.burnRate || '').replace(/[^0-9.]/g, '')) || 0.08;
    state.hopCount = 4;
    state.canaryPct = m.dora.canaryPct;
    state.guardrails = JSON.parse(JSON.stringify(DEFAULT_GUARDRAILS));

    initAgentSprites();

    if (autoCompleteFirstLoad) {
      for (let idx = 0; idx < m.steps.length; idx++) {
        applyMissionStep(idx, false);
      }
      spawnEnvelope('sora', 'vex', 'done', false);
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

    for (let i = 1; i < step.phaseIndex; i++) {
      if (state.phaseStatuses[i] !== 'blocked') {
        state.phaseStatuses[i] = 'passed';
      }
    }
    state.phaseStatuses[step.phaseIndex] = step.ok ? (animateWalk ? 'running' : 'passed') : 'blocked';

    AGENTS.forEach((a) => {
      const sp = state.agentSprites[a.id];
      if (!sp) return;
      if (a.id === step.from) {
        sp.status = step.ok ? 'working' : 'blocked';
        const shortTool = step.tool.includes('.') ? step.tool.split('.')[1] : step.tool;
        sp.bubbleText = `${shortTool}()`;
        sp.bubbleTimer = 5.0;
      } else if (state.phaseStatuses[a.phaseIndex] === 'passed') {
        sp.status = 'success';
      }
    });

    if (animateWalk) {
      const sender = state.agentSprites[step.from];
      const receiver = state.agentSprites[step.to];
      if (sender && receiver) {
        const midX = Math.round((sender.homeX + receiver.homeX) / 2);
        const midY = 6;
        const p1 = findPath(sender.x, sender.y, midX, midY, GRID_W, GRID_H);
        const p2 = findPath(midX, midY, sender.homeX, sender.homeY, GRID_W, GRID_H);
        sender.path = p1.concat(p2);
      }
    }

    spawnEnvelope(step.from, step.to, step.act, !step.ok);

    state.hopCount = Math.min(state.maxHops, stepIdx + 1);
    const stamp = new Date(Date.now() - (8 - stepIdx) * 65000).toTimeString().slice(0, 8);
    state.envelopeLog.unshift({
      time: stamp,
      act: step.act,
      from: step.from,
      to: step.to,
      hops: `${ Math.min(stepIdx + 1, 6) }/6`,
      summary: step.summary,
      ok: step.ok
    });

    state.toolSpans.unshift({
      agentId: step.from,
      tool: step.tool,
      durationMs: step.durationMs,
      tokens: step.tokens,
      ok: step.ok
    });

    if (step.haltGate) {
      state.breakerState = 'STOP';
      state.burnRateUsd = 0.44;
      state.canaryPct = 0;
      state.gateAlert = {
        badge: step.gateBadge || 'BREAKER: STOP',
        message: step.gateMessage || step.summary
      };
      const pathRule = state.guardrails.find((g) => g.id === 'gr-path-shield');
      if (pathRule) {
        pathRule.status = 'BLOCKED';
        pathRule.metric = 'Quarantined infra/prod.tf write';
      }
      stopPlayback();
    } else if (animateWalk) {
      setTimeout(() => {
        if (state.phaseStatuses[step.phaseIndex] === 'running') {
          state.phaseStatuses[step.phaseIndex] = 'passed';
          renderLifecycleRibbon();
        }
      }, 650);
    }

    renderAllUI();
  }

  function spawnEnvelope(fromId, toId, act, isAlert = false) {
    const fromA = AGENTS.find((a) => a.id === fromId);
    const toA = AGENTS.find((a) => a.id === toId);
    if (!fromA || !toA) return;
    state.envelopes.push({
      fromId,
      toId,
      act,
      isAlert,
      sx: (fromA.desk.x + 0.5) * TILE_PX,
      sy: (fromA.desk.y + 0.8) * TILE_PX,
      ex: (toA.desk.x + 0.5) * TILE_PX,
      ey: (toA.desk.y + 0.8) * TILE_PX,
      elapsed: 0,
      duration: 1.05
    });
  }

  function startPlayback() {
    if (state.isPlaying) {
      stopPlayback();
      renderAllUI();
      return;
    }
    const m = MISSIONS[state.currentMissionId];
    if (!m) return;

    if (state.currentStepIndex >= m.steps.length - 1 || state.gateAlert) {
      for (let i = 1; i <= 8; i++) state.phaseStatuses[i] = 'idle';
      state.currentStepIndex = -1;
      state.envelopeLog = [];
      state.toolSpans = [];
      state.gateAlert = null;
      state.breakerState = 'OK';
    }

    state.isPlaying = true;
    renderAllUI();

    const advance = () => {
      if (!state.isPlaying) return;
      const nextIdx = state.currentStepIndex + 1;
      if (nextIdx < m.steps.length) {
        applyMissionStep(nextIdx, true);
        if (!state.gateAlert && nextIdx + 1 < m.steps.length) {
          state.playTimer = setTimeout(advance, 950);
        } else {
          stopPlayback();
          renderAllUI();
        }
      } else {
        stopPlayback();
        renderAllUI();
      }
    };
    advance();
  }

  function stopPlayback() {
    state.isPlaying = false;
    if (state.playTimer) {
      clearTimeout(state.playTimer);
      state.playTimer = null;
    }
  }

  function stepNextPhase() {
    stopPlayback();
    const m = MISSIONS[state.currentMissionId];
    if (!m) return;
    let nextIdx = state.currentStepIndex + 1;
    if (nextIdx >= m.steps.length) {
      for (let i = 1; i <= 8; i++) state.phaseStatuses[i] = 'idle';
      state.envelopeLog = [];
      state.toolSpans = [];
      state.gateAlert = null;
      nextIdx = 0;
    }
    applyMissionStep(nextIdx, true);
  }

  function injectChaosFault(faultType) {
    stopPlayback();
    const now = new Date().toTimeString().slice(0, 8);

    if (faultType === 'flaky-test') {
      state.phaseStatuses[5] = 'blocked';
      state.breakerState = 'STEER';
      state.burnRateUsd = 0.22;
      state.selectedAgentId = 'drake';
      state.gateAlert = {
        badge: 'CHAOS · CONCURRENCY RACE',
        message: 'DRAKE detected 42ms webhook race condition in `test/webhookRace.spec.ts`. Circuit Breaker set to STEER ($0.22/min).'
      };
      spawnEnvelope('drake', 'kael', 'refuse', true);
      state.envelopeLog.unshift({
        time: now,
        act: 'refuse',
        from: 'drake',
        to: 'kael',
        hops: '5/6',
        summary: '[CHAOS] Race condition reproduced under 50-way burst; routed back to KAEL for Redis NX lock.',
        ok: false
      });
    } else if (faultType === 'livelock-hops') {
      state.phaseStatuses[4] = 'blocked';
      state.breakerState = 'CONSTRAIN';
      state.burnRateUsd = 0.34;
      state.hopCount = 6;
      state.selectedAgentId = 'lyra';
      const hopRule = state.guardrails.find((g) => g.id === 'gr-hop-cap');
      if (hopRule) {
        hopRule.status = 'TRIPPED';
        hopRule.metric = 'Hops 6/6 (Halted Ping-Pong)';
      }
      state.gateAlert = {
        badge: 'ANTI-LIVELOCK · HOPS 6/6',
        message: 'FIPA Hop Cap (maxHops=6) halted a KAEL <-> LYRA review ping-pong loop and armed Circuit Breaker CONSTRAIN ($0.34/min).'
      };
      spawnEnvelope('lyra', 'vex', 'refuse', true);
      state.envelopeLog.unshift({
        time: now,
        act: 'refuse',
        from: 'lyra',
        to: 'vex',
        hops: '6/6',
        summary: '[CHAOS] Max hop count (6/6) reached between KAEL and LYRA; escalated to VEX & Human SRE.',
        ok: false
      });
    } else if (faultType === 'canary-spike') {
      state.phaseStatuses[7] = 'blocked';
      state.breakerState = 'CONSTRAIN';
      state.burnRateUsd = 0.31;
      state.canaryPct = 0;
      state.selectedAgentId = 'orion';
      const sloRule = state.guardrails.find((g) => g.id === 'gr-canary-slo');
      if (sloRule) {
        sloRule.status = 'ROLLBACK';
        sloRule.metric = 'P99 485ms > 220ms SLO';
      }
      state.gateAlert = {
        badge: 'ARGO CANARY · AUTO-ROLLBACK',
        message: 'Canary P99 spiked to 485ms at 25% weight. ORION & SORA auto-reverted traffic to 0% stable replica set in 1.8s.'
      };
      spawnEnvelope('sora', 'orion', 'refuse', true);
      state.envelopeLog.unshift({
        time: now,
        act: 'refuse',
        from: 'sora',
        to: 'orion',
        hops: '6/6',
        summary: '[CHAOS] OTel P99 breached 220ms SLO (485ms); Argo Rollouts automatically shifted canary weight 25% -> 0%.',
        ok: false
      });
    } else if (faultType === 'prod-tf-breach') {
      loadMission('mission-chaos-guardrail', true);
      return;
    }

    renderAllUI();
  }

  function renderLifecycleRibbon() {
    const ribbon = document.getElementById('lifecycleRibbon');
    if (!ribbon) return;

    ribbon.innerHTML = AGENTS.map((a) => {
      const st = state.phaseStatuses[a.phaseIndex] || 'idle';
      const isSelected = state.selectedAgentId === a.id;
      let cls = 'phase-node';
      if (st === 'passed') cls += ' passed';
      if (st === 'running' || isSelected) cls += ' active';
      if (st === 'blocked') cls += ' blocked';

      const pillText = st === 'passed' ? 'PASS' : st === 'blocked' ? 'HALT' : st === 'running' ? 'RUN' : 'READY';

      return `
        <button type="button" class="${cls}" data-select-agent="${a.id}" data-select-phase="${a.phaseIndex}">
          <div class="phase-top">
            <span class="phase-index">P${a.phaseIndex} · ${a.phaseId}</span>
            <span class="phase-status-pill">${pillText}</span>
          </div>
          <div class="phase-name">${a.phaseLabel.replace(/^\d+\.\s*/, '')}</div>
          <div class="phase-agent">${a.name} · ${a.callsign}</div>
        </button>
      `;
    }).join('');

    ribbon.querySelectorAll('[data-select-agent]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const agentId = btn.getAttribute('data-select-agent');
        const phaseIdx = Number(btn.getAttribute('data-select-phase'));
        state.selectedAgentId = agentId;
        const m = MISSIONS[state.currentMissionId];
        if (m) {
          const stepIdx = m.steps.findIndex((s) => s.phaseIndex === phaseIdx);
          if (stepIdx >= 0) applyMissionStep(stepIdx, true);
        }
        renderAllUI();
      });
    });
  }

  function renderGateBanner() {
    const banner = document.getElementById('gateBanner');
    if (!banner) return;
    if (!state.gateAlert) {
      banner.hidden = true;
      return;
    }
    banner.hidden = false;
    document.getElementById('gateReasonBadge').textContent = state.gateAlert.badge;
    document.getElementById('gateMessageText').textContent = state.gateAlert.message;
  }

  function renderKpiStrip() {
    const m = MISSIONS[state.currentMissionId];
    if (!m) return;
    document.getElementById('kpiDeployFreq').textContent = m.dora.deployFreq;
    document.getElementById('kpiLeadTime').textContent = state.gateAlert ? 'PAUSED (Gate)' : m.dora.leadTime;
    document.getElementById('kpiChangeFail').textContent = m.dora.changeFailRate;
    document.getElementById('kpiMttr').textContent = m.dora.mttr;
    document.getElementById('kpiCanaryWeight').textContent = `${state.canaryPct}%`;

    const canarySub = document.getElementById('kpiCanarySub');
    const canaryBar = document.getElementById('kpiCanaryBar');
    if (state.canaryPct === 0) {
      canarySub.textContent = 'Reverted (0%)';
      canarySub.className = 'kpi-delta bad';
      if (canaryBar) { canaryBar.style.width = '12%'; canaryBar.className = 'kpi-bar-fill rose'; }
    } else {
      canarySub.textContent = 'P99 38ms';
      canarySub.className = 'kpi-delta good';
      if (canaryBar) { canaryBar.style.width = `${state.canaryPct}%`; canaryBar.className = 'kpi-bar-fill sky'; }
    }

    const breakerEl = document.getElementById('kpiBreakerState');
    const hopEl = document.getElementById('kpiHopCount');
    const breakerBar = document.getElementById('kpiBreakerBar');
    breakerEl.textContent = `${state.breakerState} ($${state.burnRateUsd.toFixed(2)}/m)`;
    hopEl.textContent = `Hops ${state.hopCount}/${state.maxHops}`;
    hopEl.className = 'kpi-delta ' + (state.breakerState === 'OK' ? 'good' : state.breakerState === 'STOP' ? 'bad' : 'warn');
    if (breakerBar) {
      const pct = state.breakerState === 'OK' ? 24 : state.breakerState === 'STEER' ? 58 : state.breakerState === 'CONSTRAIN' ? 82 : 100;
      breakerBar.style.width = `${pct}%`;
      breakerBar.className = 'kpi-bar-fill ' + (state.breakerState === 'OK' ? 'emerald' : state.breakerState === 'STOP' ? 'rose' : 'amber');
    }
  }

  function renderCastStrip() {
    const strip = document.getElementById('castStrip');
    if (!strip) return;

    strip.innerHTML = AGENTS.map((a) => {
      const selected = state.selectedAgentId === a.id ? 'selected' : '';
      const st = state.phaseStatuses[a.phaseIndex] || 'idle';
      const dotColor = st === 'blocked' ? 'var(--accent-rose)' : st === 'passed' ? 'var(--accent-emerald)' : 'var(--accent-sky)';
      return `
        <button type="button" class="agent-chip ${selected}" data-cast-agent="${a.id}">
          <canvas class="agent-portrait-canvas" width="18" height="28" data-portrait-id="${a.id}"></canvas>
          <div class="agent-chip-meta">
            <div class="agent-chip-name">
              <span>${a.name}</span>
              <span style="color:${dotColor};font-family:var(--font-mono);font-size:0.66rem;">● P${a.phaseIndex}</span>
            </div>
            <div class="agent-chip-role" title="${a.role}">${a.role}</div>
          </div>
        </button>
      `;
    }).join('');

    strip.querySelectorAll('canvas[data-portrait-id]').forEach((cv) => {
      paintPortraitToCanvas(cv, cv.getAttribute('data-portrait-id'));
    });

    strip.querySelectorAll('[data-cast-agent]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.selectedAgentId = btn.getAttribute('data-cast-agent');
        renderAllUI();
      });
    });
  }

  function renderVdeTab() {
    const m = MISSIONS[state.currentMissionId];
    if (!m) return;

    document.getElementById('reaArtifactLabel').textContent = m.reaEvidence.artifact;
    document.getElementById('reaFindingsList').innerHTML = m.reaEvidence.findings
      .map((f) => `<li>${escapeHtml(f)}</li>`)
      .join('');

    document.getElementById('diffFilePath').textContent = m.diffFile;
    document.getElementById('diffCodeBox').innerHTML = m.diffLines
      .map((line) => {
        const cls = line.type === 'add' ? 'diff-line diff-add' : line.type === 'del' ? 'diff-line diff-del' : line.type === 'hdr' ? 'diff-line diff-hdr' : 'diff-line';
        return `<span class="${cls}">${escapeHtml(line.text)}</span>`;
      })
      .join('');

    document.getElementById('pipelineYamlBox').textContent = m.pipelineYaml;
  }

  function renderGuardrailsTab() {
    const lbl = document.getElementById('breakerDetailLabel');
    if (lbl) {
      lbl.textContent = `State: ${state.breakerState} · Burn: $${state.burnRateUsd.toFixed(2)}/min · Hops: ${state.hopCount}/${state.maxHops}`;
    }

    const grid = document.getElementById('guardrailGrid');
    if (!grid) return;

    grid.innerHTML = state.guardrails.map((g) => {
      const isTripped = g.status !== 'PASS';
      const badgeCol = isTripped ? 'var(--accent-rose)' : 'var(--accent-emerald)';
      return `
        <div class="guardrail-card ${isTripped ? 'tripped' : ''}">
          <div class="guardrail-head">
            <span>${escapeHtml(g.title)}</span>
            <span style="font-family:var(--font-mono);color:${badgeCol};padding:1px 6px;border:1px solid ${badgeCol};border-radius:4px;">
              ${g.status}
            </span>
          </div>
          <div class="guardrail-desc">${escapeHtml(g.rule)}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;font-family:var(--font-mono);font-size:0.68rem;">
            <span style="color:var(--accent-sky);">[${escapeHtml(g.category)}] ${escapeHtml(g.metric)}</span>
            <button type="button" class="btn btn-xs" data-toggle-guardrail="${g.id}">
              ${g.enforced ? 'Enforced' : 'Bypassed'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('[data-toggle-guardrail]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const gid = btn.getAttribute('data-toggle-guardrail');
        const item = state.guardrails.find((x) => x.id === gid);
        if (item) {
          item.enforced = !item.enforced;
          item.status = item.enforced ? 'PASS' : 'BYPASSED';
          renderGuardrailsTab();
        }
      });
    });
  }

  function renderMemoryTab() {
    const queryInput = document.getElementById('kgSearchInput');
    const query = queryInput ? queryInput.value : '';
    const hits = searchKnowledgeGraph(query);

    const resultsGrid = document.getElementById('kgResultsGrid');
    if (resultsGrid) {
      resultsGrid.innerHTML = hits.slice(0, 4).map((h) => `
        <div class="kg-card">
          <div style="display:flex;justify-content:space-between;gap:6px;font-family:var(--font-mono);font-size:0.68rem;color:var(--accent-sky);">
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(h.source)}</span>
            <span style="flex-shrink:0;">score=${h.score}</span>
          </div>
          <div style="font-size:var(--text-xs);font-weight:700;margin-top:2px;">${escapeHtml(h.heading)}</div>
          <div style="font-size:0.68rem;color:var(--color-text-muted);margin-top:2px;">${escapeHtml(h.body)}</div>
        </div>
      `).join('');
    }

    const agent = AGENTS.find((a) => a.id === state.selectedAgentId) || AGENTS[0];
    const memLbl = document.getElementById('memoryAgentLabel');
    if (memLbl) memLbl.textContent = `agents/${agent.id}/memory.md (${agent.name} · ${agent.role})`;
    const memBox = document.getElementById('agentMemoryMarkdown');
    if (memBox) memBox.textContent = formatMemoryMarkdown(agent);

    drawBipartiteMemoryGraph();
  }

  function drawBipartiteMemoryGraph() {
    const canvas = document.getElementById('memoryGraphCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const isLight = state.theme === 'light';

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = isLight ? '#F0EAD2' : '#26262F';
    ctx.fillRect(0, 0, W, H);

    const leftX = 76;
    const rightX = W - 120;

    const agentCoords = {};
    AGENTS.forEach((a, i) => {
      const y = 16 + i * ((H - 28) / (AGENTS.length - 1));
      agentCoords[a.id] = { x: leftX, y };
    });

    const topicCoords = {};
    GRAPH_TOPICS.forEach((t, i) => {
      const y = 16 + i * ((H - 28) / (GRAPH_TOPICS.length - 1));
      topicCoords[t.id] = { x: rightX, y };
    });

    GRAPH_EDGES.forEach((e) => {
      const aPos = agentCoords[e.agent];
      const tPos = topicCoords[e.topic];
      if (!aPos || !tPos) return;
      const active = e.agent === state.selectedAgentId;
      ctx.beginPath();
      ctx.moveTo(aPos.x + 34, aPos.y);
      const cp1x = aPos.x + (tPos.x - aPos.x) * 0.45;
      const cp2x = aPos.x + (tPos.x - aPos.x) * 0.55;
      ctx.bezierCurveTo(cp1x, aPos.y, cp2x, tPos.y, tPos.x - 42, tPos.y);
      ctx.strokeStyle = active
        ? (isLight ? '#237082' : '#7BA8B8')
        : (isLight ? 'rgba(140,123,153,0.35)' : 'rgba(126,123,140,0.32)');
      ctx.lineWidth = active ? 2 : 1;
      ctx.stroke();
    });

    ctx.font = '600 10px "JetBrains Mono", monospace';
    AGENTS.forEach((a) => {
      const p = agentCoords[a.id];
      const selected = a.id === state.selectedAgentId;
      ctx.fillStyle = selected ? (isLight ? '#D0ECF2' : '#1F2B30') : (isLight ? '#FCFAF0' : '#1E1E25');
      ctx.strokeStyle = selected ? '#7BA8B8' : (isLight ? '#8C7B99' : '#5A5866');
      ctx.lineWidth = selected ? 1.5 : 1;
      ctx.fillRect(p.x - 44, p.y - 8, 78, 16);
      ctx.strokeRect(p.x - 44, p.y - 8, 78, 16);
      ctx.fillStyle = isLight ? '#1A1320' : '#ECE9E2';
      ctx.fillText(`@${a.id}`, p.x - 38, p.y + 3);
    });

    GRAPH_TOPICS.forEach((t) => {
      const p = topicCoords[t.id];
      const connected = GRAPH_EDGES.some((e) => e.agent === state.selectedAgentId && e.topic === t.id);
      ctx.fillStyle = connected ? (isLight ? '#E4DEF7' : '#262233') : (isLight ? '#FCFAF0' : '#1E1E25');
      ctx.strokeStyle = connected ? '#9E92C4' : (isLight ? '#8C7B99' : '#5A5866');
      ctx.lineWidth = connected ? 1.5 : 1;
      ctx.fillRect(p.x - 42, p.y - 8, 148, 16);
      ctx.strokeRect(p.x - 42, p.y - 8, 148, 16);
      ctx.fillStyle = isLight ? '#1A1320' : '#ECE9E2';
      ctx.fillText(t.label, p.x - 36, p.y + 3);
    });
  }

  function renderHiresTab() {
    const box = document.getElementById('hireJsonBox');
    if (!box) return;
    const bundle = generateHireManifests();
    const selectedHire = bundle.agents.find((h) => h.id === `aegis-${state.selectedAgentId}`) || bundle.agents[0];
    box.textContent = JSON.stringify(selectedHire, null, 2);
  }

  function renderBottomTelemetry() {
    const envFeed = document.getElementById('envelopeFeed');
    if (envFeed) {
      envFeed.innerHTML = state.envelopeLog.slice(0, 8).map((e) => `
        <div class="envelope-row">
          <span style="color:var(--color-text-muted);">${escapeHtml(e.time)}</span>
          <span class="act-tag act-${escapeHtml(e.act)}">${escapeHtml(e.act)}</span>
          <span class="env-route" style="color:var(--accent-sky);font-weight:600;">${escapeHtml(e.from.toUpperCase())} → ${escapeHtml(e.to.toUpperCase())} [${escapeHtml(e.hops)}]</span>
          <span style="color:var(--color-text);">${escapeHtml(e.summary)}</span>
        </div>
      `).join('');
    }

    const wfList = document.getElementById('waterfallList');
    if (wfList) {
      const maxDur = Math.max(850, ...state.toolSpans.map((s) => s.durationMs));
      wfList.innerHTML = state.toolSpans.slice(0, 8).map((s) => {
        const pct = Math.max(8, Math.round((s.durationMs / maxDur) * 100));
        const color = s.ok ? 'var(--accent-emerald)' : 'var(--accent-rose)';
        return `
          <div class="waterfall-row">
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${s.tool}">@${s.agentId.toUpperCase()}:${s.tool}</span>
            <div class="waterfall-track">
              <div class="waterfall-bar" style="width:${pct}%;background:${color};"></div>
            </div>
            <span style="text-align:right;color:var(--color-text-muted);">${s.durationMs}ms</span>
            <span style="text-align:center;color:${color};font-weight:700;">${s.ok ? 'PASS' : 'HALT'}</span>
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
      runBtn.textContent = state.isPlaying ? '⏸ Pause Lifecycle' : '▶ Run Full Lifecycle';
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

  // High-Detail 2D Pixel Cyber-Ops Command Floor (Warm SNES Color Grading)
  const FLOOR_THEMES = {
    soc: {
      name: 'Sector 01: Orbital Cyber-SOC',
      bgA: '#2a2320',
      bgB: '#322a26',
      border: '#6b5a4a',
      gridLine: 'rgba(232, 190, 98, 0.08)',
      aisle: '#3b332e',
      deskTop: '#a37c52',
      deskEdge: '#735436',
      rackBg: '#191920'
    },
    cleanroom: {
      name: 'Sector 02: Quantum Clean-Room Lab',
      bgA: '#1d2733',
      bgB: '#233040',
      border: '#4f759b',
      gridLine: 'rgba(114, 194, 214, 0.08)',
      aisle: '#2c3d50',
      deskTop: '#5c768d',
      deskEdge: '#3e5266',
      rackBg: '#141419'
    },
    bridge: {
      name: 'Sector 03: Tactical Ops Bridge',
      bgA: '#1d2b24',
      bgB: '#23342b',
      border: '#5ca97a',
      gridLine: 'rgba(116, 207, 155, 0.08)',
      aisle: '#2b4035',
      deskTop: '#7d8c6e',
      deskEdge: '#536147',
      rackBg: '#141916'
    }
  };

  function tickAndRenderFloor(now) {
    const dt = Math.min(0.1, (now - state.lastFrameTime) / 1000);
    state.lastFrameTime = now;
    state.corePulse += dt * 3;

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
    const pal = FLOOR_THEMES[state.floorTheme] || FLOOR_THEMES.soc;

    // 1. Checkerboard tile floor
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const isBorder = x === 0 || y === 0 || x === GRID_W - 1 || y === GRID_H - 1;
        const isCenterCorridor = y === 6 || y === 7;
        ctx.fillStyle = isBorder ? pal.border : isCenterCorridor ? pal.aisle : (x + y) % 2 === 0 ? pal.bgA : pal.bgB;
        ctx.fillRect(x * TILE_PX, y * TILE_PX, TILE_PX, TILE_PX);
      }
    }

    // 2. Subtle Central Pipeline Conduit Bus (Row 6-7)
    ctx.strokeStyle = 'rgba(180, 172, 160, 0.28)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -Math.floor(now / 40);
    ctx.beginPath();
    ctx.moveTo(2 * TILE_PX, 6.5 * TILE_PX);
    ctx.lineTo((GRID_W - 2) * TILE_PX, 6.5 * TILE_PX);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Warm Gold Command Artifact in Center Hub
    const sx = 11.5 * TILE_PX, sy = 6.5 * TILE_PX;
    ctx.fillStyle = '#D4B06A';
    ctx.fillRect(sx - 10, sy - 6, 20, 10);
    ctx.fillStyle = '#1A1320';
    ctx.fillRect(sx - 8, sy + 1, 16, 3);

    // 4. Draw 8 Lifecycle Workstations
    AGENTS.forEach((a) => {
      const dx = a.desk.x * TILE_PX;
      const dy = a.desk.y * TILE_PX;
      const status = state.phaseStatuses[a.phaseIndex] || 'idle';
      const isSelected = state.selectedAgentId === a.id;

      // Subtle Station Floor Mat
      ctx.fillStyle = isSelected ? 'rgba(212, 176, 106, 0.16)' : 'rgba(0, 0, 0, 0.24)';
      ctx.fillRect(dx - 30, dy - 18, 92, 92);
      if (isSelected) {
        ctx.strokeStyle = '#D4B06A';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(dx - 30, dy - 18, 92, 92);
      }

      // Warm Wood Desk Surface + Front Edge
      ctx.fillStyle = pal.deskTop;
      ctx.fillRect(dx - 22, dy - 2, 76, 16);
      ctx.fillStyle = pal.deskEdge;
      ctx.fillRect(dx - 22, dy + 14, 76, 6);

      // Dual Monitors on left & right wings of the desk (muted warm tones)
      const screenCol =
        status === 'passed' ? '#6E9E7D' :
        status === 'blocked' ? '#C4766E' :
        status === 'running' ? '#C9A65E' : '#6E99A8';
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

    // 5. Update & Draw 18x32 Procedural Agent Sprites (Scaled 2x -> 36x64)
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

      // Subtle feet shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.fillRect(px + 6, py + 58, 24, 6);

      // Draw 18x32 sprite at 2x scale (36x64)
      ctx.drawImage(frameCanvas, 0, 0, SCENE_W, SCENE_H, px, py, SCENE_W * 2, SCENE_H * 2);

      // Agent Callsign Plate below character
      ctx.font = '700 10px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(22, 22, 27, 0.92)';
      ctx.fillRect(px - 10, py + 63, 56, 14);
      ctx.fillStyle = state.selectedAgentId === a.id ? '#D4B06A' : '#ECE9E2';
      ctx.fillText(a.name, px + 18, py + 73);

      // Overhead Action Pill (cleanly above monitors, warm dark charcoal)
      if (sp.bubbleText) {
        ctx.font = '700 10px "JetBrains Mono", monospace';
        const label = sp.bubbleText.length > 18 ? sp.bubbleText.slice(0, 17) + '…' : sp.bubbleText;
        const textW = Math.ceil(Math.max(84, ctx.measureText(label).width + 18));
        const bx = Math.round(px + 18 - textW / 2);
        const by = Math.round(py - 25);
        ctx.fillStyle = sp.status === 'blocked' ? '#32201E' : '#222129';
        ctx.strokeStyle = sp.status === 'blocked' ? '#CF7E76' : '#7E7B8C';
        ctx.lineWidth = 1;
        ctx.fillRect(bx, by, textW, 14);
        ctx.strokeRect(bx, by, textW, 14);
        ctx.fillStyle = '#ECE9E2';
        ctx.fillText(label, Math.round(px + 18), by + 10);
      }
    });

    // 6. Update & Draw Flying FIPA Data Envelopes
    const ACT_HEX = {
      request: '#7BA8B8',
      inform: '#D8D4CC',
      propose: '#D4B06A',
      query: '#9E92C4',
      agree: '#78AE8A',
      done: '#78AE8A',
      refuse: '#CF7E76'
    };

    state.envelopes = state.envelopes.filter((env) => {
      env.elapsed += dt;
      const t = Math.min(1, env.elapsed / env.duration);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const x = Math.round(env.sx + (env.ex - env.sx) * e);
      const lift = -42 * Math.sin(Math.PI * e);
      const y = Math.round(env.sy + (env.ey - env.sy) * e + lift);

      const col = env.isAlert ? '#F08A80' : (ACT_HEX[env.act] || '#E8BE62');
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

  function initEvents() {
    const missionSelect = document.getElementById('missionSelect');
    if (missionSelect) {
      missionSelect.addEventListener('change', (e) => {
        loadMission(e.target.value, true);
      });
    }

    const floorThemeSelect = document.getElementById('floorThemeSelect');
    if (floorThemeSelect) {
      floorThemeSelect.addEventListener('change', (e) => {
        state.floorTheme = e.target.value;
        const pal = FLOOR_THEMES[state.floorTheme];
        if (pal) document.getElementById('hudFloorThemeLabel').textContent = pal.name;
      });
    }

    document.getElementById('runPipelineBtn')?.addEventListener('click', startPlayback);
    document.getElementById('stepPhaseBtn')?.addEventListener('click', stepNextPhase);
    document.getElementById('resetPipelineBtn')?.addEventListener('click', () => {
      loadMission(state.currentMissionId, true);
    });

    document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', state.theme);
      document.getElementById('themeToggleBtn').textContent = state.theme === 'dark' ? '☀ Daylight Mode' : '☾ Cyber-Ops Dark';
      renderMemoryTab();
    });

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
            spawnEnvelope('vex', a.id, 'query', false);
            renderAllUI();
            break;
          }
        }
      });
    }

    document.getElementById('approveGateBtn')?.addEventListener('click', () => {
      state.gateAlert = null;
      state.breakerState = 'OK';
      state.burnRateUsd = 0.08;
      Object.keys(state.phaseStatuses).forEach((k) => {
        if (state.phaseStatuses[k] === 'blocked') state.phaseStatuses[k] = 'passed';
      });
      state.guardrails.forEach((g) => { g.status = 'PASS'; });
      spawnEnvelope('nyx', 'orion', 'agree', false);
      state.envelopeLog.unshift({
        time: 'HUMAN-GATE',
        act: 'agree',
        from: 'nyx',
        to: 'orion',
        hops: `${state.hopCount}/6`,
        summary: 'Human SRE approved safe remediation & reset Circuit Breaker to OK.'
      });
      renderAllUI();
    });

    document.getElementById('rollbackGateBtn')?.addEventListener('click', () => {
      state.gateAlert = null;
      state.breakerState = 'OK';
      state.canaryPct = 100;
      loadMission('mission-payment-canary', true);
    });

    document.querySelectorAll('[data-chaos-fault]').forEach((btn) => {
      btn.addEventListener('click', () => {
        injectChaosFault(btn.getAttribute('data-chaos-fault'));
      });
    });

    document.getElementById('kgSearchInput')?.addEventListener('input', () => {
      renderMemoryTab();
    });

    document.getElementById('compactMemoryBtn')?.addEventListener('click', () => {
      const agent = AGENTS.find((a) => a.id === state.selectedAgentId) || AGENTS[0];
      compactAgentMemory(agent);
      renderMemoryTab();
    });

    document.getElementById('approvePatchBtn')?.addEventListener('click', () => {
      spawnEnvelope('lyra', 'orion', 'agree', false);
      state.phaseStatuses[4] = 'passed';
      state.phaseStatuses[6] = 'passed';
      state.phaseStatuses[7] = 'passed';
      state.envelopeLog.unshift({
        time: 'DIFF-SIGN',
        act: 'agree',
        from: 'lyra',
        to: 'orion',
        hops: '4/6',
        summary: 'Signed off code diff with SHA-256 provenance and promoted to Canary Release.'
      });
      renderAllUI();
    });

    document.getElementById('downloadHireBtn')?.addEventListener('click', () => {
      const bundle = generateHireManifests();
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aegismesh-squad.agent.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

    // Custom Target & Real-Time Live Scenario Modal
    const LIVE_PRESETS = {
      'oom-crash': {
        repo: 'github.com/vercel/next.js',
        title: 'Fix worker OOM heap exhaustion under concurrent SSR streaming bursts',
        artifact: 'FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory\n1: 0x104a8c [node] v8::internal::V8::FatalProcessOutOfMemory\nBundle: dist/esm/server/render-worker.bundle.js (unbounded Map cache in streamChunk)'
      },
      'secret-breach': {
        repo: 'github.com/facebook/react',
        title: 'Emergency telemetry exporter patch with unauthorized infra/prod.tf & .env.production mutation',
        artifact: 'Attempted write: infra/prod.tf (resource "aws_iam_Policy" "wildcard_admin")\nExported token: AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY in .env.production'
      },
      'redis-thundering-herd': {
        repo: 'github.com/redis/node-redis',
        title: 'Mitigate Redis connection pool starvation & P99 latency spike (390ms) via singleflight lock',
        artifact: 'OTel Alert: REDIS_POOL_EXHAUSTED (500 concurrent cache misses on key "catalog:home:v4")\nBinary Bundle: dist/client/pool-manager.bundle.cjs @ offset 0x09f20'
      }
    };

    const modal = document.getElementById('customMissionModal');
    document.getElementById('newMissionBtn')?.addEventListener('click', () => {
      if (modal) modal.hidden = false;
    });
    document.getElementById('closeModalBtn')?.addEventListener('click', () => {
      if (modal) modal.hidden = true;
    });

    document.querySelectorAll('[data-live-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-live-preset');
        const preset = LIVE_PRESETS[key];
        if (!preset) return;
        document.getElementById('customRepoInput').value = preset.repo;
        document.getElementById('customTitleInput').value = preset.title;
        document.getElementById('customArtifactInput').value = preset.artifact;
        const badge = document.getElementById('liveProbeStatusBadge');
        if (badge) badge.textContent = `Loaded Preset: ${key.toUpperCase()} (Click Probe & Run)`;
      });
    });

    document.getElementById('launchCustomMissionForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rawRepo = document.getElementById('customRepoInput').value.trim() || 'github.com/vercel/next.js';
      const title = document.getElementById('customTitleInput').value.trim() || 'Real-Time Autonomous DevOps Lifecycle Run';
      const artifact = document.getElementById('customArtifactInput').value.trim() || 'dist/app.bundle.js + crash.log';

      const submitBtn = document.getElementById('submitLiveScenarioBtn');
      const badge = document.getElementById('liveProbeStatusBadge');
      if (submitBtn) submitBtn.textContent = '⏳ Probing GitHub REST API Live...';
      if (badge) badge.textContent = 'Connecting to api.github.com...';

      // Extract owner/repo for real-time GitHub API probe
      const cleaned = rawRepo.replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/^github\.com\//i, '').replace(/\/+$/, '');
      const parts = cleaned.split('/');
      const owner = parts[0] || 'vercel';
      const repoName = parts[1] || 'next.js';
      const slug = `${owner}/${repoName}`;

      let liveMeta = {
        sha: 'a8f4c21',
        author: 'live-ci-bot',
        stars: 128400,
        openIssues: 2410,
        language: 'TypeScript',
        probeMs: 92,
        liveVerified: false
      };

      const t0 = performance.now();
      try {
        const [repoRes, commitRes] = await Promise.all([
          fetch(`https://api.github.com/repos/${slug}`, { headers: { Accept: 'application/vnd.github.v3+json' } }),
          fetch(`https://api.github.com/repos/${slug}/commits?per_page=1`, { headers: { Accept: 'application/vnd.github.v3+json' } })
        ]);
        const probeMs = Math.max(18, Math.round(performance.now() - t0));
        liveMeta.probeMs = probeMs;
        if (repoRes.ok) {
          const rJson = await repoRes.json();
          liveMeta.stars = rJson.stargazers_count ?? liveMeta.stars;
          liveMeta.openIssues = rJson.open_issues_count ?? liveMeta.openIssues;
          liveMeta.language = rJson.language || 'TypeScript';
          liveMeta.liveVerified = true;
        }
        if (commitRes.ok) {
          const cJson = await commitRes.json();
          if (Array.isArray(cJson) && cJson[0]) {
            liveMeta.sha = String(cJson[0].sha || '').slice(0, 7) || liveMeta.sha;
            liveMeta.author = cJson[0].commit?.author?.name || cJson[0].author?.login || liveMeta.author;
            liveMeta.liveVerified = true;
          }
        }
      } catch (_) {
        liveMeta.probeMs = Math.max(24, Math.round(performance.now() - t0));
      }

      if (submitBtn) submitBtn.textContent = '▶ Probe Live Repo & Run 8-Phase Lifecycle';
      if (badge) {
        badge.textContent = liveMeta.liveVerified
          ? `LIVE OK · ${slug}@${liveMeta.sha} (${liveMeta.probeMs}ms)`
          : `PROBED · ${slug}@${liveMeta.sha} (${liveMeta.probeMs}ms)`;
      }

      // Dynamic Real-Time Payload & Guardrail Scanner
      const combinedText = `${title}\n${artifact}`;
      const breachMatch = combinedText.match(/(prod\.tf|\.env(?:\.[a-z]+)?|AWS_SECRET_ACCESS_KEY|PRIVATE_KEY|k8s\/secrets\.yaml)/i);
      const isOom = /(oom|heap|memory|allocation failed|sigsegv)/i.test(combinedText);

      const customId = `mission-live-${Date.now().toString().slice(-4)}`;
      const detectedToken = breachMatch ? breachMatch[1] : null;

      MISSIONS[customId] = {
        id: customId,
        title: `Live [${slug}@${liveMeta.sha}]: ${title.slice(0, 48)}`,
        category: `Live Probe (${liveMeta.probeMs}ms · ★${liveMeta.stars.toLocaleString()})`,
        targetRepo: `github.com/${slug}`,
        summary: title,
        dora: {
          deployFreq: breachMatch ? 'QUARANTINED' : '18.4 / day',
          leadTime: `${liveMeta.probeMs}ms Probe / 9m DAG`,
          changeFailRate: breachMatch ? 'BLOCKED (0%)' : '0.9%',
          mttr: breachMatch ? '14ms Gate Halt' : '1m 42s',
          canaryPct: breachMatch ? 0 : 100,
          burnRate: breachMatch ? '$0.00/m (STOP)' : '$0.07/min'
        },
        reaEvidence: {
          artifact: `${slug}@${liveMeta.sha} · ${artifact.split('\n')[0].slice(0, 68)}`,
          findings: [
            `Live GitHub REST Probe: Connected to github.com/${slug} in ${liveMeta.probeMs}ms (HEAD commit ${liveMeta.sha} by ${liveMeta.author}, ${liveMeta.language}, ${liveMeta.openIssues} open issues).`,
            isOom
              ? `CIPHER Binary & Heap Forensics: Located unbounded V8 heap retention in worker bundle; extracted call-graph contract for bounded LRU eviction.`
              : `CIPHER Binary & Bundle Recon: Dissected target artifact and recovered symbol table + control-flow invariants before synthesis.`,
            detectedToken
              ? `ALERT — NYX Pre-Scan Flagged Protected Token "${detectedToken}" in payload; Phase 6 Policy Shield armed to quarantine.`
              : `NYX Pre-Scan Verified 0 protected path mutations (.env*, prod.tf untouched) and 0 Critical CVEs.`
          ]
        },
        diffFile: isOom
          ? `src/runtime/boundedStreamCache.ts (${slug}@${liveMeta.sha})`
          : detectedToken
            ? `infra/prod.tf [QUARANTINED BY NYX SHIELD] (${slug}@${liveMeta.sha})`
            : `src/remediation/singleflightGuard.ts (${slug}@${liveMeta.sha})`,
        diffLines: detectedToken
          ? [
              { type: 'hdr', text: `@@ -12,4 +12,8 @@ // INTERCEPTED DIFF ON ${slug}@${liveMeta.sha}` },
              { type: 'del', text: `- resource "aws_iam_role_policy" "restricted_worker" {` },
              { type: 'add', text: `+ // VIOLATION: Attempted write to protected target: ${detectedToken}` },
              { type: 'add', text: `+ // NYX Zero-Trust Shield blocked commit and armed BREAKER: STOP` }
            ]
          : isOom
            ? [
                { type: 'hdr', text: `@@ -44,7 +44,14 @@ // Clean-Room Patch for ${slug}@${liveMeta.sha}` },
                { type: 'del', text: `- const chunkCache = new Map<string, Uint8Array>();` },
                { type: 'add', text: `+ const chunkCache = new BoundedLRUCache<string, Uint8Array>({ maxEntries: 512, maxBytes: 32 * 1024 * 1024 });` },
                { type: 'add', text: `+ if (process.memoryUsage().heapUsed > HEAP_HIGH_WATERMARK) {` },
                { type: 'add', text: `+   chunkCache.evictOldest(128);` },
                { type: 'add', text: `+ }` }
              ]
            : [
                { type: 'hdr', text: `@@ -18,6 +18,13 @@ // Clean-Room Patch for ${slug}@${liveMeta.sha}` },
                { type: 'del', text: `- return await pool.query(key);` },
                { type: 'add', text: `+ return await singleflight.do(key, async () => {` },
                { type: 'add', text: `+   return await withCircuitBreaker(pool, () => pool.query(key));` },
                { type: 'add', text: `+ });` }
              ],
        pipelineYaml: `name: AegisMesh-Live-CI-CD\non:\n  push:\n    branches: [main]\njobs:\n  live-recon-verify-canary:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          ref: ${liveMeta.sha}\n      - name: Phase 2 CIPHER Binary & AST Contract Check\n        run: npx aegismesh-recon verify --repo ${slug} --sha ${liveMeta.sha}\n      - name: Phase 6 NYX Zero-Trust Shield (.env / prod.tf / Secret Scan)\n        run: npx aegismesh-shield enforce --deny-paths ".env*,prod.tf"\n      - name: Phase 7 ORION Progressive Canary (5% -> 25% -> 100%)\n        run: kubectl argo rollouts set image app=${slug}:${liveMeta.sha}`,
        steps: [
          {
            phaseIndex: 1,
            from: 'vex',
            to: 'cipher',
            act: 'request',
            tool: 'dag.plan_live_target',
            durationMs: liveMeta.probeMs + 140,
            ok: true,
            summary: `Probed ${slug}@${liveMeta.sha} (${liveMeta.probeMs}ms) & decomposed "${title.slice(0, 44)}" into 8-phase DAG.`
          },
          {
            phaseIndex: 2,
            from: 'cipher',
            to: 'kael',
            act: 'inform',
            tool: 'recon.dissect_live_artifact',
            durationMs: 490,
            ok: true,
            summary: `Dissected live artifact on ${slug}@${liveMeta.sha} & published clean-room spec to mesh/SPEC.md.`
          },
          {
            phaseIndex: 3,
            from: 'kael',
            to: 'lyra',
            act: 'propose',
            tool: 'synth.generate_patch',
            durationMs: 460,
            ok: true,
            summary: `Synthesized candidate diff against ${slug}@${liveMeta.sha} with GitHub Actions + Argo Rollouts manifest.`
          },
          {
            phaseIndex: 4,
            from: 'lyra',
            to: 'drake',
            act: 'agree',
            tool: 'verify.ast_type_audit',
            durationMs: 370,
            ok: true,
            summary: `Independent AST & symbol parity audit passed on ${slug}@${liveMeta.sha} (0 self-approvals).`
          },
          {
            phaseIndex: 5,
            from: 'drake',
            to: 'nyx',
            act: 'inform',
            tool: 'chaos.concurrency_stress',
            durationMs: 620,
            ok: true,
            summary: `50-way concurrent stress & regression matrix passed on ${slug}@${liveMeta.sha}.`
          },
          detectedToken
            ? {
                phaseIndex: 6,
                from: 'nyx',
                to: 'vex',
                act: 'refuse',
                tool: 'shield.block_protected_path',
                durationMs: 18,
                ok: false,
                haltGate: true,
                gateBadge: 'BREAKER: STOP · LIVE POLICY INTERCEPT',
                gateMessage: `NYX Zero-Trust Shield intercepted forbidden token "${detectedToken}" in live scenario for ${slug}@${liveMeta.sha}. Pipeline quarantined at Phase 6.`,
                summary: `BLOCKED unauthorized mutation touching "${detectedToken}" on ${slug}@${liveMeta.sha}; circuit breaker tripped to STOP.`
              }
            : {
                phaseIndex: 6,
                from: 'nyx',
                to: 'orion',
                act: 'agree',
                tool: 'shield.aot_policy_gate',
                durationMs: 260,
                ok: true,
                summary: `Zero-Trust Policy Shield PASS on ${slug}@${liveMeta.sha} (0 secrets, .env/prod.tf untouched).`
              },
          {
            phaseIndex: 7,
            from: 'orion',
            to: 'sora',
            act: 'inform',
            tool: 'canary.progressive_rollout',
            durationMs: 520,
            ok: true,
            summary: `Promoted ${slug}@${liveMeta.sha} canary 5% -> 25% -> 100%; P99 latency steady at ${Math.min(65, liveMeta.probeMs)}ms.`
          },
          {
            phaseIndex: 8,
            from: 'sora',
            to: 'vex',
            act: 'done',
            tool: 'pulse.otel_close_loop',
            durationMs: 290,
            ok: true,
            summary: `Verified OTel spans for ${slug}@${liveMeta.sha} & indexed live run into Knowledge Graph.`
          }
        ]
      };

      const sel = document.getElementById('missionSelect');
      if (sel) {
        const opt = document.createElement('option');
        opt.value = customId;
        opt.textContent = MISSIONS[customId].title;
        sel.prepend(opt);
        sel.value = customId;
      }
      if (modal) modal.hidden = true;
      loadMission(customId, false);
      startPlayback();
    });

    // Org ROI & Playbook Modal
    const roiModal = document.getElementById('orgRoiModal');
    document.getElementById('openOrgRoiBtn')?.addEventListener('click', () => {
      if (roiModal) roiModal.hidden = false;
    });
    document.getElementById('closeOrgRoiBtn')?.addEventListener('click', () => {
      if (roiModal) roiModal.hidden = true;
    });

    window.addEventListener('resize', () => {
      if (state.activeTab === 'tab-memory') drawBipartiteMemoryGraph();
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    document.documentElement.setAttribute('data-theme', state.theme);
    initAgentSprites();
    initEvents();
    loadMission('mission-payment-canary', true);
    requestAnimationFrame(tickAndRenderFloor);
    window.appReady = true;
  });
})();
