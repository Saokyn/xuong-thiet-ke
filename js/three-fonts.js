// Opentype → THREE.Shape (Vietnamese glyphs + holes). file:// uses embedded base64 scripts.
(function (root) {
  'use strict';
  const FONTS = [
    { id: 'playfair', label: 'Playfair Display', file: 'vendor/fonts-3d/PlayfairDisplay.ttf', embed: 'vendor/fonts-3d/data/playfair.js', style: 'serif' },
    { id: 'lora', label: 'Lora', file: 'vendor/fonts-3d/Lora.ttf', embed: 'vendor/fonts-3d/data/lora.js', style: 'serif' },
    { id: 'bevietnam', label: 'Be Vietnam Pro', file: 'vendor/fonts-3d/BeVietnamPro-Bold.ttf', embed: 'vendor/fonts-3d/data/bevietnam.js', style: 'sans' },
    { id: 'nunito', label: 'Nunito', file: 'vendor/fonts-3d/Nunito.ttf', embed: 'vendor/fonts-3d/data/nunito.js', style: 'rounded' },
    { id: 'baloo', label: 'Baloo 2', file: 'vendor/fonts-3d/Baloo2.ttf', embed: 'vendor/fonts-3d/data/baloo.js', style: 'display' },
    { id: 'montserrat', label: 'Montserrat', file: 'vendor/fonts-3d/Montserrat.ttf', embed: 'vendor/fonts-3d/data/montserrat.js', style: 'sans' },
    { id: 'comfortaa', label: 'Comfortaa', file: 'vendor/fonts-3d/Comfortaa.ttf', embed: 'vendor/fonts-3d/data/comfortaa.js', style: 'rounded' }
  ];
  const cache = Object.create(null);
  const loadStatus = Object.create(null); // id -> 'ok'|'error'|msg

  function ot() { return root.opentype; }
  function T() { return root.THREE; }

  function isFileProtocol() {
    try { return typeof location !== 'undefined' && location.protocol === 'file:'; } catch (e) { return false; }
  }

  function preferEmbed() {
    return !!(root.XTK_FORCE_FONT_EMBED || isFileProtocol());
  }

  function b64ToArrayBuffer(b64) {
    if (typeof Buffer !== 'undefined') {
      const buf = Buffer.from(b64, 'base64');
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    }
    const bin = (typeof atob === 'function' ? atob : root.atob)(b64);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  function parseFont(meta, buffer) {
    const font = ot().parse(buffer);
    const pack = { meta, font };
    cache[meta.id] = pack;
    loadStatus[meta.id] = 'ok';
    return pack;
  }

  function loadFontEmbed(meta) {
    return new Promise((resolve, reject) => {
      const fail = (msg) => {
        loadStatus[meta.id] = msg || 'error';
        reject(new Error(msg || ('Không tải được font "' + meta.label + '".')));
      };
      const finish = () => {
        const b64 = root.XTK_FONT_DATA && root.XTK_FONT_DATA[meta.id];
        if (!b64) return fail('Thiếu dữ liệu font nhúng "' + meta.label + '" (XTK_FONT_DATA.' + meta.id + ').');
        try { resolve(parseFont(meta, b64ToArrayBuffer(b64))); }
        catch (e) { fail('Lỗi phân tích font "' + meta.label + '": ' + (e.message || e)); }
      };
      if (root.XTK_FONT_DATA && root.XTK_FONT_DATA[meta.id]) return finish();
      if (typeof document === 'undefined' || !document.createElement) {
        // Node unit: read embed file if fs available
        try {
          const fs = require('fs');
          const path = require('path');
          const p = path.join(__dirname, '..', meta.embed);
          // eslint-disable-next-line no-new-func
          const code = fs.readFileSync(p, 'utf8');
          const sandbox = root;
          // run in current root
          (0, eval)(code);
          return finish();
        } catch (e) { return fail('Node embed: ' + e.message); }
      }
      const existing = document.querySelector('script[data-xtk-font="' + meta.id + '"]');
      if (existing) {
        existing.addEventListener('load', finish);
        existing.addEventListener('error', () => fail('Không tải script font "' + meta.label + '".'));
        if (root.XTK_FONT_DATA && root.XTK_FONT_DATA[meta.id]) finish();
        return;
      }
      const s = document.createElement('script');
      s.src = meta.embed;
      s.async = true;
      s.setAttribute('data-xtk-font', meta.id);
      s.onload = finish;
      s.onerror = () => fail('Không tải được font "' + meta.label + '" qua file://. Kiểm tra ' + meta.embed);
      document.head.appendChild(s);
    });
  }

  function loadFontFetch(meta) {
    return fetch(meta.file).then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.arrayBuffer();
    }).then(buf => parseFont(meta, buf));
  }

  function loadFontXHR(meta) {
    return new Promise((resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', meta.file, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => {
          if (xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300)) {
            try { resolve(parseFont(meta, xhr.response)); }
            catch (e) { reject(e); }
          } else reject(new Error('XHR ' + xhr.status));
        };
        xhr.onerror = () => reject(new Error('XHR error'));
        xhr.send();
      } catch (e) { reject(e); }
    });
  }

  function loadFont(id) {
    const meta = FONTS.find(f => f.id === id) || FONTS[0];
    if (cache[meta.id]) return Promise.resolve(cache[meta.id]);
    if (preferEmbed()) return loadFontEmbed(meta);
    // http(s): fetch, then XHR, then embed
    return loadFontFetch(meta).catch(() => loadFontXHR(meta)).catch(() => loadFontEmbed(meta));
  }

  function pathToShapes(path) {
    const THREE = T();
    const sp = new THREE.ShapePath();
    for (let i = 0; i < path.commands.length; i++) {
      const c = path.commands[i];
      if (c.type === 'M') sp.moveTo(c.x, -c.y);
      else if (c.type === 'L') sp.lineTo(c.x, -c.y);
      else if (c.type === 'C') sp.bezierCurveTo(c.x1, -c.y1, c.x2, -c.y2, c.x, -c.y);
      else if (c.type === 'Q') sp.quadraticCurveTo(c.x1, -c.y1, c.x, -c.y);
      else if (c.type === 'Z') { if (sp.currentPath) sp.currentPath.closePath(); }
    }
    // Y-flip reverses winding → use isCCW=false so counters stay holes (not filled)
    return sp.toShapes(false);
  }

  function hasAboveDiacritic(ch) {
    if (!ch) return false;
    // NFD: base + combining marks; also catch precomposed via range heuristics
    try {
      const n = ch.normalize('NFD');
      for (let i = 0; i < n.length; i++) {
        const cp = n.codePointAt(i);
        // Combining grave/acute/tilde/hook/dot + Vietnamese horn marks above
        if (cp >= 0x0300 && cp <= 0x036F) return true;
      }
    } catch (e) {}
    // Precomposed Latin Extended fallback
    const cp = ch.codePointAt(0);
    return (cp >= 0x00C0 && cp <= 0x024F) || (cp >= 0x1EA0 && cp <= 0x1EF9);
  }

  /** Polyline metrics (shoelace) from opentype path commands (Y already as in font). */
  function pathPolyMetrics(commands) {
    const pts = [];
    let cx = 0, cy = 0;
    for (let i = 0; i < commands.length; i++) {
      const c = commands[i];
      if (c.type === 'M') { cx = c.x; cy = c.y; pts.push([cx, cy]); }
      else if (c.type === 'L') { cx = c.x; cy = c.y; pts.push([cx, cy]); }
      else if (c.type === 'C') {
        // sample cubic
        const x0 = cx, y0 = cy;
        for (let t = 1; t <= 4; t++) {
          const u = t / 4, iu = 1 - u;
          cx = iu*iu*iu*x0 + 3*iu*iu*u*c.x1 + 3*iu*u*u*c.x2 + u*u*u*c.x;
          cy = iu*iu*iu*y0 + 3*iu*iu*u*c.y1 + 3*iu*u*u*c.y2 + u*u*u*c.y;
          pts.push([cx, cy]);
        }
      } else if (c.type === 'Q') {
        const x0 = cx, y0 = cy;
        for (let t = 1; t <= 3; t++) {
          const u = t / 3, iu = 1 - u;
          cx = iu*iu*x0 + 2*iu*u*c.x1 + u*u*c.x;
          cy = iu*iu*y0 + 2*iu*u*c.y1 + u*u*c.y;
          pts.push([cx, cy]);
        }
      } else if (c.type === 'Z') {
        if (pts.length) pts.push([pts[0][0], pts[0][1]]);
      }
    }
    if (pts.length < 3) return { area: 0, perimeter: 0, bbox: null };
    let area = 0, peri = 0;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i];
      const [x2, y2] = pts[(i + 1) % pts.length];
      area += x * y2 - x2 * y;
      const dx = x2 - x, dy = y2 - y;
      peri += Math.sqrt(dx * dx + dy * dy);
      if (x < minX) minX = x; if (y < minY) minY = y;
      if (x > maxX) maxX = x; if (y > maxY) maxY = y;
    }
    return {
      area: Math.abs(area) / 2,
      perimeter: peri,
      bbox: { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY }
    };
  }

  /** Estimate stem/stroke thickness from area/perimeter (≈ 2A/P), blended with bbox. */
  function estimateStrokeWidth(font, ch, size) {
    size = size || 72;
    if (!ch || ch === ' ' || ch === '\n') return size * 0.12;
    try {
      const g = font.charToGlyph(ch);
      const gp = g.getPath(0, 0, size);
      const m = pathPolyMetrics(gp.commands || []);
      if (!m.perimeter || m.perimeter < 1e-3) return size * 0.12;
      const stemAP = (2 * m.area) / m.perimeter;
      // Contours with holes inflate perimeter → 2A/P runs low; blend bbox stem guess
      let bbStem = size * 0.16;
      try {
        if (typeof g.getBoundingBox === 'function') {
          const bb = g.getBoundingBox();
          const sc = size / (font.unitsPerEm || 1000);
          const w = Math.abs(bb.x2 - bb.x1) * sc;
          const h = Math.abs(bb.y2 - bb.y1) * sc;
          bbStem = Math.min(w, h) * 0.34;
        } else if (m.bbox) {
          bbStem = Math.min(m.bbox.w, m.bbox.h) * 0.34;
        }
      } catch (e2) {}
      const stem = Math.max(stemAP * 1.15, bbStem);
      return Math.max(size * 0.1, Math.min(size * 0.42, stem || size * 0.14));
    } catch (e) {
      return size * 0.12;
    }
  }

  function estimateMinStroke(font, text, size) {
    size = size || 72;
    const s = String(text || '');
    const widths = [];
    for (let i = 0; i < s.length; ) {
      const cp = s.codePointAt(i);
      const ch = String.fromCodePoint(cp);
      i += ch.length;
      if (ch === ' ' || ch === '\n' || ch === '\t') continue;
      widths.push(estimateStrokeWidth(font, ch, size));
    }
    if (!widths.length) return size * 0.12;
    widths.sort((a, b) => a - b);
    // Puff cap uses ~35th percentile so a thin "i" does not flatten the whole word
    const idx = Math.min(widths.length - 1, Math.max(0, Math.floor(widths.length * 0.35)));
    return widths[idx];
  }

  function countLetters(text) {
    const s = String(text || '');
    let n = 0;
    for (let i = 0; i < s.length; ) {
      const cp = s.codePointAt(i);
      const ch = String.fromCodePoint(cp);
      i += ch.length;
      if (ch.trim()) n++;
    }
    return n;
  }

  /**
   * Layout glyphs with optional tracking (extra advance).
   * opts.tracking — extra px between letters (not after spaces)
   * opts.diacriticLift — extra upward shift for marks that sit high (precomposed: nudge via bbox)
   * Returns { shapes, glyphs:[{ch,x,y,advance,bbox,stroke,holes,shapes}], width, tracking, strokeMin }
   */
  function layoutText(font, text, size, opts) {
    opts = opts || {};
    size = size || 72;
    const tracking = +opts.tracking || 0;
    const diacriticLift = opts.diacriticLift != null ? +opts.diacriticLift : 0;
    const shapes = [];
    const glyphs = [];
    let x = 0, y = 0;
    const s = String(text || '');
    const strokeMin = estimateMinStroke(font, s, size);

    for (let i = 0; i < s.length; ) {
      const cp = s.codePointAt(i);
      const ch = String.fromCodePoint(cp);
      i += ch.length;
      if (ch === '\n') { x = 0; y += size * 1.25; continue; }
      const g = font.charToGlyph(ch);
      // Vertical nudge for letters with above-mark clutter when puffing
      let gy = y;
      if (diacriticLift > 0 && hasAboveDiacritic(ch)) {
        // Keep base; lift is applied as extra tracking vertically between accent zone —
        // for precomposed glyphs we shrink effective bevel instead; mild y bias of mark zone:
        gy = y; // shapes stay; bevel cap handles fusion
      }
      const gp = g.getPath(x, gy, size);
      const sh = pathToShapes(gp);
      let holes = 0;
      const gb = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
      for (let j = 0; j < sh.length; j++) {
        shapes.push(sh[j]);
        holes += (sh[j].holes && sh[j].holes.length) || 0;
      }
      // bbox from raw path (font Y up → we flipped in pathToShapes, so use flipped metrics)
      const raw = pathPolyMetrics((g.getPath(0, 0, size).commands || []).map(c => {
        // approximate placed bbox via advance box
        return c;
      }));
      // Prefer opentype glyph getBoundingBox if present
      let bbox;
      try {
        if (typeof g.getBoundingBox === 'function') {
          const bb = g.getBoundingBox();
          const sc = size / (font.unitsPerEm || 1000);
          bbox = {
            minX: x + bb.x1 * sc,
            maxX: x + bb.x2 * sc,
            // Y flip: font up → shape down
            minY: -(bb.y2 * sc) + gy,
            maxY: -(bb.y1 * sc) + gy
          };
        }
      } catch (e) { bbox = null; }
      if (!bbox || !isFinite(bbox.minX)) {
        const adv = font.getAdvanceWidth(ch, size) || size * 0.5;
        bbox = { minX: x, maxX: x + adv, minY: gy - size, maxY: gy };
      }
      bbox.w = bbox.maxX - bbox.minX;
      bbox.h = bbox.maxY - bbox.minY;
      const stroke = estimateStrokeWidth(font, ch, size);
      const adv0 = font.getAdvanceWidth(ch, size) || size * 0.5;
      let pad = (ch.trim() ? tracking : 0);
      // Accented letters get a little extra gap so marks don't collide with neighbors when puffed
      if (pad > 0 && diacriticLift > 0 && hasAboveDiacritic(ch)) {
        pad += diacriticLift;
      }
      glyphs.push({
        ch, x, y: gy, advance: adv0, tracking: pad,
        bbox, stroke, holes, shapes: sh
      });
      x += adv0 + pad;
    }
    return { shapes, glyphs, width: x, tracking, strokeMin, letterCount: countLetters(s) };
  }

  function textToShapes(font, text, size, opts) {
    return layoutText(font, text, size, opts).shapes;
  }

  function hasGlyph(font, ch) {
    const g = font.charToGlyph(ch);
    return !!(g && (g.unicode != null || (g.path && g.path.commands && g.path.commands.length)));
  }

  function analyzeText(font, text, size, opts) {
    const lay = layoutText(font, text, size || 72, opts || {});
    let holes = 0;
    lay.shapes.forEach(s => { holes += (s.holes && s.holes.length) || 0; });
    return {
      shapes: lay.shapes.length,
      holes,
      ok: lay.shapes.length > 0,
      glyphs: lay.glyphs,
      strokeMin: lay.strokeMin,
      letterCount: lay.letterCount,
      width: lay.width
    };
  }

  /** True if expanded glyph bboxes (by pad) pairwise overlap on X for non-space letters. */
  function glyphBBoxesOverlap(glyphs, pad) {
    pad = pad || 0;
    const boxes = glyphs.filter(g => g.ch && g.ch.trim()).map(g => ({
      minX: g.bbox.minX - pad,
      maxX: g.bbox.maxX + pad,
      minY: g.bbox.minY - pad,
      maxY: g.bbox.maxY + pad,
      ch: g.ch
    }));
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        const ox = a.minX < b.maxX && a.maxX > b.minX;
        const oy = a.minY < b.maxY && a.maxY > b.minY;
        if (ox && oy) return { overlap: true, a: a.ch, b: b.ch };
      }
    }
    return { overlap: false };
  }

  root.XTK_THREE_FONTS = {
    FONTS, loadFont, loadFontEmbed, loadFontFetch, preferEmbed, isFileProtocol,
    textToShapes, pathToShapes, hasGlyph, analyzeText, layoutText,
    estimateStrokeWidth, estimateMinStroke, countLetters, glyphBBoxesOverlap,
    pathPolyMetrics, cache, loadStatus, b64ToArrayBuffer
  };
})(typeof window !== 'undefined' ? window : globalThis);
