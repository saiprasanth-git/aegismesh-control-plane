/* ============================================================================
   AEGIS // MESH — HIGH-DETAIL PIXEL-ART CYBER-ENGINEER SPRITE & FLOOR ENGINE
   Original 8-Agent Autonomous DevOps Cast (20x32 Pixel Grid) + BFS Pathfinder
   ============================================================================ */

(function () {
  const PORTRAIT_W = 20;
  const PORTRAIT_H = 28;
  const SCENE_W = 20;
  const SCENE_H = 32;

  // Palette Legend:
  // . = transparent
  // O = #090D16 (deep outline)
  // S = skin base, s = skin shadow
  // H = hair base, h = hair highlight
  // J = primary jacket/suit, j = jacket shadow/trim
  // A = role accent (visor, LED, trim, tie/core), a = bright accent glow
  // U = undershirt / chest plate (#E2E8F0)
  // P = pants (#1E293B), B = boots (#0F172A)
  // M = metallic headset / cyber-gear (#94A3B8)

  const AGENT_PALETTES = {
    vex: {
      // P1: Lead Architect & DAG Planner (Electric Cyan Visor + Navy Commander Coat)
      O: '#070A12',
      S: '#F1C6A7', s: '#D49E7A',
      H: '#1E293B', h: '#475569',
      J: '#1E3A5F', j: '#0F233D',
      A: '#38BDF8', a: '#BAE6FD',
      U: '#F8FAFC', P: '#0F172A', B: '#090D16', M: '#94A3B8'
    },
    cipher: {
      // P2: Binary & Crash Forensics (Neon Violet Neural Goggles + Obsidian Trench)
      O: '#070A12',
      S: '#E5B899', s: '#C6906E',
      H: '#E2E8F0', h: '#94A3B8',
      J: '#2E1F47', j: '#1A112B',
      A: '#A855F7', a: '#E9D5FF',
      U: '#334155', P: '#1E1B2E', B: '#090D16', M: '#CBD5E1'
    },
    kael: {
      // P3: Code & IaC Synthesizer (Amber Cyber-Hoodie + Holo-Gloves)
      O: '#070A12',
      S: '#D9A17C', s: '#B87D58',
      H: '#18181B', h: '#3F3F46',
      J: '#B45309', j: '#78350F',
      A: '#F59E0B', a: '#FDE68A',
      U: '#1E293B', P: '#1E293B', B: '#090D16', M: '#94A3B8'
    },
    lyra: {
      // P4: AST & PR Verifier (Emerald Comms Headset + Slate Tactical Blazer)
      O: '#070A12',
      S: '#F5CBA7', s: '#D9A47C',
      H: '#5B21B6', h: '#7C3AED',
      J: '#065F46', j: '#064E3B',
      A: '#10B981', a: '#A7F3D0',
      U: '#F1F5F9', P: '#1E293B', B: '#090D16', M: '#CBD5E1'
    },
    drake: {
      // P5: Concurrency & Chaos QA (Crimson-Orange Hazard Rig + Visor)
      O: '#070A12',
      S: '#C68B59', s: '#9C6639',
      H: '#27272A', h: '#52525B',
      J: '#9F1239', j: '#881337',
      A: '#FB7185', a: '#FECDD3',
      U: '#18181B', P: '#27272A', B: '#090D16', M: '#94A3B8'
    },
    nyx: {
      // P6: Zero-Trust Guardrail Warden (Indigo-Silver Sentinel Armor + Shield Crest)
      O: '#070A12',
      S: '#F3D1B8', s: '#D5A98A',
      H: '#0F172A', h: '#38BDF8',
      J: '#312E81', j: '#1E1B4B',
      A: '#818CF8', a: '#E0E7FF',
      U: '#E2E8F0', P: '#1E1B4B', B: '#090D16', M: '#E2E8F0'
    },
    orion: {
      // P7: Progressive Canary & FinOps (Teal-Gold Flight Director Jacket)
      O: '#070A12',
      S: '#8D5524', s: '#6B3E17',
      H: '#090D16', h: '#334155',
      J: '#115E59', j: '#134E4A',
      A: '#2DD4BF', a: '#99F6E4',
      U: '#F8FAFC', P: '#0F172A', B: '#090D16', M: '#FBBF24'
    },
    sora: {
      // P8: OpenTelemetry SRE & Feedback Loop (Sky-Mint Telemetry Visor + Ops Rig)
      O: '#070A12',
      S: '#EAC09E', s: '#C99874',
      H: '#0284C7', h: '#38BDF8',
      J: '#1E293B', j: '#0F172A',
      A: '#34D399', a: '#D1FAE5',
      U: '#0F172A', P: '#1E293B', B: '#090D16', M: '#38BDF8'
    }
  };

  // Build 20x28 high-clarity cyber-engineer portrait grid
  function buildPortraitGrid(agentId) {
    const hasVisor = ['vex', 'cipher', 'drake', 'sora'].includes(agentId);
    const hasHeadset = ['lyra', 'nyx', 'orion', 'kael'].includes(agentId);
    const longHair = ['lyra', 'nyx', 'sora'].includes(agentId);

    const rows = [
      '....................',
      '.....OOOOOOOOOO.....',
      '....OHHHHHHHHHhO....',
      '...OHHHHHHHHHHhhO...',
      '...OHhHHHHHHHHhhO...',
      hasHeadset
        ? '..OMSSSSSSSSSSSSMO..'
        : '...OSSSSSSSSSSSSO...',
      hasVisor
        ? '..OOAAAAAAAAAAAAOO..'
        : '..OMSSOOSssOOSSSMO..',
      hasVisor
        ? '..OAAaAAAAAAAAaAAO..'
        : '..OMSSOOSssOOSSSMO..',
      longHair
        ? '..OHSSSSSSSSSSSSHO..'
        : '...OSSSSSSSSSSSSO...',
      longHair
        ? '..OHSSsSSSSSSsSSHO..'
        : '...OSSsSSSSSSsSSO...',
      longHair
        ? '..OHSSSSOOOOSSSSHO..'
        : '...OSSSSOOOOSSSSO...',
      '....OssssssssssO....',
      '.....OOOSSSSOOO.....',
      '...OOOOOUUUUOOOOO...',
      '..OJJJJJUUUUJJJJJO..',
      '.OJJjJJJUAUUJJJjJJO.',
      '.OJJjJJJUUUUJJJjJJO.',
      '.OJJjJJJUAUUJJJjJJO.',
      '.OJJAAJJUUUUJJAAJJO.',
      '.OJJaaJJUUUUJJaaJJO.',
      '.OJJJJJUUUUUUJJJJJO.',
      '.OJJjJJJJJJJJJJjJJO.',
      '.OSSSSJJAAAAJJSSSSO.',
      '.OssssJJaaaaJJssssO.',
      '..OOOOJJJJJJJJOOOO..',
      '.....OPPPPPPPPO.....',
      '.....OPPP..PPPO.....',
      '.....OOOO..OOOO.....'
    ];
    return rows;
  }

  // Build 3-frame 20x32 full-body scene sprites (Idle + Walk A + Walk B)
  function buildSceneFrames(agentId) {
    const base24 = buildPortraitGrid(agentId).slice(0, 24);

    const legsIdle = [
      '....OOJJJJJJJJOO....',
      '....OPPPPPPPPPPO....',
      '....OPPPP..PPPPO....',
      '....OPPPP..PPPPO....',
      '....OPPPP..PPPPO....',
      '....OBBBB..BBBBO....',
      '....OBBBB..BBBBO....',
      '....OOOOO..OOOOO....'
    ];

    const legsStepA = [
      '....OOJJJJJJJJOO....',
      '....OPPPPPPPPPPO....',
      '...OPPPP....PPPPO...',
      '...OPPPP....PPPPO...',
      '...OBBBB....BBBBO...',
      '...OOOOO....BBBBO...',
      '............OOOOO...',
      '....................'
    ];

    const legsStepB = [
      '....OOJJJJJJJJOO....',
      '....OPPPPPPPPPPO....',
      '...OPPPP....PPPPO...',
      '...OPPPP....PPPPO...',
      '...OBBBB....BBBBO...',
      '...OBBBB....OOOOO...',
      '...OOOOO............',
      '....................'
    ];

    return [
      base24.concat(legsIdle),
      base24.concat(legsStepA),
      base24.concat(legsStepB)
    ];
  }

  function renderGridToCanvas(grid, palette, w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    for (let y = 0; y < h; y++) {
      const row = grid[y] || '';
      for (let x = 0; x < w; x++) {
        const ch = row[x];
        if (!ch || ch === '.') continue;
        const hex = palette[ch];
        if (!hex) continue;
        ctx.fillStyle = hex;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }

  const portraitCache = {};
  const sceneFrameCache = {};

  function getPortraitCanvas(agentId) {
    const key = AGENT_PALETTES[agentId] ? agentId : 'vex';
    if (!portraitCache[key]) {
      portraitCache[key] = renderGridToCanvas(
        buildPortraitGrid(key),
        AGENT_PALETTES[key],
        PORTRAIT_W,
        PORTRAIT_H
      );
    }
    return portraitCache[key];
  }

  function getSceneFrames(agentId) {
    const key = AGENT_PALETTES[agentId] ? agentId : 'vex';
    if (!sceneFrameCache[key]) {
      const grids = buildSceneFrames(key);
      sceneFrameCache[key] = grids.map((g) =>
        renderGridToCanvas(g, AGENT_PALETTES[key], SCENE_W, SCENE_H)
      );
    }
    return sceneFrameCache[key];
  }

  function paintPortraitToCanvas(targetCanvas, agentId) {
    if (!targetCanvas) return;
    const src = getPortraitCanvas(agentId);
    const ctx = targetCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    ctx.drawImage(src, 0, 0, PORTRAIT_W, PORTRAIT_H, 0, 0, targetCanvas.width, targetCanvas.height);
  }

  // BFS Tile Pathfinder
  function findPath(sx, sy, gx, gy, gridW, gridH) {
    const startX = Math.max(1, Math.min(gridW - 2, Math.round(sx)));
    const startY = Math.max(1, Math.min(gridH - 2, Math.round(sy)));
    const goalX = Math.max(1, Math.min(gridW - 2, Math.round(gx)));
    const goalY = Math.max(1, Math.min(gridH - 2, Math.round(gy)));

    if (startX === goalX && startY === goalY) return [];

    const key = (x, y) => `${x},${y}`;
    const queue = [{ x: startX, y: startY }];
    const cameFrom = new Map();
    cameFrom.set(key(startX, startY), null);

    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 }
    ];

    while (queue.length > 0) {
      const cur = queue.shift();
      if (cur.x === goalX && cur.y === goalY) break;

      for (const d of dirs) {
        const nx = cur.x + d.dx;
        const ny = cur.y + d.dy;
        if (nx < 1 || ny < 1 || nx >= gridW - 1 || ny >= gridH - 1) continue;
        const k = key(nx, ny);
        if (cameFrom.has(k)) continue;
        cameFrom.set(k, cur);
        queue.push({ x: nx, y: ny });
      }
    }

    const goalKey = key(goalX, goalY);
    if (!cameFrom.has(goalKey)) return [{ x: goalX, y: goalY }];

    const path = [];
    let step = { x: goalX, y: goalY };
    while (step && !(step.x === startX && step.y === startY)) {
      path.push(step);
      step = cameFrom.get(key(step.x, step.y)) || null;
    }
    path.reverse();
    return path;
  }

  window.AegisSprites = {
    PORTRAIT_W,
    PORTRAIT_H,
    SCENE_W,
    SCENE_H,
    AGENT_PALETTES,
    getPortraitCanvas,
    getSceneFrames,
    paintPortraitToCanvas,
    findPath
  };
})();
