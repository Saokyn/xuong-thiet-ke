// Phase 4: collapsible side panels, export dialog (size / DPI / quality) and automatic export quality boost.
(() => {
  const X = window.XTK, canvas = X.canvas, st = X.state;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const view = $('#view-designer');

  // ================= 1. Collapsible side panels
  const KEY = 'xtk-panels', narrow = () => matchMedia('(max-width:820px)').matches;
  let pan; try { pan = JSON.parse(localStorage.getItem(KEY)); } catch (e) { pan = null; }
  if (!pan || typeof pan !== 'object') pan = narrow() ? { left: false, right: false } : { left: true, right: true };
  let fitRaf = 0; const refit = () => { cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(() => { X.fit(); X.drawRulers?.(); }); };
  function applyPanels() {
    view.classList.toggle('hide-left', !pan.left); view.classList.toggle('hide-right', !pan.right);
    $('#toggleLeft').classList.toggle('off', !pan.left); $('#toggleRight').classList.toggle('off', !pan.right);
    $('#toggleLeft').setAttribute('aria-pressed', String(!pan.left)); $('#toggleRight').setAttribute('aria-pressed', String(!pan.right));
    refit();
  }
  function setPanel(side, open) {
    pan[side] = open === undefined ? !pan[side] : !!open;
    if (pan[side] && narrow()) pan[side === 'left' ? 'right' : 'left'] = false; // only one overlay on small screens
    try { localStorage.setItem(KEY, JSON.stringify(pan)); } catch (e) { }
    applyPanels(); return pan[side];
  }
  $('#toggleLeft').onclick = () => setPanel('left'); $('#toggleRight').onclick = () => setPanel('right');
  $$('.rail [data-tab]').forEach(b => b.addEventListener('click', () => { if (!pan.left) setPanel('left', true); }));
  document.addEventListener('keydown', e => {
    if (!view.classList.contains('active') || !(e.ctrlKey || e.metaKey) || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.code === 'BracketLeft') { e.preventDefault(); setPanel('left'); }
    else if (e.code === 'BracketRight') { e.preventDefault(); setPanel('right'); }
    else if (e.code === 'Backslash') { e.preventDefault(); const open = !(pan.left || pan.right); setPanel('left', open); setPanel('right', open); }
  });
  new ResizeObserver(refit).observe($('#stage'));
  applyPanels();

  // ================= 2. Export dialog
  const dlg = $('#exportDlg'), scaleIn = $('#exportScale');
  const MAXSIDE = 30000;
  const opts = { quality: 0.95, boost: true };
  const baseDpi = () => (st.tpl?.print ? 300 : 96);
  const scale = () => +scaleIn.value || 1;
  X.exportOpts = () => ({ quality: opts.quality, dpi: Math.max(1, Math.round(baseDpi() * scale())) });
  function setScale(s, from) {
    const t = st.tpl; if (!t) return;
    s = Math.max(16 / Math.min(t.w, t.h), Math.min(s, MAXSIDE / Math.max(t.w, t.h)));
    scaleIn.value = String(+s.toFixed(6));
    if (from !== 'w') $('#expW').value = Math.round(t.w * s);
    if (from !== 'h') $('#expH').value = Math.round(t.h * s);
    if (from !== 'dpi') $('#expDpi').value = Math.round(baseDpi() * s);
    $$('#expPresets button').forEach(b => b.classList.toggle('on', Math.abs(+b.dataset.s - s) < 1e-6));
    info();
  }
  $$('#expPresets button').forEach(b => b.onclick = () => setScale(+b.dataset.s));
  $('#expW').oninput = () => { const v = +$('#expW').value; if (v > 0) setScale(v / st.tpl.w, 'w'); };
  $('#expH').oninput = () => { const v = +$('#expH').value; if (v > 0) setScale(v / st.tpl.h, 'h'); };
  $('#expDpi').oninput = () => { const v = +$('#expDpi').value; if (v > 0) setScale(v / baseDpi(), 'dpi'); };
  [['#expW', 'w'], ['#expH', 'h'], ['#expDpi', 'dpi']].forEach(([s]) => $(s).onchange = () => setScale(scale()));
  $('#expQ').oninput = () => { opts.quality = +$('#expQ').value / 100; $('#expQv').textContent = $('#expQ').value; };
  $('#expBoost').onchange = () => { opts.boost = $('#expBoost').checked; info(); };
  $('#exportFmt').onchange = info;

  // ---- Image analysis: how much each bitmap must be enlarged to reach the output resolution
  function images(objs = canvas.getObjects(), out = []) { for (const o of objs) { if (o.visible === false) continue; if (o.type === 'image' && o._element) out.push(o); if (o._objects) images(o._objects, out); } return out; }
  function need(o, s) { const sc = o.getObjectScaling(); return Math.max(Math.abs(sc.scaleX) / (o._filterScalingX || 1), Math.abs(sc.scaleY) / (o._filterScalingY || 1)) * s; }
  const BOOST_MAX = 4, BOOST_MIN = 1.05;
  function analyze(s = scale()) {
    return images().map(o => { const n = need(o, s), el = o._element, w = el.naturalWidth || el.width, h = el.naturalHeight || el.height; const f = opts.boost ? Math.min(n, BOOST_MAX, 8192 / Math.max(w, h)) : 1; return { o, n, f: f > BOOST_MIN ? f : 1, low: n / (f > BOOST_MIN ? f : 1) > (opts.boost ? 1.01 : 1.25) && n > 1.25 }; });
  }
  function info() {
    const t = st.tpl; if (!t) return;
    const s = scale(), w = Math.round(t.w * s), h = Math.round(t.h * s), dpi = Math.round(baseDpi() * s);
    const cm = v => (v / baseDpi() * 2.54).toFixed(1), fmt = $('#exportFmt').value;
    const tiled = w > Exporter.TILE_THRESHOLD || h > Exporter.TILE_THRESHOLD || w * h > 40e6;
    $('#expInfo').innerHTML = `Ảnh xuất: <b>${w} × ${h} px</b> · ${dpi} dpi · khổ in ${cm(t.w)} × ${cm(t.h)} cm (${(t.w / baseDpi()).toFixed(2)} × ${(t.h / baseDpi()).toFixed(2)} in)` +
      `${tiled ? ' · <span title="Ảnh rất lớn được dựng theo từng mảnh để tiết kiệm bộ nhớ">xuất theo mảnh</span>' : ''}${/svg/.test(fmt) ? ' · SVG là vector, không phụ thuộc kích thước' : ''}`;
    $('#expQRow').hidden = fmt !== 'jpg';
    const a = analyze(s), boosted = a.filter(x => x.f > 1), low = a.filter(x => x.low), w$ = $('#expWarn');
    const name = x => (x.o.name || 'Ảnh').replace(/[<>&]/g, '');
    w$.hidden = !(low.length || boosted.length);
    w$.innerHTML = (boosted.length ? `✨ Sẽ tự tăng chất lượng ${boosted.length} ảnh: ${boosted.map(x => `${name(x)} (${x.f.toFixed(1)}×)`).join(', ')}.<br>` : '') +
      (low.length ? `⚠ Ảnh vẫn thiếu độ phân giải ở kích thước này: ${low.map(x => `${name(x)} (cần ${x.n.toFixed(1)}×)`).join(', ')}. Nên dùng ảnh gốc lớn hơn hoặc giảm kích thước xuất.` : '');
    return { w, h, dpi, boosted: boosted.length, low: low.map(name) };
  }
  // ---- Boost hook used by Exporter.renderRegion (every format: PNG/JPG/tiles/PDF/ZIP pages)
  const cache = new WeakMap();
  function upscaled(el, f) {
    let m = cache.get(el); if (!m) cache.set(el, m = new Map());
    const k = f.toFixed(2); if (!m.has(k)) { if (m.size > 2) m.clear(); m.set(k, X.upscaleCanvas(el, f)); }
    return m.get(k);
  }
  Exporter.boost = (cv, s) => {
    if (!opts.boost || cv !== canvas) return null;
    const swaps = [];
    for (const x of analyze(s)) {
      if (x.f <= 1) continue; const o = x.o;
      try { const r = upscaled(o._element, x.f); swaps.push([o, o._element, o._filterScalingX, o._filterScalingY]); o._element = r.canvas; o._filterScalingX = (o._filterScalingX || 1) * r.f; o._filterScalingY = (o._filterScalingY || 1) * r.f; o.dirty = true; } catch (e) { console.warn('boost', e); }
    }
    return swaps.length ? () => swaps.forEach(([o, el, fx, fy]) => { o._element = el; o._filterScalingX = fx; o._filterScalingY = fy; o.dirty = true; }) : null;
  };
  function openExport() { if (!st.tpl) return; setScale(scale()); $('#expQ').value = Math.round(opts.quality * 100); $('#expQv').textContent = $('#expQ').value; $('#expBoost').checked = opts.boost; info(); dlg.showModal(); }
  $('#exportBtn').onclick = openExport;
  $('#expClose').onclick = () => dlg.close();
  $('#expGo').onclick = async () => { dlg.close(); try { return await X.doExport2($('#exportFmt').value); } catch (e) { /* toast shown */ } };
  Object.assign(X, { setPanel, panels: () => ({ ...pan }), openExport, setExportScale: setScale, exportInfo: info, analyzeExport: analyze, exportOptions: opts });
})();
