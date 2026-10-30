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
      // P1: Lead Architect & DAG Planner (Warm Navy Suit + Sky Visor)
      O: '#1A1320',
      S: '#F2C19E', s: '#D49E7A',
      H: '#2C221E', h: '#524139',
      J: '#2B3A4A', j: '#1D2833',
      A: '#72C2D6', a: '#D0ECF2',
      U: '#FCFAF0', P: '#1F2933', B: '#1A1320', M: '#C6C3BC'
    },
    cipher: {
      // P2: Binary & Crash Forensics (Warm Ochre Jacket + Lilac Goggles)
      O: '#1A1320',
      S: '#F0BD99', s: '#C9936E',
      H: '#6B4C2B', h: '#8F683D',
      J: '#D4A838', j: '#A68020',
      A: '#B5A4F0', a: '#E4DEF7',
      U: '#FCFAF0', P: '#4A3B28', B: '#1A1320', M: '#ECE9E2'
    },
    kael: {
      // P3: Code & IaC Synthesizer (Warm Steel-Blue Jacket + Coral Trim)
      O: '#1A1320',
      S: '#F4C5A4', s: '#D6A07C',
      H: '#5C3D28', h: '#7D553A',
      J: '#3E5F8A', j: '#2B4466',
      A: '#F08A80', a: '#F7D8D4',
      U: '#FCFAF0', P: '#263240', B: '#1A1320', M: '#C6C3BC'
    },
    lyra: {
      // P4: AST & PR Verifier (Warm Sage/Teal Blazer + Mint Comms)
      O: '#1A1320',
      S: '#F6CCA8', s: '#D9A882',
      H: '#B85A32', h: '#D9774A',
      J: '#5C8A78', j: '#426658',
      A: '#74CF9B', a: '#D2EFE0',
      U: '#FCFAF0', P: '#2E3B36', B: '#1A1320', M: '#ECE9E2'
    },
    drake: {
      // P5: Concurrency & Chaos QA (Warm Charcoal Rig + Amber/Gold Visor)
      O: '#1A1320',
      S: '#EBB692', s: '#C78E69',
      H: '#242024', h: '#453E45',
      J: '#3A3A48', j: '#262630',
      A: '#E8BE62', a: '#F7E8BE',
      U: '#FCFAF0', P: '#22222B', B: '#1A1320', M: '#C6C3BC'
    },
    nyx: {
      // P6: Zero-Trust Guardrail Warden (Warm Plum/Violet Coat + Gold Crest)
      O: '#1A1320',
      S: '#F5C8A6', s: '#D4A17E',
      H: '#D9B854', h: '#F0D478',
      J: '#4B3D60', j: '#352A45',
      A: '#E8BE62', a: '#F7E8BE',
      U: '#FCFAF0', P: '#2A2236', B: '#1A1320', M: '#ECE9E2'
    },
    orion: {
      // P7: Progressive Canary & FinOps (Warm Olive/Brown Jacket + Sky Badge)
      O: '#1A1320',
      S: '#8C583A', s: '#6B4026',
      H: '#1C1614', h: '#3B2F2B',
      J: '#5C5346', j: '#423B31',
      A: '#72C2D6', a: '#D0ECF2',
      U: '#FCFAF0', P: '#332E27', B: '#1A1320', M: '#E8BE62'
    },
    sora: {
      // P8: OpenTelemetry SRE & Feedback Loop (Warm Terracotta/Plum Jacket + Mint Visor)
      O: '#1A1320',
      S: '#C48A64', s: '#9E6B49',
      H: '#1F181B', h: '#3D3036',
      J: '#9E3B68', j: '#75294C',
      A: '#74CF9B', a: '#D2EFE0',
      U: '#FCFAF0', P: '#2B2329', B: '#1A1320', M: '#72C2D6'
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
