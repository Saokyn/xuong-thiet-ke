// Xưởng Thiết Kế — extended features (Phase 1 + 2). Depends on app.js (window.XTK).
(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const X = window.XTK, canvas = X.canvas, FX = window.XTK_FX, EL = window.XTK_ELEMENTS, st = X.state;
  const PROPS = FX.PROPS, H = window.XTK_HOOKS = window.XTK_HOOKS || {};
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const U = () => X.U(), color = () => $('#colorPick').value, toast = X.toast;
  const fname = () => ($('#designName').value || 'thiet-ke').replace(/[\\/:*?"<>|]/g, '_');
  const tick = () => new Promise(r => setTimeout(r, 0));
  fabric.filterBackend = new fabric.Canvas2dFilterBackend();
  function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 60000); }
  const prog = { on(f, m) { const p = $('#progress'); p.hidden = false; p.querySelector('div').style.width = (f * 100) + '%'; p.querySelector('span').textContent = m; }, off() { $('#progress').hidden = true; } };
  const loadJSON = (c, json) => new Promise(r => c.loadFromJSON(json, () => { c.renderAll(); r(); }));
  const readFile = (f, as = 'dataURL') => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; as === 'text' ? r.readAsText(f) : as === 'buf' ? r.readAsArrayBuffer(f) : r.readAsDataURL(f); });
  const add = (o, pos) => { if (pos) { canvas.add(o); o.setPositionByOrigin(new fabric.Point(pos.x, pos.y), 'center', 'center'); o.setCoords(); canvas.setActiveObject(o); canvas.requestRenderAll(); } else X.center(o); };
  const fitSize = (o, size) => { const s = size / Math.max(o.width, o.height); o.set({ scaleX: s, scaleY: s }); return o; };

  // ================= Tabs
  $$('.rail button').forEach(b => b.onclick = () => {
    $$('.rail button').forEach(x => x.classList.toggle('on', x === b));
    $$('.panel .tab').forEach(t => t.classList.toggle('on', t.dataset.tab === b.dataset.tab));
    if (b.dataset.tab === 'tpl') renderTplList2();
    if (b.dataset.tab === 'brand') renderBrand();
  });

  // ================= Template library
  const LIB = window.LIBRARY, KIT = window.LIBRARY_KIT;
  const tplById = id => TEMPLATES.find(t => t.id === id);
  function libJSON(t, size) {
    const T = size || tplById(t.size); const { bg, o } = t.build(KIT(T.w, T.h));
    const fixT = x => { if (/text/.test(x.type) && !x.styles) x.styles = {}; (x.objects || []).forEach(fixT); return x; };
    const objects = o.map(fixT);
    if (bg && typeof bg === 'object') objects.unshift({ type: 'rect', left: 0, top: 0, width: T.w, height: T.h, fill: bg, name: '__bg', selectable: false, evented: false, xtk: { bg: 1 } });
    return { version: fabric.version, objects, background: typeof bg === 'string' ? bg : '#ffffff' };
  }
  const thumbCache = {}; let thumbCanvas, thumbQ = Promise.resolve();
  function libThumb(t) {
    if (thumbCache[t.id]) return Promise.resolve(thumbCache[t.id]);
    return thumbQ = thumbQ.then(async () => {
      if (thumbCache[t.id]) return thumbCache[t.id];
      const T = tplById(t.size), s = Math.min(240 / T.w, 240 / T.h);
      thumbCanvas = thumbCanvas || new fabric.StaticCanvas(null, { enableRetinaScaling: false });
      thumbCanvas.setDimensions({ width: Math.round(T.w * s), height: Math.round(T.h * s) }); thumbCanvas.setZoom(s);
      thumbCanvas.clear(); await loadJSON(thumbCanvas, libJSON(t));
      return thumbCache[t.id] = thumbCanvas.toDataURL({ format: 'png' });
    });
  }
  const fontsReady = Promise.all(X.FONTS.flatMap(f => ['400', '700'].map(w => document.fonts.load(`${w} 20px "${f}"`, 'Tiếng Việt ắằẳẵặ')))).catch(() => {});
  const libMatch = (t, q) => !q || (t.name + ' ' + t.tags + ' ' + t.cat).toLowerCase().includes(q.toLowerCase());
  let libCat = '';
  function libCard(t, onClick) {
    const T = tplById(t.size), el = document.createElement('div'); el.className = 'card libcard'; el.dataset.id = t.id;
    el.innerHTML = `<div class="thumb"><img alt=""></div><b>${esc(t.name)}</b><small>${esc(t.cat)} · ${esc(T.name)}</small>`;
    const img = el.querySelector('img');
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); fontsReady.then(() => libThumb(t)).then(u => img.src = u); } });
    io.observe(el); el.onclick = onClick; return el;
  }
  function openLib(t) {
    const T = tplById(t.size); X.openTemplate(T, libJSON(t)); $('#designName').value = t.name; X.show('designer');
  }
  function renderLib() {
    const q = $('#libSearch').value.trim(), sz = $('#libSize').value, g = $('#libGrid'); g.innerHTML = '';
    const list = LIB.filter(t => libMatch(t, q) && (!sz || t.size === sz) && (!libCat || t.cat === libCat));
    list.forEach(t => g.appendChild(libCard(t, () => openLib(t))));
    if (!list.length) g.innerHTML = '<p class="muted">Không tìm thấy mẫu phù hợp.</p>';
  }
  [...new Set(LIB.map(t => t.size))].forEach(id => $('#libSize').insertAdjacentHTML('beforeend', `<option value="${id}">${esc(tplById(id).name)}</option>`));
  const cats = ['', ...new Set(LIB.map(t => t.cat))];
  $('#libCats').innerHTML = cats.map(c => `<button class="chip${c ? '' : ' on'}" data-c="${esc(c)}">${c ? esc(c) : 'Tất cả'} <small>${c ? LIB.filter(t => t.cat === c).length : LIB.length}</small></button>`).join('');
  $$('#libCats .chip').forEach(b => b.onclick = () => { libCat = b.dataset.c; $$('#libCats .chip').forEach(x => x.classList.toggle('on', x === b)); renderLib(); });
  $('#libSearch').oninput = renderLib; $('#libSize').onchange = renderLib; renderLib();
  // Designer tab: apply a template at the current size
  function renderTplList2() {
    const g = $('#tplList2'); g.innerHTML = ''; const q = $('#tplSearch2').value.trim(), same = $('#tplSameSize').checked;
    const cur = st.tpl, ratio = cur ? cur.w / cur.h : 1;
    LIB.filter(t => libMatch(t, q) && (!same || Math.abs(Math.log((tplById(t.size).w / tplById(t.size).h) / ratio)) < 0.12)).forEach(t => g.appendChild(libCard(t, async () => {
      if (canvas.getObjects().length && !confirm('Thay nội dung trang hiện tại bằng mẫu “' + t.name + '”?')) return;
      X.setRestoring(true); canvas.clear(); await loadJSON(canvas, libJSON(t, st.tpl)); X.setRestoring(false);
      X.snapshot(); X.refreshLayers();
    })));
    if (!g.children.length) g.innerHTML = '<p class="muted small">Không có mẫu cùng tỉ lệ. Bỏ chọn “Chỉ mẫu cùng kích thước” để áp mẫu bất kỳ (tự co giãn).</p>';
  }
  $('#tplSearch2').oninput = renderTplList2; $('#tplSameSize').onchange = renderTplList2;

  // ================= Elements panel
  const svgPrev = (inner) => `<svg viewBox="0 0 100 100" width="44" height="44">${inner}</svg>`;
  const shapePrev = k => k === 'rect' ? '<rect x="8" y="22" width="84" height="56" fill="#6366f1"/>' : k === 'round' ? '<rect x="8" y="22" width="84" height="56" rx="12" fill="#6366f1"/>' : k === 'circle' ? '<circle cx="50" cy="50" r="42" fill="#6366f1"/>' : k === 'triangle' ? '<path d="M50 8 L94 92 L6 92 Z" fill="#6366f1"/>' : `<path d="${EL.P[k]}" fill="#6366f1"/>`;
  const linePrev = k => k === 'wave' ? '<path d="M5 50 Q17 30 30 50 T55 50 T80 50 T95 45" stroke="#334155" stroke-width="6" fill="none"/>' : k.startsWith('arrow') ? `<path d="M${k === 'arrow2' ? 20 : 8} 50 L80 50" stroke="#334155" stroke-width="6"/><path d="M76 34 L96 50 L76 66Z" fill="#334155"/>${k === 'arrow2' ? '<path d="M24 34 L4 50 L24 66Z" fill="#334155"/>' : ''}` : `<path d="M6 50 L94 50" stroke="#334155" stroke-width="6" stroke-linecap="round" ${k === 'dash' ? 'stroke-dasharray="16 10"' : k === 'dot' ? 'stroke-dasharray="0 14"' : ''}/>`;
  const GROUP_VI = { business: 'kinh doanh', social: 'mạng xã hội', food: 'ẩm thực', arrows: 'mũi tên', misc: 'khác', shopping: 'mua sắm', contact: 'liên hệ', nature: 'thiên nhiên', event: 'sự kiện' };
  function addSVG(svgStr, name, size, recolor) {
    if (recolor) svgStr = svgStr.replace(/currentColor/g, color());
    fabric.loadSVGFromString(svgStr, (objs, opts) => { const g = fabric.util.groupSVGElements(objs, opts); g.set({ name }); fitSize(g, size || U() * 0.25); add(g); });
  }
  function addEmoji(code, pos, size) { fabric.Image.fromURL('assets/emoji/' + code + '.svg', img => { img.set({ name: 'Emoji' }); fitSize(img, size || U() * 0.15); add(img, pos); }); }
  const ELITEMS = [];
  EL.SHAPES.forEach(([n, k]) => ELITEMS.push({ sec: 'Hình khối', n, kw: n + ' ' + k + ' hình', prev: svgPrev(shapePrev(k)), add: () => add(FX.shape(k, U(), color())) }));
  EL.LINES.forEach(([n, k]) => ELITEMS.push({ sec: 'Đường kẻ & mũi tên', n, kw: n + ' ' + k + ' đường mũi tên', prev: svgPrev(linePrev(k)), add: () => add(FX.line(k, U(), color())) }));
  Object.entries(EL.MOTIFS).forEach(([g, list]) => list.forEach(([n, s]) => ELITEMS.push({ sec: g, n, kw: n + ' ' + g + (g === 'Tết' ? ' tet xuân' : g === 'Cưới' ? ' cuoi wedding' : g === 'Trung thu' ? ' trung thu trăng' : ' khung tên nhãn ruy băng'), prev: s.replace('<svg ', '<svg width="44" height="44" '), add: () => addSVG(s, n, U() * 0.3) })));
  Object.entries(window.TABLER_ICONS || {}).forEach(([g, list]) => list.forEach(([n, s]) => ELITEMS.push({ sec: 'Biểu tượng', n, kw: n.replace(/-/g, ' ') + ' ' + g + ' ' + (GROUP_VI[g] || '') + ' icon biểu tượng', prev: s.replace('<svg ', '<svg width="30" height="30" '), add: () => addSVG(s, n, U() * 0.18, true) })));
  EL.EMOJI.forEach(code => ELITEMS.push({ sec: 'Emoji', n: EL.EMOJI_KW[code] || 'emoji', kw: (EL.EMOJI_KW[code] || '') + ' emoji ' + code, prev: `<img src="assets/emoji/${code}.svg" width="34" height="34" alt="" loading="lazy" draggable="true" data-emoji="${code}">`, add: () => addEmoji(code) }));
  function renderElements() {
    const q = $('#elSearch').value.trim().toLowerCase(), body = $('#elBody'); body.innerHTML = '';
    const secs = {};
    ELITEMS.filter(i => !q || (i.n + ' ' + i.kw + ' ' + i.sec).toLowerCase().includes(q)).forEach(i => (secs[i.sec] = secs[i.sec] || []).push(i));
    Object.entries(secs).forEach(([s, items]) => {
      const h = document.createElement('h4'); h.textContent = s + ` (${items.length})`; body.appendChild(h);
      const box = document.createElement('div'); box.className = 'iconlist' + (s === 'Biểu tượng' ? ' small-icons' : '');
      items.slice(0, q ? 200 : (s === 'Biểu tượng' ? 60 : 80)).forEach(i => { const b = document.createElement('button'); b.className = 'el'; b.title = i.n; b.innerHTML = i.prev; b.onclick = i.add; box.appendChild(b); });
      body.appendChild(box);
    });
    if (!body.children.length) body.innerHTML = '<p class="muted small">Không tìm thấy thành phần.</p>';
  }
  $('#elSearch').oninput = renderElements; renderElements();

  // ================= Text
  const PRESETS = [
    ['Tiêu đề đậm', { fontFamily: 'Montserrat', fontWeight: 700, fill: '#111827' }, 0.1],
    ['Neon', { fontFamily: 'Comfortaa', fontWeight: 700, fill: '#ffffff', stroke: '#22d3ee', strokeWidth: 0.004, shadow: ['#22d3ee', 0.03, 0, 0] }, 0.1, '#0f172a'],
    ['Viền nổi', { fontFamily: 'Bungee', fill: '#facc15', stroke: '#1f2937', strokeWidth: 0.012 }, 0.1],
    ['Retro bóng khối', { fontFamily: 'Lobster', fill: '#f97316', shadow: ['#7c2d12', 0, 0.008, 0.008] }, 0.1],
    ['Nhãn nền màu', { fontFamily: 'Be Vietnam Pro', fontWeight: 700, fill: '#ffffff', backgroundColor: '#e11d48' }, 0.06],
    ['Chữ chuyển sắc', { fontFamily: 'Montserrat', fontWeight: 700, grad: ['#6366f1', '#ec4899'] }, 0.1],
    ['IN HOA GIÃN CÁCH', { fontFamily: 'Oswald', fontWeight: 400, fill: '#334155', charSpacing: 500, upper: 1 }, 0.05],
    ['Viết tay mềm mại', { fontFamily: 'Dancing Script', fontWeight: 700, fill: '#be123c' }, 0.1],
    ['Thanh lịch', { fontFamily: 'Playfair Display', fontWeight: 700, fill: '#5b3a29', fontStyle: 'italic' }, 0.09],
    ['Dễ thương', { fontFamily: 'Baloo 2', fontWeight: 700, fill: '#ec4899', stroke: '#ffffff', strokeWidth: 0.01, shadow: ['rgba(0,0,0,.25)', 0.01, 0, 0.006] }, 0.09],
    ['Bóng đổ mềm', { fontFamily: 'Nunito', fontWeight: 700, fill: '#ffffff', shadow: ['rgba(0,0,0,.6)', 0.02, 0, 0.006] }, 0.08, '#64748b'],
    ['Thư pháp', { fontFamily: 'Charm', fontWeight: 700, fill: '#991b1b' }, 0.1],
  ];
  function presetProps(p, u) {
    const o = { ...p }; delete o.grad; delete o.upper;
    if (o.strokeWidth) { o.strokeWidth *= u; o.paintFirst = 'stroke'; }
    if (p.shadow) o.shadow = new fabric.Shadow({ color: p.shadow[0], blur: p.shadow[1] * u, offsetX: p.shadow[2] * u, offsetY: p.shadow[3] * u });
    if (p.grad) o.fill = new fabric.Gradient({ type: 'linear', gradientUnits: 'percentage', coords: { x1: 0, y1: 0, x2: 1, y2: 0 }, colorStops: [{ offset: 0, color: p.grad[0] }, { offset: 1, color: p.grad[1] }] });
    if (o.backgroundColor) o.padding = 0;
    return o;
  }
  $('#textPresets').innerHTML = PRESETS.map(([n, p, , bg], i) => `<button data-i="${i}" style="font-family:'${p.fontFamily}';font-weight:${p.fontWeight || 400};${p.fontStyle ? 'font-style:italic;' : ''}color:${p.fill || p.grad?.[0] || '#111'};${p.backgroundColor ? 'background:' + p.backgroundColor + ';' : bg ? 'background:' + bg + ';' : ''}${p.stroke ? `-webkit-text-stroke:1px ${p.stroke};` : ''}${p.shadow ? `text-shadow:2px 2px 4px ${p.shadow[0]};` : ''}${p.charSpacing ? 'letter-spacing:.3em;' : ''}${p.grad ? `background:linear-gradient(90deg,${p.grad[0]},${p.grad[1]});-webkit-background-clip:text;color:transparent;` : ''}">${esc(n)}</button>`).join('');
  $$('#textPresets button').forEach(b => b.onclick = () => {
    const [n, p, s] = PRESETS[+b.dataset.i], u = U();
    const t = new fabric.Textbox(p.upper ? n.toUpperCase() : n, { fontSize: u * s, width: st.tpl.w * 0.8, textAlign: 'center', name: 'Chữ: ' + n, ...presetProps(p, u) });
    if (p.upper) t.xtk = { upper: 1 };
    X.center(t);
  });
  $('#addCurved').onclick = () => X.center(FX.curvedText({ text: 'CHỮ CONG ĐẸP MẮT', radius: U() * 0.35, fontSize: U() * 0.07, fill: color() === '#ffffff' ? '#111827' : color() }));

  // ================= Background: solid / gradient / pattern
  const bgRect = () => canvas.getObjects().find(o => o.name === '__bg');
  function ensureBgRect() {
    let r = bgRect();
    if (!r) { r = new fabric.Rect({ left: 0, top: 0, width: st.tpl.w, height: st.tpl.h, name: '__bg', selectable: false, evented: false, xtk: { bg: 1 }, objectCaching: false }); canvas.insertAt(r, 0); }
    r.set({ width: st.tpl.w, height: st.tpl.h, left: 0, top: 0, scaleX: 1, scaleY: 1 }); return r;
  }
  function gradObj(c1, c2, type) {
    if (type === 'radial') return { type: 'radial', gradientUnits: 'percentage', coords: { x1: 0.5, y1: 0.5, r1: 0, x2: 0.5, y2: 0.5, r2: 0.75 }, colorStops: [{ offset: 0, color: c1 }, { offset: 1, color: c2 }] };
    const a = (+type) * Math.PI / 180, dx = Math.cos(a) / 2, dy = Math.sin(a) / 2;
    return { type: 'linear', gradientUnits: 'percentage', coords: { x1: 0.5 - dx, y1: 0.5 - dy, x2: 0.5 + dx, y2: 0.5 + dy }, colorStops: [{ offset: 0, color: c1 }, { offset: 1, color: c2 }] };
  }
  function setBg(v) {
    if (typeof v === 'string') { const r = bgRect(); if (r) canvas.remove(r); canvas.backgroundColor = v; }
    else if (v.grad) ensureBgRect().set('fill', new fabric.Gradient(v.grad));
    else if (v.pattern) ensureBgRect().set('fill', new fabric.Pattern({ source: v.pattern, repeat: 'repeat' }));
    canvas.requestRenderAll(); X.snapshot(); X.refreshLayers();
  }
  H.setBg = setBg;
  const GRADS = [['#4f46e5', '#ec4899', 0], ['#f59e0b', '#ef4444', 45], ['#06b6d4', '#3b82f6', 90], ['#10b981', '#a3e635', 45], ['#0f172a', '#334155', 90], ['#fde68a', '#fca5a5', 135], ['#fdf2f8', '#e0e7ff', 90], ['#fef9c3', '#f97316', 'radial'], ['#1e1b4b', '#7c3aed', 'radial'], ['#fff7ed', '#fed7aa', 90]];
  $('#gradList').innerHTML = GRADS.map(([a, b, t], i) => `<span data-i="${i}" style="background:${t === 'radial' ? `radial-gradient(${a},${b})` : `linear-gradient(${90 + (+t)}deg,${a},${b})`}"></span>`).join('');
  $$('#gradList span').forEach(s => s.onclick = () => { const [a, b, t] = GRADS[+s.dataset.i]; setBg({ grad: gradObj(a, b, t) }); });
  $('#gApply').onclick = () => setBg({ grad: gradObj($('#g1').value, $('#g2').value, $('#gType').value) });
  const PATS = {
    'Chấm bi': (g, s, fg) => { g.fillStyle = fg; g.beginPath(); g.arc(s / 2, s / 2, s * 0.14, 0, 7); g.fill(); },
    'Sọc chéo': (g, s, fg) => { g.strokeStyle = fg; g.lineWidth = s * 0.16; g.beginPath(); for (let k = -1; k <= 1; k++) { g.moveTo(k * s, s); g.lineTo(k * s + s, 0); } g.stroke(); },
    'Kẻ ô': (g, s, fg) => { g.strokeStyle = fg; g.lineWidth = Math.max(1, s * 0.04); g.strokeRect(0, 0, s, s); },
    'Caro': (g, s, fg) => { g.fillStyle = fg; g.fillRect(0, 0, s / 2, s / 2); g.fillRect(s / 2, s / 2, s / 2, s / 2); },
    'Zigzag': (g, s, fg) => { g.strokeStyle = fg; g.lineWidth = s * 0.08; g.beginPath(); g.moveTo(0, s * 0.6); g.lineTo(s / 4, s * 0.35); g.lineTo(s / 2, s * 0.6); g.lineTo(s * 0.75, s * 0.35); g.lineTo(s, s * 0.6); g.stroke(); },
    'Sóng': (g, s, fg) => { g.strokeStyle = fg; g.lineWidth = s * 0.07; g.beginPath(); g.moveTo(0, s / 2); g.bezierCurveTo(s / 4, s * 0.25, s / 4, s * 0.25, s / 2, s / 2); g.bezierCurveTo(s * 0.75, s * 0.75, s * 0.75, s * 0.75, s, s / 2); g.stroke(); },
    'Sao nhỏ': (g, s, fg) => { g.fillStyle = fg; g.save(); g.translate(s * 0.25, s * 0.25); g.scale(s / 300, s / 300); g.fill(new Path2D(EL.P.star)); g.restore(); },
    'Tim nhỏ': (g, s, fg) => { g.fillStyle = fg; g.save(); g.translate(s * 0.3, s * 0.3); g.scale(s / 250, s / 250); g.fill(new Path2D(EL.P.heart)); g.restore(); },
  };
  function patternCanvas(name, fg, bg, size) {
    const c = document.createElement('canvas'); c.width = c.height = Math.max(8, Math.round(size)); const g = c.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); PATS[name](g, c.width, fg); return c;
  }
  $('#patList').innerHTML = Object.keys(PATS).map(n => `<span data-n="${n}" title="${n}" style="background-image:url(${patternCanvas(n, '#6366f1', '#eef2ff', 24).toDataURL()})"></span>`).join('');
  $$('#patList span').forEach(s => s.onclick = () => setBg({ pattern: patternCanvas(s.dataset.n, $('#g1').value, $('#g2').value === '#ec4899' ? '#ffffff' : $('#g2').value, U() / 14) }));
  // Eyedropper: click on the design to pick a colour
  let picking = false;
  $('#eyedrop').onclick = () => { picking = true; canvas.defaultCursor = 'crosshair'; canvas.selection = false; toast('Bấm vào một điểm trên thiết kế để lấy màu'); };
  canvas.on('mouse:down', e => {
    if (!picking) return; picking = false; canvas.defaultCursor = 'default'; canvas.selection = true;
    const r = canvas.lowerCanvasEl.getBoundingClientRect(), k = canvas.lowerCanvasEl.width / r.width;
    const d = canvas.getContext().getImageData(Math.round((e.e.clientX - r.left) * k), Math.round((e.e.clientY - r.top) * k), 1, 1).data;
    const hex = '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join('');
    canvas.discardActiveObject(); $('#colorPick').value = hex; X.applyColor(hex); toast('Đã lấy màu ' + hex);
  });
  // Palette from image (color-thief, fallback: simple quantization)
  function paletteOf(img) {
    try { const p = ColorThief.getPaletteSync(img, { colorCount: 6 }); if (p && p.length) return p.map(c => typeof c.hex === 'function' ? c.hex() : Array.isArray(c) ? '#' + c.map(v => v.toString(16).padStart(2, '0')).join('') : String(c)); } catch (e) { /* fallback */ }
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.drawImage(img, 0, 0, 64, 64);
    const d = g.getImageData(0, 0, 64, 64).data, b = {};
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 128) continue; const k = (d[i] >> 5) + ',' + (d[i + 1] >> 5) + ',' + (d[i + 2] >> 5); (b[k] = b[k] || [0, 0, 0, 0]); b[k][0] += d[i]; b[k][1] += d[i + 1]; b[k][2] += d[i + 2]; b[k][3]++; }
    return Object.values(b).sort((a, z) => z[3] - a[3]).slice(0, 6).map(v => '#' + v.slice(0, 3).map(x => Math.round(x / v[3]).toString(16).padStart(2, '0')).join(''));
  }
  function showImgPalette(cols) {
    $('#imgPalette').innerHTML = cols.map(c => `<span style="background:${c}" title="${c}" data-c="${c}"></span>`).join('');
    $$('#imgPalette span').forEach(s => s.onclick = () => X.applyColor(s.dataset.c));
  }
  $('#palImg').onchange = async e => { const f = e.target.files[0]; if (!f) return; e.target.value = ''; const img = await FX.loadEl(await readFile(f)); showImgPalette(paletteOf(img)); };
  $('#palFromSel').onclick = () => { const o = canvas.getActiveObject(); if (!o || o.type !== 'image') return toast('Hãy chọn một ảnh trên thiết kế'); showImgPalette(paletteOf(o._originalElement || o._element)); };

  Object.assign(window.XTK, { libJSON, openLib, setBg, paletteOf, addEmoji });
  // (continued below)

  // ================= Images, frames, collage
  const isCell = o => o && o.type === 'image' && o.xtk?.cell;
  async function placeImage(url, name, pos) {
    const target = pos ? null : canvas.getActiveObject(); // pos (truthy) = never fill the selected frame cell
    if (isCell(target)) { await FX.fillCell(target, url); canvas.requestRenderAll(); X.snapshot(); X.renderProps(); X.checkDpi(); return target; }
    return new Promise(res => fabric.Image.fromURL(url, img => {
      const s = X.fitScale(img.width, img.height); // inserted images always land centred on the page
      img.set({ scaleX: s, scaleY: s, name: name || 'Ảnh' }); add(img); X.checkDpi(); res(img);
    }, { crossOrigin: 'anonymous' }));
  }
  $('#uploadImg').onchange = async e => { const f = e.target.files[0]; if (!f) return; e.target.value = ''; placeImage(await readFile(f), 'Ảnh: ' + f.name.slice(0, 24)); };
  const cellFile = document.createElement('input'); cellFile.type = 'file'; cellFile.accept = 'image/*';
  cellFile.onchange = async () => { const f = cellFile.files[0]; cellFile.value = ''; if (f) placeImage(await readFile(f)); };
  canvas.on('mouse:dblclick', e => { if (isCell(e.target)) { canvas.setActiveObject(e.target); cellFile.click(); } });
  // Drag & drop images from the desktop onto the stage (into a frame cell if dropped on one)
  const stage = $('#stage');
  stage.addEventListener('dragover', e => { e.preventDefault(); });
  stage.addEventListener('drop', async e => {
    e.preventDefault();
    const p = canvas.getPointer(e, true), scene = canvas.getPointer(e);
    const emoji = e.dataTransfer.getData('text/emoji');
    if (emoji) return addEmoji(emoji);
    const f = [...(e.dataTransfer.files || [])].find(f => f.type.startsWith('image/')); if (!f) return;
    const url = await readFile(f);
    const hit = canvas.getObjects().slice().reverse().find(o => isCell(o) && o.containsPoint(new fabric.Point(p.x, p.y)));
    if (hit) { await FX.fillCell(hit, url); canvas.setActiveObject(hit); canvas.requestRenderAll(); X.snapshot(); X.checkDpi(); }
    else placeImage(url, 'Ảnh: ' + f.name.slice(0, 24), true);
  });
  document.addEventListener('dragstart', e => { const em = e.target.dataset?.emoji; if (em) e.dataTransfer.setData('text/emoji', em); });
  const FRAMES = [['Vuông', 'rect'], ['Bo góc', 'round'], ['Tròn', 'circle'], ['Trái tim', 'heart'], ['Ngôi sao', 'star'], ['Lục giác', 'hexagon'], ['Thoi', 'diamond'], ['Vòm', 'arch'], ['Blob', 'blob'], ['Blob 2', 'blob2'], ['Đám mây', 'cloud'], ['Lá', 'leaf']];
  $('#frameList').innerHTML = FRAMES.map(([n, k]) => `<button class="el" data-k="${k}" title="Khung ${n}">${svgPrev(shapePrev(k).replace('#6366f1', '#94a3b8'))}</button>`).join('');
  $$('#frameList button').forEach(b => b.onclick = async () => {
    const k = b.dataset.k, s = U() * 0.5, c = await FX.makeCell(0, 0, s, s, k === 'round' ? 'round' : k, k === 'round' ? s * 0.12 : 0);
    X.center(c);
  });
  const colPrev = cells => `<svg viewBox="0 0 100 100" width="44" height="44">${cells.map(([x, y, w, h]) => `<rect x="${x * 100 + 3}" y="${y * 100 + 3}" width="${w * 100 - 6}" height="${h * 100 - 6}" rx="3" fill="#94a3b8"/>`).join('')}</svg>`;
  $('#collageList').innerHTML = Object.entries(FX.COLLAGE).map(([n, c]) => `<button class="el" data-n="${n}" title="Lưới ${n}">${colPrev(c)}</button>`).join('');
  $$('#collageList button').forEach(b => b.onclick = async () => {
    const gap = +$('#colGap').value / 1000 * U(), rad = +$('#colRad').value / 1000 * U();
    const cells = await FX.collage(b.dataset.n, st.tpl.w, st.tpl.h, gap, rad);
    X.setRestoring(true); cells.forEach(c => canvas.add(c)); X.setRestoring(false);
    canvas.setActiveObject(new fabric.ActiveSelection(cells, { canvas })); canvas.requestRenderAll(); X.snapshot(); X.refreshLayers();
    toast(`Đã thêm lưới ${cells.length} ô. Kéo-thả ảnh vào từng ô hoặc nhấp đúp để chọn ảnh.`);
  });

  // ================= Properties panel extensions
  const hex = v => typeof v === 'string' && /^#[0-9a-f]{6}/i.test(v) ? v.slice(0, 7) : (typeof v === 'string' && /^#[0-9a-f]{3}$/i.test(v) ? '#' + [...v.slice(1)].map(c => c + c).join('') : '#000000');
  const commit = () => { canvas.requestRenderAll(); X.snapshot(); };
  function sec(b, title, html) { const d = document.createElement('details'); d.className = 'psec'; d.open = true; d.innerHTML = `<summary>${title}</summary>${html}`; b.appendChild(d); return d; }
  function bind(root, sel, ev, fn) { root.querySelectorAll(sel).forEach(el => el.addEventListener(ev, () => fn(el))); }
  H.props = (o, b) => {
    const u = U();
    // lock + common
    const common = document.createElement('div'); common.className = 'row';
    common.innerHTML = `<button data-a="lock">${o.xtk?.locked ? '🔓 Mở khóa' : '🔒 Khóa'}</button><button data-a="dup">⧉ Nhân bản</button>` + (o.type === 'group' && !o.xtk?.curved ? '<button data-a="ungroup">◫ Bỏ nhóm</button>' : '');
    b.prepend(common);
    bind(common, '[data-a]', 'click', el => ({ lock: toggleLock, dup: duplicate, ungroup })[el.dataset.a]());
    if (o.type === 'textbox' || o.type === 'i-text' || o.type === 'text') textProps(o, b, u);
    if (o.xtk?.curved) curvedProps(o, b, u);
    if (o.type === 'image') imageProps(o, b);
    if (['rect', 'circle', 'triangle', 'path', 'ellipse', 'polygon'].includes(o.type)) shapeProps(o, b, u);
  };
  function textProps(o, b, u) {
    const sh = o.shadow || {};
    const d = sec(b, 'Hiệu ứng chữ', `
      <div class="row"><button data-t="upper" class="${o.xtk?.upper ? 'on' : ''}">AA In hoa</button><button data-t="italic" class="${o.fontStyle === 'italic' ? 'on' : ''}"><i>I</i></button><button data-t="underline" class="${o.underline ? 'on' : ''}"><u>U</u></button></div>
      <label>Giãn chữ <input type="range" min="-100" max="1200" step="10" data-k="charSpacing" value="${o.charSpacing || 0}"></label>
      <label>Giãn dòng <input type="range" min="0.7" max="2.5" step="0.05" data-k="lineHeight" value="${o.lineHeight || 1.16}"></label>
      <label><input type="checkbox" data-c="stroke" ${o.stroke ? 'checked' : ''}> Viền chữ <input type="color" data-v="strokeColor" value="${hex(o.stroke || '#000000')}"> <input type="range" min="1" max="40" data-v="strokeW" value="${o.stroke ? Math.round(o.strokeWidth / o.fontSize * 200) : 6}"></label>
      <label><input type="checkbox" data-c="shadow" ${o.shadow ? 'checked' : ''}> Bóng đổ <input type="color" data-v="shColor" value="${hex(sh.color && sh.color.startsWith('#') ? sh.color : '#000000')}"></label>
      <label class="small">Độ nhòe <input type="range" min="0" max="100" data-v="shBlur" value="${o.shadow ? Math.round(sh.blur / u * 1000) : 20}"></label>
      <label class="small">Lệch <input type="range" min="-50" max="50" data-v="shOff" value="${o.shadow ? Math.round(sh.offsetY / u * 1000) : 8}"></label>
      <label><input type="checkbox" data-c="bg" ${o.backgroundColor ? 'checked' : ''}> Nền chữ <input type="color" data-v="bgColor" value="${hex(o.backgroundColor || '#fde047')}"></label>
      <label><input type="checkbox" data-c="grad" ${o.fill && typeof o.fill === 'object' ? 'checked' : ''}> Màu chuyển sắc <input type="color" data-v="g1" value="#6366f1"><input type="color" data-v="g2" value="#ec4899"></label>
      <button data-t="curve">↷ Chuyển thành chữ cong</button>`);
    const v = k => d.querySelector(`[data-v=${k}]`), c = k => d.querySelector(`[data-c=${k}]`).checked;
    const apply = () => {
      o.set({ stroke: c('stroke') ? v('strokeColor').value : null, strokeWidth: c('stroke') ? o.fontSize * +v('strokeW').value / 200 : 1, paintFirst: 'stroke' });
      o.set('shadow', c('shadow') ? new fabric.Shadow({ color: v('shColor').value, blur: +v('shBlur').value / 1000 * u, offsetX: +v('shOff').value / 1000 * u, offsetY: +v('shOff').value / 1000 * u }) : null);
      o.set('backgroundColor', c('bg') ? v('bgColor').value : '');
      if (c('grad')) o.set('fill', new fabric.Gradient(gradObj(v('g1').value, v('g2').value, 0)));
      else if (typeof o.fill === 'object') o.set('fill', v('g1').value);
      o.dirty = true; canvas.requestRenderAll();
    };
    bind(d, '[data-v],[data-c]', 'input', apply); bind(d, '[data-v],[data-c]', 'change', () => X.snapshot());
    bind(d, '[data-k]', 'input', el => { o.set(el.dataset.k, +el.value); o.initDimensions?.(); canvas.requestRenderAll(); }); bind(d, '[data-k]', 'change', () => X.snapshot());
    bind(d, '[data-t]', 'click', el => {
      const t = el.dataset.t;
      if (t === 'upper') { const x = o.xtk || {}; if (x.upper) { o.set('text', x.orig ?? o.text.toLowerCase()); delete x.upper; delete x.orig; } else { x.orig = o.text; x.upper = 1; o.set('text', o.text.toUpperCase()); } o.xtk = x; }
      if (t === 'italic') o.set('fontStyle', o.fontStyle === 'italic' ? 'normal' : 'italic');
      if (t === 'underline') o.set('underline', !o.underline);
      if (t === 'curve') { const g = FX.curvedText({ text: o.text.replace(/\n/g, ' '), radius: Math.max(o.width / 2, o.fontSize * 3), fontFamily: o.fontFamily, fontSize: o.fontSize, fill: typeof o.fill === 'string' ? o.fill : '#111827', fontWeight: o.fontWeight }); const c0 = o.getCenterPoint(); canvas.remove(o); add(g, c0); return; }
      commit(); X.renderProps();
    });
  }
  function curvedProps(o, b, u) {
    const p = o.xtk.curved;
    const d = sec(b, 'Chữ cong', `<label>Nội dung<input data-q="text" value="${esc(p.text)}"></label>
      <label>Font<select data-q="fontFamily">${X.FONTS.map(f => `<option ${f === p.fontFamily ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
      <label>Cỡ chữ<input type="number" data-q="fontSize" value="${Math.round(p.fontSize)}"></label>
      <label>Độ cong (bán kính, âm = cong xuống)<input type="range" data-q="radius" min="${-u}" max="${u}" step="${Math.max(1, Math.round(u / 200))}" value="${p.radius}"></label>
      <label>Giãn chữ<input type="range" data-q="charSpacing" min="0" max="800" value="${p.charSpacing || 0}"></label>
      <label>Màu<input type="color" data-q="fill" value="${hex(p.fill)}"></label>`);
    bind(d, '[data-q]', 'change', el => {
      const q = { ...p, [el.dataset.q]: ['fontSize', 'radius', 'charSpacing'].includes(el.dataset.q) ? +el.value : el.value };
      if (Math.abs(q.radius) < q.fontSize) q.radius = q.fontSize * Math.sign(q.radius || 1);
      const g = FX.curvedText(q), c0 = o.getCenterPoint(); g.set({ angle: o.angle, opacity: o.opacity });
      canvas.remove(o); add(g, c0);
    });
  }
  function shapeProps(o, b, u) {
    const d = sec(b, 'Viền & chuyển sắc', `<label><input type="checkbox" data-c="st" ${o.stroke ? 'checked' : ''}> Viền <input type="color" data-v="stc" value="${hex(o.stroke || '#111827')}"> <input type="range" min="1" max="60" data-v="stw" value="${o.stroke ? Math.max(1, Math.round(o.strokeWidth * o.scaleX / u * 1000)) : 8}"></label>
      ${o.type === 'rect' ? `<label>Bo góc<input type="range" min="0" max="${Math.round(Math.min(o.width, o.height) / 2)}" data-v="rx" value="${o.rx || 0}"></label>` : ''}
      <label><input type="checkbox" data-c="gr" ${typeof o.fill === 'object' && o.fill ? 'checked' : ''}> Chuyển sắc <input type="color" data-v="g1" value="#6366f1"><input type="color" data-v="g2" value="#ec4899"><select data-v="gt"><option value="0">Ngang</option><option value="90">Dọc</option><option value="45">Chéo</option><option value="radial">Tỏa</option></select></label>`);
    const v = k => d.querySelector(`[data-v=${k}]`), c = k => d.querySelector(`[data-c=${k}]`).checked;
    bind(d, '[data-v],[data-c]', 'input', () => {
      o.set({ stroke: c('st') ? v('stc').value : (o.type === 'path' && !o.fill ? o.stroke : null), strokeWidth: c('st') ? +v('stw').value / 1000 * u / o.scaleX : o.strokeWidth });
      if (v('rx')) o.set({ rx: +v('rx').value, ry: +v('rx').value });
      if (c('gr')) o.set('fill', new fabric.Gradient(gradObj(v('g1').value, v('g2').value, v('gt').value))); else if (typeof o.fill === 'object' && o.fill) o.set('fill', v('g1').value);
      o.dirty = true; canvas.requestRenderAll();
    });
    bind(d, '[data-v],[data-c]', 'change', () => X.snapshot());
  }
  const FILTERS = [['brightness', 'Độ sáng', -100, 100, 0], ['contrast', 'Tương phản', -100, 100, 0], ['saturation', 'Bão hòa', -100, 100, 0], ['blur', 'Làm mờ', 0, 100, 0]];
  const FTOGGLES = [['grayscale', 'Đen trắng'], ['sepia', 'Sepia'], ['vintage', 'Cổ điển'], ['sharpen', 'Làm nét']];
  const F = fabric.Image.filters;
  function applyFilters(o) {
    const f = o.xtk?.f || {}, list = [];
    if (f.brightness) list.push(new F.Brightness({ brightness: f.brightness / 100 }));
    if (f.contrast) list.push(new F.Contrast({ contrast: f.contrast / 100 }));
    if (f.saturation) list.push(new F.Saturation({ saturation: f.saturation / 100 }));
    if (f.blur) list.push(new F.Blur({ blur: f.blur / 200 }));
    if (f.grayscale) list.push(new F.Grayscale());
    if (f.sepia) list.push(new F.Sepia());
    if (f.vintage) list.push(new F.Vintage());
    if (f.sharpen) list.push(new F.Convolute({ matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0] }));
    o.filters = list; o.applyFilters(); canvas.requestRenderAll();
  }
  function imageProps(o, b) {
    const f = o.xtk?.f || {}, cr = o.xtk?.crop || { l: 0, r: 0, t: 0, b: 0 }, cell = isCell(o);
    const d = sec(b, cell ? 'Khung ảnh' : 'Chỉnh ảnh', `
      ${cell ? `<button data-i="pick" class="primary">🖼 ${o.xtk.filled ? 'Thay ảnh' : 'Chọn ảnh cho khung'}</button><p class="small muted">Hoặc kéo-thả ảnh từ máy vào khung.</p>` : ''}
      ${FILTERS.map(([k, n, a, z]) => `<label class="small">${n}<input type="range" min="${a}" max="${z}" data-f="${k}" value="${f[k] || 0}"></label>`).join('')}
      <div class="row wrap">${FTOGGLES.map(([k, n]) => `<button data-g="${k}" class="${f[k] ? 'on' : ''}">${n}</button>`).join('')}<button data-i="reset">Gốc</button></div>
      <div class="row"><button data-i="flipX">⇋ Lật ngang</button><button data-i="flipY">⇵ Lật dọc</button></div>
      ${cell ? '' : `<label class="small">Bo góc<input type="range" min="0" max="50" data-r="rad" value="${o.xtk?.shape === 'round' ? Math.round((o.xtk.rad || 0) / Math.min(o.getScaledWidth(), o.getScaledHeight()) * 100) : 0}"></label>
      <label class="small">Khung cắt<select data-r="shape">${[['none', 'Không'], ['circle', 'Tròn'], ['heart', 'Trái tim'], ['star', 'Ngôi sao'], ['hexagon', 'Lục giác'], ['blob', 'Blob'], ['arch', 'Vòm'], ['diamond', 'Thoi']].map(([k, n]) => `<option value="${k}" ${o.xtk?.shape === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <details><summary class="small">✂ Cắt ảnh</summary>${['l:Trái', 'r:Phải', 't:Trên', 'b:Dưới'].map(s => { const [k, n] = s.split(':'); return `<label class="small">${n}<input type="range" min="0" max="45" data-crop="${k}" value="${Math.round(cr[k] * 100)}"></label>`; }).join('')}</details>`}
      <button data-i="rmbg">✂️ Xóa nền (AI)</button>`);
    bind(d, '[data-f]', 'change', el => { o.xtk = { ...(o.xtk || {}), f: { ...(o.xtk?.f || {}), [el.dataset.f]: +el.value } }; applyFilters(o); X.snapshot(); });
    bind(d, '[data-g]', 'click', el => { const ff = { ...(o.xtk?.f || {}) }; ff[el.dataset.g] = !ff[el.dataset.g]; o.xtk = { ...(o.xtk || {}), f: ff }; el.classList.toggle('on'); applyFilters(o); X.snapshot(); });
    bind(d, '[data-i]', 'click', el => {
      const a = el.dataset.i;
      if (a === 'pick') return cellFile.click();
      if (a === 'reset') { o.xtk = { ...(o.xtk || {}), f: {} }; applyFilters(o); X.snapshot(); return X.renderProps(); }
      if (a === 'flipX' || a === 'flipY') { o.set(a, !o[a]); return commit(); }
      if (a === 'rmbg') return removeBg(o);
    });
    bind(d, '[data-r]', 'change', async () => {
      const shape = d.querySelector('[data-r=shape]').value, rad = +d.querySelector('[data-r=rad]').value;
      if (shape !== 'none') await FX.setClip(o, shape);
      else if (rad > 0) await FX.setClip(o, 'round', rad / 100 * Math.min(o.getScaledWidth(), o.getScaledHeight()));
      else await FX.setClip(o, 'none');
      commit();
    });
    bind(d, '[data-crop]', 'change', async () => {
      const el = o._originalElement || o._element, nw = el.naturalWidth || el.width, nh = el.naturalHeight || el.height;
      const c = {}; d.querySelectorAll('[data-crop]').forEach(i => c[i.dataset.crop] = +i.value / 100);
      const sx = o.scaleX; o.set({ cropX: nw * c.l, cropY: nh * c.t, width: nw * (1 - c.l - c.r), height: nh * (1 - c.t - c.b), scaleX: sx, scaleY: o.scaleY });
      o.xtk = { ...(o.xtk || {}), crop: c };
      if (o.clipPath && o.xtk.shape) await FX.setClip(o, o.xtk.shape, o.xtk.rad || 0);
      o.setCoords(); commit();
    });
  }

  // ================= Layout tools
  let clip = null;
  function cloneActive(cb, offset = true) {
    const a = canvas.getActiveObject(); if (!a) return;
    a.clone(c => cb(c), PROPS);
  }
  function pasteClone(c, off) {
    canvas.discardActiveObject();
    c.set({ left: c.left + off, top: c.top + off, evented: true });
    if (c.type === 'activeSelection') { c.canvas = canvas; c.forEachObject(o => canvas.add(o)); c.setCoords(); }
    else canvas.add(c);
    canvas.setActiveObject(c); canvas.requestRenderAll(); X.snapshot();
  }
  function duplicate() { cloneActive(c => pasteClone(c, U() * 0.03)); }
  function copy() { cloneActive(c => { clip = c; }); }
  function paste() { if (clip) clip.clone(c => { pasteClone(c, U() * 0.03); clip = c; }, PROPS); }
  function group() {
    const a = canvas.getActiveObject(); if (!a || a.type !== 'activeSelection') return toast('Chọn từ 2 đối tượng trở lên để nhóm (Shift + bấm)');
    const g = a.toGroup(); g.name = 'Nhóm'; canvas.requestRenderAll(); X.snapshot(); X.refreshLayers();
  }
  function ungroup() {
    const a = canvas.getActiveObject(); if (!a || a.type !== 'group') return;
    if (a.xtk?.curved) return toast('Chữ cong là một khối, không thể bỏ nhóm');
    a.toActiveSelection(); canvas.requestRenderAll(); X.snapshot(); X.refreshLayers();
  }
  function toggleLock() {
    const a = canvas.getActiveObject(); if (!a) return;
    (a.type === 'activeSelection' ? a.getObjects() : [a]).forEach(o => {
      const l = !o.xtk?.locked; o.xtk = { ...(o.xtk || {}), locked: l };
      o.set({ lockMovementX: l, lockMovementY: l, lockScalingX: l, lockScalingY: l, lockRotation: l, hasControls: !l, editable: !l });
    });
    canvas.requestRenderAll(); X.snapshot(); X.refreshLayers(); X.renderProps(); toast(a.xtk?.locked ? 'Đã khóa' : 'Đã mở khóa');
  }
  function align(mode) {
    const a = canvas.getActiveObject(); if (!a) return;
    const multi = a.type === 'activeSelection', objs = multi ? a.getObjects() : [a];
    if (multi) canvas.discardActiveObject();
    const bb = o => o.getBoundingRect(true, true);
    let L = 0, T = 0, R = st.tpl.w, B = st.tpl.h;
    if (multi) { const bs = objs.map(bb); L = Math.min(...bs.map(b => b.left)); T = Math.min(...bs.map(b => b.top)); R = Math.max(...bs.map(b => b.left + b.width)); B = Math.max(...bs.map(b => b.top + b.height)); }
    const mv = (o, dx, dy) => { o.set({ left: o.left + dx, top: o.top + dy }); o.setCoords(); };
    if (mode === 'dh' || mode === 'dv') {
      if (objs.length < 3) toast('Phân bố cần từ 3 đối tượng');
      else {
        const h = mode === 'dh', s = objs.slice().sort((p, q) => h ? bb(p).left - bb(q).left : bb(p).top - bb(q).top);
        const total = s.reduce((n, o) => n + (h ? bb(o).width : bb(o).height), 0), span = h ? R - L : B - T, gap = (span - total) / (s.length - 1);
        let pos = h ? L : T; s.forEach(o => { const b = bb(o); h ? mv(o, pos - b.left, 0) : mv(o, 0, pos - b.top); pos += (h ? b.width : b.height) + gap; });
      }
    } else objs.forEach(o => { const b = bb(o); ({ left: () => mv(o, L - b.left, 0), right: () => mv(o, R - b.left - b.width, 0), hcenter: () => mv(o, (L + R) / 2 - b.left - b.width / 2, 0), top: () => mv(o, 0, T - b.top), bottom: () => mv(o, 0, B - b.top - b.height), vcenter: () => mv(o, 0, (T + B) / 2 - b.top - b.height / 2) })[mode](); });
    if (multi) canvas.setActiveObject(new fabric.ActiveSelection(objs, { canvas }));
    canvas.requestRenderAll(); X.snapshot();
  }
  $('#dup').onclick = duplicate; $('#group').onclick = group; $('#ungroup').onclick = ungroup; $('#lock').onclick = toggleLock;
  $('#align').onchange = e => { if (e.target.value) align(e.target.value); e.target.value = ''; };
  // Smart guides / snapping
  let guides = [];
  canvas.on('object:moving', e => {
    const t = e.target, z = canvas.getZoom(), th = 6 / z; guides = [];
    const b = t.getBoundingRect(true, true), others = canvas.getObjects().filter(o => o !== t && o.name !== '__bg' && o.visible && !(t.type === 'activeSelection' && t.contains(o)));
    const vx = [0, st.tpl.w / 2, st.tpl.w], hy = [0, st.tpl.h / 2, st.tpl.h];
    others.forEach(o => { const r = o.getBoundingRect(true, true); vx.push(r.left, r.left + r.width / 2, r.left + r.width); hy.push(r.top, r.top + r.height / 2, r.top + r.height); });
    const snap = (edges, lines) => { let best = null; edges.forEach(e0 => lines.forEach(l => { const d = l - e0; if (Math.abs(d) < th && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, l }; })); return best; };
    const sx = snap([b.left, b.left + b.width / 2, b.left + b.width], vx), sy = snap([b.top, b.top + b.height / 2, b.top + b.height], hy);
    if (sx) { t.left += sx.d; guides.push({ x: sx.l }); }
    if (sy) { t.top += sy.d; guides.push({ y: sy.l }); }
    if (sx || sy) t.setCoords();
  });
  canvas.on('mouse:up', () => { if (guides.length) { guides = []; canvas.requestRenderAll(); } });
  canvas.on('after:render', opt => {
    if (!guides.length || (opt && opt.ctx && opt.ctx !== canvas.contextContainer)) return;
    const g = canvas.contextContainer, v = canvas.viewportTransform; g.save(); g.strokeStyle = '#ec4899'; g.lineWidth = 1; g.setLineDash([4, 3]);
    guides.forEach(l => { g.beginPath(); if (l.x != null) { const x = l.x * v[0] + v[4]; g.moveTo(x, 0); g.lineTo(x, canvas.height); } else { const y = l.y * v[3] + v[5]; g.moveTo(0, y); g.lineTo(canvas.width, y); } g.stroke(); });
    g.restore();
  });
  // Rulers
  let rulers = false;
  function drawRulers() {
    const top = $('#rulerTop'), left = $('#rulerLeft'); top.hidden = left.hidden = !rulers; if (!rulers || !st.tpl) return;
    const wrap = canvas.wrapperEl, z = canvas.getZoom(), S = 20, dpr = devicePixelRatio || 1;
    const print = st.tpl.print, unit = print ? 300 / 2.54 : 1, uname = print ? 'cm' : 'px';
    let step = 1; const cand = [1, 2, 5]; outer: for (let p = -2; p < 6; p++) for (const c of cand) { step = c * 10 ** p; if (step * unit * z >= 60) break outer; }
    const draw = (cv, len, vertical) => {
      cv.width = (vertical ? S : len) * dpr; cv.height = (vertical ? len : S) * dpr; cv.style.width = (vertical ? S : len) + 'px'; cv.style.height = (vertical ? len : S) + 'px';
      const g = cv.getContext('2d'); g.scale(dpr, dpr); g.fillStyle = '#f8fafc'; g.fillRect(0, 0, vertical ? S : len, vertical ? len : S); g.fillStyle = '#475569'; g.strokeStyle = '#94a3b8'; g.font = '9px sans-serif';
      const max = (vertical ? st.tpl.h : st.tpl.w) / unit;
      for (let v = 0; v <= max + 1e-9; v += step / 5) {
        const p = v * unit * z, major = Math.abs(v / step - Math.round(v / step)) < 1e-6;
        g.beginPath(); if (vertical) { g.moveTo(S, p); g.lineTo(S - (major ? 10 : 4), p); } else { g.moveTo(p, S); g.lineTo(p, S - (major ? 10 : 4)); } g.stroke();
        if (major) { const lb = +v.toFixed(2) + (v === 0 ? uname : ''); if (vertical) { g.save(); g.translate(8, p + 2); g.rotate(-Math.PI / 2); g.fillText(lb, 0, 0); g.restore(); } else g.fillText(lb, p + 2, 9); }
      }
    };
    draw(top, canvas.width, false); draw(left, canvas.height, true);
    top.style.left = wrap.offsetLeft + 'px'; top.style.top = (wrap.offsetTop - S) + 'px';
    left.style.left = (wrap.offsetLeft - S) + 'px'; left.style.top = wrap.offsetTop + 'px';
  }
  $('#rulerToggle').onclick = () => { rulers = !rulers; $('#rulerToggle').classList.toggle('on', rulers); drawRulers(); };
  new ResizeObserver(() => setTimeout(drawRulers, 30)).observe($('#stage'));
  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (!$('#view-designer').classList.contains('active') || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const a = canvas.getActiveObject(); if (a?.isEditing) return;
    const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
    const act = fn => { e.preventDefault(); fn(); };
    if (mod && k === 'd') return act(duplicate);
    if (mod && k === 'g') return act(e.shiftKey ? ungroup : group);
    if (mod && k === 'l') return act(toggleLock);
    if (mod && k === 'c') return act(copy);
    if (mod && k === 'v') return act(paste);
    if (mod && k === 's') return act(() => $('#save').click());
    if (mod && k === 'a') return act(() => { const os = canvas.getObjects().filter(o => o.selectable !== false && o.name !== '__bg'); if (os.length) { canvas.setActiveObject(new fabric.ActiveSelection(os, { canvas })); canvas.requestRenderAll(); } });
    if (k === 'escape') return act(() => { canvas.discardActiveObject(); canvas.isDrawingMode = false; canvas.requestRenderAll(); });
    if (a && k.startsWith('arrow') && !a.lockMovementX) {
      const d = (e.shiftKey ? 10 : 1) / canvas.getZoom();
      act(() => { a.set({ left: a.left + (k === 'arrowleft' ? -d : k === 'arrowright' ? d : 0), top: a.top + (k === 'arrowup' ? -d : k === 'arrowdown' ? d : 0) }); a.setCoords(); canvas.requestRenderAll(); clearTimeout(act._t); act._t = setTimeout(X.snapshot, 400); });
    }
  });

  // ================= Pages
  const thumbs = [];
  function savePage() { st.pages[st.cur] = canvas.toJSON(PROPS); thumbs[st.cur] = X.thumb(); }
  async function loadPage(json) {
    X.setRestoring(true); canvas.discardActiveObject(); canvas.clear(); canvas.backgroundColor = '#ffffff';
    if (json) await loadJSON(canvas, json);
    X.setRestoring(false); X.resetHistory(); X.snapshot(); X.refreshLayers(); X.renderProps(); X.checkDpi(); canvas.requestRenderAll();
  }
  async function gotoPage(i, save = true) { if (save) savePage(); st.cur = i; await loadPage(st.pages[i]); renderPages(); }
  function renderPages() {
    const p = $('#pages'); p.innerHTML = ''; if (st.tpl) try { thumbs[st.cur] = X.thumb(); } catch (e) {}
    st.pages.forEach((_, i) => {
      const b = document.createElement('button'); b.className = 'page' + (i === st.cur ? ' on' : ''); b.title = 'Trang ' + (i + 1);
      b.innerHTML = (thumbs[i] ? `<img src="${thumbs[i]}" alt="">` : '') + `<span>${i + 1}</span>`;
      b.onclick = () => i !== st.cur && gotoPage(i); p.appendChild(b);
    });
  }
  // Keep the current page's tab thumbnail live (debounced)
  let thumbT; const liveThumb = () => { clearTimeout(thumbT); thumbT = setTimeout(() => { if (!st.tpl) return; const img = $('#pages .page.on img'); thumbs[st.cur] = X.thumb(); if (img) img.src = thumbs[st.cur]; else renderPages(); }, 400); };
  ['object:added', 'object:modified', 'object:removed'].forEach(ev => canvas.on(ev, liveThumb));
  H.opened = () => { if (!X.setRestoring) return; thumbs.length = 0; renderPages(); setTimeout(drawRulers, 30); };
  H.pages = () => { thumbs.length = 0; renderPages(); };
  $('#pageAdd').onclick = async () => { savePage(); st.pages.splice(st.cur + 1, 0, null); thumbs.splice(st.cur + 1, 0, null); await gotoPage(st.cur + 1, false); };
  $('#pageDup').onclick = async () => { savePage(); st.pages.splice(st.cur + 1, 0, JSON.parse(JSON.stringify(st.pages[st.cur]))); thumbs.splice(st.cur + 1, 0, thumbs[st.cur]); await gotoPage(st.cur + 1, false); };
  $('#pageDel').onclick = async () => { if (st.pages.length < 2) return toast('Thiết kế cần ít nhất 1 trang'); if (!confirm('Xóa trang ' + (st.cur + 1) + '?')) return; st.pages.splice(st.cur, 1); thumbs.splice(st.cur, 1); await gotoPage(Math.max(0, st.cur - 1), false); };
  // Run fn for every page (loaded into the main canvas), then restore the current page
  async function eachPage(fn) {
    savePage(); const cur = st.cur, out = [];
    for (let i = 0; i < st.pages.length; i++) { if (st.pages.length > 1) { st.cur = i; await loadPage(st.pages[i]); } out.push(await fn(i)); }
    if (st.pages.length > 1) { st.cur = cur; await loadPage(st.pages[cur]); renderPages(); }
    return out;
  }

  // ================= Export: transparent PNG, PDF, SVG, ZIP
  async function withTransparent(fn) {
    const bg = canvas.backgroundColor, r = bgRect(); canvas.backgroundColor = null; if (r) r.visible = false;
    try { return await fn(); } finally { canvas.backgroundColor = bg; if (r) r.visible = true; canvas.requestRenderAll(); }
  }
  async function exportPNGT() {
    const r = await withTransparent(() => Exporter.exportDesign(canvas, st.tpl.w, st.tpl.h, { format: 'png', scale: +$('#exportScale').value, ...(X.exportOpts?.() || {}), onProgress: prog.on }));
    prog.off(); download(r.blob, `${fname()}_${r.width}x${r.height}_trong-suot.png`); toast('Đã xuất PNG nền trong suốt'); return r;
  }
  async function exportPDF() {
    const { jsPDF } = window.jspdf, t = st.tpl, pxmm = t.print ? 25.4 / 300 : 25.4 / 96;
    const bleed = $('#bleed').checked && t.print ? 3 : 0, bpx = bleed / pxmm;
    const Wmm = t.w * pxmm + 2 * bleed, Hmm = t.h * pxmm + 2 * bleed;
    const maxSide = 7000, sc = Math.min(+$('#exportScale').value, maxSide / Math.max(t.w + 2 * bpx, t.h + 2 * bpx));
    const pdf = new jsPDF({ unit: 'mm', format: [Wmm, Hmm], orientation: Wmm > Hmm ? 'l' : 'p', compress: true });
    await eachPage(async i => {
      prog.on(i / st.pages.length, `PDF: trang ${i + 1}/${st.pages.length}`); await tick();
      canvas.discardActiveObject();
      const r = bgRect(); if (r && bpx) r.set({ left: -bpx, top: -bpx, width: t.w + 2 * bpx, height: t.h + 2 * bpx });
      const el = Exporter.renderRegion(canvas, -bpx, -bpx, t.w + 2 * bpx, t.h + 2 * bpx, sc);
      if (r && bpx) r.set({ left: 0, top: 0, width: t.w, height: t.h });
      const c2 = document.createElement('canvas'); c2.width = el.width; c2.height = el.height; const g = c2.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c2.width, c2.height); g.drawImage(el, 0, 0);
      if (i) pdf.addPage([Wmm, Hmm], Wmm > Hmm ? 'l' : 'p');
      pdf.addImage(c2.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, Wmm, Hmm, undefined, 'FAST');
      el.width = el.height = c2.width = c2.height = 0;
      if (bleed) { // crop marks inside the bleed zone
        pdf.setDrawColor(0); pdf.setLineWidth(0.15);
        [[bleed, 0, bleed, bleed * 0.8], [0, bleed, bleed * 0.8, bleed], [Wmm - bleed, 0, Wmm - bleed, bleed * 0.8], [Wmm, bleed, Wmm - bleed * 0.8, bleed], [bleed, Hmm, bleed, Hmm - bleed * 0.8], [0, Hmm - bleed, bleed * 0.8, Hmm - bleed], [Wmm - bleed, Hmm, Wmm - bleed, Hmm - bleed * 0.8], [Wmm, Hmm - bleed, Wmm - bleed * 0.8, Hmm - bleed]].forEach(l => pdf.line(...l));
      }
    });
    const blob = pdf.output('blob'); prog.off();
    download(blob, `${fname()}${bleed ? '_tran-le-3mm' : ''}.pdf`);
    toast(`Đã xuất PDF ${st.pages.length} trang · ${Wmm.toFixed(1)}×${Hmm.toFixed(1)} mm${sc < 1 ? ' (ảnh ' + Math.round(sc * 100) + '% vì khổ lớn)' : ''}`);
    return { blob, Wmm, Hmm, pages: st.pages.length };
  }
  let fontCssP;
  async function fontFaces(families) {
    fontCssP = fontCssP || fetch('fonts/fonts.css').then(r => r.text());
    const css = await fontCssP, blocks = css.match(/@font-face\s*{[^}]*}/g) || [], out = [];
    for (const bl of blocks) {
      const fam = (bl.match(/font-family:\s*['"]?([^;'"]+)/) || [])[1]; if (!families.has(fam)) continue;
      const url = (bl.match(/url\(['"]?([^)'"]+)/) || [])[1]; if (!url) continue;
      const buf = await (await fetch(new URL(url, location.origin + location.pathname.replace(/[^/]*$/, '') + 'fonts/'))).arrayBuffer();
      let bin = ''; const u8 = new Uint8Array(buf); for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
      out.push(bl.replace(/url\([^)]*\)/, `url(data:font/woff2;base64,${btoa(bin)})`));
    }
    return out.join('\n');
  }
  async function exportSVG() {
    const vpt = canvas.viewportTransform.slice(); canvas.discardActiveObject();
    canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
    let svg; try { svg = canvas.toSVG({ width: st.tpl.w, height: st.tpl.h, viewBox: { x: 0, y: 0, width: st.tpl.w, height: st.tpl.h } }); } finally { canvas.viewportTransform = vpt; canvas.requestRenderAll(); }
    const fams = new Set(); const walk = o => { if (o.fontFamily) fams.add(o.fontFamily); (o._objects || []).forEach(walk); }; canvas.getObjects().forEach(walk);
    const css = await fontFaces(fams); if (css) svg = svg.replace(/(<svg[^>]*>)/, `$1<defs><style>${css}</style></defs>`);
    const blob = new Blob([svg], { type: 'image/svg+xml' }); download(blob, fname() + '.svg'); toast('Đã xuất SVG (đã nhúng font)'); return { blob, size: blob.size };
  }
  async function exportZIP() {
    const zip = new JSZip(), sc = +$('#exportScale').value;
    await eachPage(async i => { const r = await Exporter.exportDesign(canvas, st.tpl.w, st.tpl.h, { format: 'png', scale: sc, onProgress: (f) => prog.on((i + f) / st.pages.length, `Trang ${i + 1}/${st.pages.length}`) }); zip.file(`${fname()}_trang-${String(i + 1).padStart(2, '0')}.png`, r.blob); });
    const blob = await zip.generateAsync({ type: 'blob' }); prog.off(); download(blob, fname() + '_cac-trang.zip'); toast(`Đã xuất ZIP ${st.pages.length} trang`); return { blob };
  }
  async function doExport2(fmt) {
    try {
      if (fmt === 'png' || fmt === 'jpg') return await X.doExport(fmt, +$('#exportScale').value);
      return await ({ 'png-t': exportPNGT, pdf: exportPDF, svg: exportSVG, zip: exportZIP })[fmt]();
    } catch (e) { prog.off(); toast('Xuất thất bại: ' + e.message); throw e; }
  }
  $('#exportBtn').onclick = () => doExport2($('#exportFmt').value);

  // ================= Smart resize
  async function resizeJSON(json, from, to) {
    const sx = to.w / from.w, sy = to.h / from.h, s = Math.min(sx, sy);
    const objs = await FX.enliven(json.objects || []);
    objs.forEach(o => {
      if (o.name === '__bg') { o.set({ left: 0, top: 0, width: to.w, height: to.h, scaleX: 1, scaleY: 1 }); return; }
      o.setCoords(); const b = o.getBoundingRect(true, true);
      const full = b.width >= from.w * 0.9 && b.height >= from.h * 0.9, k = full ? Math.max(sx, sy) : s;
      const c = new fabric.Point((b.left + b.width / 2) * sx, (b.top + b.height / 2) * sy);
      if (o.type === 'textbox') {
        o.set({ fontSize: o.fontSize * k, width: Math.min(o.width * k * (sx > sy ? Math.min(sx / sy, 1.6) : 1), to.w * 0.96 / o.scaleX), strokeWidth: o.strokeWidth * k });
        if (o.shadow) o.shadow = new fabric.Shadow({ ...o.shadow, blur: o.shadow.blur * k, offsetX: o.shadow.offsetX * k, offsetY: o.shadow.offsetY * k });
        o.initDimensions();
      } else o.set({ scaleX: o.scaleX * k, scaleY: o.scaleY * k });
      o.setPositionByOrigin(c, 'center', 'center');
    });
    return { version: json.version, background: json.background, objects: objs.map(o => o.toObject(PROPS)) };
  }
  $('#resizeBtn').onclick = () => {
    $('#resizeList').innerHTML = TEMPLATES.filter(t => t.id !== st.tpl.id).map(t => `<label class="small"><input type="checkbox" value="${t.id}"> ${esc(t.name)} <span class="muted">${t.w}×${t.h}</span></label>`).join('');
    $('#resizeDlg').showModal();
  };
  $('#resizeClose').onclick = () => $('#resizeDlg').close();
  const chosen = () => [...$$('#resizeList input:checked')].map(i => tplById(i.value));
  async function resizeAll(to) { savePage(); const from = st.tpl; return Promise.all(st.pages.map(p => p ? resizeJSON(p, from, to) : null)); }
  async function openResized(to) {
    const pages = await resizeAll(to), name = $('#designName').value;
    X.openTemplate(to, pages[0]); st.pages = pages; st.cur = 0; thumbs.length = 0; renderPages(); $('#designName').value = name + ' – ' + to.name;
    toast('Đã đổi sang ' + to.name + ' (' + to.w + '×' + to.h + '). Kiểm tra lại bố cục trước khi xuất.');
  }
  $('#resizeOpen').onclick = async () => { const c = chosen(); if (!c.length) return toast('Chọn ít nhất một kích thước'); $('#resizeDlg').close(); await openResized(c[0]); };
  async function renderJSONToBlob(json, t, scale = 1, format = 'png') {
    const el = document.createElement('canvas'); const sc = new fabric.StaticCanvas(el, { width: 10, height: 10, enableRetinaScaling: false });
    await loadJSON(sc, json); const r = await Exporter.exportDesign(sc, t.w, t.h, { format, scale }); sc.dispose(); return r.blob;
  }
  $('#resizeZip').onclick = async () => {
    const c = chosen(); if (!c.length) return toast('Chọn ít nhất một kích thước'); $('#resizeDlg').close();
    const zip = new JSZip();
    for (const [i, to] of c.entries()) { prog.on(i / c.length, 'Đổi cỡ: ' + to.name); const pages = await resizeAll(to); for (const [j, p] of pages.entries()) if (p) zip.file(`${fname()}_${to.id}${pages.length > 1 ? '_trang-' + (j + 1) : ''}.png`, await renderJSONToBlob(p, to, Math.min(1, 4000 / Math.max(to.w, to.h)))); }
    download(await zip.generateAsync({ type: 'blob' }), fname() + '_doi-co.zip'); prog.off(); toast('Đã tải ZIP ' + c.length + ' kích thước');
  };

  // ================= Brand kit (IndexedDB)
  let brand = null;
  const fontOpts = sel => X.FONTS.map(f => `<option ${f === sel ? 'selected' : ''}>${f}</option>`).join('');
  async function renderBrand() {
    brand = brand || await DB.getBrand();
    $('#brandColors').innerHTML = brand.colors.map((c, i) => `<span style="background:${c}" title="${c} (bấm để dùng, chuột phải để xóa)" data-i="${i}"></span>`).join('') || '<small class="muted">Chưa có màu</small>';
    $$('#brandColors span').forEach(s => { s.onclick = () => X.applyColor(brand.colors[+s.dataset.i]); s.oncontextmenu = e => { e.preventDefault(); brand.colors.splice(+s.dataset.i, 1); saveBrand(); }; });
    $('#brandFontH').innerHTML = fontOpts(brand.fontH); $('#brandFontB').innerHTML = fontOpts(brand.fontB);
    $('#brandLogos').innerHTML = brand.logos.map((l, i) => `<div><img src="${l}" alt="logo" data-i="${i}" title="Bấm để thêm vào thiết kế"><button data-x="${i}" title="Xóa">✕</button></div>`).join('');
    $$('#brandLogos img').forEach(im => im.onclick = () => placeImage(brand.logos[+im.dataset.i], 'Logo', { x: st.tpl.w / 2, y: st.tpl.h / 2 }));
    $$('#brandLogos [data-x]').forEach(b => b.onclick = () => { brand.logos.splice(+b.dataset.x, 1); saveBrand(); });
  }
  async function saveBrand() { await DB.putBrand(brand); renderBrand(); }
  $('#brandAddColor').onclick = async () => { brand = brand || await DB.getBrand(); const c = $('#brandColorPick').value; if (!brand.colors.includes(c)) brand.colors.push(c); saveBrand(); };
  $('#brandFontH').onchange = e => { brand.fontH = e.target.value; saveBrand(); };
  $('#brandFontB').onchange = e => { brand.fontB = e.target.value; saveBrand(); };
  $('#brandLogoUp').onchange = async e => { const f = e.target.files[0]; if (!f) return; e.target.value = ''; brand = brand || await DB.getBrand(); brand.logos.push(await readFile(f)); saveBrand(); };
  async function applyBrand() {
    brand = brand || await DB.getBrand(); if (!brand.colors.length) return toast('Thêm ít nhất một màu thương hiệu trước');
    const flat = []; const walk = o => { if (o.type === 'group' && !o.xtk?.curved) o.getObjects().forEach(walk); else flat.push(o); }; canvas.getObjects().forEach(walk);
    const area = {}; const add2 = (c, a) => { if (typeof c === 'string' && /^#|^rgb/.test(c) && !/rgba\(0,\s*0,\s*0,\s*0\)/.test(c)) area[c.toLowerCase()] = (area[c.toLowerCase()] || 0) + a; };
    add2(canvas.backgroundColor, st.tpl.w * st.tpl.h);
    flat.forEach(o => { if (o.type === 'image' || /text/.test(o.type)) return; add2(o.fill, o.getScaledWidth() * o.getScaledHeight()); });
    const ranked = Object.entries(area).sort((a, b) => b[1] - a[1]).map(e => e[0]), map = {};
    ranked.forEach((c, i) => map[c] = brand.colors[i % brand.colors.length]);
    const lum = h => { const m = /^#([0-9a-f]{6})/i.exec(h); if (!m) return 0.5; const n = parseInt(m[1], 16); return ((n >> 16) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) / 255; };
    if (typeof canvas.backgroundColor === 'string' && map[canvas.backgroundColor.toLowerCase()]) canvas.backgroundColor = map[canvas.backgroundColor.toLowerCase()];
    const bgL = lum(typeof canvas.backgroundColor === 'string' ? canvas.backgroundColor : '#ffffff');
    const texts = flat.filter(o => /text/.test(o.type)), maxFs = Math.max(0, ...texts.map(t => t.fontSize * t.scaleY));
    flat.forEach(o => {
      if (/text/.test(o.type)) {
        o.set('fontFamily', o.fontSize * o.scaleY >= maxFs * 0.6 ? brand.fontH : brand.fontB);
        if (typeof o.fill === 'string') { const cands = brand.colors.filter(c => Math.abs(lum(c) - bgL) > 0.45); if (cands.length) o.set('fill', cands[o.fontSize * o.scaleY >= maxFs * 0.6 ? 0 : cands.length - 1]); }
        o.initDimensions?.();
      } else if (typeof o.fill === 'string' && map[o.fill.toLowerCase()]) o.set('fill', map[o.fill.toLowerCase()]);
      if (o.type === 'line' && typeof o.stroke === 'string') o.set('stroke', brand.colors[0]);
      o.dirty = true;
    });
    canvas.getObjects().forEach(o => { if (o.type === 'group') { o.dirty = true; o.addWithUpdate?.(); } });
    canvas.requestRenderAll(); X.snapshot(); toast('Đã áp dụng bộ nhận diện thương hiệu');
  }
  $('#brandApply').onclick = applyBrand;

  // ================= Tools: drawing, QR, charts, tables
  function brush(hi) {
    canvas.isDrawingMode = true; const b = new fabric.PencilBrush(canvas); const w = +$('#drawW').value * U() / 500;
    const c = color(); b.width = hi ? w * 3 : w;
    b.color = hi ? `rgba(${parseInt(c.slice(1, 3), 16)},${parseInt(c.slice(3, 5), 16)},${parseInt(c.slice(5, 7), 16)},0.4)` : c; b.decimate = 2; b.xtkHi = hi;
    canvas.freeDrawingBrush = b; toast((hi ? 'Bút dạ quang' : 'Bút vẽ') + ': kéo trên thiết kế để vẽ, Esc để dừng');
  }
  $('#drawPen').onclick = () => brush(false); $('#drawHi').onclick = () => brush(true); $('#drawOff').onclick = () => { canvas.isDrawingMode = false; };
  canvas.on('path:created', e => { const hi = canvas.freeDrawingBrush.xtkHi; e.path.set({ name: hi ? 'Nét dạ quang' : 'Nét vẽ', strokeLineCap: hi ? 'square' : 'round' }); if (hi) e.path.globalCompositeOperation = 'multiply'; X.snapshot(); X.refreshLayers(); });
  function makeQR(text, size, fg = '#000000') {
    const q = qrcode(0, 'M'); q.addData(unescape(encodeURIComponent(text))); q.make();
    const n = q.getModuleCount(), m = size / (n + 8); let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    const path = new fabric.Path(d, { fill: fg, scaleX: m, scaleY: m, left: 4 * m, top: 4 * m, objectCaching: false });
    const bg = new fabric.Rect({ width: size, height: size, fill: '#ffffff', left: 0, top: 0 });
    return new fabric.Group([bg, path], { name: 'Mã QR', xtk: { qr: text } });
  }
  $('#qrAdd').onclick = () => { const t = $('#qrText').value.trim(); if (!t) return toast('Nhập nội dung cho mã QR'); X.center(makeQR(t, U() * 0.35)); };
  const parseKV = s => s.split('\n').map(l => l.split(/[:,;\t]/)).filter(p => p.length >= 2 && !isNaN(parseFloat(p[1]))).map(p => [p[0].trim(), parseFloat(p[1])]);
  const CHART_COLORS = ['#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#8b5cf6', '#84cc16'];
  function makeChart(type, data, W, Hh) {
    const parts = [], max = Math.max(...data.map(d => d[1]), 1), fs = Hh * 0.06, ff = 'Be Vietnam Pro';
    if (type === 'pie') {
      const R = Math.min(W * 0.5, Hh) / 2 * 0.9, tot = data.reduce((a, d) => a + d[1], 0) || 1; let a0 = -Math.PI / 2;
      parts.length = 0; a0 = -Math.PI / 2;
      data.forEach((d, i) => { const a1 = a0 + d[1] / tot * Math.PI * 2, large = a1 - a0 > Math.PI ? 1 : 0;
        const p = new fabric.Path(`M${R} ${R} L${R + R * Math.cos(a0)} ${R + R * Math.sin(a0)} A${R} ${R} 0 ${large} 1 ${R + R * Math.cos(a1)} ${R + R * Math.sin(a1)} Z`, { fill: CHART_COLORS[i % 8], stroke: '#fff', strokeWidth: R * 0.01 });
        p.set({ left: p.pathOffset.x - p.width / 2, top: p.pathOffset.y - p.height / 2 }); parts.push(p);
        parts.push(new fabric.Rect({ left: 2 * R + W * 0.05, top: i * fs * 1.6, width: fs, height: fs, fill: CHART_COLORS[i % 8] }));
        parts.push(new fabric.Text(`${d[0]} (${Math.round(d[1] / tot * 100)}%)`, { left: 2 * R + W * 0.05 + fs * 1.4, top: i * fs * 1.6 - fs * 0.1, fontSize: fs, fontFamily: ff, fill: '#1f2937' }));
        a0 = a1; });
    } else {
      const n = data.length, ch = Hh * 0.82, bw = W / n;
      parts.push(new fabric.Line([0, ch, W, ch], { stroke: '#94a3b8', strokeWidth: Math.max(1, Hh * 0.006) }));
      const pts = data.map((d, i) => ({ x: bw * (i + 0.5), y: ch - d[1] / max * ch * 0.9 }));
      data.forEach((d, i) => {
        if (type === 'bar') parts.push(new fabric.Rect({ left: bw * i + bw * 0.15, top: pts[i].y, width: bw * 0.7, height: ch - pts[i].y, fill: CHART_COLORS[i % 8], rx: bw * 0.05, ry: bw * 0.05 }));
        parts.push(new fabric.Text(d[0], { left: pts[i].x, top: ch + Hh * 0.03, originX: 'center', fontSize: fs, fontFamily: ff, fill: '#334155' }));
        parts.push(new fabric.Text(String(d[1]), { left: pts[i].x, top: pts[i].y - fs * 1.3, originX: 'center', fontSize: fs * 0.9, fontFamily: ff, fontWeight: 700, fill: '#111827' }));
      });
      if (type === 'line') { parts.push(new fabric.Polyline(pts, { fill: '', stroke: CHART_COLORS[0], strokeWidth: Hh * 0.012, strokeLineJoin: 'round', objectCaching: false })); pts.forEach(p => parts.push(new fabric.Circle({ left: p.x, top: p.y, radius: Hh * 0.018, originX: 'center', originY: 'center', fill: '#fff', stroke: CHART_COLORS[0], strokeWidth: Hh * 0.008 }))); }
    }
    return new fabric.Group(parts, { name: 'Biểu đồ', xtk: { chart: { type, data } } });
  }
  $('#chartAdd').onclick = () => { const d = parseKV($('#chartData').value); if (!d.length) return toast('Nhập dữ liệu dạng "Nhãn: số", mỗi dòng một mục'); X.center(makeChart($('#chartType').value, d, U() * 0.7, U() * 0.45)); };
  const parseCSV = s => { const rows = []; let row = [], f = '', q = false; for (let i = 0; i < s.length; i++) { const c = s[i]; if (q) { if (c === '"' && s[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; } else if (c === '"') q = true; else if (c === ',' || c === ';' || c === '\t') { row.push(f); f = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(f); f = ''; if (row.some(x => x !== '')) rows.push(row); row = []; } else f += c; } row.push(f); if (row.some(x => x !== '')) rows.push(row); return rows.map(r => r.map(x => x.trim())); };
  function makeTable(rows, W) {
    const cols = Math.max(...rows.map(r => r.length)), cw = W / cols, rh = W * 0.09, fs = rh * 0.38, parts = [];
    rows.forEach((r, i) => { for (let j = 0; j < cols; j++) {
      parts.push(new fabric.Rect({ left: j * cw, top: i * rh, width: cw, height: rh, fill: i === 0 ? '#4f46e5' : i % 2 ? '#ffffff' : '#eef2ff', stroke: '#c7d2fe', strokeWidth: Math.max(1, W * 0.002) }));
      parts.push(new fabric.Textbox(r[j] || '', { left: j * cw + cw * 0.06, top: i * rh + (rh - fs * 1.16) / 2, width: cw * 0.88, fontSize: fs, fontFamily: 'Be Vietnam Pro', fontWeight: i === 0 ? 700 : 400, fill: i === 0 ? '#ffffff' : '#1f2937', textAlign: j ? 'center' : 'left' }));
    } });
    return new fabric.Group(parts, { name: 'Bảng', subTargetCheck: true, xtk: { table: rows } });
  }
  $('#tableAdd').onclick = () => { const r = parseCSV($('#tableData').value); if (!r.length) return toast('Nhập dữ liệu bảng (CSV)'); X.center(makeTable(r, U() * 0.75)); };

  // ================= Bulk create from CSV
  $('#bulkFile').onchange = async e => { const f = e.target.files[0]; if (!f) return; e.target.value = ''; $('#bulkCsv').value = await readFile(f, 'text'); };
  async function bulkCreate(csvText) {
    const rows = parseCSV(csvText || $('#bulkCsv').value); if (rows.length < 2) throw new Error('CSV cần dòng tiêu đề và ít nhất 1 dòng dữ liệu');
    const head = rows[0], data = rows.slice(1); savePage();
    const base = JSON.stringify(st.pages[st.cur]);
    const used = head.filter(h => base.includes('{{' + h + '}}')); if (!used.length) throw new Error('Thiết kế chưa có ô {{tên_cột}} nào khớp với CSV: ' + head.map(h => '{{' + h + '}}').join(', '));
    const zip = new JSZip(), sc = Math.min(+$('#exportScale').value, 4000 / Math.max(st.tpl.w, st.tpl.h)), names = new Set();
    for (const [i, r] of data.entries()) {
      prog.on(i / data.length, `Đang tạo ${i + 1}/${data.length}`);
      let j = base; head.forEach((h, k) => { j = j.split('{{' + h + '}}').join(JSON.stringify(r[k] ?? '').slice(1, -1)); });
      let nm = (r[0] || 'muc').replace(/[\\/:*?"<>|]/g, '_').slice(0, 40); while (names.has(nm)) nm += '_'; names.add(nm);
      zip.file(`${String(i + 1).padStart(3, '0')}_${nm}.png`, await renderJSONToBlob(JSON.parse(j), st.tpl, sc));
    }
    const blob = await zip.generateAsync({ type: 'blob' }); prog.off(); download(blob, fname() + '_hang-loat.zip');
    toast(`Đã tạo ${data.length} thiết kế và nén ZIP`); return { count: data.length, blob };
  }
  $('#bulkGo').onclick = () => bulkCreate().catch(e => { prog.off(); toast(e.message, 6000); });

  // ================= Project JSON + full backup
  function projectData() { savePage(); return { app: 'xuong-thiet-ke', version: 2, name: $('#designName').value, tpl: st.tpl, pages: st.pages, created: new Date().toISOString() }; }
  async function importProject(p) {
    if (!p || p.app !== 'xuong-thiet-ke' || !p.tpl || !Array.isArray(p.pages)) throw new Error('Tệp không phải dự án Xưởng Thiết Kế');
    X.openDoc({ id: null, name: p.name || 'Dự án nhập', tpl: p.tpl, json: p.pages[0], pages: p.pages }); st.id = null; renderPages();
  }
  async function backupZip() {
    const zip = new JSZip(), all = await DB.all(), b = await DB.getBrand();
    zip.file('designs.json', JSON.stringify(all)); zip.file('brand.json', JSON.stringify(b));
    zip.file('README.txt', `Sao lưu Xưởng Thiết Kế — ${new Date().toLocaleString('vi-VN')}\n${all.length} thiết kế + bộ nhận diện thương hiệu.\nKhôi phục: Dự án… → Khôi phục từ .zip`);
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }); download(blob, 'xuong-thiet-ke-sao-luu.zip'); toast(`Đã sao lưu ${all.length} thiết kế`); return { blob, count: all.length };
  }
  async function restoreZip(buf) {
    const zip = await JSZip.loadAsync(buf), d = zip.file('designs.json'); if (!d) throw new Error('Không tìm thấy designs.json trong tệp sao lưu');
    const list = JSON.parse(await d.async('string')); for (const x of list) await DB.put(x);
    const b = zip.file('brand.json'); if (b) { brand = JSON.parse(await b.async('string')); await DB.putBrand(brand); }
    toast(`Đã khôi phục ${list.length} thiết kế`); return list.length;
  }
  $('#projMenu').onchange = async e => {
    const v = e.target.value; e.target.value = '';
    if (v === 'exp') download(new Blob([JSON.stringify(projectData())], { type: 'application/json' }), fname() + '.xtk.json');
    if (v === 'imp') $('#projFile').click();
    if (v === 'backup') backupZip();
    if (v === 'restore') $('#restoreFile').click();
  };
  $('#projFile').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (f) try { await importProject(JSON.parse(await readFile(f, 'text'))); toast('Đã nhập dự án'); } catch (er) { toast(er.message); } };
  $('#restoreFile').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (f) try { await restoreZip(await readFile(f, 'buf')); } catch (er) { toast(er.message); } };

  // ================= Background removal (on-device, @imgly/background-removal loaded on first use)
  const BGR_URL = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm';
  let bgrMod = null;
  async function removeBg(o) {
    o = o || canvas.getActiveObject(); if (!o || o.type !== 'image') return toast('Hãy chọn một ảnh để xóa nền');
    try {
      prog.on(0.02, 'Đang tải thư viện tách nền…');
      bgrMod = bgrMod || await import(BGR_URL);
      const el = o._originalElement || o._element, c = document.createElement('canvas'); c.width = el.naturalWidth || el.width; c.height = el.naturalHeight || el.height; c.getContext('2d').drawImage(el, 0, 0);
      const src = await new Promise(r => c.toBlob(r, 'image/png'));
      const seen = {};
      const blob = await bgrMod.removeBackground(src, { model: 'isnet_quint8', output: { format: 'image/png' }, progress: (key, cur, total) => { seen[key] = total ? cur / total : 0; const v = Object.values(seen); prog.on(Math.min(0.95, v.reduce((a, b) => a + b, 0) / Math.max(v.length, 1)), (key.startsWith('fetch') ? 'Tải mô hình (lần đầu, sau đó dùng ngoại tuyến): ' : 'Đang xử lý: ') + Math.round((total ? cur / total : 0) * 100) + '%'); } });
      const url = await readFile(blob), img = await FX.loadEl(url);
      const keep = { cropX: o.cropX, cropY: o.cropY, width: o.width, height: o.height, scaleX: o.scaleX, scaleY: o.scaleY };
      o.setElement(img); o.set(keep); o.xtk = { ...(o.xtk || {}), nobg: true }; if (o.filters?.length) o.applyFilters();
      o.dirty = true; canvas.requestRenderAll(); X.snapshot(); prog.off(); toast('Đã xóa nền ảnh');
      return true;
    } catch (e) { prog.off(); toast('Không xóa được nền: ' + (e.message || e) + (navigator.onLine ? '' : ' (lần đầu cần kết nối mạng để tải mô hình)'), 7000); return false; }
  }
  $('#bgRemove').onclick = () => removeBg();

  // Initial pages bar; test hooks
  renderPages();
  Object.assign(window.XTK, { doExport2, exportPDF, exportSVG, exportPNGT, exportZIP, gotoPage, savePage, renderPages, resizeJSON, openResized, applyBrand, renderBrand, makeQR, makeChart, makeTable, bulkCreate, projectData, importProject, backupZip, restoreZip, removeBg, align, group, ungroup, duplicate, toggleLock, placeImage, drawRulers, setRulers: v => { rulers = v; drawRulers(); } });
})();
