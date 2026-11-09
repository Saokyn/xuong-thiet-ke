// UI for tab Nền: quick colour row + searchable/filterable palette library with "Áp bộ màu".
// Logic/data: js/palettes.js. Brand Kit / gradients / patterns / image palette stay untouched.
(function (root) {
  const X = root.XTK, P = root.XTK_PALETTES;
  if (!X || !X.canvas || !P) return;
  const $ = s => document.querySelector(s), canvas = X.canvas;

  // ---- Quick row: replace the old 15-swatch grid; click = fill selection, else set background
  const pal = $('#palette');
  if (pal) {
    pal.innerHTML = '';
    pal.classList.add('palette-quick');
    P.QUICK.forEach(c => {
      const s = document.createElement('span');
      s.style.background = c; s.title = c; s.setAttribute('role', 'button'); s.setAttribute('aria-label', 'Màu ' + c);
      s.onclick = () => {
        const CP = root.XTK_COLOR_PANEL, o = canvas.getActiveObject();
        if (CP) { CP.open(o ? (/text/i.test(o.type) ? 'text' : 'fill') : 'bg', o); return; }
        $('#colorPick').value = c;
        if (o) X.applyColor(c);
        else if (root.XTK_HOOKS && root.XTK_HOOKS.setBg) root.XTK_HOOKS.setBg(c);
        else { canvas.backgroundColor = c; canvas.requestRenderAll(); X.snapshot && X.snapshot(); }
      };
      pal.appendChild(s);
    });
  }

  // ---- Library panel (inserted after the quick-row / applyBg row, before gradients)
  const host = document.querySelector('.tab[data-tab="bg"]');
  if (!host || host.querySelector('#palLib')) return;
  const box = document.createElement('div');
  box.id = 'palLib'; box.className = 'pal-lib';
  box.innerHTML = `
    <details open>
      <summary><b>Bộ màu thiết kế</b> <span class="small muted">(${P.PALETTES.length} bảng · 4 màu)</span></summary>
      <input id="palSearch" type="search" placeholder="Tìm theo tên…" aria-label="Tìm bảng màu" autocomplete="off">
      <div id="palChips" class="pal-chips" role="toolbar" aria-label="Lọc theo nhóm"></div>
      <div id="palList" class="pal-list" role="list"></div>
      <p class="small muted">Bấm một ô màu để tô đối tượng đang chọn (hoặc nền). Nút <b>Áp bộ màu</b> tô cả thiết kế theo bảng — bỏ qua ảnh, chuyển sắc, hoa văn, đối tượng khóa.</p>
    </details>`;
  const before = host.querySelector('h4'); // first h4 after quick row is "Nền chuyển sắc" — insert before it
  // Find "Nền chuyển sắc" heading specifically
  let insertBefore = null;
  host.querySelectorAll('h4').forEach(h => { if (/chuyển sắc/i.test(h.textContent)) insertBefore = h; });
  if (insertBefore) host.insertBefore(box, insertBefore); else host.appendChild(box);

  let cat = null, q = '';
  const chips = $('#palChips'), list = $('#palList'), search = $('#palSearch');

  function renderChips() {
    const all = [{ id: null, label: 'Tất cả' }].concat(P.CATS.map(c => ({ id: c, label: c })));
    chips.innerHTML = all.map(c => `<button type="button" data-cat="${c.id == null ? '' : c.id}" aria-pressed="${(c.id == null ? cat == null : cat === c.id) ? 'true' : 'false'}" class="${(c.id == null ? cat == null : cat === c.id) ? 'on' : ''}">${c.label}</button>`).join('');
  }
  function renderList() {
    const rows = P.filterPalettes(P.PALETTES, { cat, q });
    if (!rows.length) { list.innerHTML = '<p class="small muted">Không có bảng màu khớp.</p>'; return; }
    list.innerHTML = rows.map((p, i) => {
      const sw = p.colors.map(c => `<span style="background:${c}" title="${c}" data-c="${c}" role="button" aria-label="Màu ${c}"></span>`).join('');
      return `<div class="pal-row" role="listitem" data-i="${P.PALETTES.indexOf(p)}">
        <div class="pal-meta"><b>${esc(p.name)}</b><span class="small muted">${esc(p.cat)}</span></div>
        <div class="pal-swatches">${sw}</div>
        <button type="button" class="pal-apply" data-apply="${P.PALETTES.indexOf(p)}" title="Áp dụng cả 4 màu cho thiết kế">Áp bộ màu</button>
      </div>`;
    }).join('');
  }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function refresh() { renderChips(); renderList(); }
  refresh();

  chips.addEventListener('click', e => {
    const b = e.target.closest('button[data-cat]'); if (!b) return;
    cat = b.dataset.cat || null; refresh();
  });
  search.addEventListener('input', () => { q = search.value; renderList(); });
  list.addEventListener('click', e => {
    const sw = e.target.closest('.pal-swatches span[data-c]');
    if (sw) {
      const CP = root.XTK_COLOR_PANEL, o = canvas.getActiveObject();
      if (CP) { CP.open(o ? (/text/i.test(o.type) ? 'text' : 'fill') : 'bg', o); return; }
      const c = sw.dataset.c; $('#colorPick').value = c;
      if (o) X.applyColor(c);
      else if (root.XTK_HOOKS && root.XTK_HOOKS.setBg) root.XTK_HOOKS.setBg(c);
      return;
    }
    const btn = e.target.closest('[data-apply]');
    if (btn) {
      const p = P.PALETTES[+btn.dataset.apply]; if (!p) return;
      const r = P.applyPalette(p, X);
      if (r && r.error) X.toast(r.error, 2200);
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
