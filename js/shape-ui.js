// "Kết hợp hình" panel (docked in the right Thuộc tính panel by default, optional floating window with a drag handle),
// "Sửa điểm" bar, "↺ Khôi phục gốc". Logic lives in shape-boolean.js / shape-nodes.js.
(function (root) {
  // Keep a floating panel fully reachable inside the viewport (pure; unit-tested)
  function clampPos(x, y, w, h, vw, vh, m) { m = m == null ? 8 : m; return { x: Math.round(Math.max(m, Math.min(vw - w - m, x))), y: Math.round(Math.max(m, Math.min(vh - h - m, y))) }; }
  if (typeof module !== 'undefined' && module.exports) { module.exports = { clampPos }; return; }
  const X = root.XTK, BL = root.XTK_BOOL_LIB, NL = root.XTK_NODES_LIB; if (!X || !X.canvas || !BL || !NL) return;
  const canvas = X.canvas, $ = s => document.querySelector(s), bar = $('#floatBar'), stage = $('#stage') || document.body;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nm = o => esc((root.XTK_LAYERS && XTK_LAYERS.layerName) ? XTK_LAYERS.layerName(o) : (o.name || o.type));
  const OKT = /^(rect|circle|ellipse|triangle|polygon|path|textbox|i-text|text)$/;
  // ---- floating-bar buttons (contextual only)
  const grp = document.createElement('span'); grp.className = 'fbgrp'; grp.id = 'fbShape';
  grp.innerHTML = '<button id="fbBool" title="Kết hợp hình/chữ: hợp nhất, trừ, giao nhau, loại phần giao">⧉ Kết hợp hình</button><button id="fbNodes" title="Sửa điểm neo (cạnh thẳng)">✎ Sửa điểm</button><button id="fbRestore" title="Trả lại các hình/chữ gốc (chữ sửa được như cũ)">↺ Khôi phục gốc</button>';
  bar.prepend(grp);
  // ---- dock panel
  const dock = document.createElement('section'); dock.id = 'boolDock'; dock.className = 'booldock'; dock.setAttribute('role', 'region'); dock.setAttribute('aria-label', 'Kết hợp hình'); dock.hidden = true;
  const pane = $('#paneProps'); pane ? pane.insertBefore(dock, $('#propsBody')) : document.body.appendChild(dock);
  const LS = 'xtk-booldock'; let pos = (() => { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) { return {}; } })();
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(pos)); } catch (e) { } };
  function place() {
    dock.classList.toggle('floating', !!pos.float);
    const host = pos.float || !pane ? document.body : pane; if (dock.parentNode !== host) pos.float || !pane ? host.appendChild(dock) : pane.insertBefore(dock, $('#propsBody'));
    if (pos.float) { const r = dock.getBoundingClientRect(), c = clampPos(pos.x == null ? innerWidth - r.width - 24 : pos.x, pos.y == null ? 80 : pos.y, r.width, r.height, innerWidth, innerHeight); dock.style.left = c.x + 'px'; dock.style.top = c.y + 'px'; pos.x = c.x; pos.y = c.y; }
    else { dock.style.left = dock.style.top = ''; }
  }
  addEventListener('resize', () => { if (pos.float && !dock.hidden) { place(); save(); } });
  // drag only via the handle; pointer capture keeps canvas gestures untouched
  dock.addEventListener('pointerdown', e => {
    const h = e.target.closest('.bdhandle'); if (!h || !pos.float || e.button > 0) return;
    e.preventDefault(); h.setPointerCapture(e.pointerId); const r = dock.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
    const mv = ev => { const c = clampPos(ev.clientX - ox, ev.clientY - oy, r.width, r.height, innerWidth, innerHeight); dock.style.left = c.x + 'px'; dock.style.top = c.y + 'px'; pos.x = c.x; pos.y = c.y; };
    const up = () => { h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up); save(); };
    h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
  });
  dock.addEventListener('keydown', e => { // keyboard move of the floating panel
    if (!e.target.classList.contains('bdhandle') || !pos.float) return; const d = e.shiftKey ? 40 : 10, k = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[e.key]; if (!k) return;
    e.preventDefault(); e.stopPropagation(); pos.x += k[0]; pos.y += k[1]; place(); save();
  });
  const head = () => `<div class="bdhead">${pos.float ? '<span class="bdhandle" tabindex="0" role="button" aria-label="Kéo để di chuyển bảng (hoặc dùng phím mũi tên)" title="Kéo để di chuyển">⠿</span>' : ''}<b>⧉ Kết hợp hình</b><span class="bdsp"></span><button data-float title="${pos.float ? 'Gắn lại vào cột Thuộc tính' : 'Tách thành bảng nổi kéo được'}">${pos.float ? '⇲ Gắn vào cột' : '⇱ Thả nổi'}</button>${pos.float ? '<button data-reset title="Đưa bảng về góc phải trên">Đặt lại</button>' : ''}</div>`;
  let groupPick = null; // {group, a, b}
  function render(S) {
    const o = canvas.getActiveObject();
    if (S) {
      const r = S.res || {}, two = S.objs.length === 2, back = r.back || (S.meta && S.meta.back) || S.objs[0], front = r.front || (S.meta && S.meta.front) || S.objs[S.objs.length - 1];
      const msg = S.busy ? '<p class="small" role="status">⏳ Đang tính… (đọc nét phông nếu có chữ)</p>' : r.error ? `<p class="err" role="alert">⚠ ${esc(r.error)}</p>` : r.empty ? '<p class="err" role="status">Kết quả rỗng — không có phần nào</p>' : `<p class="small" role="status">${r.geom.length} phần · ${r.ms} ms${r.iou ? ` · khớp nét chữ ${Math.round(r.iou * 100)}%` : ''}</p>`;
      const notes = (S.meta && S.meta.curved ? '<p class="small warn">Đường cong được xấp xỉ bằng đoạn thẳng.</p>' : '') + (S.meta && S.meta.hasText ? '<p class="small warn">Có chữ: kết quả là hình vector (không còn sửa chữ trực tiếp). Dùng “↺ Khôi phục gốc” để lấy lại chữ.</p>' : '') + (S.meta && S.meta.band ? '<p class="small">Viền ngoài của hình được giữ (lỗ chữ không có viền).</p>' : '') + (S.meta && S.meta.strokeIssue && !S.busy ? `<p class="small warn" role="alert">⚠ ${esc(S.meta.strokeIssue)}</p><label class="small"><input type="checkbox" data-dropstroke ${S.dropStroke ? 'checked' : ''}> Chấp nhận bỏ viền</label>` : '') + (S.parent ? '<p class="small">Trong nhóm — các thành phần khác giữ nguyên.</p>' : '');
      const dis = S.busy || !S.res || r.error || r.empty || (S.meta && S.meta.strokeIssue && !S.dropStroke);
      dock.innerHTML = head() + `<div class="bdops" role="group" aria-label="Phép kết hợp">${Object.entries(BL.OPS).map(([k, v]) => `<button data-op="${k}" aria-pressed="${S.op === k}" class="${S.op === k ? 'primary' : ''}" ${S.busy || (!two && k !== 'union') ? 'disabled' : ''}>${v}</button>`).join('')}</div>`
        + (two ? `<p class="small">Sau (A): <b>${nm(back)}</b><br>Trước (B): <b>${nm(front)}</b> <button data-swap ${S.busy ? 'disabled' : ''}>⇄ Đổi</button></p>` : `<p class="small">${S.objs.length} đối tượng</p>`)
        + msg + notes + `<div class="bdact"><button data-ok class="primary" ${dis ? 'disabled' : ''}>Áp dụng <kbd>Enter</kbd></button><button data-cancel>Hủy <kbd>Esc</kbd></button></div>`;
    } else if (o && o.type === 'group' && !(o.xtk && o.xtk.boolean)) {
      const kids = o.getObjects().filter(k => OKT.test(k.type));
      if (kids.length < 2) { dock.hidden = true; return; }
      if (!groupPick || groupPick.group !== o) groupPick = { group: o, a: 0, b: 1 };
      const opt = sel => kids.map((k, i) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${nm(k)}</option>`).join('');
      dock.innerHTML = head() + `<p class="small">Chọn 2 thành phần trong nhóm (giữ nguyên các thành phần khác):</p><label class="small">Sau (A) <select data-ga>${opt(groupPick.a)}</select></label><label class="small">Trước (B) <select data-gb>${opt(groupPick.b)}</select></label><div class="bdact"><button data-gstart class="primary">Bắt đầu</button></div>` + o.getObjects().map((k, i) => k.xtk && k.xtk.boolean && k.xtk.boolean.sources ? `<button data-grestore="${i}" title="Trả lại các đối tượng gốc trong nhóm">↺ Khôi phục gốc: ${nm(k)}</button>` : '').join('');
      dock._kids = kids;
    } else { dock.hidden = true; return; }
    dock.hidden = false; place();
  }
  const B = BL.init(X, { update(S) { bar.classList.toggle('compediting', !!S); if (S && pane && pane.hidden) $('#ptabProps') && $('#ptabProps').click(); render(S); sync(); } });
  dock.addEventListener('change', e => { if (e.target.matches('[data-dropstroke]')) { B.setDropStroke(e.target.checked); return; } if (!groupPick) return; if (e.target.matches('[data-ga]')) groupPick.a = +e.target.value; if (e.target.matches('[data-gb]')) groupPick.b = +e.target.value; });
  dock.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return; const S = B.session();
    if ('float' in t.dataset) { pos.float = !pos.float; save(); render(S); return; }
    if ('reset' in t.dataset) { pos = { float: true }; save(); render(S); return; }
    if ('grestore' in t.dataset) { const g = canvas.getActiveObject(); if (g && g.type === 'group') B.restore(g.getObjects()[+t.dataset.grestore]); return; }
    if ('gstart' in t.dataset) { const k = dock._kids; if (groupPick.a === groupPick.b) { X.toast('Chọn 2 thành phần khác nhau.', 1800); return; } B.start([k[groupPick.a], k[groupPick.b]]); return; }
    if (!S) return;
    if (t.dataset.op) B.set(t.dataset.op); else if ('swap' in t.dataset) B.set(null, !S.swap); else if ('ok' in t.dataset) B.apply(); else if ('cancel' in t.dataset) B.cancel();
  });
  // ---- Sửa điểm bar (unchanged behaviour)
  const nb = document.createElement('div'); nb.id = 'nodeBar'; nb.className = 'compbar'; nb.setAttribute('role', 'toolbar'); nb.setAttribute('aria-label', 'Sửa điểm'); nb.hidden = true; stage.appendChild(nb);
  const N = NL.init(X, { update(S) {
    nb.hidden = !S; bar.classList.toggle('compediting', !!S); if (!S) return;
    nb.innerHTML = `<span class="small">Kéo điểm để di chuyển · bấm cạnh để thêm · chọn điểm rồi Delete để xóa (tối thiểu 3) · ${S.obj.points.length} điểm</span><button data-del ${S.sel < 0 || S.obj.points.length <= 3 ? 'disabled' : ''}>Xóa điểm</button><button data-ok class="primary">Xong <kbd>Enter</kbd></button><button data-cancel>Hủy <kbd>Esc</kbd></button>`;
  } });
  nb.addEventListener('click', e => { const t = e.target.closest('button'); if (!t) return; if ('del' in t.dataset) N.delSel(); else if ('ok' in t.dataset) N.finish(); else if ('cancel' in t.dataset) N.cancel(); });
  function sync() {
    const o = canvas.getActiveObject(), busy = B.session() || N.session();
    const multi = o && o.type === 'activeSelection' && o.size() >= 2 && o.getObjects().every(k => OKT.test(k.type)), one = o && /^(rect|triangle|polygon|path)$/.test(o.type), isRes = o && o.xtk && o.xtk.boolean && o.xtk.boolean.sources;
    $('#fbBool').hidden = !multi || !!busy; $('#fbNodes').hidden = !one || !!busy; $('#fbRestore').hidden = !isRes || !!busy;
    grp.hidden = $('#fbBool').hidden && $('#fbNodes').hidden && $('#fbRestore').hidden;
    if (!busy) render(null);
  }
  ['selection:created', 'selection:updated', 'selection:cleared', 'object:modified'].forEach(e => canvas.on(e, sync));
  $('#fbBool').onclick = () => B.start(); $('#fbNodes').onclick = () => N.start(); $('#fbRestore').onclick = () => B.restore();
  sync();
})(typeof window !== 'undefined' ? window : globalThis);
