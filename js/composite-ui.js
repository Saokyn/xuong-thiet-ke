// Phase 11 stage 2 UI: contextual "Lồng ảnh" actions in the floating object bar + image edit bar. Logic in composite.js.
(function () {
  const X = window.XTK, L = window.XTK_COMPOSITE_LIB; if (!X || !X.canvas || !L) return;
  const canvas = X.canvas, $ = s => document.querySelector(s), bar = $('#floatBar'), stage = $('#stage');
  const grp = document.createElement('span'); grp.className = 'fbgrp'; grp.id = 'fbComp';
  grp.innerHTML = '<button id="fbNest" title="Ảnh sẽ hiện bên trong nét chữ/hình (giữ vị trí ảnh hiện tại); ảnh rời được cất để Tách ảnh">🖼 Lồng ảnh</button><button id="fbCompStroke" title="Bật/tắt viền chữ/hình khi đang chứa ảnh">◌ Viền</button><button id="fbCompEdit" title="Chỉnh vị trí/cỡ ảnh bên trong (hình: bấm đúp)">✥ Chỉnh ảnh</button><button id="fbCompOut" title="Tách ảnh ra thành lớp riêng">⇱ Tách ảnh</button><button id="fbCompRestore" title="Khôi phục ảnh lồng khi tô bị mất">🖼 Khôi phục</button>';
  bar.prepend(grp);
  const eb = document.createElement('div'); eb.id = 'compBar'; eb.className = 'compbar'; eb.setAttribute('role', 'toolbar'); eb.setAttribute('aria-label', 'Chỉnh ảnh trong khung'); eb.hidden = true;
  eb.innerHTML = '<span class="small">Kéo để di chuyển · cuộn để phóng</span><button data-m="fit">Vừa khung</button><button data-m="fill">Lấp đầy</button><button data-m="reset">Đặt lại</button><button data-m="replace">Thay ảnh</button><button data-m="stroke">◌ Viền</button><button data-m="out">Tách ảnh</button><button data-m="ok" class="primary">Xong <kbd>Enter</kbd></button><button data-m="cancel">Hủy <kbd>Esc</kbd></button>';
  (stage || document.body).appendChild(eb);
  const file = document.createElement('input'); file.type = 'file'; file.accept = 'image/*'; file.hidden = true; document.body.appendChild(file);
  const C = L.init(X, { onEdit(on) { eb.hidden = !on; bar.classList.toggle('compediting', on); sync(); } });
  const sel = () => canvas.getActiveObject();
  function sync() {
    const o = sel(), objs = o ? (o.type === 'activeSelection' ? o.getObjects() : [o]) : [];
    const canNest = objs.length === 2 && objs.some(x => x.type === 'image'), isC = objs.length === 1 && C.isComposite(objs[0]);
    const needR = isC && C.needsPatternRestore && C.needsPatternRestore(objs[0]);
    $('#fbNest').hidden = !canNest; $('#fbCompEdit').hidden = !isC || !!C.editing() || needR; $('#fbCompOut').hidden = !isC || needR; $('#fbCompStroke').hidden = !isC; $('#fbCompRestore').hidden = !needR; grp.hidden = !canNest && !isC;
  }
  ['selection:created', 'selection:updated', 'selection:cleared', 'object:modified'].forEach(e => canvas.on(e, sync));
  $('#fbNest').onclick = () => { const o = sel(); if (o) C.nest(o.type === 'activeSelection' ? o.getObjects().slice() : [o]).then(sync); };
  $('#fbCompStroke').onclick = () => { const o = sel(); if (C.isComposite(o)) C.toggleStroke(o); };
  $('#fbCompEdit').onclick = () => { const o = sel(); if (C.isComposite(o)) C.begin(o); };
  $('#fbCompOut').onclick = () => { const o = sel(); if (C.isComposite(o)) { C.end(true); C.release(o).then(sync); } };
  $('#fbCompRestore').onclick = () => { const o = sel(); if (C.restorePattern) C.restorePattern(o).then(sync); };
  eb.addEventListener('click', e => {
    const m = e.target.closest('[data-m]')?.dataset.m, f = C.editing(); if (!m || !f) return;
    if (m === 'fit' || m === 'fill') C.reset(f, m); else if (m === 'reset') C.reset(f, 'fill');
    else if (m === 'replace') file.click(); else if (m === 'stroke') { C.end(true); C.toggleStroke(f); C.begin(f); } else if (m === 'ok') C.end(true); else if (m === 'cancel') C.end(false);
    else if (m === 'out') { C.end(true); C.release(f).then(sync); }
  });
  file.onchange = () => { const f = file.files[0], fr = C.editing(); file.value = ''; if (!f || !fr || !/^image\//.test(f.type)) return; const rd = new FileReader(); rd.onload = () => { C.end(true); C.replace(fr, rd.result).then(r => { if (r) { X.snapshot(); C.begin(fr); } }); }; rd.readAsDataURL(f); };
  // Colour pickers must not silently overwrite an image fill
  const guard = e => { const o = sel(); if (o && C.isComposite(o) && /^(fbColor|colorPick)$/.test(e.target.id)) { e.stopImmediatePropagation(); X.toast('Đối tượng đang chứa ảnh — “Tách ảnh” trước khi đổi màu.', 2200); } };
  document.addEventListener('input', guard, true); document.addEventListener('change', guard, true);
  sync();
})();
