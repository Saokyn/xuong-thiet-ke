// Phase 11 stage 3: "Sửa điểm" — straight-segment polygon anchor editing (no Bézier handles).
// rect (square corners) / triangle are converted to an equivalent 3–4 point polygon keeping the same transform; straight
// single-ring paths (e.g. Kết hợp hình results) convert too. Curved shapes are refused with an explanation (never flattened silently).
(function (root) {
  const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  const inv = m => { const d = m[0] * m[3] - m[1] * m[2]; return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d, (m[2] * m[5] - m[3] * m[4]) / d, (m[1] * m[4] - m[0] * m[5]) / d]; };
  const ap = (m, x, y) => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });
  const area = P => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a.x * b.y - b.x * a.y; } return s / 2; };
  function segX(p, q, r, s) { // proper segment intersection (shared endpoints excluded)
    const o = (a, b, c) => Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
    return o(p, q, r) * o(p, q, s) < 0 && o(r, s, p) * o(r, s, q) < 0;
  }
  function selfIntersects(P) {
    const n = P.length;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { if (j === i + 1 || (i === 0 && j === n - 1)) continue; if (segX(P[i], P[(i + 1) % n], P[j], P[(j + 1) % n])) return true; }
    return false;
  }
  function validate(P) {
    if (P.length < 3) return 'Cần ít nhất 3 điểm.';
    if (selfIntersects(P)) return 'Các cạnh đang cắt nhau — sửa lại hoặc Esc để hủy.';
    if (Math.abs(area(P)) < 1e-3) return 'Hình bị dẹt (diện tích ≈ 0) — kéo các điểm ra.';
    return null;
  }
  // nearest edge to local point within tol (local units) → {i (insert after i), t, d} | null
  function nearestEdge(P, p, tol) {
    let best = null;
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length], dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L)), d = Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y);
      if (d <= tol && (!best || d < best.d)) best = { i, t, d };
    }
    return best;
  }
  const nearestVertex = (P, p, tol) => { let b = -1, bd = tol; P.forEach((q, i) => { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d <= bd) { bd = d; b = i; } }); return b; };
  // Keep scene position stable: points edited in raw point space; M = old object matrix (maps p - po → scene)
  function recenter(P, po, M) {
    const xs = P.map(p => p.x), ys = P.map(p => p.y), minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const c = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
    return { pathOffset: c, width: maxX - minX, height: maxY - minY, center: ap(M, c.x - po.x, c.y - po.y) };
  }
  // Points (local, centred) for convertible types, or {error}
  function convertible(o) {
    const w = o.width, h = o.height;
    if (o.xtk && o.xtk.locked) return { error: 'Lớp đang khóa — mở khóa trước.' };
    if (o.xtk && o.xtk.composite) return { error: 'Hình đang chứa ảnh — “Tách ảnh” trước khi sửa điểm.' };
    if (o.type === 'polygon') return { points: o.points.map(p => ({ x: p.x, y: p.y })), keep: true };
    if (o.type === 'rect') return (o.rx || o.ry) ? { error: 'Hình chữ nhật bo góc có cạnh cong — chưa sửa điểm thẳng được.' } : { points: [{ x: -w / 2, y: -h / 2 }, { x: w / 2, y: -h / 2 }, { x: w / 2, y: h / 2 }, { x: -w / 2, y: h / 2 }] };
    if (o.type === 'triangle') return { points: [{ x: -w / 2, y: h / 2 }, { x: 0, y: -h / 2 }, { x: w / 2, y: h / 2 }] };
    if (o.type === 'path') {
      const c = o.path, pts = []; let rings = 0;
      for (const s of c) { if (s[0] === 'M') { if (++rings > 1) return { error: 'Hình có lỗ hoặc nhiều phần — chưa sửa điểm được.' }; pts.push({ x: s[1], y: s[2] }); } else if (s[0] === 'L') pts.push({ x: s[1], y: s[2] }); else if (s[0] === 'Z' || s[0] === 'z') { } else return { error: 'Hình có đường cong — chưa hỗ trợ sửa điểm cong (không tự làm thẳng).' }; }
      const po = o.pathOffset || { x: 0, y: 0 }; if (pts.length > 1 && pts[0].x === pts[pts.length - 1].x && pts[0].y === pts[pts.length - 1].y) pts.pop();
      return pts.length >= 3 ? { points: pts.map(p => ({ x: p.x - po.x, y: p.y - po.y })) } : { error: 'Đường quá ít điểm.' };
    }
    if (o.type === 'circle' || o.type === 'ellipse') return { error: 'Hình tròn/elip là đường cong — chưa sửa điểm thẳng được.' };
    return { error: 'Loại đối tượng này không sửa điểm được.' };
  }

  // ---------- browser wiring ----------
  function init(X, ui) {
    const canvas = X.canvas, toast = X.toast || (() => { }), U = fabric.util;
    let S = null;
    const tolPx = 8;
    const mats = o => o.calcTransformMatrix();
    function toLocal(o, scene) { const m = inv(mats(o)), q = ap(m, scene.x, scene.y); return { x: q.x + o.pathOffset.x, y: q.y + o.pathOffset.y }; }
    const localTol = o => { const m = mats(o), k = Math.max(Math.hypot(m[0], m[1]), Math.hypot(m[2], m[3])) * canvas.getZoom(); return tolPx / k; };
    function commitDims(o) {
      const r = recenter(o.points, o.pathOffset, mats(o));
      o.set({ width: r.width, height: r.height }); o.pathOffset = new fabric.Point(r.pathOffset.x, r.pathOffset.y);
      o.setPositionByOrigin(new fabric.Point(r.center.x, r.center.y), 'center', 'center'); o.setCoords(); o.dirty = true;
    }
    function controlsFor(o) {
      const c = {};
      o.points.forEach((p, i) => {
        c['p' + i] = new fabric.Control({
          cursorStyle: 'pointer', sizeX: 12, sizeY: 12,
          positionHandler: (dim, finalM, obj) => { const q = obj.points[i]; return U.transformPoint({ x: q.x - obj.pathOffset.x, y: q.y - obj.pathOffset.y }, U.multiplyTransformMatrices(canvas.viewportTransform, mats(obj))); },
          actionHandler: (e, tr, x, y) => { const obj = tr.target, l = toLocal(obj, { x, y }); obj.points[i] = { x: l.x, y: l.y }; S.sel = i; obj.dirty = true; return true; },
          mouseDownHandler: () => { S.sel = i; ui && ui.update(S); canvas.requestRenderAll(); return false; },
          actionName: 'modifyPolygon',
          render: (ctx, left, top) => { ctx.save(); ctx.fillStyle = S && S.sel === i ? '#f97316' : '#fff'; ctx.strokeStyle = '#4f46e5'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(left, top, 6, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore(); }
        });
      });
      return c;
    }
    function refreshControls() { const o = S.obj; o.controls = controlsFor(o); o.hasBorders = false; canvas.requestRenderAll(); ui && ui.update(S); }
    function start(o) {
      if (S) return; o = o || canvas.getActiveObject(); if (!o || o.type === 'activeSelection') { toast('Chọn 1 hình để sửa điểm.', 1800); return; }
      const cv = convertible(o); if (cv.error) { toast(cv.error, 2600); return; }
      const endHold = root.XTK_UTIL ? XTK_UTIL.holdRestoring(X) : () => { }; // whole session = one undo step; restores previous flag
      let poly = o; const before = o.toObject((window.XTK_FX && XTK_FX.PROPS) || ['name', 'xtk']), idx = canvas.getObjects().indexOf(o);
      if (!cv.keep) try {
        const m = mats(o); poly = new fabric.Polygon(cv.points.map(p => ({ x: p.x, y: p.y })), { fill: o.fill, stroke: o.stroke, strokeWidth: o.strokeWidth, strokeLineJoin: o.strokeLineJoin || 'miter', opacity: o.opacity, angle: o.angle, scaleX: o.scaleX, scaleY: o.scaleY, skewX: o.skewX, skewY: o.skewY, flipX: o.flipX, flipY: o.flipY, shadow: o.shadow, name: o.name, objectCaching: false });
        poly.xtk = o.xtk; poly.setPositionByOrigin(new fabric.Point(m[4], m[5]), 'center', 'center');
        canvas.remove(o); canvas.insertAt(poly, idx);
      } catch (e) { if (!canvas.getObjects().includes(o)) canvas.insertAt(o, idx); endHold(); toast('Không chuyển được hình sang điểm neo.', 2200); return; }
      S = { obj: poly, orig: o, before, converted: !cv.keep, P0: poly.points.map(p => ({ ...p })), po0: { ...poly.pathOffset }, dims: { width: poly.width, height: poly.height, left: poly.left, top: poly.top }, sel: -1, endHold, ctrls: poly.controls, borders: poly.hasBorders, locks: { lockMovementX: poly.lockMovementX, lockMovementY: poly.lockMovementY } };
      poly.objectCaching = false; poly.set({ lockMovementX: true, lockMovementY: true });
      canvas.setActiveObject(poly); refreshControls();
    }
    function finish() {
      if (!S) return; const o = S.obj, err = validate(o.points); if (err) { toast(err, 2600); return false; }
      commitDims(o); o.controls = S.ctrls; o.hasBorders = S.borders; o.set(S.locks); o.objectCaching = true; const eh = S.endHold; S = null;
      eh(); canvas.requestRenderAll(); X.snapshot && X.snapshot(); X.refreshLayers && X.refreshLayers(); ui && ui.update(null); return true;
    }
    function cancel() {
      if (!S) return; const s = S; S = null; const o = s.obj;
      if (s.converted) { const i = canvas.getObjects().indexOf(o); canvas.remove(o); canvas.insertAt(s.orig, i); canvas.setActiveObject(s.orig); }
      else { o.points = s.P0; o.pathOffset = new fabric.Point(s.po0.x, s.po0.y); o.set(s.dims); o.controls = s.ctrls; o.hasBorders = s.borders; o.set(s.locks); o.objectCaching = true; o.setCoords(); o.dirty = true; }
      s.endHold(); canvas.requestRenderAll(); ui && ui.update(null);
    }
    canvas.on('mouse:down', ev => {
      if (!S) return; const o = S.obj; if (ev.transform && ev.transform.corner) return;
      if (ev.target !== o) { if (!finish()) canvas.setActiveObject(o); return; }
      const l = toLocal(o, canvas.getPointer(ev.e)), tol = localTol(o);
      if (nearestVertex(o.points, l, tol) >= 0) return;
      const e = nearestEdge(o.points, l, tol); if (!e) return;
      o.points.splice(e.i + 1, 0, l); S.sel = e.i + 1; refreshControls();
    });
    canvas.on('mouse:up', () => { if (S) { S.obj.setCoords(); canvas.requestRenderAll(); } });
    function delSel() { if (!S || S.sel < 0) return; if (S.obj.points.length <= 3) { toast('Cần tối thiểu 3 điểm.', 1500); return; } S.obj.points.splice(S.sel, 1); S.sel = -1; S.obj.dirty = true; refreshControls(); }
    document.addEventListener('keydown', e => {
      if (!S) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); cancel(); }
      else if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); finish(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); e.stopImmediatePropagation(); delSel(); }
    }, true);
    const api = { start, finish, cancel, delSel, session: () => S, convertible };
    window.XTK_NODES = api; return api;
  }
  const api = { area, selfIntersects, validate, nearestEdge, nearestVertex, recenter, convertible, init, mul, inv, ap };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.XTK_NODES_LIB = api;
})(typeof window !== 'undefined' ? window : globalThis);
