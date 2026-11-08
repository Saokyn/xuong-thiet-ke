// Phase 11 stage 3: "Kết hợp hình" — true vector booleans (Hợp nhất / Trừ / Giao nhau / Loại phần giao).
// Engine: polygon-clipping 0.15.7 (MIT, vendor/polygon-clipping.min.js, lazy-loaded). Curves are flattened to polygons
// with a documented scene-unit tolerance, so results are straight-segment vector paths (holes + disjoint parts kept).
(function (root) {
  const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  const ap = (m, p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
  const TOL = 0.5, MAX_PTS = 20000, MAX_SEG = 256;
  const scaleOf = m => Math.max(Math.hypot(m[0], m[1]), Math.hypot(m[2], m[3]), 1e-9);
  const segs = (len, tol) => Math.max(8, Math.min(MAX_SEG, Math.ceil(len / Math.max(tol, 1e-3) / 4)));
  // ellipse arc points (local), centre cx,cy radii rx,ry from a0 to a1
  function arc(cx, cy, rx, ry, a0, a1, n) { const r = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; r.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } return r; }
  const cubic = (p0, p1, p2, p3, n) => Array.from({ length: n }, (_, k) => { const t = (k + 1) / n, u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; });
  const quad = (p0, p1, p2, n) => Array.from({ length: n }, (_, k) => { const t = (k + 1) / n, u = 1 - t; return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]; });
  const hasFill = o => o.fill && !(typeof o.fill === 'string' && /^(transparent|none|rgba\([^)]*,\s*0\))$/i.test(o.fill.trim()));
  // Local rings (object space, centred like Fabric renders) → null + reason when unsupported
  function localRings(o, k) {
    const t = o.type, w = o.width, h = o.height;
    if (t === 'rect') {
      const rx = Math.min(o.rx || 0, w / 2), ry = Math.min(o.ry || 0, h / 2), x = -w / 2, y = -h / 2;
      if (!rx || !ry) return [[[x, y], [x + w, y], [x + w, y + h], [x, y + h]]];
      const n = segs(Math.PI / 2 * Math.max(rx, ry) * k, TOL), P = Math.PI;
      return [[...arc(x + w - rx, y + ry, rx, ry, -P / 2, 0, n), ...arc(x + w - rx, y + h - ry, rx, ry, 0, P / 2, n), ...arc(x + rx, y + h - ry, rx, ry, P / 2, P, n), ...arc(x + rx, y + ry, rx, ry, P, 1.5 * P, n)]];
    }
    if (t === 'circle' || t === 'ellipse') {
      const rx = t === 'circle' ? o.radius : o.rx, ry = t === 'circle' ? o.radius : o.ry;
      const a0 = t === 'circle' ? (o.startAngle || 0) * Math.PI / 180 : 0, a1 = t === 'circle' ? (o.endAngle == null ? 360 : o.endAngle) * Math.PI / 180 : 2 * Math.PI;
      if (Math.abs(a1 - a0 - 2 * Math.PI) > 1e-6) return { error: 'Hình tròn bị cắt cung chưa hỗ trợ.' };
      const r = arc(0, 0, rx, ry, 0, 2 * Math.PI, segs(2 * Math.PI * Math.max(rx, ry) * k, TOL) * 2); r.pop(); return [r];
    }
    if (t === 'triangle') return [[[-w / 2, h / 2], [0, -h / 2], [w / 2, h / 2]]];
    if (t === 'polygon') { const po = o.pathOffset || { x: 0, y: 0 }; return [o.points.map(p => [p.x - po.x, p.y - po.y])]; }
    if (t === 'path') {
      const po = o.pathOffset || { x: 0, y: 0 }, rings = []; let cur = null, start = null, last = null;
      const cmds = root.fabric && fabric.util.makePathSimpler ? fabric.util.makePathSimpler(o.path) : o.path;
      for (const c of cmds) {
        const k0 = c[0];
        if (k0 === 'M') { if (cur && cur.length > 2) rings.push(cur); last = start = [c[1], c[2]]; cur = [last]; }
        else if (k0 === 'L') { last = [c[1], c[2]]; cur.push(last); }
        else if (k0 === 'C') { const p = [c[5], c[6]]; cur.push(...cubic(last, [c[1], c[2]], [c[3], c[4]], p, segs(Math.hypot(p[0] - last[0], p[1] - last[1]) * 1.5 * k, TOL))); last = p; }
        else if (k0 === 'Q') { const p = [c[3], c[4]]; cur.push(...quad(last, [c[1], c[2]], p, segs(Math.hypot(p[0] - last[0], p[1] - last[1]) * 1.5 * k, TOL))); last = p; }
        else if (k0 === 'Z' || k0 === 'z') { if (cur && cur.length > 2) rings.push(cur); cur = null; last = start; }
        else return { error: 'Đường có lệnh “' + k0 + '” chưa hỗ trợ.' };
      }
      if (cur && cur.length > 2) return { error: 'Đường hở (không khép kín) không kết hợp được.' };
      return rings.map(r => r.map(p => [p[0] - po.x, p[1] - po.y]));
    }
    return { error: 'Loại đối tượng này không kết hợp được.' };
  }
  function reject(o) {
    if (/text/.test(o.type)) return 'Chữ đang sửa được không kết hợp được — chỉ dùng hình khối.';
    if (o.type === 'image') return 'Ảnh không kết hợp được — có thể dùng “Lồng ảnh”.';
    if (o.type === 'group') return 'Nhóm chưa hỗ trợ — bỏ nhóm trước.';
    if (o.type === 'line' || o.type === 'polyline') return 'Đường thẳng/gấp khúc là đường hở — không kết hợp được.';
    if (o.xtk && o.xtk.composite) return 'Hình đang chứa ảnh — “Tách ảnh” trước.';
    if (o.xtk && o.xtk.locked) return 'Có lớp đang khóa — mở khóa trước.';
    if (!hasFill(o)) return 'Hình chỉ có viền (không tô) chưa hỗ trợ — hãy tô màu trước.';
    if (o.fill && typeof o.fill !== 'string') return 'Hình tô chuyển màu/hoa văn chưa hỗ trợ.';
    return null;
  }
  const CURVED = o => o.type === 'circle' || o.type === 'ellipse' || (o.type === 'rect' && (o.rx || o.ry)) || (o.type === 'path' && (o.path || []).some(c => /[CQSTA]/i.test(c[0])));
  // World (scene) rings for one object (closed, polygon-clipping format)
  function worldRings(o, M) {
    const m = M || o.calcTransformMatrix(), lr = localRings(o, scaleOf(m)); if (lr.error) return lr;
    return { rings: lr.map(r => { const w = r.map(p => ap(m, p)); w.push(w[0].slice()); return w; }) };
  }
  const OPS = { union: 'Hợp nhất', subtract: 'Trừ', intersect: 'Giao nhau', xor: 'Loại phần giao' };
  // Main-thread part (cheap, bounded): validate + tessellate. objs in z-order (back..front).
  function prepare(objs, op, swap, mats) {
    if (!OPS[op]) return { error: 'Lệnh không hợp lệ.' };
    if (objs.length < 2) return { error: 'Chọn ít nhất 2 hình.' };
    if (op !== 'union' && objs.length !== 2) return { error: '“' + OPS[op] + '” hiện chỉ dùng cho đúng 2 hình (sau + trước).' };
    if (objs.length > 50) return { error: 'Tối đa 50 hình mỗi lần hợp nhất.' };
    for (const o of objs) { const r = reject(o); if (r) return { error: r }; }
    const shapes = []; let pts = 0;
    for (let i = 0; i < objs.length; i++) { const g = worldRings(objs[i], mats && mats[i]); if (g.error) return g; shapes.push(g.rings); pts += g.rings.reduce((s, r) => s + r.length, 0); }
    if (pts > MAX_PTS) return { error: 'Hình quá phức tạp (' + pts + ' điểm) — giới hạn ' + MAX_PTS + '.' };
    let back = objs[0], front = objs[objs.length - 1];
    if (swap && objs.length === 2) { shapes.reverse(); [back, front] = [front, back]; }
    return { op, shapes, back, front, style: op === 'intersect' ? front : back, curved: objs.some(CURVED), pts };
  }
  // Same as prepare but live text is allowed via textItemFn(o, M) → {item, pts} | {error} (real glyph outlines, async fonts)
  const isTextO = o => /text/.test(o.type || '');
  async function prepareAsync(objs, op, swap, mats, textItemFn) {
    if (!OPS[op]) return { error: 'Lệnh không hợp lệ.' };
    if (objs.length < 2) return { error: 'Chọn ít nhất 2 hình/chữ.' };
    if (op !== 'union' && objs.length !== 2) return { error: '“' + OPS[op] + '” hiện chỉ dùng cho đúng 2 đối tượng (sau + trước).' };
    if (objs.length > 50) return { error: 'Tối đa 50 đối tượng mỗi lần hợp nhất.' };
    const shapes = [], texts = []; let pts = 0, hasText = false;
    for (let i = 0; i < objs.length; i++) {
      const o = objs[i], M = mats && mats[i];
      if (isTextO(o)) {
        if (o.xtk && o.xtk.locked) return { error: 'Có lớp đang khóa — mở khóa trước.' };
        if (!textItemFn) return { error: reject(o) };
        const t = await textItemFn(o, M); if (t.error) return { error: t.error };
        shapes.push(t.item); texts.push(i); pts += t.pts; hasText = true;
      } else {
        const r = reject(o); if (r) return { error: r };
        const g = worldRings(o, M); if (g.error) return g; shapes.push(g.rings); pts += g.rings.reduce((s, r) => s + r.length, 0);
      }
    }
    if (pts > MAX_PTS) return { error: 'Quá phức tạp (' + pts + ' điểm) — giới hạn ' + MAX_PTS + '.' };
    let order = objs.map((_, i) => i);
    if (swap && objs.length === 2) { shapes.reverse(); order.reverse(); }
    const back = objs[order[0]], front = objs[order[order.length - 1]], style = op === 'intersect' ? front : back;
    const out = { op, shapes, order, texts: texts.map(i => order.indexOf(i)), back, front, style, curved: hasText || objs.some(CURVED), hasText, pts, band: null, strokeIssue: null };
    if (hasText) Object.assign(out, strokePlan(op, back, style, objs, mats && mats[order[0]]));
    return out;
  }
  // Outlines when text is involved (decided BEFORE Apply — never a silent drop after the fact):
  // · Trừ, back = shape with a solid stroke → exact stroke band computed in the worker (outer stroke kept, NO outline round letter holes).
  // · Trừ: the front text's own stroke is part of the cutter (whatever its colour) — never an issue.
  // · anything else that would lose a visible stroke (dashed, text as colour source, other ops) → strokeIssue: Apply needs an explicit opt-in.
  const visStroke = o => !!(o && o.stroke && o.strokeWidth > 0 && typeof o.stroke === 'string' && !/^(transparent|none|rgba\([^)]*,\s*0\))$/i.test(o.stroke.trim()));
  function strokePlan(op, back, style, objs, Mback) {
    if (op === 'subtract') {
      if (!visStroke(back)) return {};
      if (isTextO(back)) return { strokeIssue: 'Chữ phía sau có viền — kết quả chỉ giữ màu tô của chữ (viền thành cùng màu tô).' };
      if (back.strokeDashArray && back.strokeDashArray.length) return { strokeIssue: 'Viền nét đứt của hình phía sau chưa hỗ trợ — kết quả sẽ không có viền.' };
      const M = Mback || back.calcTransformMatrix(), lr = localRings(back, scaleOf(M)); if (lr.error) return { strokeIssue: lr.error };
      return { band: { rings: lr, m: M, d: back.strokeWidth / 2, join: back.strokeLineJoin || 'miter', miter: back.strokeMiterLimit || 4, uniform: !!back.strokeUniform, first: back.paintFirst === 'stroke', color: back.stroke } };
    }
    if (objs.some(visStroke)) return { strokeIssue: '“' + OPS[op] + '” có chữ: viền của các đối tượng không giữ được — kết quả chỉ có màu tô của “' + ((root.XTK_LAYERS && root.XTK_LAYERS.layerName && root.XTK_LAYERS.layerName(style)) || style.name || style.type) + '”.' };
    return {};
  }
  // Engine part (runs in the Web Worker): rings of each shape combined even-odd, then the operation.
  // Text item → world rings: glyph contours unioned with NONZERO winding (overlapping composite glyphs, e.g. Ề),
  // then grown by half the stroke width (Fabric strokes centred on the contour) with the same join, then transformed.
  const CS = 100; // Clipper integer scale (0.01 local units)
  const TXT_MAX_CONTOURS = 4000, TXT_MAX_IN = 60000, TXT_MAX_OUT = 120000;
  const tooComplex = () => { const e = new Error('complex'); e.complex = true; return e; };
  const countPts = ps => ps.reduce((n, r) => n + r.length, 0);
  function textToRings(CL, it) {
    if (!it || !Array.isArray(it.nz) || it.nz.length > TXT_MAX_CONTOURS || countPts(it.nz) > TXT_MAX_IN) throw tooComplex();
    const toP = r => r.map(p => ({ X: Math.round(p[0] * CS), Y: Math.round(p[1] * CS) }));
    const c = new CL.Clipper(); c.AddPaths(it.nz.map(toP), CL.PolyType.ptSubject, true);
    let sol = new CL.Paths(); c.Execute(CL.ClipType.ctUnion, sol, CL.PolyFillType.pftNonZero, CL.PolyFillType.pftNonZero);
    const m = it.m, ap2 = p => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
    const join = j => j === 'round' ? CL.JoinType.jtRound : j === 'bevel' ? CL.JoinType.jtSquare : CL.JoinType.jtMiter;
    const grow = (paths, d, st, scale) => { const o = new CL.ClipperOffset(st.miter || 4, 0.25 * scale); o.AddPaths(paths, join(st.join), CL.EndType.etClosedPolygon); const out = new CL.Paths(); o.Execute(out, d * scale); return out; };
    const st = it.stroke;
    if (st && !st.uniform) sol = grow(sol, st.d, st, CS);
    let rings = sol.map(r => r.map(p => ap2([p.X / CS, p.Y / CS])));
    if (st && st.uniform) { // strokeUniform: stroke width is in scene units → grow after transforming
      const w = rings.map(r => r.map(p => ({ X: Math.round(p[0] * CS), Y: Math.round(p[1] * CS) })));
      rings = grow(w, st.d, st, CS).map(r => r.map(p => [p.X / CS, p.Y / CS]));
    }
    if (countPts(rings) > TXT_MAX_OUT) throw tooComplex();
    return rings.filter(r => r.length > 2).map(r => { r.push(r[0].slice()); return r; });
  }
  // Stroke band of a solid shape outline: offset(+d) − offset(−d) (Fabric default: stroke over fill),
  // or offset(+d) − shape when paintFirst = 'stroke' (inner half hidden under the fill). Local space (stroke scales with
  // the object, incl. non-uniform), or scene space for strokeUniform. Returns world rings combined even-odd.
  function bandRings(pc, CL, b) {
    const m = b.m, ap2 = p => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
    const base = b.uniform ? b.rings.map(r => r.map(ap2)) : b.rings;
    if (countPts(base) > TXT_MAX_IN) throw tooComplex();
    const toP = r => r.map(p => ({ X: Math.round(p[0] * CS), Y: Math.round(p[1] * CS) }));
    const join = b.join === 'round' ? CL.JoinType.jtRound : b.join === 'bevel' ? CL.JoinType.jtSquare : CL.JoinType.jtMiter;
    const off = d => { const o = new CL.ClipperOffset(b.miter, 0.25 * CS); o.AddPaths(base.map(toP), join, CL.EndType.etClosedPolygon); const out = new CL.Paths(); o.Execute(out, d * CS); return out; };
    const close = ps => ps.filter(r => r.length > 2).map(r => { const q = r.map(p => { const v = [p.X / CS, p.Y / CS]; return b.uniform ? v : ap2(v); }); q.push(q[0].slice()); return q; });
    const outer = close(off(b.d)), inner = b.first ? base.map(r => { const q = r.map(p => b.uniform ? p : ap2(p)); q.push(q[0].slice()); return q; }) : close(off(-b.d));
    if (countPts(outer) + countPts(inner) > TXT_MAX_OUT) throw tooComplex();
    const O = evenOdd(pc, outer); return inner.length ? pc.difference(O, evenOdd(pc, inner)) : O;
  }
  const evenOdd = (pc, rings) => rings.length === 1 ? [[rings[0]]] : pc.xor(...rings.map(r => [[r]]));
  function runJob(pc, job, CL) {
    try {
      const sil = {};
      const gs = job.shapes.map((sh, i) => {
        if (Array.isArray(sh)) return evenOdd(pc, sh);
        if (!CL) throw new Error('clipper');
        const rings = textToRings(CL, sh); if (!rings.length) throw new Error('empty');
        const g = evenOdd(pc, rings); sil[i] = g; return g;
      });
      const [A, B] = gs, op = job.op;
      const geom = op === 'union' ? pc.union(...gs) : op === 'subtract' ? pc.difference(A, B) : op === 'intersect' ? pc.intersection(A, B) : pc.xor(A, B);
      let band = null;
      if (job.band) { if (!CL) throw new Error('clipper'); band = pc.difference(bandRings(pc, CL, job.band), B); }
      return { id: job.id, geom, sil, band };
    } catch (e) { return { id: job.id, error: e.message === 'clipper' ? 'Thiếu bộ nới viền (Clipper).' : e.complex ? 'Quá phức tạp (quá nhiều nét/điểm sau khi nới viền) — hãy rút ngắn chữ hoặc giảm cỡ viền.' : 'Không tính được phép kết hợp (hình suy biến?).' }; }
  }
  // Synchronous convenience (Node tests only — the browser always uses the worker)
  function combine(pc, objs, op, swap, mats) {
    const p = prepare(objs, op, swap, mats); if (p.error) return p;
    const t0 = Date.now(), r = runJob(pc, { id: 0, op: p.op, shapes: p.shapes }); if (r.error) return r;
    return { geom: r.geom, style: p.style, back: p.back, front: p.front, curved: p.curved, ms: Date.now() - t0, empty: !r.geom.length };
  }
  // Staleness signature of the current source geometry/style + stacking
  const signature = (objs, list) => JSON.stringify(objs.map(o => [list ? list.indexOf(o) : 0, o.calcTransformMatrix().map(v => +v.toFixed(6)), o.type, o.width, o.height, o.rx, o.ry, o.radius, o.points, o.path, o.pathOffset, o.fill, o.visible, o.stroke, o.strokeWidth, o.strokeDashArray, o.strokeLineJoin, o.strokeUniform, o.paintFirst, o.text, o.fontFamily, o.fontSize, o.fontWeight, o.fontStyle, o.lineHeight, o.charSpacing]));
  const area = r => { let s = 0; for (let i = 0; i < r.length - 1; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return s / 2; };
  const geomArea = g => g.reduce((s, poly) => s + Math.abs(area(poly[0])) - poly.slice(1).reduce((h, r) => h + Math.abs(area(r)), 0), 0);
  const toSVG = g => g.map(poly => poly.map(r => 'M ' + r.slice(0, -1).map(p => (+p[0].toFixed(3)) + ' ' + (+p[1].toFixed(3))).join(' L ') + ' Z').join(' ')).join(' ');

  // ---------- browser wiring ----------
  const TIMEOUT_MS = 6000, IOU_MIN = 0.9;
  const decompose = a => { const angle = Math.atan2(a[1], a[0]), den = a[0] ** 2 + a[1] ** 2, sx = Math.sqrt(den), sy = (a[0] * a[3] - a[2] * a[1]) / sx, skx = Math.atan2(a[0] * a[2] + a[1] * a[3], den); return { angle: angle * 180 / Math.PI, scaleX: sx, scaleY: sy, skewX: skx * 180 / Math.PI, x: a[4], y: a[5] }; };
  const inv = m => { const d = m[0] * m[3] - m[1] * m[2]; return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d, (m[2] * m[5] - m[3] * m[4]) / d, (m[1] * m[4] - m[0] * m[5]) / d]; };
  // place o so its LOCAL (parent-space) matrix equals L
  function setLocal(o, L) { const d = decompose(L); o.set({ angle: d.angle, scaleX: d.scaleX, scaleY: d.scaleY, skewX: d.skewX, skewY: 0, flipX: false, flipY: false }); o.setPositionByOrigin(new fabric.Point(d.x, d.y), 'center', 'center'); o.setCoords(); }
  function init(X, ui) {
    const canvas = X.canvas, toast = X.toast || (() => { }), U = root.XTK_UTIL, ov = U ? U.overlay(canvas) : null, TO = root.XTK_TEXT_OUTLINE;
    const quiet = f => (U ? U.withRestoring(X, f) : f());
    const PROPS = () => (root.XTK_FX && XTK_FX.PROPS) || ['name', 'xtk'];
    let worker = null, seq = 0, S = null;
    function getWorker() {
      if (worker) return worker;
      if (typeof Worker === 'undefined') throw new Error('Trình duyệt không hỗ trợ Web Worker — không thể kết hợp hình an toàn.');
      worker = new Worker('js/bool-worker.js');
      worker.onmessage = e => onResult(e.data);
      worker.onerror = e => { e.preventDefault && e.preventDefault(); kill(); if (S && S.busy) finishJob({ id: S.jobId, error: 'Không tải được bộ tính hình (Worker).' }); };
      return worker;
    }
    function kill() { if (worker) { worker.terminate(); worker = null; } }
    const parentList = p => p ? p._objects : canvas.getObjects();
    function drawLayer(t, z) {
      if (!S || !S.res || !S.res.geom || !S.res.geom.length || S.busy) return;
      const p = new Path2D(toSVG(S.res.geom)); t.fillStyle = 'rgba(249,115,22,.35)'; t.fill(p, 'evenodd'); t.lineWidth = 2 / z; t.strokeStyle = '#f97316'; t.stroke(p);
    }
    const paint = () => ov && ov.set('boolean', S ? drawLayer : null);
    function onRemoved(e) { if (S && (S.objs.includes(e.target) || e.target === S.parent)) { toast('Đối tượng nguồn đã bị xóa/thay đổi — đã hủy kết hợp hình.', 2500); stop(); } }
    // objs: explicit sources (e.g. 2 children of one group) or the current multi-selection
    function start(objs) {
      if (S) return;
      let parent = null;
      if (objs) { parent = objs[0].group && objs[0].group.type === 'group' ? objs[0].group : null; if (!objs.every(o => (o.group && o.group.type === 'group' ? o.group : null) === parent)) { toast('Các đối tượng phải cùng một nhóm (hoặc cùng ở ngoài).', 2500); return; } }
      else { const a = canvas.getActiveObject(); if (!a || a.type !== 'activeSelection') { toast('Chọn từ 2 hình/chữ trở lên (Shift + bấm), hoặc chọn 1 nhóm rồi chọn 2 thành phần.', 2600); return; } objs = a.getObjects().slice(); }
      try { getWorker(); } catch (e) { toast(e.message, 3000); return; }
      canvas.discardActiveObject(); // back to scene coordinates; nothing mutated
      const list = parentList(parent); objs = objs.slice().sort((a, b) => list.indexOf(a) - list.indexOf(b));
      S = { objs, parent, op: 'subtract', swap: false, res: null, busy: false, jobId: 0, prevSkip: canvas.skipTargetFind, prevSel: canvas.selection };
      if (objs.length !== 2) S.op = 'union';
      canvas.skipTargetFind = true; canvas.selection = false;
      canvas.on('object:removed', onRemoved); compute(); canvas.requestRenderAll();
    }
    async function compute() {
      if (!S) return; const id = ++seq; S.jobId = id; S.busy = true; S.dropStroke = false; S.res = null; S.t0 = Date.now(); ui && ui.update(S); paint();
      const s0 = S, mats = S.objs.map(o => o.calcTransformMatrix());
      const p = await prepareAsync(S.objs, S.op, S.swap, mats, TO ? (o, M) => TO.textItem(o, M) : null);
      if (S !== s0 || S.jobId !== id) return; // obsolete
      S.meta = p; S.sig = signature(S.objs, parentList(S.parent));
      if (p.error) { S.busy = false; S.res = { error: p.error }; ui && ui.update(S); paint(); return; }
      clearTimeout(S.timer); S.timer = setTimeout(() => { if (S && S.jobId === id && S.busy) { kill(); finishJob({ id, error: 'Phép tính quá lâu (>' + TIMEOUT_MS / 1000 + ' giây) — đã dừng. Hãy giảm độ phức tạp.' }); } }, TIMEOUT_MS);
      try { getWorker().postMessage({ id, op: p.op, shapes: p.shapes, band: p.band ? { rings: p.band.rings, m: p.band.m, d: p.band.d, join: p.band.join, miter: p.band.miter, uniform: p.band.uniform, first: p.band.first } : null }); } catch (e) { finishJob({ id, error: e.message }); }
    }
    function onResult(d) { if (S && d && d.id === S.jobId) finishJob(d); } // obsolete/cancelled job ids are ignored
    function finishJob(d) {
      if (!S || d.id !== S.jobId) return; clearTimeout(S.timer); S.busy = false;
      if (d.error) S.res = { error: d.error };
      else {
        S.res = { geom: d.geom, band: d.band && d.band.length ? d.band : null, empty: !d.geom.length, ms: Date.now() - S.t0, back: S.meta.back, front: S.meta.front, style: S.meta.style, curved: S.meta.curved, hasText: S.meta.hasText };
        // Guard: every text silhouette must match Fabric's own rendering of that text
        for (const k of Object.keys(d.sil || {})) {
          const t = S.objs[S.meta.order[+k]]; let iou = 1;
          try { iou = TO.silhouetteIoU(t, d.sil[k].flat()); } catch (e) { iou = -1; }
          if (iou < IOU_MIN) { S.res = { error: iou < 0 ? 'Không kiểm tra được nét chữ so với màn hình — không áp dụng.' : `Nét chữ tính ra lệch so với chữ đang hiển thị (khớp ${Math.round(iou * 100)}%) — không áp dụng để tránh sai.` }; break; }
          S.res.iou = Math.min(S.res.iou || 1, iou);
        }
      }
      ui && ui.update(S); paint();
    }
    function set(op, swap) { if (!S || S.busy) return; if (op) S.op = op; if (swap != null) S.swap = swap; compute(); }
    function stop() {
      if (!S) return; const s = S; S = null; clearTimeout(s.timer); seq++; // invalidate any pending result
      canvas.off('object:removed', onRemoved); canvas.skipTargetFind = s.prevSkip; canvas.selection = s.prevSel;
      paint(); ui && ui.update(null); canvas.requestRenderAll(); return s;
    }
    function cancel() { const s = stop(); if (s && !s.parent) { const alive = s.objs.filter(o => canvas.getObjects().includes(o)); if (alive.length > 1) { canvas.setActiveObject(new fabric.ActiveSelection(alive, { canvas })); canvas.requestRenderAll(); } } else if (s && s.parent) { canvas.setActiveObject(s.parent); canvas.requestRenderAll(); } }
    function apply() {
      if (!S || S.busy || !S.res || S.res.error) return false;
      const list = parentList(S.parent);
      if (!S.objs.every(o => list.includes(o)) || (S.parent && !canvas.getObjects().includes(S.parent) && !S.parent.group)) { toast('Đối tượng nguồn đã bị xóa — đã hủy.', 2200); stop(); return false; }
      if (signature(S.objs, list) !== S.sig) { toast('Đối tượng nguồn đã thay đổi — đã tính lại, bấm Áp dụng lần nữa.', 2500); compute(); return false; }
      if (S.meta.strokeIssue && !S.dropStroke) { toast('Hãy xác nhận ô “Chấp nhận bỏ viền” trước khi áp dụng.', 2500); return false; }
      if (S.res.empty) { toast('Kết quả rỗng — không có gì để tạo, các đối tượng được giữ nguyên.', 2500); return false; }
      const st = S.res.style, keepStroke = !S.res.hasText && st.stroke && st.strokeWidth;
      // With text involved the result path is never stroked (Fabric would outline every letter hole); a kept outer
      // stroke is the separate exact band path computed in the worker.
      const fillPath = new fabric.Path(toSVG(S.res.geom), { fill: st.fill, fillRule: 'evenodd', stroke: keepStroke ? st.stroke : null, strokeWidth: keepStroke ? st.strokeWidth * scaleOf(st.calcTransformMatrix()) : 0, strokeLineJoin: 'round', objectCaching: true });
      let path = fillPath;
      if (S.res.band && S.meta.band) {
        const bandPath = new fabric.Path(toSVG(S.res.band), { fill: S.meta.band.color, fillRule: 'evenodd', stroke: null, strokeWidth: 0, name: 'Viền' });
        path = new fabric.Group(S.meta.band.first ? [bandPath, fillPath] : [fillPath, bandPath], { opacity: st.opacity });
      } else fillPath.set({ opacity: st.opacity });
      path.set({ name: OPS[S.op] + (S.res.hasText ? ' (chữ)' : '') });
      const S_hasText = !!S.res.hasText, parent = S.parent, objs = S.objs, idx = Math.min(...objs.map(o => list.indexOf(o)));
      if (parent) { const L = mul(inv(parent.calcTransformMatrix()), path.calcTransformMatrix()); setLocal(path, L); }
      // Pin the result to the precision Fabric serialises (NUM_FRACTION_DIGITS) BEFORE recording m0, so "Khôi phục gốc"
      // gives the same answer in this session and after save/reload (otherwise D ≠ I by rounding drift).
      { const j = path.toObject(); path.set({ left: j.left, top: j.top, angle: j.angle, scaleX: j.scaleX, scaleY: j.scaleY, skewX: j.skewX, skewY: j.skewY }); path.setCoords(); }
      path.xtk = { boolean: { op: S.op, flattened: !!S.res.curved, text: !!S.res.hasText, band: !!(S.res.band && S.meta.band), droppedStroke: !!S.meta.strokeIssue, m0: path.calcOwnMatrix ? path.calcOwnMatrix() : path.calcTransformMatrix(), sources: objs.map(o => o.toObject(PROPS())) } };
      stop();
      quiet(() => {
        if (parent) { objs.forEach(o => parent.remove(o)); parent.insertAt(path, idx); parent.dirty = true; parent.setCoords(); }
        else { objs.forEach(o => canvas.remove(o)); canvas.insertAt(path, idx); }
      });
      canvas.setActiveObject(parent || path); canvas.requestRenderAll(); X.snapshot && X.snapshot(); X.refreshLayers && X.refreshLayers();
      if (S === null && S_hasText) toast('Đã tạo hình vector. Muốn sửa lại chữ: chọn kết quả → “↺ Khôi phục gốc”.', 3200);
      return path;
    }
    // "Khôi phục gốc": put the original live objects back, following any later move/rotate/scale of the result
    function restore(res) {
      res = res || canvas.getActiveObject(); const b = res && res.xtk && res.xtk.boolean; if (!b || !b.sources) { toast('Chọn một kết quả “Kết hợp hình” để khôi phục.', 2000); return Promise.resolve(null); }
      const parent = res.group && res.group.type === 'group' ? res.group : null, list = parentList(parent), idx = list.indexOf(res);
      const Lnow = res.calcOwnMatrix ? res.calcOwnMatrix() : res.calcTransformMatrix(), D = mul(Lnow, inv(b.m0));
      return new Promise(done => fabric.util.enlivenObjects(b.sources, objs => {
        objs.forEach(o => setLocal(o, mul(D, o.calcOwnMatrix ? o.calcOwnMatrix() : o.calcTransformMatrix())));
        quiet(() => { if (parent) { parent.remove(res); objs.forEach((o, i) => parent.insertAt(o, idx + i)); parent.dirty = true; } else { canvas.remove(res); objs.forEach((o, i) => canvas.insertAt(o, idx + i)); } });
        if (!parent && objs.length > 1) canvas.setActiveObject(new fabric.ActiveSelection(objs, { canvas })); else canvas.setActiveObject(parent || objs[0]);
        canvas.requestRenderAll(); X.snapshot && X.snapshot(); X.refreshLayers && X.refreshLayers(); done(objs);
      }));
    }
    document.addEventListener('keydown', e => { if (!S) return; if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); } else if (e.key === 'Enter' && !/INPUT|SELECT|TEXTAREA/.test((e.target && e.target.tagName) || '')) { e.preventDefault(); e.stopPropagation(); apply(); } }, true);
    function setDropStroke(v) { if (S) { S.dropStroke = !!v; ui && ui.update(S); } }
    const api = { start, set, setDropStroke, apply, cancel, restore, session: () => S, OPS };
    root.XTK_BOOL = api; return api;
  }
  const api = { localRings, reject, worldRings, prepare, prepareAsync, strokePlan, textToRings, bandRings, TXT_MAX_CONTOURS, TXT_MAX_IN, TXT_MAX_OUT, runJob, signature, combine, geomArea, toSVG, OPS, TOL, MAX_PTS, init, mul };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.XTK_BOOL_LIB = api;
})(typeof window !== 'undefined' ? window : globalThis);
