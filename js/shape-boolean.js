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
  // Engine part (runs in the Web Worker): rings of each shape combined even-odd, then the operation.
  function runJob(pc, job) {
    try {
      const gs = job.shapes.map(rings => { let g = [[rings[0]]]; for (let i = 1; i < rings.length; i++) g = pc.xor(g, [[rings[i]]]); return g; });
      const [A, B] = gs, op = job.op;
      const geom = op === 'union' ? pc.union(...gs) : op === 'subtract' ? pc.difference(A, B) : op === 'intersect' ? pc.intersection(A, B) : pc.xor(A, B);
      return { id: job.id, geom };
    } catch (e) { return { id: job.id, error: 'Không tính được phép kết hợp (hình suy biến?).' }; }
  }
  // Synchronous convenience (Node tests only — the browser always uses the worker)
  function combine(pc, objs, op, swap, mats) {
    const p = prepare(objs, op, swap, mats); if (p.error) return p;
    const t0 = Date.now(), r = runJob(pc, { id: 0, op: p.op, shapes: p.shapes }); if (r.error) return r;
    return { geom: r.geom, style: p.style, back: p.back, front: p.front, curved: p.curved, ms: Date.now() - t0, empty: !r.geom.length };
  }
  // Staleness signature of the current source geometry/style + stacking
  const signature = (objs, list) => JSON.stringify(objs.map(o => [list ? list.indexOf(o) : 0, o.calcTransformMatrix().map(v => +v.toFixed(6)), o.type, o.width, o.height, o.rx, o.ry, o.radius, o.points, o.path, o.pathOffset, o.fill, o.visible]));
  const area = r => { let s = 0; for (let i = 0; i < r.length - 1; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return s / 2; };
  const geomArea = g => g.reduce((s, poly) => s + Math.abs(area(poly[0])) - poly.slice(1).reduce((h, r) => h + Math.abs(area(r)), 0), 0);
  const toSVG = g => g.map(poly => poly.map(r => 'M ' + r.slice(0, -1).map(p => (+p[0].toFixed(3)) + ' ' + (+p[1].toFixed(3))).join(' L ') + ' Z').join(' ')).join(' ');

  // ---------- browser wiring ----------
  const TIMEOUT_MS = 4000;
  function init(X, ui) {
    const canvas = X.canvas, toast = X.toast || (() => { }), U = root.XTK_UTIL, ov = U ? U.overlay(canvas) : null;
    const quiet = f => (U ? U.withRestoring(X, f) : f());
    let worker = null, seq = 0, S = null;
    function getWorker() {
      if (worker) return worker;
      if (typeof Worker === 'undefined') throw new Error('Trình duyệt không hỗ trợ Web Worker — không thể kết hợp hình an toàn.');
      worker = new Worker('js/bool-worker.js');
      worker.onmessage = e => onResult(e.data);
      worker.onerror = e => { e.preventDefault && e.preventDefault(); kill(); if (S && S.busy) finishJob({ id: S.jobId, error: 'Không tải được bộ tính hình (polygon-clipping).' }); };
      return worker;
    }
    function kill() { if (worker) { worker.terminate(); worker = null; } }
    const zorder = list => list.slice().sort((a, b) => canvas.getObjects().indexOf(a) - canvas.getObjects().indexOf(b));
    function drawLayer(t, z) {
      if (!S || !S.res || !S.res.geom || !S.res.geom.length || S.busy) return;
      const p = new Path2D(toSVG(S.res.geom)); t.fillStyle = 'rgba(249,115,22,.35)'; t.fill(p, 'evenodd'); t.lineWidth = 2 / z; t.strokeStyle = '#f97316'; t.stroke(p);
    }
    const paint = () => ov && ov.set('boolean', S ? drawLayer : null);
    function onRemoved(e) { if (S && S.objs.includes(e.target)) { toast('Hình nguồn đã bị xóa/thay đổi — đã hủy kết hợp hình.', 2500); stop(); } }
    function start() {
      if (S) return;
      const a = canvas.getActiveObject(); if (!a || a.type !== 'activeSelection') { toast('Chọn từ 2 hình khối trở lên (Shift + bấm).', 2200); return; }
      try { getWorker(); } catch (e) { toast(e.message, 3000); return; }
      const objs = zorder(a.getObjects()); canvas.discardActiveObject(); // back to scene coordinates; nothing mutated
      // Freeze ALL canvas interaction without touching serialized object props (so no snapshot can capture frozen flags)
      S = { objs, op: 'union', swap: false, res: null, busy: false, jobId: 0, prevSkip: canvas.skipTargetFind, prevSel: canvas.selection };
      canvas.skipTargetFind = true; canvas.selection = false;
      canvas.on('object:removed', onRemoved); compute(); canvas.requestRenderAll();
    }
    function compute() {
      if (!S) return; const p = prepare(S.objs, S.op, S.swap); S.meta = p; S.sig = signature(S.objs, canvas.getObjects());
      if (p.error) { S.busy = false; S.res = { error: p.error }; ui && ui.update(S); paint(); return; }
      const id = ++seq; S.jobId = id; S.busy = true; S.res = null; S.t0 = Date.now(); ui && ui.update(S); paint();
      clearTimeout(S.timer); S.timer = setTimeout(() => { if (S && S.jobId === id && S.busy) { kill(); finishJob({ id, error: 'Phép tính quá lâu (>' + TIMEOUT_MS / 1000 + ' giây) — đã dừng. Hãy giảm độ phức tạp.' }); } }, TIMEOUT_MS);
      try { getWorker().postMessage({ id, op: p.op, shapes: p.shapes }); } catch (e) { finishJob({ id, error: e.message }); }
    }
    function onResult(d) { if (S && d && d.id === S.jobId) finishJob(d); } // obsolete/cancelled job ids are ignored
    function finishJob(d) {
      if (!S || d.id !== S.jobId) return; clearTimeout(S.timer); S.busy = false;
      S.res = d.error ? { error: d.error } : { geom: d.geom, empty: !d.geom.length, ms: Date.now() - S.t0, back: S.meta.back, front: S.meta.front, style: S.meta.style, curved: S.meta.curved };
      ui && ui.update(S); paint();
    }
    function set(op, swap) { if (!S) return; if (op) S.op = op; if (swap != null) S.swap = swap; compute(); }
    function stop() {
      if (!S) return; const s = S; S = null; clearTimeout(s.timer); seq++; // invalidate any pending result
      canvas.off('object:removed', onRemoved); canvas.skipTargetFind = s.prevSkip; canvas.selection = s.prevSel;
      paint(); ui && ui.update(null); canvas.requestRenderAll(); return s;
    }
    function cancel() { const s = stop(); if (s) { const alive = s.objs.filter(o => canvas.getObjects().includes(o)); if (alive.length > 1) { canvas.setActiveObject(new fabric.ActiveSelection(alive, { canvas })); canvas.requestRenderAll(); } } }
    function apply() {
      if (!S || S.busy || !S.res || S.res.error) return false;
      const list = canvas.getObjects();
      if (!S.objs.every(o => list.includes(o))) { toast('Hình nguồn đã bị xóa — đã hủy.', 2200); stop(); return false; }
      if (signature(S.objs, list) !== S.sig) { toast('Hình nguồn đã thay đổi — đã tính lại, bấm Áp dụng lần nữa.', 2500); compute(); return false; }
      if (S.res.empty) { toast('Kết quả rỗng — không có gì để tạo, các hình được giữ nguyên.', 2500); return false; }
      const st = S.res.style, path = new fabric.Path(toSVG(S.res.geom), { fill: st.fill, fillRule: 'evenodd', stroke: st.stroke, strokeWidth: (st.strokeWidth || 0) * scaleOf(st.calcTransformMatrix()), strokeLineJoin: 'round', opacity: st.opacity, name: OPS[S.op] });
      path.xtk = { boolean: { op: S.op, flattened: !!S.res.curved, sources: S.objs.map(o => o.toObject((root.XTK_FX && XTK_FX.PROPS) || ['name', 'xtk'])) } };
      const idx = Math.min(...S.objs.map(o => list.indexOf(o))), objs = S.objs; stop();
      quiet(() => { objs.forEach(o => canvas.remove(o)); canvas.insertAt(path, idx); });
      canvas.setActiveObject(path); canvas.requestRenderAll(); X.snapshot && X.snapshot(); X.refreshLayers && X.refreshLayers(); return path;
    }
    document.addEventListener('keydown', e => { if (!S) return; if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); } else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); apply(); } }, true);
    const api = { start, set, apply, cancel, session: () => S, OPS };
    root.XTK_BOOL = api; return api;
  }
  const api = { localRings, reject, worldRings, prepare, runJob, signature, combine, geomArea, toSVG, OPS, TOL, MAX_PTS, init, mul };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.XTK_BOOL_LIB = api;
})(typeof window !== 'undefined' ? window : globalThis);
