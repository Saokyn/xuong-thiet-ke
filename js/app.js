(() => {
  const $ = s => document.querySelector(s);
  const FONTS = ['Be Vietnam Pro', 'Montserrat', 'Lora', 'Roboto', 'Playfair Display', 'Dancing Script', 'Lobster', 'Pacifico', 'Bungee', 'Nunito', 'Oswald', 'Merriweather', 'Quicksand', 'Comfortaa', 'Patrick Hand', 'Baloo 2', 'Charm'];
  const P = () => window.XTK_FX.PROPS;
  const PALETTE = ['#111827', '#ffffff', '#4f46e5', '#7c3aed', '#ec4899', '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#0ea5e9', '#1e3a8a', '#a16207', '#fef3c7', '#d1d5db'];
  let state = { tpl: null, id: null, pages: [null], cur: 0 };
  let history = [], hIndex = -1, restoring = false;

  const toast = (msg, ms = 3500) => { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, ms); };

  // ---------- Views
  function show(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
    document.querySelectorAll('.nav[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    if (view === 'designer') { if (!state.tpl) openTemplate(TEMPLATES[2]); else fit(); }
    if (view === 'saved') renderSaved();
  }
  document.querySelectorAll('.nav[data-view]').forEach(b => b.onclick = () => show(b.dataset.view));

  // ---------- Template picker
  function renderTemplates() {
    const g = $('#templateGrid'); g.innerHTML = '';
    TEMPLATES.forEach(t => {
      const s = Math.min(150 / t.w, 100 / t.h);
      const el = document.createElement('div'); el.className = 'card tpl';
      el.innerHTML = `<div class="box"><div class="shape" style="width:${t.w * s}px;height:${t.h * s}px"></div></div>
        <b>${t.name}${t.w > 8000 || t.h > 8000 ? '<span class="badge">xuất theo mảnh</span>' : ''}</b>
        <small>${t.w} × ${t.h} px${t.print ? ' · 300dpi · ' + (t.w / 300 * 2.54).toFixed(1) + '×' + (t.h / 300 * 2.54).toFixed(1) + ' cm' : ''}</small>`;
      el.onclick = () => { openTemplate(t); show('designer'); };
      g.appendChild(el);
    });
  }
  $('#customGo').onclick = () => {
    const u = $('#customUnit').value; let w = +$('#customW').value, h = +$('#customH').value;
    if (u !== 'px') { const f = u === 'cm' ? 10 : 1; w = mm2px(w * f); h = mm2px(h * f); }
    if (!(w >= 16 && h >= 16 && w <= 30000 && h <= 30000)) return toast('Kích thước phải từ 16 đến 30000 px');
    openTemplate({ id: 'custom', name: 'Tùy chỉnh', w: Math.round(w), h: Math.round(h), print: u !== 'px' }); show('designer');
  };

  // ---------- Canvas
  const canvas = new fabric.Canvas('c', { preserveObjectStacking: true, backgroundColor: '#ffffff' });
  fabric.Object.prototype.set({ transparentCorners: false, cornerColor: '#4f46e5', cornerStyle: 'circle', borderColor: '#4f46e5' });
  window.XTK_canvas = canvas;

  function fit() {
    if (!state.tpl) return;
    const st = $('#stage'), pad = 40;
    const z = Math.min((st.clientWidth - pad) / state.tpl.w, (st.clientHeight - pad) / state.tpl.h);
    if (!(z > 0)) return;
    canvas.setDimensions({ width: Math.round(state.tpl.w * z), height: Math.round(state.tpl.h * z) });
    canvas.setZoom(z);
    // controls scale with zoom so they stay usable
    $('#sizeInfo').textContent = `${state.tpl.name}: ${state.tpl.w} × ${state.tpl.h} px · hiển thị ${(z * 100).toFixed(z < 0.1 ? 1 : 0)}%` + (state.tpl.print ? ' · in 300dpi' : '');
    canvas.requestRenderAll();
  }
  window.addEventListener('resize', fit);

  function openTemplate(t, json) {
    state.tpl = { ...t }; state.id = json ? state.id : null; if (!openTemplate._keepPages) { state.pages = [null]; state.cur = 0; }
    canvas.clear(); canvas.backgroundColor = '#ffffff';
    history = []; hIndex = -1;
    const after = () => { fit(); snapshot(); refreshLayers(); checkDpi(); window.XTK_HOOKS?.opened?.(); };
    if (json) { restoring = true; canvas.loadFromJSON(json, () => { restoring = false; canvas.renderAll(); after(); }); }
    else { $('#designName').value = t.name; after(); }
    setTimeout(fit, 0);
  }

  const U = () => Math.min(state.tpl.w, state.tpl.h); // unit for default sizes
  const center = o => { canvas.add(o); o.center(); o.setCoords(); canvas.setActiveObject(o); canvas.requestRenderAll(); };
  const color = () => $('#colorPick').value;

  $('#addHeading').onclick = () => center(new fabric.Textbox('Tiêu đề của bạn', { fontFamily: 'Be Vietnam Pro', fontWeight: 700, fontSize: U() * 0.1, fill: '#111827', width: state.tpl.w * 0.8, textAlign: 'center', name: 'Tiêu đề' }));
  $('#addText').onclick = () => center(new fabric.Textbox('Nhập nội dung ở đây — tiếng Việt có dấu đầy đủ.', { fontFamily: 'Roboto', fontSize: U() * 0.045, fill: '#374151', width: state.tpl.w * 0.6, textAlign: 'center', name: 'Đoạn văn' }));

  $('#uploadImg').onchange = e => {
    const f = e.target.files[0]; if (!f) return; e.target.value = '';
    const r = new FileReader();
    r.onload = () => fabric.Image.fromURL(r.result, img => {
      const s = Math.min(1, state.tpl.w * 0.8 / img.width, state.tpl.h * 0.8 / img.height);
      img.set({ scaleX: s, scaleY: s, name: 'Ảnh: ' + f.name.slice(0, 24) }); center(img); checkDpi();
    });
    r.readAsDataURL(f);
  };

  // ---------- DPI check for print templates
  function effDpi(o) { return o.type === 'image' ? o.width / (o.getScaledWidth() / 300) : Infinity; }
  function checkDpi() {
    const w = $('#dpiWarn');
    if (!state.tpl?.print) { w.hidden = true; return; }
    const low = canvas.getObjects().filter(o => o.type === 'image' && effDpi(o) < 299.5);
    if (!low.length) { w.hidden = true; return; }
    w.hidden = false;
    w.textContent = '⚠ Độ phân giải ảnh thấp cho bản in: ' + low.map(o => `${o.name || 'Ảnh'} ≈ ${Math.round(effDpi(o))} dpi`).join('; ') + ' (khuyến nghị ≥ 300 dpi). Thu nhỏ ảnh hoặc dùng ảnh gốc lớn hơn.';
  }

  // ---------- Palette
  const pal = $('#palette');
  PALETTE.forEach(c => { const s = document.createElement('span'); s.style.background = c; s.title = c; s.onclick = () => applyColor(c); pal.appendChild(s); });
  function applyColor(c) {
    $('#colorPick').value = c;
    const o = canvas.getActiveObject(); if (!o) return;
    const targets = o.type === 'activeSelection' ? o.getObjects() : [o];
    targets.forEach(t => t.type === 'line' || (t.type === 'path' && !t.fill) ? t.set('stroke', c) : t.type === 'group' ? t.getObjects().forEach(x => x.set(x.type === 'line' ? 'stroke' : 'fill', c)) : t.set('fill', c));
    canvas.requestRenderAll(); snapshot(); renderProps();
  }
  $('#colorPick').oninput = e => applyColor(e.target.value);
  $('#applyBg').onclick = () => window.XTK_HOOKS.setBg(color());

  // ---------- History
  function snapshot() {
    if (restoring || !state.tpl) return;
    const j = JSON.stringify(canvas.toJSON(P()));
    if (history[hIndex] === j) return;
    history = history.slice(0, hIndex + 1); history.push(j);
    if (history.length > 60) history.shift(); hIndex = history.length - 1;
  }
  function restore(i) {
    if (i < 0 || i >= history.length) return;
    hIndex = i; restoring = true;
    canvas.loadFromJSON(history[i], () => { restoring = false; canvas.renderAll(); refreshLayers(); renderProps(); checkDpi(); });
  }
  $('#undo').onclick = () => restore(hIndex - 1);
  $('#redo').onclick = () => restore(hIndex + 1);
  canvas.on('object:added', () => { snapshot(); refreshLayers(); });
  canvas.on('object:removed', () => { snapshot(); refreshLayers(); });
  canvas.on('object:modified', () => { snapshot(); checkDpi(); renderProps(); });
  canvas.on('object:scaling', checkDpi);
  canvas.on('text:changed', () => refreshLayers());
  ['selection:created', 'selection:updated', 'selection:cleared'].forEach(ev => canvas.on(ev, () => { renderProps(); refreshLayers(); }));

  // ---------- Delete & layers
  function del() {
    const o = canvas.getActiveObject(); if (!o || o.isEditing) return;
    (o.type === 'activeSelection' ? o.getObjects() : [o]).forEach(x => canvas.remove(x));
    canvas.discardActiveObject(); canvas.requestRenderAll();
  }
  $('#del').onclick = del;
  const order = fn => () => { const o = canvas.getActiveObject(); if (!o) return; fn(o); canvas.requestRenderAll(); snapshot(); refreshLayers(); };
  $('#front').onclick = order(o => canvas.bringToFront(o));
  $('#back').onclick = order(o => canvas.sendToBack(o));
  $('#forward').onclick = order(o => canvas.bringForward(o));
  $('#backward').onclick = order(o => canvas.sendBackwards(o));
  document.addEventListener('keydown', e => {
    if (!$('#view-designer').classList.contains('active') || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if ((e.key === 'Delete' || e.key === 'Backspace')) { del(); e.preventDefault(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.shiftKey ? restore(hIndex + 1) : restore(hIndex - 1); e.preventDefault(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { restore(hIndex + 1); e.preventDefault(); }
  });
  function label(o) { return o.name && !/^(Tiêu đề|Đoạn văn)$/.test(o.name) ? o.name : (o.text ? '“' + o.text.slice(0, 22) + '”' : o.type); }
  function refreshLayers() {
    const ul = $('#layers'); ul.innerHTML = ''; const act = canvas.getActiveObjects();
    canvas.getObjects().filter(o => o.name !== '__bg').reverse().forEach(o => {
      const li = document.createElement('li'); li.textContent = (o.xtk?.locked ? '🔒 ' : '') + label(o); if (act.includes(o)) li.className = 'sel';
      li.onclick = () => { canvas.setActiveObject(o); canvas.requestRenderAll(); };
      ul.appendChild(li);
    });
  }

  // ---------- Properties panel
  function renderProps() {
    const o = canvas.getActiveObject(), b = $('#propsBody');
    if (!o) { b.innerHTML = '<p class="muted">Chọn một đối tượng để chỉnh sửa.</p>'; return; }
    if (o.type === 'activeSelection') { b.innerHTML = `<p class="muted">Đã chọn ${o.size()} đối tượng. Dùng “Căn chỉnh”, “Nhóm” trên thanh công cụ.</p>`; return; }
    const isText = /text/.test(o.type) && !o.xtk?.curved;
    let h = '';
    if (isText) {
      h += `<label>Font<select data-p="fontFamily">${FONTS.map(f => `<option ${f === o.fontFamily ? 'selected' : ''} style="font-family:'${f}'">${f}</option>`).join('')}</select></label>
      <label>Cỡ chữ (px)<input type="number" data-p="fontSize" value="${Math.round(o.fontSize)}"></label>
      <label>Độ đậm<select data-p="fontWeight"><option value="400" ${o.fontWeight != 700 && o.fontWeight != 'bold' ? 'selected' : ''}>Thường</option><option value="700" ${o.fontWeight == 700 || o.fontWeight == 'bold' ? 'selected' : ''}>Đậm</option></select></label>
      <label>Căn lề<select data-p="textAlign">${['left', 'center', 'right'].map(a => `<option ${a === o.textAlign ? 'selected' : ''}>${a}</option>`).join('')}</select></label>`;
    }
    const fillKey = o.type === 'line' ? 'stroke' : 'fill';
    if (o.type !== 'image' && !(o.type === 'group' && !o.xtk?.curved)) h += `<label>Màu<input type="color" data-p="${fillKey}" value="${typeof o[fillKey] === 'string' && o[fillKey].startsWith('#') ? o[fillKey].slice(0, 7) : '#000000'}"></label>`;
    h += `<label>Độ mờ<input type="range" min="0" max="1" step="0.05" data-p="opacity" value="${o.opacity}"></label>
      <label>Xoay (°)<input type="number" data-p="angle" value="${Math.round(o.angle)}"></label>`;
    if (o.type === 'image' && state.tpl.print) h += `<p class="small">Độ phân giải hiệu dụng: <b>${Math.round(effDpi(o))} dpi</b></p>`;
    b.innerHTML = h;
    b.querySelectorAll('[data-p]').forEach(inp => inp.oninput = () => {
      const p = inp.dataset.p; let v = inp.value;
      if (['fontSize', 'opacity', 'angle', 'fontWeight'].includes(p)) v = +v;
      if (p === 'angle') o.rotate(v); else o.set(p, v);
      o.setCoords(); canvas.requestRenderAll();
    });
    b.querySelectorAll('[data-p]').forEach(inp => inp.onchange = () => { snapshot(); refreshLayers(); });
    window.XTK_HOOKS?.props?.(o, b);
  }

  // ---------- Sample design
  function sampleDesign() {
    const { w, h } = state.tpl, u = U();
    canvas.backgroundColor = '#1e1b4b';
    const add = o => canvas.add(o);
    add(new fabric.Circle({ radius: u * 0.45, left: w * 0.62, top: -u * 0.15, fill: '#7c3aed', opacity: 0.85, name: 'Vòng tím' }));
    add(new fabric.Circle({ radius: u * 0.3, left: -u * 0.1, top: h - u * 0.45, fill: '#ec4899', opacity: 0.8, name: 'Vòng hồng' }));
    add(new fabric.Rect({ left: w * 0.06, top: h * 0.62, width: w * 0.3, height: u * 0.012, fill: '#f59e0b', name: 'Gạch vàng' }));
    add(new fabric.Textbox('KHAI TRƯƠNG\nCÀ PHÊ ĐÀ LẠT', { left: w * 0.06, top: h * 0.2, width: w * 0.8, fontFamily: 'Montserrat', fontWeight: 700, fontSize: u * 0.14, fill: '#ffffff', lineHeight: 1.05, name: 'Tiêu đề' }));
    add(new fabric.Textbox('Giảm 20% tuần đầu tiên — hương vị cao nguyên mộc mạc', { left: w * 0.06, top: h * 0.66, width: w * 0.7, fontFamily: 'Lora', fontSize: u * 0.055, fill: '#fde68a', name: 'Phụ đề' }));
    add(new fabric.Textbox('Ưu đãi · Đặt bàn ngay', { left: w * 0.06, top: h * 0.82, width: w * 0.5, fontFamily: 'Be Vietnam Pro', fontWeight: 700, fontSize: u * 0.045, fill: '#a5f3fc', name: 'Lời kêu gọi' }));
    canvas.requestRenderAll(); snapshot(); refreshLayers();
  }

  // ---------- Save / load
  function thumb() {
    const s = Math.min(320 / state.tpl.w, 320 / state.tpl.h);
    const vpt = canvas.viewportTransform.slice(); canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
    try { return canvas.toDataURL({ format: 'jpeg', quality: 0.8, multiplier: s, left: 0, top: 0, width: state.tpl.w, height: state.tpl.h }); }
    finally { canvas.viewportTransform = vpt; }
  }
  $('#save').onclick = async () => {
    canvas.discardActiveObject();
    const d = { id: state.id || ('d' + Date.now().toString(36)), name: $('#designName').value || 'Không tên', tpl: state.tpl, json: (state.pages[state.cur] = canvas.toJSON(P()), state.pages[0]), pages: state.pages.length > 1 ? state.pages : undefined, thumb: thumb(), updated: Date.now() };
    try { await DB.put(d); state.id = d.id; toast('Đã lưu “' + d.name + '” trên thiết bị'); }
    catch (e) { toast('Không lưu được: ' + e.message); }
  };
  function openDoc(d) {
    state.id = d.id; $('#designName').value = d.name; show('designer');
    openTemplate(d.tpl, d.pages ? d.pages[0] : d.json); state.id = d.id;
    state.pages = d.pages ? d.pages.slice() : [d.json]; state.cur = 0; window.XTK_HOOKS?.pages?.();
  }
  async function renderSaved() {
    const g = $('#savedGrid'); const all = await DB.all();
    g.innerHTML = all.length ? '' : '<p class="muted">Chưa có thiết kế nào được lưu.</p>';
    all.forEach(d => {
      const el = document.createElement('div'); el.className = 'card saved';
      el.innerHTML = `<img alt=""><b></b><br><small>${d.tpl.w}×${d.tpl.h} · ${new Date(d.updated).toLocaleString('vi-VN')}</small><div class="row"><button class="primary">Mở</button><button>Xóa</button></div>`;
      el.querySelector('img').src = d.thumb; el.querySelector('b').textContent = d.name;
      const [open, rm] = el.querySelectorAll('button');
      open.onclick = () => { openDoc(d); };
      rm.onclick = async () => { if (confirm('Xóa thiết kế này?')) { await DB.del(d.id); renderSaved(); } };
      g.appendChild(el);
    });
  }

  // ---------- Export
  async function doExport(format, scale) {
    const p = $('#progress'), bar = p.querySelector('div'), txt = p.querySelector('span');
    p.hidden = false; const t0 = performance.now();
    try {
      const r = await Exporter.exportDesign(canvas, state.tpl.w, state.tpl.h, { format, scale, onProgress: (f, m) => { bar.style.width = (f * 100) + '%'; txt.textContent = m; } });
      const a = document.createElement('a'); a.href = URL.createObjectURL(r.blob);
      a.download = `${($('#designName').value || 'thiet-ke').replace(/[\\/:*?"<>|]/g, '_')}_${r.width}x${r.height}.${format}`;
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 60000);
      toast(`Đã xuất ${r.width}×${r.height}px ${format.toUpperCase()} (300dpi${r.tiled ? ', ' + r.strips + ' mảnh' : ''}) trong ${((performance.now() - t0) / 1000).toFixed(1)}s`);
      return r;
    } catch (e) { toast('Xuất ảnh thất bại: ' + e.message); throw e; }
    finally { p.hidden = true; }
  }
  $('#exportBtn').onclick = () => doExport($('#exportFmt').value, +$('#exportScale').value);

  // ---------- AI panel
  const s = AI.settings(); $('#aiBase').value = s.base; $('#aiModel').value = s.model;
  if (s.hasKey) $('#aiKey').placeholder = '•••••• (đã lưu trên thiết bị)';
  $('#toggleAI').onclick = () => { $('#aiPanel').hidden = !$('#aiPanel').hidden; };
  $('#closeAI').onclick = () => { $('#aiPanel').hidden = true; };
  $('#aiSaveKey').onclick = () => { AI.save({ base: $('#aiBase').value.trim(), model: $('#aiModel').value.trim(), key: $('#aiKey').value.trim() }); $('#aiKey').value = ''; $('#aiKey').placeholder = AI.settings().hasKey ? '•••••• (đã lưu trên thiết bị)' : 'Dán API key của bạn'; toast('Đã lưu cài đặt AI trên thiết bị này'); };
  $('#aiClearKey').onclick = () => { AI.clearKey(); $('#aiKey').placeholder = 'Dán API key của bạn'; toast('Đã xóa API key'); };
  $('#aiGo').onclick = async () => {
    const q = $('#aiPrompt').value.trim(); if (!q) return toast('Hãy mô tả ý tưởng của bạn');
    $('#aiStatus').textContent = 'Đang tạo ý tưởng…'; $('#aiGo').disabled = true;
    try { renderAI(await AI.generate(q, state.tpl || TEMPLATES[0])); $('#aiStatus').textContent = ''; }
    catch (e) { $('#aiStatus').textContent = e.message; }
    finally { $('#aiGo').disabled = false; }
  };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function renderAI(r) {
    const c = r.copy || {};
    const colors = (r.colors || []).filter(x => /^#[0-9a-f]{3,8}$/i.test(x));
    $('#aiResult').innerHTML = `
      <div class="ai-sec"><h5>Brief</h5><p>${esc(r.brief)}</p></div>
      <div class="ai-sec"><h5>Gợi ý bố cục</h5><p>${esc(r.layout)}</p></div>
      <div class="ai-sec"><h5>Bảng màu (bấm để dùng)</h5><div class="swatches">${colors.map(x => `<span data-c="${x}" style="background:${x}">${x}</span>`).join('')}</div></div>
      <div class="ai-sec"><h5>Font</h5><p>${(r.fonts || []).map(esc).join(', ')}</p></div>
      <div class="ai-sec"><h5>Nội dung chữ</h5>${['headline', 'subheadline', 'body', 'cta'].filter(k => c[k]).map(k => `<p><b>${k}:</b> ${esc(c[k])} <button class="small" data-add="${k}">+ Thêm</button></p>`).join('')}</div>
      <div class="ai-sec"><h5>Prompt tạo ảnh (EN)</h5>${(r.image_prompts || []).map(p => `<div class="prompt">${esc(p)}</div><button class="small" data-copy="${esc(p)}">Sao chép</button>`).join('')}</div>`;
    $('#aiResult').querySelectorAll('[data-c]').forEach(e => e.onclick = () => applyColor(e.dataset.c));
    $('#aiResult').querySelectorAll('[data-add]').forEach(e => e.onclick = () => {
      if (!state.tpl) openTemplate(TEMPLATES[2]);
      const k = e.dataset.add, big = k === 'headline';
      const font = (r.fonts || []).find(f => FONTS.includes(f)) || 'Be Vietnam Pro';
      center(new fabric.Textbox(c[k], { fontFamily: font, fontWeight: big ? 700 : 400, fontSize: U() * (big ? 0.1 : 0.045), fill: colors[0] || '#111827', width: state.tpl.w * 0.8, textAlign: 'center', name: k }));
    });
    $('#aiResult').querySelectorAll('[data-copy]').forEach(e => e.onclick = () => navigator.clipboard?.writeText(e.dataset.copy).then(() => toast('Đã sao chép prompt')));
  }

  // ---------- Online status + SW
  const net = () => $('#netStatus').textContent = navigator.onLine ? '● Trực tuyến' : '○ Ngoại tuyến (vẫn dùng được)';
  addEventListener('online', net); addEventListener('offline', net); net();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});

  // Ensure bundled fonts are ready before rendering text on canvas
  Promise.all(FONTS.flatMap(f => ['400', '700'].map(w => document.fonts.load(`${w} 20px "${f}"`, 'Tiếng Việt ắằẳẵặ')))).then(() => { fabric.util.clearFabricFontCache?.(); canvas.requestRenderAll(); });

  renderTemplates();
  // Hooks for automated tests
  window.XTK = { openDoc, snapshot, restore, refreshLayers, renderProps, center, U, toast, checkDpi, fit, applyColor, FONTS, thumb, del, setRestoring: v => restoring = v, resetHistory: () => { history = []; hIndex = -1; }, openTemplate, sampleDesign, doExport, show, renderAI, exportDesign: (o) => Exporter.exportDesign(canvas, state.tpl.w, state.tpl.h, o), state, canvas };
})();
