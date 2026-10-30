/* ============================================================================
   AEGIS // MESH — PROCEDURAL PIXEL-ART ENGINE + BFS PATHFINDER + FLOOR SCENE
   Warm 3-Shade Shaded Pixel-Art Character Renderer (18x28 Bust & 18x32 Walk)
   ============================================================================ */

(function () {
  const PORTRAIT_W = 18;
  const PORTRAIT_H = 28;
  const SCENE_W = 18;
  const SCENE_H = 32;
  const OUTLINE = [38, 34, 46];
  const HX0 = 4, HX1 = 13;

  let CUR_W = PORTRAIT_W, CUR_H = PORTRAIT_H;

  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
  function shades(rgb, dl = 1.22, dd = 0.68) {
    return [
      [clamp(rgb[0] * dl), clamp(rgb[1] * dl), clamp(rgb[2] * dl)],
      [rgb[0], rgb[1], rgb[2]],
      [clamp(rgb[0] * dd), clamp(rgb[1] * dd), clamp(rgb[2] * dd)],
    ];
  }

  function set(buf, x, y, c, a = 255) {
    if (x < 0 || x >= CUR_W || y < 0 || y >= CUR_H) return;
    const i = (y * CUR_W + x) * 4;
    buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = a;
  }
  function alphaAt(buf, x, y) {
    if (x < 0 || x >= CUR_W || y < 0 || y >= CUR_H) return 0;
    return buf[(y * CUR_W + x) * 4 + 3];
  }
  function rgbAt(buf, x, y) {
    const i = (y * CUR_W + x) * 4;
    return [buf[i], buf[i + 1], buf[i + 2]];
  }
  function eq(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  }
  function rect(buf, x0, y0, x1, y1, c) {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) set(buf, x, y, c);
    }
  }

  const SKIN = {
    light: { hi: [255, 221, 189], base: [247, 201, 170], sh: [212, 158, 126], line: [168, 112, 82] },
    tan:   { hi: [232, 182, 136], base: [214, 162, 116], sh: [176, 126, 86],  line: [138, 92, 60] },
    brown: { hi: [180, 130, 94],  base: [158, 112, 78],  sh: [124, 86, 58],   line: [90, 60, 40] },
    dark:  { hi: [142, 98, 70],   base: [120, 80, 56],   sh: [94, 62, 42],    line: [64, 42, 28] },
  };

  function drawHead(buf, skin) {
    const s = SKIN[skin];
    for (let y = 4; y <= 16; y++) {
      for (let x = HX0; x <= HX1; x++) {
        if (((x === HX0 || x === HX1) && (y === 4 || y === 5 || y === 16)) || ((x === 5 || x === 12) && y === 4)) continue;
        set(buf, x, y, s.base);
      }
    }
    for (let y = 6; y < 12; y++) set(buf, 5, y, s.hi);
    set(buf, 6, 5, s.hi); set(buf, 7, 5, s.hi);
    for (let y = 6; y < 15; y++) set(buf, 12, y, s.sh);
    for (const x of [7, 8, 9, 10, 11]) set(buf, x, 16, s.sh);
    for (const ex of [HX0 - 1, HX1 + 1]) {
      set(buf, ex, 9, s.base); set(buf, ex, 10, s.base); set(buf, ex, 11, s.sh);
    }
    rect(buf, 7, 17, 10, 18, s.sh);
    rect(buf, 7, 17, 9, 17, s.base);
  }

  function drawHeavyFace(buf, skin) {
    const s = SKIN[skin];
    for (let y = 11; y <= 15; y++) {
      set(buf, HX0 - 1, y, s.base); set(buf, HX1 + 1, y, s.base);
    }
    set(buf, HX0 - 1, 15, s.sh); set(buf, HX1 + 1, 15, s.sh);
    for (const x of [5, 6, 11, 12]) set(buf, x, 16, s.base);
    rect(buf, 6, 17, 11, 18, s.base);
    for (const x of [6, 7, 8, 9, 10, 11]) set(buf, x, 18, s.sh);
    set(buf, 7, 17, s.sh); set(buf, 10, 17, s.sh);
  }

  function drawFace(buf, skin, brow, mouth, blush, lashes = false) {
    const s = SKIN[skin];
    const white = [250, 248, 244], pup = [46, 38, 42];
    for (const [a, b, p] of [[5, 6, 6], [10, 11, 10]]) {
      set(buf, a, 9, white); set(buf, b, 9, white); set(buf, p, 9, pup);
    }
    if (lashes) {
      const lash = [54, 40, 48], glint = [252, 250, 248];
      for (const x of [5, 6, 10, 11]) set(buf, x, 8, lash);
      set(buf, 4, 8, lash); set(buf, 12, 8, lash);
      set(buf, 5, 9, glint); set(buf, 10, 9, glint);
    }
    if (brow === 'flat') for (const x of [5, 6, 10, 11]) set(buf, x, 7, s.line);
    else if (brow === 'angry') { set(buf, 5, 8, s.line); set(buf, 6, 7, s.line); set(buf, 10, 7, s.line); set(buf, 11, 8, s.line); }
    else if (brow === 'raised') for (const x of [5, 6, 10, 11]) set(buf, x, 6, s.line);
    else if (brow === 'soft') { for (const x of [5, 11]) set(buf, x, 7, s.line); for (const x of [6, 10]) set(buf, x, 7, s.sh); }
    set(buf, 8, 11, s.sh); set(buf, 8, 12, s.sh); set(buf, 7, 12, s.sh);
    const mc = [158, 86, 80];
    const mouths = {
      neutral: [[7, 14], [8, 14], [9, 14], [10, 14]],
      smile: [[7, 14], [8, 14], [9, 14], [10, 14], [6, 13], [11, 13]],
      frown: [[7, 15], [8, 15], [9, 15], [10, 15], [6, 14], [11, 14]],
      grin: [[7, 14], [8, 14], [9, 14], [10, 14], [7, 13], [8, 13], [9, 13], [10, 13], [6, 13], [11, 13]],
    };
    for (const [x, y] of mouths[mouth] || mouths.neutral) set(buf, x, y, mc);
    if (blush) for (const x of [5, 12]) set(buf, x, 12, [235, 150, 140], 140);
  }

  const HAIR_FNS = {
    styleShort(buf, color, skinBase, a) {
      const [hi, base, sh] = shades(color);
      const part = a.part ?? 'L', recede = a.recede ?? 0;
      rect(buf, HX0, 2, HX1, 4, base);
      for (let x = HX0 - 1; x <= HX1 + 1; x++) set(buf, x, 3, base);
      rect(buf, HX0 - 1, 4, HX1 + 1, 5, base);
      for (let y = 6; y < 9; y++) { set(buf, HX0 - 1, y, base); set(buf, HX0, y, base); set(buf, HX1, y, base); set(buf, HX1 + 1, y, base); }
      for (let x = HX0; x <= HX1; x++) set(buf, x, 5, base);
      if (recede) {
        for (let y = 3; y < 6; y++) for (let x = 6; x < 12; x++) if (eq(rgbAt(buf, x, y), base)) set(buf, x, y, skinBase);
        set(buf, 8, 5, base);
      }
      const hx = part === 'L' ? 6 : 11;
      for (let y = 2; y < 6; y++) set(buf, hx, y, sh);
      for (let x = HX0; x < hx; x++) if (alphaAt(buf, x, 3)) set(buf, x, 3, hi);
      for (let x = HX0; x <= HX1; x++) if (alphaAt(buf, x, 2)) set(buf, x, 2, hi);
    },
    styleFloppy(buf, color) {
      const [hi, base] = shades(color);
      rect(buf, HX0, 2, HX1, 4, base);
      for (let x = HX0 - 1; x <= HX1 + 1; x++) set(buf, x, 3, base);
      rect(buf, HX0 - 1, 4, HX1 + 1, 5, base);
      for (let x = HX0; x <= HX1; x++) set(buf, x, 5, base);
      for (let x = 6; x <= 12; x++) set(buf, x, 6, base);
      set(buf, 9, 7, base); set(buf, 10, 7, base); set(buf, 11, 7, base);
      for (let y = 6; y < 9; y++) { set(buf, HX0 - 1, y, base); set(buf, HX0, y, base); set(buf, HX1, y, base); set(buf, HX1 + 1, y, base); }
      for (let x = HX0; x <= HX1; x++) if (alphaAt(buf, x, 2)) set(buf, x, 2, hi);
      for (const x of [7, 8, 9]) set(buf, x, 6, hi);
    },
    styleFrame(buf, color, skinBase, a) {
      const [hi, base, sh] = shades(color);
      const length = a.length ?? 17, vol = a.vol ?? 1;
      rect(buf, HX0 - 1, 2, HX1 + 1, 5, base);
      for (let x = HX0 - 1; x <= HX1 + 1; x++) set(buf, x, 3, base);
      for (let x = HX0; x <= HX1; x++) set(buf, x, 5, base);
      for (let x = 6; x < 12; x++) set(buf, x, 6, base);
      set(buf, 8, 6, skinBase); set(buf, 9, 6, skinBase);
      for (let y = 6; y <= length; y++) {
        for (let dx = 0; dx < vol; dx++) { set(buf, HX0 - 1 - dx, y, base); set(buf, HX1 + 1 + dx, y, base); }
        set(buf, HX0, y, base); set(buf, HX1, y, base);
      }
      for (let x = HX0 - 1; x < HX0 + 1; x++) set(buf, x, length + 1, base);
      for (let x = HX1; x < HX1 + 2; x++) set(buf, x, length + 1, base);
      for (let y = 2; y < 6; y++) if (alphaAt(buf, HX1, y)) set(buf, HX1, y, sh);
      for (let x = HX0; x < 9; x++) if (alphaAt(buf, x, 2)) set(buf, x, 2, hi);
    },
    styleBun(buf, color, skinBase) {
      const [hi, base] = shades(color);
      rect(buf, HX0, 3, HX1, 5, base);
      for (let x = HX0 - 1; x <= HX1 + 1; x++) set(buf, x, 4, base);
      for (let x = HX0; x <= HX1; x++) set(buf, x, 5, base);
      for (let x = 6; x < 12; x++) set(buf, x, 6, base);
      set(buf, 8, 6, skinBase); set(buf, 9, 6, skinBase);
      for (let y = 6; y < 9; y++) { set(buf, HX0, y, base); set(buf, HX1, y, base); }
      rect(buf, 7, 1, 10, 2, base);
      for (let x = HX0; x <= HX1; x++) if (alphaAt(buf, x, 3)) set(buf, x, 3, hi);
    },
    styleRecede(buf, color, skinBase) {
      const [, base, sh] = shades(color);
      for (let y = 4; y < 10; y++) { set(buf, HX0 - 1, y, base); set(buf, HX0, y, base); set(buf, HX1, y, base); set(buf, HX1 + 1, y, base); }
      for (let x = HX0; x <= HX1; x++) set(buf, x, 4, base);
      for (let x = HX0 + 1; x < HX1; x++) set(buf, x, 5, base);
      for (let y = 5; y < 9; y++) for (let x = 6; x < 12; x++) if (eq(rgbAt(buf, x, y), base)) set(buf, x, y, skinBase);
      for (let x = HX0; x <= HX1; x++) if (alphaAt(buf, x, 4)) set(buf, x, 4, sh);
    },
    styleSpiky(buf, color, skinBase) {
      const [hi, base] = shades(color);
      rect(buf, HX0, 3, HX1, 5, base);
      for (let x = HX0 - 1; x <= HX1 + 1; x++) set(buf, x, 4, base);
      for (let x = HX0; x <= HX1; x++) set(buf, x, 5, base);
      const spikes = [[5, 2], [7, 1], [9, 2], [11, 1], [6, 2], [8, 2], [10, 2], [12, 2]];
      for (const [x, y] of spikes) set(buf, x, y, base);
      for (let x = 6; x < 12; x++) set(buf, x, 6, base);
      set(buf, 8, 6, skinBase); set(buf, 9, 6, skinBase);
      for (let y = 6; y < 8; y++) { set(buf, HX0, y, base); set(buf, HX1, y, base); }
      for (const [x, y] of spikes) set(buf, x, y, hi);
    }
  };

  function drawFacial(buf, kind, color) {
    const [, base, sh] = shades(color);
    if (kind === 'mustache') {
      for (const x of [6, 7, 8, 9, 10]) set(buf, x, 13, base);
      set(buf, 6, 12, base); set(buf, 10, 12, base);
    } else if (kind === 'stubble') {
      for (const [x, y] of [[5, 14], [6, 15], [7, 15], [8, 15], [9, 15], [10, 15], [11, 14], [12, 13], [4, 13], [5, 15], [10, 15]]) {
        set(buf, x, y, sh, 150);
      }
    }
  }

  function drawGlasses(buf) {
    const frame = [60, 54, 62];
    const glint = [236, 240, 246];
    for (const x of [5, 6]) { set(buf, x, 8, frame); set(buf, x, 10, frame); }
    set(buf, 4, 9, frame); set(buf, 7, 9, frame);
    set(buf, 4, 8, frame); set(buf, 7, 8, frame);
    for (const x of [10, 11]) { set(buf, x, 8, frame); set(buf, x, 10, frame); }
    set(buf, 9, 9, frame); set(buf, 12, 9, frame);
    set(buf, 9, 8, frame); set(buf, 12, 8, frame);
    set(buf, 8, 8, frame);
    set(buf, 3, 9, frame); set(buf, 13, 9, frame);
    set(buf, 4, 8, glint); set(buf, 9, 8, glint);
  }

  function bodyShape(buf, col, heavy = false) {
    const [, base, sh] = shades(col);
    const rows = heavy
      ? [[19, 5, 12], [20, 3, 14], [21, 2, 15], [22, 1, 16], [23, 1, 16], [24, 0, 17], [25, 0, 17], [26, 0, 17], [27, 0, 17]]
      : [[19, 6, 11], [20, 4, 13], [21, 3, 14], [22, 2, 15], [23, 2, 15], [24, 1, 16], [25, 1, 16], [26, 1, 16], [27, 1, 16]];
    for (const [y, a, b] of rows) rect(buf, a, y, b, y, base);
    const [lo, hi] = heavy ? [1, 16] : [2, 15];
    for (let y = 22; y < 28; y++) { set(buf, lo, y, sh); set(buf, hi, y, sh); }
  }

  function drawClothing(buf, kind, c1, c2, tie, skin, heavy = false) {
    const [hi, base, sh] = shades(c1);
    bodyShape(buf, c1, heavy);
    if (kind === 'suit') {
      const white = [238, 238, 236];
      for (const [x, y] of [[8, 19], [9, 19], [7, 20], [8, 20], [9, 20], [10, 20], [8, 21], [9, 21]]) set(buf, x, y, white);
      for (const [x, y] of [[6, 20], [7, 21], [11, 20], [10, 21], [6, 21], [11, 21]]) set(buf, x, y, sh);
      if (tie) { for (let y = 20; y < 26; y++) { set(buf, 8, y, tie); set(buf, 9, y, tie); } set(buf, 8, 20, shades(tie)[0]); }
      else for (let y = 22; y < 26; y++) { set(buf, 8, y, white); set(buf, 9, y, white); }
    } else if (kind === 'dressshirt') {
      for (const [x, y] of [[6, 19], [7, 19], [10, 19], [11, 19], [7, 20], [10, 20]]) set(buf, x, y, sh);
      for (let y = 20; y < 27; y += 2) set(buf, 8, y, sh);
      if (tie) for (let y = 19; y < 26; y++) { set(buf, 8, y, tie); set(buf, 9, y, tie); }
    } else if (kind === 'cardigan') {
      const inner = c2 ? shades(c2)[1] : [235, 233, 226];
      for (let y = 19; y < 27; y++) { set(buf, 8, y, inner); set(buf, 9, y, inner); }
      for (const [x, y] of [[6, 19], [7, 19], [10, 19], [11, 19]]) set(buf, x, y, sh);
    } else if (kind === 'sweater') {
      for (const [x, y] of [[6, 19], [7, 19], [8, 19], [9, 19], [10, 19], [11, 19]]) set(buf, x, y, sh);
    }
  }

  function collarNeck(buf, skin) {
    rect(buf, 7, 18, 10, 19, SKIN[skin].sh);
  }

  const SHOE = [44, 40, 48];
  function drawSceneLegs(buf, pants, phase) {
    const [, base, sh] = shades(pants);
    for (const [lx0, lx1] of [[5, 7], [10, 12]]) {
      rect(buf, lx0, 25, lx1, 30, base);
      for (let y = 25; y <= 30; y++) set(buf, lx1, y, sh);
    }
    const leftLow = phase !== 1, rightLow = phase !== 2;
    rect(buf, 5, leftLow ? 31 : 30, 7, leftLow ? 31 : 30, SHOE);
    rect(buf, 10, rightLow ? 31 : 30, 12, rightLow ? 31 : 30, SHOE);
  }

  function drawSceneTorso(buf, r, back) {
    const [, base, sh] = shades(r.c1);
    if (r.heavy) {
      rect(buf, 3, 18, 14, 18, base);
      rect(buf, 2, 19, 15, 19, base);
      rect(buf, 2, 20, 15, 24, base);
      for (let y = 20; y <= 24; y++) { set(buf, 2, y, sh); set(buf, 15, y, sh); set(buf, 14, y, sh); }
    } else {
      rect(buf, 4, 18, 13, 18, base);
      rect(buf, 3, 19, 14, 19, base);
      rect(buf, 4, 20, 13, 24, base);
      for (let y = 20; y <= 24; y++) { set(buf, 3, y, sh); set(buf, 14, y, sh); set(buf, 13, y, sh); }
    }
    if (back) {
      rect(buf, 6, 18, 11, 18, sh);
      for (let y = 19; y <= 24; y++) set(buf, 8, y, sh);
      return;
    }
    if (r.cloth === 'suit') {
      const white = [238, 238, 236];
      for (const [x, y] of [[8, 18], [9, 18], [7, 19], [8, 19], [9, 19], [10, 19], [8, 20], [9, 20]]) set(buf, x, y, white);
      for (const [x, y] of [[6, 19], [7, 20], [11, 19], [10, 20]]) set(buf, x, y, sh);
      if (r.tie) { for (let y = 19; y <= 24; y++) { set(buf, 8, y, r.tie); set(buf, 9, y, r.tie); } set(buf, 8, 19, shades(r.tie)[0]); }
    } else if (r.cloth === 'dressshirt') {
      for (const [x, y] of [[6, 18], [7, 18], [10, 18], [11, 18], [7, 19], [10, 19]]) set(buf, x, y, sh);
      if (r.tie) for (let y = 18; y <= 24; y++) { set(buf, 8, y, r.tie); set(buf, 9, y, r.tie); }
      else for (let y = 20; y <= 24; y += 2) set(buf, 8, y, sh);
    } else if (r.cloth === 'cardigan') {
      const inner = r.c2 ? shades(r.c2)[1] : [235, 233, 226];
      for (let y = 18; y <= 24; y++) { set(buf, 8, y, inner); set(buf, 9, y, inner); }
      for (const [x, y] of [[6, 18], [7, 18], [10, 18], [11, 18]]) set(buf, x, y, sh);
    } else if (r.cloth === 'sweater') {
      for (const [x, y] of [[6, 18], [7, 18], [8, 18], [9, 18], [10, 18], [11, 18]]) set(buf, x, y, sh);
    }
  }

  function outlinePass(buf) {
    const pts = [];
    for (let y = 0; y < CUR_H; y++) {
      for (let x = 0; x < CUR_W; x++) {
        if (alphaAt(buf, x, y) !== 0) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (alphaAt(buf, x + dx, y + dy) === 255) { pts.push([x, y]); break; }
        }
      }
    }
    for (const [x, y] of pts) set(buf, x, y, OUTLINE);
  }

  // Warm, Muted Natural Recipes for the 8 AEGIS // MESH Specialists (Zero Neon)
  const RECIPES = {
    vex:    { skin: 'light', hairc: [58, 42, 28],   hair: 'styleShort',  hairargs: { part: 'L' }, cloth: 'suit',       c1: [58, 63, 74],    tie: [170, 58, 58],  brow: 'flat',  mouth: 'smile' },
    cipher: { skin: 'light', hairc: [64, 48, 28],   hair: 'styleShort',  hairargs: { part: 'R' }, cloth: 'dressshirt', c1: [184, 155, 62],  tie: [120, 82, 46],  glasses: true, brow: 'flat',  mouth: 'neutral' },
    kael:   { skin: 'light', hairc: [92, 60, 34],   hair: 'styleFloppy',                          cloth: 'dressshirt', c1: [172, 196, 224], tie: [120, 130, 150], brow: 'flat',  mouth: 'smile' },
    lyra:   { skin: 'light', hairc: [120, 76, 42],  hair: 'styleFrame',  hairargs: { length: 18, vol: 2 }, cloth: 'cardigan', c1: [116, 156, 142], c2: [244, 242, 238], brow: 'soft', mouth: 'smile', blush: true, lashes: true },
    drake:  { skin: 'light', hairc: [42, 32, 24],   hair: 'styleSpiky',                           cloth: 'suit',       c1: [68, 64, 76],    tie: [148, 96, 54],  facial: 'stubble', brow: 'angry', mouth: 'neutral' },
    nyx:    { skin: 'light', hairc: [186, 154, 90], hair: 'styleBun',                             cloth: 'cardigan',   c1: [150, 146, 170], c2: [235, 233, 226], brow: 'flat',  mouth: 'neutral', lashes: true },
    orion:  { skin: 'dark',  hairc: [60, 54, 48],   hair: 'styleRecede',                          cloth: 'dressshirt', c1: [150, 120, 86],  tie: [120, 78, 52],  glasses: true, facial: 'mustache', brow: 'flat', mouth: 'neutral', heavy: true },
    sora:   { skin: 'tan',   hairc: [28, 22, 18],   hair: 'styleShort',  hairargs: { part: 'L' }, cloth: 'sweater',    c1: [122, 60, 74],   brow: 'flat',  mouth: 'smile' },
  };

  function drawHeadGroup(buf, r) {
    const skinBase = SKIN[r.skin].base;
    drawHead(buf, r.skin);
    if (r.heavy) drawHeavyFace(buf, r.skin);
    drawFace(buf, r.skin, r.brow ?? 'flat', r.mouth ?? 'neutral', r.blush ?? false, r.lashes ?? false);
    if (r.facial) drawFacial(buf, r.facial, r.hairc);
    HAIR_FNS[r.hair](buf, r.hairc, skinBase, r.hairargs ?? {});
    if (r.glasses) drawGlasses(buf);
  }

  function defaultPants(r) {
    return r.cloth === 'suit' ? shades(r.c1)[2] : [54, 56, 70];
  }

  function composePortrait(r) {
    CUR_W = PORTRAIT_W; CUR_H = PORTRAIT_H;
    const buf = new Uint8ClampedArray(PORTRAIT_W * PORTRAIT_H * 4);
    drawClothing(buf, r.cloth, r.c1, r.c2, r.tie, r.skin, r.heavy ?? false);
    collarNeck(buf, r.skin);
    drawHeadGroup(buf, r);
    outlinePass(buf);
    return buf;
  }

  function composeScene(r, phase) {
    CUR_W = SCENE_W; CUR_H = SCENE_H;
    const buf = new Uint8ClampedArray(SCENE_W * SCENE_H * 4);
    drawSceneTorso(buf, r, false);
    drawSceneLegs(buf, defaultPants(r), phase);
    drawHeadGroup(buf, r);
    outlinePass(buf);
    return buf;
  }

  const portraitCanvasCache = new Map();
  const sceneCanvasCache = new Map();

  function bufToCanvas(buf, w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h);
    img.data.set(buf);
    ctx.putImageData(img, 0, 0);
    return c;
  }

  function getPortraitCanvas(name) {
    if (!portraitCanvasCache.has(name)) {
      const r = RECIPES[name] || RECIPES.vex;
      portraitCanvasCache.set(name, bufToCanvas(composePortrait(r), PORTRAIT_W, PORTRAIT_H));
    }
    return portraitCanvasCache.get(name);
  }

  function getSceneFrames(name) {
    if (!sceneCanvasCache.has(name)) {
      const r = RECIPES[name] || RECIPES.vex;
      sceneCanvasCache.set(name, [
        bufToCanvas(composeScene(r, 0), SCENE_W, SCENE_H),
        bufToCanvas(composeScene(r, 1), SCENE_W, SCENE_H),
        bufToCanvas(composeScene(r, 2), SCENE_W, SCENE_H),
      ]);
    }
    return sceneCanvasCache.get(name);
  }

  function paintPortraitToCanvas(canvasEl, name) {
    if (!canvasEl) return;
    const src = getPortraitCanvas(name);
    canvasEl.width = PORTRAIT_W * 2;
    canvasEl.height = PORTRAIT_H * 2;
    const ctx = canvasEl.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    ctx.drawImage(src, 0, 0, PORTRAIT_W, PORTRAIT_H, 0, 0, canvasEl.width, canvasEl.height);
  }

  // BFS Pathfinding on 24x14 tile grid
  function findPath(sx, sy, gx, gy, gridW = 24, gridH = 14) {
    const start = { x: Math.round(sx), y: Math.round(sy) };
    const goal = { x: Math.round(gx), y: Math.round(gy) };
    if (start.x === goal.x && start.y === goal.y) return [];
    const key = (p) => `${p.x},${p.y}`;
    const visited = new Set([key(start)]);
    const parent = new Map();
    const queue = [start];
    const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];

    while (queue.length > 0) {
      const cur = queue.shift();
      for (const d of dirs) {
        const nx = cur.x + d.x, ny = cur.y + d.y;
        const nk = `${nx},${ny}`;
        if (nx < 1 || nx >= gridW - 1 || ny < 1 || ny >= gridH - 1) continue;
        if (visited.has(nk)) continue;
        visited.add(nk);
        parent.set(nk, cur);
        if (nx === goal.x && ny === goal.y) {
          const path = [];
          let p = goal;
          while (!(p.x === start.x && p.y === start.y)) {
            path.unshift(p);
            p = parent.get(key(p));
          }
          return path;
        }
        queue.push({ x: nx, y: ny });
      }
    }
    return [goal];
  }

  window.AegisSprites = {
    PORTRAIT_W,
    PORTRAIT_H,
    SCENE_W,
    SCENE_H,
    getPortraitCanvas,
    getSceneFrames,
    paintPortraitToCanvas,
    findPath,
  };
})();
