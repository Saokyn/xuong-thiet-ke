// Phase 12: real glyph outlines for live Fabric text (for "Kết hợp hình" with text).
// Uses the SAME font files the browser renders: built-in faces from fonts/fonts.css (WOFF2 → TTF via the official
// google/woff2 decoder build "wawoff2", MIT) or the user's uploaded font bytes; glyphs parsed with opentype.js 1.3.4 (MIT).
// Glyphs are placed at Fabric's own per-character positions (__charBounds, line offsets, baseline formula of Fabric 5.3).
// Anything that would make our outline differ from what is on screen is refused with a Vietnamese reason — never a substitute font.
(function (root) {
  // ---------- fonts.css parsing & per-character face choice (CSS Fonts 4: last matching @font-face is tried first) ----------
  function parseFontCss(css) {
    const out = [];
    (css.match(/@font-face\s*{[^}]*}/g) || []).forEach(b => {
      const g = re => (b.match(re) || [])[1];
      const fam = g(/font-family:\s*['"]?([^;'"]+)['"]?\s*;/), file = g(/src:\s*url\(\s*['"]?([^)'"]+)['"]?\s*\)/);
      if (!fam || !file) return;
      const ranges = (g(/unicode-range:\s*([^;]+);/) || 'U+0-10FFFF').split(',').map(s => { const m = s.trim().replace(/^U\+/i, '').split('-'); const a = parseInt(m[0].replace(/\?/g, '0'), 16), z = m[1] ? parseInt(m[1], 16) : parseInt(m[0].replace(/\?/g, 'F'), 16); return [a, z]; });
      out.push({ family: fam.trim(), weight: +(g(/font-weight:\s*(\d+)/) || 400), style: (g(/font-style:\s*(\w+)/) || 'normal'), file, ranges });
    });
    return out;
  }
  const normWeight = w => w === 'bold' ? 700 : (w === 'normal' || w == null || w === '') ? 400 : +w;
  const covers = (f, cp) => f.ranges.some(([a, z]) => cp >= a && cp <= z);
  // faces of exactly this family/weight/style; returns [] if the browser would have to synthesize bold/italic
  const facesFor = (faces, family, weight, style) => faces.filter(f => f.family === family && f.weight === weight && f.style === style);
  // Choose face for code point: reverse declaration order, unicode-range must cover, and font must contain the glyph
  function pickFace(list, cp, hasGlyph) { for (let i = list.length - 1; i >= 0; i--) if (covers(list[i], cp) && hasGlyph(list[i], cp)) return list[i]; return null; }

  // ---------- checks (no font I/O) ----------
  function textReject(t) {
    if (!/text/.test(t.type || '')) return 'Không phải chữ.';
    if (t.path) return 'Chữ chạy theo đường cong chưa hỗ trợ.';
    if (t.direction && t.direction !== 'ltr') return 'Chữ viết từ phải sang trái chưa hỗ trợ.';
    if (t.underline || t.overline || t.linethrough) return 'Chữ có gạch chân/gạch ngang chưa hỗ trợ — tắt gạch rồi thử lại.';
    if (t.textBackgroundColor) return 'Chữ có nền màu chưa hỗ trợ.';
    if (t.isEmptyStyles && !t.isEmptyStyles()) return 'Chữ có định dạng riêng từng ký tự (màu/cỡ khác nhau) chưa hỗ trợ — dùng một kiểu chung.';
    if ((t.fontStyle || 'normal') !== 'normal') return 'Chữ nghiêng là nghiêng giả lập của trình duyệt — chưa lấy được nét chính xác.';
    if (t.xtk && t.xtk.composite) return 'Chữ đang chứa ảnh — “Tách ảnh” trước.';
    if (t.fill && typeof t.fill !== 'string') return 'Chữ tô chuyển màu/hoa văn chưa hỗ trợ.';
    const s = t.text || ''; if (!s.trim()) return 'Chữ trống.';
    if (s.length > 400) return 'Chữ quá dài (>400 ký tự) để kết hợp.';
    if (/[\u0300-\u036f]/.test(s)) return 'Chữ có dấu tổ hợp (dấu gõ tách rời) — hãy gõ lại bằng bộ gõ dựng sẵn (Unicode dựng sẵn).';
    return null;
  }
  // ---------- curve flattening ----------
  function flattenCommands(cmds, segFor) {
    const rings = []; let cur = null, last = null, start = null;
    const push = p => { cur.push(p); last = p; };
    for (const c of cmds) {
      if (c.type === 'M') { if (cur && cur.length > 2) rings.push(cur); start = last = [c.x, c.y]; cur = [last]; }
      else if (c.type === 'L') push([c.x, c.y]);
      else if (c.type === 'Q') { const n = segFor(last, [c.x, c.y]), p0 = last; for (let k = 1; k <= n; k++) { const t = k / n, u = 1 - t; push([u * u * p0[0] + 2 * u * t * c.x1 + t * t * c.x, u * u * p0[1] + 2 * u * t * c.y1 + t * t * c.y]); } }
      else if (c.type === 'C') { const n = segFor(last, [c.x, c.y]), p0 = last; for (let k = 1; k <= n; k++) { const t = k / n, u = 1 - t; push([u * u * u * p0[0] + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x, u * u * u * p0[1] + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y]); } }
      else if (c.type === 'Z') { if (cur && cur.length > 2) rings.push(cur); cur = null; last = start; }
    }
    if (cur && cur.length > 2) rings.push(cur);
    return rings;
  }
  // ---------- layout: glyph contours in the text's LOCAL space (origin = object centre, like Fabric renders) ----------
  // t: Fabric text after initDimensions (or a mock with the same fields). glyphFor(ch) → {font, glyph} | null.
  function layoutGlyphs(t, glyphFor, worldScale) {
    const lines = t._textLines, fs = t.fontSize, lh = t.lineHeight, frac = t._fontSizeFraction == null ? 0.222 : t._fontSizeFraction;
    const left = -t.width / 2; let y = -t.height / 2; const contours = []; let pts = 0;
    const k = worldScale || 1, segFor = (a, b) => Math.max(2, Math.min(16, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * k / 3)));
    for (let i = 0; i < lines.length; i++) {
      const H = t.getHeightOfLine(i), base = y + H / lh - H * frac / lh, lo = t._getLineLeftOffset(i), cb = t.__charBounds[i];
      for (let j = 0; j < lines[i].length; j++) {
        const ch = lines[i][j]; if (/^\s+$/.test(ch)) continue;
        if ([...ch].length !== 1) return { error: 'Ký tự ghép nhiều mã (“' + ch + '”) chưa hỗ trợ.' };
        const gf = glyphFor(ch); if (!gf) return { error: 'Phông không có ký tự “' + ch + '” — trình duyệt đang dùng phông thay thế, không lấy nét chính xác được.' };
        const box = cb[j], x = left + lo + box.left + (j === 0 ? (box.kernedWidth - box.width) : 0);
        const rings = flattenCommands(gf.glyph.getPath(x, base, fs).commands, segFor);
        rings.forEach(r => { pts += r.length; contours.push(r); });
      }
      y += H;
    }
    return { contours, pts };
  }
  // Stroke parameters Fabric uses for the text outline (centred on the glyph contour)
  function strokeSpec(t) {
    const visible = t.stroke && t.strokeWidth > 0 && !(typeof t.stroke === 'string' && /^(transparent|none|rgba\([^)]*,\s*0\))$/i.test(t.stroke.trim()));
    if (!visible) return null;
    return { d: t.strokeWidth / 2, join: t.strokeLineJoin || 'miter', miter: t.strokeMiterLimit || 4, uniform: !!t.strokeUniform };
  }

  // ---------- browser font loading (lazy) ----------
  const scripts = {};
  const loadScript = (src, pre) => scripts[src] || (scripts[src] = new Promise((res, rej) => { if (pre) pre(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { delete scripts[src]; rej(new Error('Không tải được ' + src)); }; document.head.appendChild(s); }));
  let w2P = null;
  function woff2() {
    return w2P || (w2P = new Promise((res, rej) => {
      if (root.Module && root.Module.decompress) return res(root.Module);
      root.Module = { onRuntimeInitialized() { res(root.Module); } };
      loadScript('vendor/woff2-decompress.js').catch(e => { w2P = null; rej(e); });
    }));
  }
  const otReady = () => root.opentype ? Promise.resolve(root.opentype) : loadScript('vendor/opentype.min.js').then(() => root.opentype);
  const isWoff2 = b => b.byteLength > 4 && String.fromCharCode(...new Uint8Array(b.slice(0, 4))) === 'wOF2';
  async function parseBytes(buf) {
    const ot = await otReady();
    if (isWoff2(buf)) { const M = await woff2(), out = M.decompress(new Uint8Array(buf)); if (!out) throw new Error('woff2'); buf = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength); }
    return ot.parse(buf);
  }
  const cache = new Map(); let facesP = null;
  const builtinFaces = () => facesP || (facesP = fetch('fonts/fonts.css').then(r => { if (!r.ok) throw new Error('css'); return r.text(); }).then(parseFontCss).catch(e => { facesP = null; throw e; }));
  const fontFile = f => cache.get(f) || (cache.set(f, fetch('fonts/' + f).then(r => { if (!r.ok) throw new Error(f); return r.arrayBuffer(); }).then(parseBytes).catch(e => { cache.delete(f); throw e; })), cache.get(f));
  // Resolve glyph sources for every character of t. Returns {glyphFor} or {error}
  async function resolveFonts(t) {
    const fam = t.fontFamily, weight = normWeight(t.fontWeight), style = t.fontStyle || 'normal', chars = [...new Set([...(t.text || '')].filter(c => !/\s/.test(c)))];
    const custom = root.XTK_FONTS && root.XTK_FONTS.bytes ? root.XTK_FONTS.bytes(fam) : null;
    try {
      if (custom) {
        if (weight !== 400) return { error: 'Phông tự tải “' + fam + '” chỉ có kiểu thường — chữ đậm đang là đậm giả lập, không lấy nét chính xác được. Hãy bỏ đậm.' };
        const key = 'custom:' + fam; if (!cache.has(key)) cache.set(key, parseBytes(custom.data.slice(0)));
        const font = await cache.get(key);
        const map = {}; for (const c of chars) { const g = font.charToGlyph(c); if (!g || !g.index) return { error: 'Phông “' + fam + '” không có ký tự “' + c + '”.' }; map[c] = { font, glyph: g }; }
        return { glyphFor: c => map[c] || null };
      }
      const faces = facesFor(await builtinFaces(), fam, weight, style);
      if (!faces.length) return { error: 'Phông “' + fam + '” không có bản ' + (weight === 700 ? 'đậm' : 'độ đậm ' + weight) + ' thật — trình duyệt đang giả lập, không lấy nét chính xác được.' };
      const parsed = new Map(); for (const f of faces) parsed.set(f, null);
      const map = {};
      for (const c of chars) {
        const cp = c.codePointAt(0); let hit = null;
        for (let i = faces.length - 1; i >= 0 && !hit; i--) {
          const f = faces[i]; if (!covers(f, cp)) continue;
          const font = parsed.get(f) || await fontFile(f.file); parsed.set(f, font);
          const g = font.charToGlyph(c); if (g && g.index) hit = { font, glyph: g };
        }
        if (!hit) return { error: 'Phông “' + fam + '” không có ký tự “' + c + '”.' };
        map[c] = hit;
      }
      return { glyphFor: c => map[c] || null };
    } catch (e) { return { error: 'Không đọc được tệp phông “' + fam + '” (' + (location.protocol === 'file:' ? 'mở bằng file:// chặn tải phông' : e.message) + ').' }; }
  }
  // Worker item for a live text object: {nz: contours(local), m: world matrix, stroke} | {error}
  async function textItem(t, M) {
    const r = textReject(t); if (r) return { error: r };
    if (document.fonts) { try { await document.fonts.load(`${t.fontStyle || 'normal'} ${t.fontWeight || 'normal'} ${Math.round(t.fontSize)}px "${t.fontFamily}"`, t.text); } catch (e) { } }
    t.initDimensions && t.initDimensions();
    const fr = await resolveFonts(t); if (fr.error) return fr;
    const m = M || t.calcTransformMatrix(), k = Math.max(Math.hypot(m[0], m[1]), Math.hypot(m[2], m[3]));
    const lay = layoutGlyphs(t, fr.glyphFor, k); if (lay.error) return lay;
    return { item: { nz: lay.contours, m, stroke: strokeSpec(t) }, pts: lay.pts };
  }
  // Runtime guard: compare our silhouette with Fabric's own render of the text (alpha masks, IoU)
  // WORLD bbox of the object's local box (+stroke, +margin) through its FULL transform (incl. parent group,
  // rotation, flips, skew). getBoundingRect(true,true) is group-relative for children — wrong frame for world rings.
  function worldBox(t, margin) {
    const m = t.calcTransformMatrix(), hw = (t.width || 0) / 2 + (t.strokeWidth || 0) / 2 + margin, hh = (t.height || 0) / 2 + (t.strokeWidth || 0) / 2 + margin;
    const P = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
    const xs = P.map(p => p[0]), ys = P.map(p => p[1]), l = Math.min(...xs), tp = Math.min(...ys);
    return { left: l, top: tp, width: Math.max(...xs) - l, height: Math.max(...ys) - tp };
  }
  function silhouetteIoU(t, worldRings, size, makeCanvas) {
    size = size || 360;
    const b = worldBox(t, (t.fontSize || 0) * 0.25 + 4), x0 = b.left, y0 = b.top, W = Math.max(1, b.width), H = Math.max(1, b.height), s = size / Math.max(W, H);
    const mk = () => { const c = makeCanvas ? makeCanvas() : document.createElement('canvas'); c.width = Math.ceil(W * s); c.height = Math.ceil(H * s); return c; };
    const a = mk(), ga = a.getContext('2d'); ga.setTransform(s, 0, 0, s, -x0 * s, -y0 * s);
    const sh = t.shadow, op = t.opacity, oc = t.objectCaching; t.shadow = null; t.opacity = 1; t.objectCaching = false;
    try { const m = t.calcTransformMatrix(); ga.save(); ga.transform(...m); t._render ? (t._setOpacity && t._setOpacity(ga), t._render(ga)) : t.render(ga); ga.restore(); } finally { t.shadow = sh; t.opacity = op; t.objectCaching = oc; t.dirty = true; }
    const bc = mk(), gb = bc.getContext('2d'); gb.setTransform(s, 0, 0, s, -x0 * s, -y0 * s); gb.fillStyle = '#000';
    gb.beginPath(); worldRings.forEach(r => { r.forEach((p, i) => i ? gb.lineTo(p[0], p[1]) : gb.moveTo(p[0], p[1])); gb.closePath(); }); gb.fill('evenodd');
    const da = ga.getImageData(0, 0, a.width, a.height).data, db = gb.getImageData(0, 0, a.width, a.height).data; let I = 0, U = 0;
    for (let i = 3; i < da.length; i += 4) { const p = da[i] > 100, q = db[i] > 100; if (p && q) I++; if (p || q) U++; }
    return U ? I / U : 0;
  }
  const api = { parseFontCss, normWeight, facesFor, pickFace, covers, textReject, flattenCommands, layoutGlyphs, strokeSpec, resolveFonts, textItem, silhouetteIoU, worldBox, parseBytes };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.XTK_TEXT_OUTLINE = api;
})(typeof window !== 'undefined' ? window : globalThis);
