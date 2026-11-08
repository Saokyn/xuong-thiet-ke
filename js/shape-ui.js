// Phase 11 stage 3 UI: contextual "Kết hợp hình" + "Sửa điểm" buttons and their small session bars.
(function () {
  const X = window.XTK, BL = window.XTK_BOOL_LIB, NL = window.XTK_NODES_LIB; if (!X || !X.canvas || !BL || !NL) return;
  const canvas = X.canvas, $ = s => document.querySelector(s), bar = $('#floatBar'), stage = $('#stage') || document.body;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nm = o => esc(o.name || o.type);
  const grp = document.createElement('span'); grp.className = 'fbgrp'; grp.id = 'fbShape';
  grp.innerHTML = '<button id="fbBool" title="Kết hợp hình: hợp nhất, trừ, giao nhau, loại phần giao">⧉ Kết hợp hình</button><button id="fbNodes" title="Sửa điểm neo (cạnh thẳng)">✎ Sửa điểm</button>';
  bar.prepend(grp);
  const mk = (id, label) => { const d = document.createElement('div'); d.id = id; d.className = 'compbar'; d.setAttribute('role', 'toolbar'); d.setAttribute('aria-label', label); d.hidden = true; stage.appendChild(d); return d; };
  const bb = mk('boolBar', 'Kết hợp hình'), nb = mk('nodeBar', 'Sửa điểm');
  const B = BL.init(X, { update(S) {
    bb.hidden = !S; bar.classList.toggle('compediting', !!S); if (!S) return;
    const r = S.res || {}, two = S.objs.length === 2, back = r.back || S.objs[0], front = r.front || S.objs[S.objs.length - 1];
    const msg = S.busy ? '<span class="small" role="status">⏳ Đang tính…</span>' : r.error ? `<span class="err" role="alert">⚠ ${esc(r.error)}</span>` : r.empty ? '<span class="err" role="status">Kết quả rỗng — không có phần nào</span>' : `<span class="small" role="status">${r.geom.length} phần · ${r.ms} ms</span>`;
    const curve = S.meta && S.meta.curved ? '<span class="small warn">Đường cong được xấp xỉ bằng đoạn thẳng</span>' : '';
    const dis = S.busy || !S.res || r.error || r.empty;
    bb.innerHTML = Object.entries(BL.OPS).map(([k, v]) => `<button data-op="${k}" aria-pressed="${S.op === k}" class="${S.op === k ? 'primary' : ''}">${v}</button>`).join('')
      + (two ? `<span class="small">Sau (A): <b>${nm(back)}</b> · Trước (B): <b>${nm(front)}</b></span><button data-swap>⇄ Đổi trước/sau</button>` : `<span class="small">${S.objs.length} hình</span>`)
      + msg + curve + `<button data-ok class="primary" ${dis ? 'disabled' : ''}>Áp dụng <kbd>Enter</kbd></button><button data-cancel>Hủy <kbd>Esc</kbd></button>`;
  } });
  bb.addEventListener('click', e => { const t = e.target.closest('button'); if (!t) return; const S = B.session(); if (!S) return;
    if (t.dataset.op) B.set(t.dataset.op); else if ('swap' in t.dataset) { if (!S.busy) B.set(null, !S.swap); } else if ('ok' in t.dataset) B.apply(); else if ('cancel' in t.dataset) B.cancel(); });
  const N = NL.init(X, { update(S) {
    nb.hidden = !S; bar.classList.toggle('compediting', !!S); if (!S) return;
    nb.innerHTML = `<span class="small">Kéo điểm để di chuyển · bấm cạnh để thêm · chọn điểm rồi Delete để xóa (tối thiểu 3) · ${S.obj.points.length} điểm</span><button data-del ${S.sel < 0 || S.obj.points.length <= 3 ? 'disabled' : ''}>Xóa điểm</button><button data-ok class="primary">Xong <kbd>Enter</kbd></button><button data-cancel>Hủy <kbd>Esc</kbd></button>`;
  } });
  nb.addEventListener('click', e => { const t = e.target.closest('button'); if (!t) return; if ('del' in t.dataset) N.delSel(); else if ('ok' in t.dataset) N.finish(); else if ('cancel' in t.dataset) N.cancel(); });
  function sync() {
    const o = canvas.getActiveObject(), busy = B.session() || N.session();
    const multi = o && o.type === 'activeSelection' && o.size() >= 2, one = o && o.type !== 'activeSelection' && /^(rect|triangle|polygon|path)$/.test(o.type);
    $('#fbBool').hidden = !multi || !!busy; $('#fbNodes').hidden = !one || !!busy; grp.hidden = $('#fbBool').hidden && $('#fbNodes').hidden;
  }
  ['selection:created', 'selection:updated', 'selection:cleared', 'object:modified'].forEach(e => canvas.on(e, sync));
  $('#fbBool').onclick = () => B.start(); $('#fbNodes').onclick = () => N.start();
  sync();
})();
