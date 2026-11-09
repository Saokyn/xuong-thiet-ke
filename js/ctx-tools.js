// Shared helpers for contextual toolbar + unified color panel (Node-testable).
(function (root) {
  const FONT_MIN = 4, FONT_MAX = 800;
  const RECENT_KEY = 'xtk-recent-colors', RECENT_MAX = 12;
  const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const clampFont = v => clamp(Math.round(+v || FONT_MIN), FONT_MIN, FONT_MAX);
  const clampAngle = v => { let a = ((+v || 0) % 360 + 360) % 360; return a; }; // 0–360 (360 → 0)
  const clampOpacity = v => clamp(+v || 0, 0, 1);

  function normHex(h) {
    if (!h || typeof h !== 'string') return null;
    let s = h.trim().toLowerCase();
    if (!HEX_RE.test(s)) return null;
    if (s.length === 4) s = '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
    return s;
  }
  const validateHex = h => !!normHex(h);

  // Displayed text size = fontSize * scaleY (matches floating bar). Setting bakes scale → 1.
  function getDisplayFontSize(o) {
    if (!o || !/text/i.test(o.type)) return null;
    return (o.fontSize || 0) * Math.abs(o.scaleY || 1);
  }
  function setDisplayFontSize(o, displayPx) {
    if (!o || !/text/i.test(o.type)) return false;
    const v = clampFont(displayPx);
    const sx = Math.abs(o.scaleX || 1), sy = Math.abs(o.scaleY || 1);
    const ratio = sy ? sx / sy : 1;
    o.set({ fontSize: v, scaleX: ratio, scaleY: 1 });
    if (o.initDimensions) o.initDimensions();
    o.dirty = true; o.setCoords && o.setCoords();
    return true;
  }

  // ---------- recent colors ----------
  function loadRecent(store) {
    try {
      const raw = (store || (typeof localStorage !== 'undefined' ? localStorage : null))?.getItem(RECENT_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.map(normHex).filter(Boolean).slice(0, RECENT_MAX) : [];
    } catch (e) { return []; }
  }
  function pushRecent(hex, store) {
    const c = normHex(hex); if (!c) return loadRecent(store);
    const s = store || (typeof localStorage !== 'undefined' ? localStorage : null);
    let arr = loadRecent(s).filter(x => x !== c);
    arr.unshift(c); if (arr.length > RECENT_MAX) arr = arr.slice(0, RECENT_MAX);
    try { s && s.setItem(RECENT_KEY, JSON.stringify(arr)); } catch (e) { }
    return arr;
  }

  // ---------- document colors (solid fills/strokes/bg only) ----------
  const isSolidStr = v => typeof v === 'string' && /^#|^rgb/i.test(v) && !/^(transparent|none)$/i.test(String(v).trim());
  function extractDocumentColors(canvas) {
    const set = new Set();
    const add = v => { const h = normHex(v) || (isSolidStr(v) ? null : null); if (normHex(v)) set.add(normHex(v)); else if (isSolidStr(v) && /^#/.test(v)) set.add(normHex(v.slice(0, 7))); };
    const addRaw = v => { const h = normHex(typeof v === 'string' ? v.slice(0, 7) : v); if (h) set.add(h); };
    if (canvas && typeof canvas.backgroundColor === 'string') addRaw(canvas.backgroundColor);
    function walk(o) {
      if (!o || o.name === '__bg') return;
      if (o.type === 'group' && !(o.xtk && o.xtk.curved)) { (o.getObjects ? o.getObjects() : o._objects || []).forEach(walk); return; }
      if (o.type === 'image' || (o.xtk && o.xtk.composite)) return;
      if (typeof o.fill === 'object' && o.fill) return; // pattern/gradient
      if (isSolidStr(o.fill)) addRaw(o.fill);
      if (isSolidStr(o.stroke)) addRaw(o.stroke);
      if (isSolidStr(o.backgroundColor)) addRaw(o.backgroundColor);
      if (o.shadow && isSolidStr(o.shadow.color)) addRaw(o.shadow.color);
    }
    (canvas && canvas.getObjects ? canvas.getObjects() : []).forEach(walk);
    return [...set];
  }

  // Can this target receive a solid color?
  function colorTargetBlocked(target, obj) {
    if (!target) return 'Không có mục tiêu màu.';
    if (target === 'bg') return null;
    if (!obj) return 'Chưa chọn đối tượng.';
    if (obj.type === 'image') return 'Ảnh không tô màu đặc — dùng bộ lọc hoặc Lồng ảnh.';
    if (obj.xtk && obj.xtk.composite) {
      if (target === 'stroke') return null; // viền vẫn chỉnh được khi đang Lồng ảnh
      return 'Đối tượng đang chứa ảnh — “Tách ảnh” trước khi đổi màu.';
    }
    if (target === 'fill' && obj.fill && typeof obj.fill === 'object') {
      const isGrad = Array.isArray(obj.fill.colorStops);
      const isPat = !isGrad && (obj.fill.patternTransform || obj.fill.type === 'pattern' || obj.fill.source != null);
      if (isPat) return 'Đang dùng hoa văn / Lồng ảnh — Tách ảnh trước.';
      return 'Đang dùng chuyển sắc/hoa văn — tắt trước hoặc chọn mục khác.';
    }
    return null;
  }

  // Apply a solid color to a named target. Returns { ok, error }. Does NOT snapshot (caller does).
  function applyColorTarget(target, hex, ctx) {
    const c = normHex(hex); if (!c) return { ok: false, error: 'Mã màu không hợp lệ.' };
    const canvas = ctx.canvas, obj = ctx.obj;
    const block = colorTargetBlocked(target, target === 'bg' ? null : obj);
    if (block) return { ok: false, error: block };
    if (target === 'bg') {
      if (ctx.setBg) ctx.setBg(c);
      else { const r = canvas.getObjects().find(o => o.name === '__bg'); if (r) canvas.remove(r); canvas.backgroundColor = c; }
      return { ok: true, color: c };
    }
    if (!obj) return { ok: false, error: 'Chưa chọn đối tượng.' };
    const targets = obj.type === 'activeSelection' ? obj.getObjects() : [obj];
    targets.forEach(t => {
      if (t.type === 'image') return;
      if (t.xtk && t.xtk.composite && target !== 'stroke') return;
      if (t.type === 'group' && !(t.xtk && t.xtk.curved)) {
        (t.getObjects ? t.getObjects() : []).forEach(ch => applyChild(ch, target, c));
        t.dirty = true; return;
      }
      applyChild(t, target, c);
    });
    return { ok: true, color: c };
  }
  function applyChild(t, target, c) {
    if (t.type === 'image' || (t.xtk && t.xtk.composite)) return;
    if (typeof t.fill === 'object' && t.fill && target === 'fill') return;
    if (target === 'fill' || target === 'text') {
      if (t.type === 'line' || (t.type === 'path' && !t.fill)) t.set('stroke', c);
      else t.set('fill', c);
    } else if (target === 'stroke') {
      t.set('stroke', c); if (!t.strokeWidth) t.set('strokeWidth', 2);
    } else if (target === 'textBg') {
      if (/text/i.test(t.type)) t.set('backgroundColor', c);
    } else if (target === 'shadow') {
      const sh = t.shadow || {}; t.set('shadow', new (root.fabric || fabric).Shadow({ color: c, blur: sh.blur || 8, offsetX: sh.offsetX || 4, offsetY: sh.offsetY || 4 }));
    }
    t.dirty = true;
  }

  // Multi-select: set opacity / solid fill on eligible children
  function applyMulti(objs, prop, value) {
    const list = [];
    function walk(o) {
      if (!o || o.name === '__bg' || (o.xtk && o.xtk.locked)) return;
      if (o.type === 'group' && !(o.xtk && o.xtk.curved)) { (o.getObjects ? o.getObjects() : []).forEach(walk); return; }
      list.push(o);
    }
    objs.forEach(walk);
    list.forEach(o => {
      if (prop === 'opacity') o.set('opacity', clampOpacity(value));
      else if (prop === 'fill') {
        if (o.type === 'image' || (o.xtk && o.xtk.composite) || (o.fill && typeof o.fill === 'object')) return;
        if (o.type === 'line' || (o.type === 'path' && !o.fill)) o.set('stroke', value);
        else if (typeof o.fill === 'string' || o.fill == null) o.set('fill', value);
      }
      o.dirty = true;
    });
    return list.length;
  }

  
  // Stroke style ↔ Fabric strokeDashArray (scaled by stroke width), matching js/fx.js line presets
  function strokeStyleOf(o) {
    const d = o && o.strokeDashArray, w = Math.max(1, o && o.strokeWidth || 1);
    if (!d || !d.length) return 'solid';
    // dotted often uses [0, gap] or very small dash
    if (d[0] === 0 || d[0] < w * 0.5) return 'dot';
    return 'dash';
  }
  function dashForStyle(style, strokeWidth) {
    const w = Math.max(1, +strokeWidth || 1);
    if (style === 'dash') return [w * 4, w * 3];
    if (style === 'dot') return [0, w * 2.5];
    return null;
  }
  function applyStrokeStyle(o, style) {
    if (!o) return false;
    const w = o.strokeWidth || 1;
    const patch = { strokeDashArray: dashForStyle(style, w), strokeLineCap: style === 'dot' ? 'round' : (o.strokeLineCap || 'butt') };
    if (typeof o.set === 'function') o.set(patch); else Object.assign(o, patch);
    o.dirty = true; return true;
  }
  // Keep dash pattern in sync when width changes
  function syncDashToWidth(o) {
    if (!o || !o.strokeDashArray || !o.strokeDashArray.length) return;
    applyStrokeStyle(o, strokeStyleOf(o));
  }

  // Image corner radius as percent 0–50 of min side (stored xtk.rad as px via FX.setClip)
  function getImageRadiusPct(o) {
    if (!o || o.type !== 'image') return 0;
    if (o.xtk && o.xtk.shape === 'round' && o.xtk.rad) {
      const m = Math.min(o.getScaledWidth ? o.getScaledWidth() : o.width * (o.scaleX || 1), o.getScaledHeight ? o.getScaledHeight() : o.height * (o.scaleY || 1));
      return m ? Math.round(o.xtk.rad / m * 100) : 0;
    }
    return 0;
  }

  // Numeric field defaults / clamps used by Thuộc tính
  const NUM = {
    left: { min: -20000, max: 20000, step: 1, unit: 'px', def: 0 },
    top: { min: -20000, max: 20000, step: 1, unit: 'px', def: 0 },
    scaleX: { min: 0.01, max: 20, step: 0.01, unit: '×', def: 1 },
    scaleY: { min: 0.01, max: 20, step: 0.01, unit: '×', def: 1 },
    angle: { min: 0, max: 360, step: 1, unit: '°', def: 0 },
    opacity: { min: 0, max: 100, step: 1, unit: '%', def: 100 },
    fontSizeDisp: { min: FONT_MIN, max: FONT_MAX, step: 1, unit: 'px', def: 40 },
    charSpacing: { min: -100, max: 1200, step: 10, unit: '', def: 0 },
    lineHeight: { min: 0.7, max: 2.5, step: 0.05, unit: '', def: 1.16 },
    strokeWidth: { min: 0, max: 80, step: 1, unit: 'px', def: 0 },
    rx: { min: 0, max: 2000, step: 1, unit: 'px', def: 0 },
    shBlur: { min: 0, max: 100, step: 1, unit: '', def: 20 },
    shOff: { min: -50, max: 50, step: 1, unit: '', def: 8 },
    textStrokeW: { min: 0, max: 40, step: 1, unit: '', def: 6 },
    imgRad: { min: 0, max: 50, step: 1, unit: '%', def: 0 },
    widthPx: { min: 1, max: 20000, step: 1, unit: 'px', def: 100 },
    heightPx: { min: 1, max: 20000, step: 1, unit: 'px', def: 100 }
  };
  function clampNum(key, v) {
    const n = NUM[key]; if (!n) return +v;
    return clamp(+v, n.min, n.max);
  }


  // Pixel size from Fabric object (getScaledWidth/Height)
  function getPixelSize(o) {
    if (!o) return { w: 0, h: 0 };
    const w = typeof o.getScaledWidth === 'function' ? o.getScaledWidth() : (o.width || 0) * Math.abs(o.scaleX || 1);
    const h = typeof o.getScaledHeight === 'function' ? o.getScaledHeight() : (o.height || 0) * Math.abs(o.scaleY || 1);
    return { w: Math.round(Math.abs(w)), h: Math.round(Math.abs(h)) };
  }
  function setPixelSize(o, dim, value, lockRatio) {
    if (!o) return false;
    const v = Math.max(1, Math.round(+value || 1));
    const baseW = Math.max(1e-6, Math.abs(o.width || 1));
    const baseH = Math.max(1e-6, Math.abs(o.height || 1));
    if (dim === 'width' || dim === 'w') {
      const sx = v / baseW;
      if (lockRatio) {
        const cur = getPixelSize(o); const ratio = cur.w ? cur.h / cur.w : 1;
        o.set({ scaleX: sx, scaleY: (v * ratio) / baseH });
      } else if (typeof o.set === 'function') o.set('scaleX', sx); else o.scaleX = sx;
    } else {
      const sy = v / baseH;
      if (lockRatio) {
        const cur = getPixelSize(o); const ratio = cur.h ? cur.w / cur.h : 1;
        o.set({ scaleY: sy, scaleX: (v * ratio) / baseW });
      } else if (typeof o.set === 'function') o.set('scaleY', sy); else o.scaleY = sy;
    }
    if (o.setCoords) o.setCoords();
    o.dirty = true; return true;
  }

  /**
   * Clamp popover top-left inside host. When content is taller/wider than the host,
   * use effective size min(requested, host-2*margin) so Y/X are not locked to a single value.
   * Returns {x,y,maxW,maxH,effW,effH}.
   */
  function clampPopPos(hostW, hostH, x, y, pw, ph, margin) {
    margin = margin == null ? 8 : margin;
    hostW = +hostW || 0; hostH = +hostH || 0;
    const maxW = Math.max(40, hostW - margin * 2);
    const maxH = Math.max(80, hostH - margin * 2);
    const effW = Math.min(Math.max(+pw || 0, 40), maxW);
    const effH = Math.min(Math.max(+ph || 0, 80), maxH);
    const xMax = Math.max(margin, hostW - effW - margin);
    const yMax = Math.max(margin, hostH - effH - margin);
    return {
      x: Math.min(xMax, Math.max(margin, +x || 0)),
      y: Math.min(yMax, Math.max(margin, +y || 0)),
      maxW, maxH, effW, effH
    };
  }

  // Place a popover box (pw×ph) in host (hw×hh) avoiding object rect (ox,oy,ow,oh) — all same coordinate space.
  // Returns {x,y} top-left. Prefers right of object, then left, then below, then host edge.
  function placeAvoiding(hostW, hostH, pw, ph, ox, oy, ow, oh, margin) {
    margin = margin == null ? 8 : margin;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const fits = (x, y) => x >= margin && y >= margin && x + pw <= hostW - margin && y + ph <= hostH - margin;
    const overlaps = (x, y) => !(x + pw <= ox || x >= ox + ow || y + ph <= oy || y >= oy + oh);
    const cands = [
      { x: ox + ow + margin, y: oy },                 // right
      { x: ox - pw - margin, y: oy },                 // left
      { x: ox, y: oy + oh + margin },                 // below
      { x: ox, y: oy - ph - margin },                 // above
      { x: hostW - pw - margin, y: oy },              // dock right edge
      { x: margin, y: oy },                           // dock left edge
      { x: hostW - pw - margin, y: hostH - ph - margin },
      { x: margin, y: margin }
    ];
    for (const c of cands) {
      const x = clamp(c.x, margin, Math.max(margin, hostW - pw - margin));
      const y = clamp(c.y, margin, Math.max(margin, hostH - ph - margin));
      if (fits(x, y) && !overlaps(x, y)) return { x: Math.round(x), y: Math.round(y) };
    }
    // last resort: dock top-right of host (toolbar side), even if slight overlap
    return { x: Math.round(hostW - pw - margin), y: Math.round(margin) };
  }

  const api = {
    FONT_MIN, FONT_MAX, RECENT_MAX, RECENT_KEY,
    clamp, clampFont, clampAngle, clampOpacity, normHex, validateHex,
    strokeStyleOf, dashForStyle, applyStrokeStyle, syncDashToWidth, getImageRadiusPct, NUM, clampNum,
    getPixelSize, setPixelSize, placeAvoiding, clampPopPos,
    getDisplayFontSize, setDisplayFontSize,
    loadRecent, pushRecent, extractDocumentColors,
    colorTargetBlocked, applyColorTarget, applyMulti, isSolidStr
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.XTK_CTX = api;
})(typeof window !== 'undefined' ? window : globalThis);
