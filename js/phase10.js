// Phase 10: Layers panel, Alt+click cycling / "select object here", custom font upload (IndexedDB + optional Supabase sync)
(() => {
  const X = window.XTK; if (!X || !X.canvas) return;
  const canvas = X.canvas, $ = s => document.querySelector(s), FX = window.XTK_FX || {};
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isBg = o => o && o.name === '__bg';
  const isText = o => o && /text/.test(o.type || '');
  const TYPE_VI = { image: 'Ảnh', rect: 'Hình chữ nhật', circle: 'Hình tròn', ellipse: 'Hình elip', triangle: 'Tam giác', polygon: 'Đa giác', polyline: 'Đường gấp khúc', path: 'Hình vẽ', line: 'Đường kẻ', group: 'Nhóm', textbox: 'Văn bản', 'i-text': 'Văn bản', text: 'Văn bản' };
  const ICON = { image: '🖼', rect: '▭', circle: '◯', ellipse: '⬭', triangle: '△', polygon: '⬠', polyline: '〰', path: '✎', line: '╱', group: '▣', textbox: 'T', 'i-text': 'T', text: 'T' };
  const typeName = o => (o.xtk?.qr ? 'Mã QR' : TYPE_VI[o.type] || o.type || 'Đối tượng');
  function layerName(o) {
    if (o.xtk?.userName && o.name) return o.name;
    if (isText(o) && o.text) { const t = o.text.replace(/\s+/g, ' ').trim(); return t.length > 28 ? t.slice(0, 27) + '…' : t; }
    if (o.name && !/^(Tiêu đề|Đoạn văn)$/.test(o.name)) return o.name;
    return typeName(o);
  }
  const isLocked = o => !!o.xtk?.locked;
  function setLocked(o, l) {
    o.xtk = { ...(o.xtk || {}), locked: l };
    o.set({ lockMovementX: l, lockMovementY: l, lockScalingX: l, lockScalingY: l, lockRotation: l, hasControls: !l, editable: !l, selectable: !l, evented: !l });
  }
  // Ensure the extra props we rely on are serialized (name/xtk/selectable/evented already in FX.PROPS; 'visible' is a Fabric default prop)
  if (Array.isArray(FX.PROPS)) ['name', 'xtk', 'selectable', 'evented', 'visible'].forEach(p => { if (!FX.PROPS.includes(p)) FX.PROPS.push(p); });

  // ================= 1. Layers panel =================
  const tabP = $('#ptabProps'), tabL = $('#ptabLayers'), paneP = $('#paneProps'), paneL = $('#paneLayers'), list = $('#layers'), search = $('#layerSearch');
  function setTab(t) {
    const l = t === 'layers'; paneL.hidden = !l; paneP.hidden = l;
    tabL.classList.toggle('on', l); tabP.classList.toggle('on', !l); tabL.setAttribute('aria-selected', l); tabP.setAttribute('aria-selected', !l);
    try { localStorage.setItem('xtk-ptab', t); } catch (e) { }
    if (l) refreshNow();
  }
  tabP.onclick = () => setTab('props'); tabL.onclick = () => setTab('layers');
  ['#fbCrop', '#fbFilter'].forEach(s => $(s)?.addEventListener('click', () => setTab('props'), true));
  const expanded = new WeakSet(), thumbCache = new WeakMap(); let pendingLock = null, anchor = null;
  const THUMB = 30;
  function thumbOf(o) {
    const c = thumbCache.get(o), ver = (o.__xtkVer || 0);
    if (c && c.ver === ver) return c.url;
    return null;
  }
  const idle = f => window.requestIdleCallback ? requestIdleCallback(f, { timeout: 200 }) : setTimeout(f, 30);
  const thumbQ = new Set(); let thumbTimer = 0;
  function queueThumb(o) { thumbQ.add(o); if (!thumbTimer) thumbTimer = idle(drainThumbs); }
  function drainThumbs(dl) {
    thumbTimer = 0; const t0 = performance.now();
    for (const o of thumbQ) {
      thumbQ.delete(o);
      try {
        const w = o.getScaledWidth() || 1, h = o.getScaledHeight() || 1, m = Math.min(4, THUMB / Math.max(w, h));
        const vis = o.visible; o.visible = true;
        const url = o.toDataURL({ multiplier: m, format: 'png', enableRetinaScaling: false, withoutShadow: true });
        o.visible = vis; thumbCache.set(o, { ver: o.__xtkVer || 0, url });
        const img = list.querySelector(`[data-uid="${o.__xtkUid}"] img.lthumb`); if (img) img.src = url;
      } catch (e) { thumbCache.set(o, { ver: o.__xtkVer || 0, url: '' }); }
      if (performance.now() - t0 > 12) break;
    }
    if (thumbQ.size) thumbTimer = idle(drainThumbs);
  }
  let uidN = 0; const uid = o => o.__xtkUid || (o.__xtkUid = ++uidN);
  const objs = () => canvas.getObjects().filter(o => !isBg(o));
  const fold = s => (X.foldVi ? X.foldVi(s) : String(s).toLowerCase());
  function row(o, child) {
    const li = document.createElement('li'); li.dataset.uid = uid(o);
    const act = canvas.getActiveObjects(), sel = act.includes(o) || pendingLock === o;
    li.className = 'lrow' + (sel ? ' sel' : '') + (o.visible === false ? ' lhidden' : '') + (isLocked(o) ? ' llocked' : '') + (child ? ' lchild' : '');
    if (!child) li.draggable = true;
    const t = thumbOf(o); if (t == null) queueThumb(o);
    const grp = o.type === 'group' && !child;
    li.innerHTML = (grp ? `<button class="lexp" data-a="exp" title="Mở/đóng nhóm" aria-expanded="${expanded.has(o)}">${expanded.has(o) ? '▾' : '▸'}</button>` : '<span class="lexp"></span>') +
      `<img class="lthumb" alt="" src="${t || 'data:image/gif;base64,R0lGODlhAQABAAAAACw='}"><span class="licon" title="${esc(typeName(o))}">${ICON[o.type] || '◻'}</span><span class="lname" title="${esc(layerName(o))}">${esc(layerName(o))}</span>` +
      (child ? '' : `<button class="leye" data-a="eye" title="${o.visible === false ? 'Hiện' : 'Ẩn'}" aria-pressed="${o.visible === false}">${o.visible === false ? '◌' : '👁'}</button><button class="llock" data-a="lock" title="${isLocked(o) ? 'Mở khóa' : 'Khóa'}" aria-pressed="${isLocked(o)}">${isLocked(o) ? '🔒' : '🔓'}</button>`);
    if (pendingLock === o && !child) li.insertAdjacentHTML('beforeend', '<div class="lunlock">Lớp đang khóa · <button data-a="lock">🔓 Mở khóa</button></div>');
    return li;
  }
  function refreshNow() {
    rt = 0;
    const all = objs(); $('#layerCount').textContent = all.length ? all.length : '';
    if (paneL.hidden && document.activeElement !== search) { list.dataset.stale = '1'; return; }
    delete list.dataset.stale;
    const q = fold(search.value.trim());
    const sig = q + '|' + (pendingLock ? uid(pendingLock) : 0) + '|' + all.map(o => uid(o) + ':' + layerName(o) + ':' + (o.visible !== false) + ':' + isLocked(o) + ':' + expanded.has(o) + ':' + (o.__xtkVer || 0)).join(',');
    if (sig === lastSig && !list.querySelector('.lrename')) { // structure unchanged: only update selection highlight
      const act = canvas.getActiveObjects();
      list.querySelectorAll('.lrow').forEach(li => { const o = objOf(li); li.classList.toggle('sel', act.includes(o) || (!!o && o === pendingLock)); });
      const s = list.querySelector('.lrow.sel'); if (s) s.scrollIntoView({ block: 'nearest' }); return;
    }
    if (list.querySelector('.lrename')) return;
    lastSig = sig;
    const frag = document.createDocumentFragment();
    all.slice().reverse().forEach(o => {
      const kids = o.type === 'group' ? o.getObjects() : [];
      const hit = !q || fold(layerName(o)).includes(q) || kids.some(k => fold(layerName(k)).includes(q));
      if (!hit) return;
      frag.appendChild(row(o));
      if (kids.length && (expanded.has(o) || q)) { const ul = document.createElement('ul'); ul.className = 'lkids'; kids.slice().reverse().forEach(k => ul.appendChild(row(k, true))); frag.appendChild(ul); }
    });
    if (!frag.childNodes.length) { const p = document.createElement('li'); p.className = 'lempty muted'; p.textContent = all.length ? 'Không có lớp nào khớp.' : 'Chưa có đối tượng.'; frag.appendChild(p); }
    list.replaceChildren(frag);
    const s = list.querySelector('.lrow.sel'); if (s) s.scrollIntoView({ block: 'nearest' });
  }
  let lastSig = ''; let rt = 0; const refresh = () => { if (!rt) rt = requestAnimationFrame(refreshNow); };
  window.XTK_LAYERS = { refresh, refreshNow, layerName, setLocked, setTab };
  const bump = o => { if (o) { o.__xtkVer = (o.__xtkVer || 0) + 1; if (o.group) bump(o.group); } };
  canvas.on('object:added', refresh); canvas.on('object:removed', refresh);
  canvas.on('object:modified', e => { (e.target?.type === 'activeSelection' ? e.target.getObjects() : [e.target]).forEach(bump); refresh(); });
  canvas.on('text:changed', e => { bump(e.target); refresh(); });
  ['selection:created', 'selection:updated', 'selection:cleared'].forEach(ev => canvas.on(ev, () => { if (canvas.getActiveObject()) pendingLock = null; refresh(); }));
  canvas.on('after:render', () => { }); // keep fabric hook symmetry
  search.addEventListener('input', refresh);
  const objOf = li => { const u = +li?.dataset.uid; if (!u) return null; for (const o of canvas.getObjects()) { if (o.__xtkUid === u) return o; if (o.type === 'group') { const k = o.getObjects().find(k => k.__xtkUid === u); if (k) return k; } } return null; };
  function selectObjs(arr) {
    canvas.discardActiveObject();
    arr = arr.filter(o => !isLocked(o) && o.selectable !== false && !o.group);
    if (arr.length === 1) canvas.setActiveObject(arr[0]);
    else if (arr.length > 1) canvas.setActiveObject(new fabric.ActiveSelection(arr, { canvas }));
    canvas.requestRenderAll(); refreshNow();
  }
  list.addEventListener('click', e => {
    const li = e.target.closest('.lrow'); if (!li) return; const o = objOf(li); if (!o) return;
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'exp') { expanded.has(o) ? expanded.delete(o) : expanded.add(o); refreshNow(); return; }
    if (a === 'eye') { o.visible = o.visible === false; if (!o.visible && canvas.getActiveObjects().includes(o)) canvas.discardActiveObject(); canvas.requestRenderAll(); X.snapshot(); refreshNow(); X.toast(o.visible ? 'Đã hiện lớp' : 'Đã ẩn lớp (không xuất ra file)', 1200); return; }
    if (a === 'lock') { const l = !isLocked(o); if (l && canvas.getActiveObjects().includes(o)) canvas.discardActiveObject(); setLocked(o, l); pendingLock = l ? o : null; canvas.requestRenderAll(); X.snapshot(); if (!l) canvas.setActiveObject(o); refreshNow(); X.renderProps(); X.toast(l ? 'Đã khóa lớp' : 'Đã mở khóa', 1200); return; }
    if (li.classList.contains('lchild')) return; // read-only children
    if (isLocked(o)) { canvas.discardActiveObject(); pendingLock = o; canvas.requestRenderAll(); refreshNow(); return; }
    pendingLock = null;
    if (e.shiftKey && anchor && objs().includes(anchor)) {
      const order = objs().reverse(), i = order.indexOf(anchor), j = order.indexOf(o);
      selectObjs(order.slice(Math.min(i, j), Math.max(i, j) + 1));
    } else if (e.ctrlKey || e.metaKey) {
      const cur = canvas.getActiveObjects(); selectObjs(cur.includes(o) ? cur.filter(x => x !== o) : [...cur, o]); anchor = o;
    } else { selectObjs([o]); anchor = o; }
  });
  list.addEventListener('dblclick', e => {
    const li = e.target.closest('.lrow'); const sp = li?.querySelector('.lname'); if (!sp || e.target.closest('[data-a]')) return; const o = objOf(li); if (!o) return;
    const inp = document.createElement('input'); inp.className = 'lrename'; inp.value = o.xtk?.userName ? o.name : layerName(o); inp.setAttribute('aria-label', 'Tên lớp');
    sp.replaceWith(inp); inp.focus(); inp.select(); let done = false;
    const fin = ok => { if (done) return; done = true; inp.remove(); const v = inp.value.trim().slice(0, 60);
      if (ok && v) { o.name = v; o.xtk = { ...(o.xtk || {}), userName: true }; X.snapshot(); } else if (ok && !v && o.xtk?.userName) { const x = { ...o.xtk }; delete x.userName; o.xtk = x; X.snapshot(); }
      refreshNow(); };
    inp.addEventListener('keydown', k => { k.stopPropagation(); if (k.key === 'Enter') fin(true); if (k.key === 'Escape') fin(false); });
    inp.addEventListener('blur', () => fin(true));
  });
  // Drag & drop reordering (rows are top-of-stack first)
  let dragO = null;
  list.addEventListener('dragstart', e => { const li = e.target.closest('.lrow:not(.lchild)'); if (!li) return; dragO = objOf(li); li.classList.add('ldrag'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', li.dataset.uid); } catch (x) { } });
  list.addEventListener('dragover', e => { if (!dragO) return; const li = e.target.closest('.lrow:not(.lchild)'); if (!li) return; e.preventDefault();
    list.querySelectorAll('.ldropa,.ldropb').forEach(x => x.classList.remove('ldropa', 'ldropb')); const r = li.getBoundingClientRect(); li.classList.add(e.clientY < r.top + r.height / 2 ? 'ldropa' : 'ldropb'); });
  list.addEventListener('dragleave', e => { if (!list.contains(e.relatedTarget)) list.querySelectorAll('.ldropa,.ldropb').forEach(x => x.classList.remove('ldropa', 'ldropb')); });
  list.addEventListener('drop', e => { e.preventDefault(); const li = e.target.closest('.lrow:not(.lchild)'); const t = objOf(li), o = dragO; dragO = null;
    if (!t || !o || t === o) { refreshNow(); return; } const r = li.getBoundingClientRect(); moveLayer(o, t, e.clientY < r.top + r.height / 2); });
  list.addEventListener('dragend', () => { dragO = null; list.querySelectorAll('.ldrag,.ldropa,.ldropb').forEach(x => x.classList.remove('ldrag', 'ldropa', 'ldropb')); });
  function moveLayer(o, target, above) { // above = place visually above target (higher z)
    const order = objs().reverse().filter(x => x !== o); let i = order.indexOf(target); if (i < 0) return;
    order.splice(above ? i : i + 1, 0, o);
    const all = canvas.getObjects(), base = all.filter(isBg).length;
    order.slice().reverse().forEach((x, k) => canvas.moveTo(x, base + k));
    canvas.requestRenderAll(); X.snapshot(); refreshNow();
  }
  window.XTK_LAYERS.move = moveLayer;
  // Hidden objects: also ensure exporters skip them (Fabric does not render visible:false; SVG gets visibility:hidden)
  try { const st = localStorage.getItem('xtk-ptab'); if (st === 'layers') setTab('layers'); } catch (e) { }
  refreshNow();

  // ================= 2. Alt+click cycling & "select object here" =================
  const PK = window.XTK_PICK, PKUI = PK ? PK.install(X) : { hover() { } };
  function hitsAt(e) { // geometry + alpha aware (transparent regions/empty bbox ignored); locked/hidden excluded
    if (PK) return PK.hitsAt(canvas, e, isBg);
    const p = canvas.getPointer(e);
    return canvas.getObjects().filter(o => !isBg(o) && o.visible !== false && !isLocked(o) && o.containsPoint(p, null, true)).reverse();
  }
  let altPick = null, altLast = null;
  canvas.on('mouse:up', () => { if (altPick) { const o = altPick; altPick = null; if (canvas.getActiveObject() !== o) { canvas.setActiveObject(o); canvas.requestRenderAll(); refreshNow(); } } });
  canvas.on('mouse:down', opt => {
    const e = opt.e; if (!e || !e.altKey || e.button > 0) { altLast = null; return; }
    const hits = hitsAt(e).filter(o => !isLocked(o) && o.selectable !== false); if (hits.length < 2) return;
    const cur = altLast && hits.includes(altLast) ? altLast : canvas.getActiveObject(), i = hits.indexOf(cur), next = hits[(i + 1) % hits.length];
    canvas._currentTransform = null; altPick = altLast = next; canvas.setActiveObject(next); canvas.requestRenderAll(); refreshNow();
    X.toast(`Đã chọn: ${layerName(next)} (${hits.indexOf(next) + 1}/${hits.length})`, 1000);
  });
  const stage = $('#stage') || canvas.upperCanvasEl.closest('.canvas-wrap') || canvas.wrapperEl.parentElement;
  const pick = $('#ctxPick'), pickList = $('#ctxPickList'), menu = $('#ctxMenu'); let lastHits = [];
  stage?.addEventListener('xtk:ctxmenu', ev => {
    lastHits = hitsAt(ev.detail); pickList.hidden = true;
    pick.parentElement.hidden = lastHits.length < 1; pick.querySelector('span').textContent = `(${lastHits.length}) ▸`;
  });
  function openPick(focus) {
    const act = canvas.getActiveObjects();
    pickList.innerHTML = lastHits.map((o, i) => { const on = act.includes(o);
      return `<button data-pick="${i}" role="menuitemradio" aria-checked="${on}" tabindex="-1" class="${on ? 'on' : ''}"><span class="pkchk" aria-hidden="true">${on ? '✓' : ''}</span><span class="pkname">${ICON[o.type] || '◻'} ${esc(layerName(o))}</span><small>${esc(typeName(o))}</small></button>`; }).join('');
    pickList.setAttribute('aria-label', 'Đối tượng tại điểm bấm'); pick.setAttribute('aria-expanded', 'true');
    pickList.hidden = false; pickList.classList.remove('flip');
    const r = pickList.getBoundingClientRect(); if (r.right > window.innerWidth - 4) pickList.classList.add('flip');
    if (focus) { const bs = pickList.querySelectorAll('button'), k = Math.max(0, [...bs].findIndex(b => b.classList.contains('on'))); bs[k]?.focus(); }
  }
  function closePick(refocus) { pickList.hidden = true; pick.setAttribute('aria-expanded', 'false'); PKUI.hover(null); if (refocus) pick.focus(); }
  function choose(o) {
    menu.hidden = true; closePick(); if (!o) return;
    canvas.setActiveObject(o); canvas.requestRenderAll(); refreshNow(); // selection only — no history snapshot
  }
  pick.addEventListener('click', e => { e.stopPropagation(); pickList.hidden ? openPick(e.detail === 0) : closePick(); });
  pick.addEventListener('mouseenter', () => openPick(false));
  pick.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); openPick(true); } });
  pickList.addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (!b) return; e.stopPropagation(); choose(lastHits[+b.dataset.pick]); });
  pickList.addEventListener('mouseover', e => { const b = e.target.closest('[data-pick]'); PKUI.hover(b ? lastHits[+b.dataset.pick] : null); });
  pickList.addEventListener('mouseleave', () => PKUI.hover(null));
  pickList.addEventListener('focusin', e => { const b = e.target.closest('[data-pick]'); if (b) PKUI.hover(lastHits[+b.dataset.pick]); });
  pickList.addEventListener('keydown', e => {
    const bs = [...pickList.querySelectorAll('button')], i = bs.indexOf(document.activeElement);
    const n = PK ? PK.navIndex(e.key, i, bs.length) : null;
    if (n != null) { e.preventDefault(); e.stopPropagation(); bs[n].focus(); return; }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); if (i >= 0) choose(lastHits[+bs[i].dataset.pick]); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); closePick(true); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePick(); menu.hidden = true; }
  });
  new MutationObserver(() => { if (menu.hidden) PKUI.hover(null); }).observe(menu, { attributes: true, attributeFilter: ['hidden'] });
  menu.addEventListener('mouseover', e => { if (!e.target.closest('.ctxsub') && !pickList.hidden) closePick(); });

  // ================= 3. Custom fonts =================
  const BUILTIN = X.FONTS.slice(); const custom = new Map(); // family -> rec
  const MAX = 10 * 1024 * 1024, EXT = ['ttf', 'otf', 'woff', 'woff2'];
  const MIME = { ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2' };
  function sniff(buf) {
    const b = new Uint8Array(buf.slice(0, 4)), s = String.fromCharCode(...b);
    if (s === 'wOF2') return 'woff2'; if (s === 'wOFF') return 'woff'; if (s === 'OTTO') return 'otf';
    if ((b[0] === 0 && b[1] === 1 && b[2] === 0 && b[3] === 0) || s === 'true') return 'ttf';
    return null;
  }
  const sha256 = async buf => [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map(x => x.toString(16).padStart(2, '0')).join('');
  function familyFromFile(n) {
    let s = n.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b(latin|ext|vietnamese|normal|regular|webfont)\b/gi, '').replace(/\b\d{3}\b/g, '').replace(/\s+/g, ' ').trim();
    s = s.replace(/\b\w/g, c => c.toUpperCase()); return s.slice(0, 60) || 'Font của tôi';
  }
  function hasVietnamese(fam) {
    const c = document.createElement('canvas').getContext('2d'), w = (f, t) => { c.font = `48px ${f}`; return c.measureText(t).width; };
    const vn = 'ệ ữ ở ặ Đ', ok = ['monospace', 'serif'].every(fb => Math.abs(w(`"${fam}", ${fb}`, vn) - w(`"${fam}", ${fb === 'serif' ? 'monospace' : 'serif'}`, vn)) < 0.5);
    return ok;
  }
  async function register(rec) {
    const ff = new FontFace(rec.family, rec.data); await ff.load(); document.fonts.add(ff); rec.face = ff;
    custom.set(rec.family, rec); if (!X.FONTS.includes(rec.family)) X.FONTS.push(rec.family);
  }
  function unregister(rec) { if (rec.face) document.fonts.delete(rec.face); custom.delete(rec.family); const i = X.FONTS.indexOf(rec.family); if (i >= 0 && !BUILTIN.includes(rec.family)) X.FONTS.splice(i, 1); }
  const UP = '__upload';
  function decorateSelect(sel) {
    if (!sel || sel.querySelector(`option[value="${UP}"]`)) return;
    const have = new Set([...sel.options].map(o => o.value));
    [...custom.keys()].forEach(f => { if (!have.has(f)) { const op = new Option(f, f); op.style.fontFamily = `'${f}'`; op.dataset.custom = 1; sel.add(op); } });
    const op = new Option('＋ Tải font của tôi…', UP); op.className = 'fontup'; sel.add(op);
  }
  function rebuildSelects() {
    const fb = $('#fbFont');
    if (fb) { const v = fb.value; [...fb.options].filter(o => o.dataset.custom || o.value === UP).forEach(o => o.remove()); [...fb.options].forEach(o => { if (!X.FONTS.includes(o.value)) o.remove(); }); decorateSelect(fb); fb.value = v; }
    document.querySelectorAll('#propsBody select[data-p=fontFamily]').forEach(s => { const v = s.value; [...s.options].filter(o => o.dataset.custom || o.value === UP).forEach(o => o.remove()); decorateSelect(s); s.value = v; });
  }
  new MutationObserver(() => document.querySelectorAll('#propsBody select[data-p=fontFamily]').forEach(decorateSelect)).observe($('#propsBody'), { childList: true, subtree: true });
  let revertTo = null;
  const onPick = e => {
    const s = e.target; if (s.tagName !== 'SELECT' || s.value !== UP) return;
    e.stopImmediatePropagation(); e.preventDefault();
    const o = canvas.getActiveObject(); s.value = (o && o.fontFamily) || s.options[0].value; revertTo = o; if (e.type === 'change' || !dlg.open) openFontDlg();
  };
  document.addEventListener('input', onPick, true); document.addEventListener('change', onPick, true);
  // ---- dialog
  const dlg = $('#fontDlg'), fileIn = $('#fontFile'), nameIn = $('#fontName'), msg = $('#fontMsg'); let staged = null;
  const say = (t, cls) => { msg.textContent = t; msg.className = 'small ' + (cls || ''); };
  function openFontDlg() { renderFontList(); say(''); staged = null; $('#fontNameRow').hidden = true; fileIn.value = ''; const cs = window.XTK_CLOUDSYNC; $('#fontCloudNote').textContent = cs?.user ? ' và đồng bộ riêng tư vào tài khoản của bạn' : ''; dlg.open || dlg.showModal(); }
  $('#fontClose').onclick = () => dlg.close();
  fileIn.addEventListener('change', async () => {
    const f = fileIn.files[0]; staged = null; $('#fontNameRow').hidden = true; if (!f) return;
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (!EXT.includes(ext)) return say('Định dạng không hỗ trợ — chỉ nhận .ttf, .otf, .woff, .woff2.', 'err');
    if (f.size > MAX) return say(`File quá lớn (${(f.size / 1048576).toFixed(1)} MB) — tối đa 10 MB.`, 'err');
    const buf = await f.arrayBuffer(), kind = sniff(buf);
    if (!kind) return say('File không phải font hợp lệ (sai chữ ký định dạng).', 'err');
    staged = { buf, ext: kind, file: f.name }; nameIn.value = uniqueName(familyFromFile(f.name)); $('#fontNameRow').hidden = false; nameIn.focus(); nameIn.select();
    say(`Đã đọc ${f.name} (${kind.toUpperCase()}, ${Math.round(f.size / 1024)} KB). Đặt tên rồi bấm “Thêm font”.`);
  });
  function uniqueName(n) { let s = n, i = 2; while (BUILTIN.includes(s) || custom.has(s)) s = `${n} ${i++}`; return s; }
  nameIn.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); $('#fontAdd').click(); } });
  $('#fontAdd').onclick = async () => {
    if (!staged) return; const fam = nameIn.value.trim().replace(/["'\\]/g, '').slice(0, 60);
    if (!fam) return say('Vui lòng nhập tên font.', 'err');
    if (BUILTIN.includes(fam) || custom.has(fam)) return say('Tên này đã có — hãy chọn tên khác.', 'err');
    const id = await sha256(staged.buf);
    const dupe = [...custom.values()].find(r => r.id === id); if (dupe) return say(`Font này đã được tải lên với tên “${dupe.family}”.`, 'err');
    const rec = { id, family: fam, ext: staged.ext, file: staged.file, size: staged.buf.byteLength, data: staged.buf, added: Date.now() };
    try { await register(rec); } catch (e) { return say('Trình duyệt không đọc được font này: ' + (e.message || e), 'err'); }
    rec.vn = hasVietnamese(fam);
    const { face, ...store } = rec; try { await DB.fontPut(store); } catch (e) { say('Không lưu được vào bộ nhớ trình duyệt — font chỉ dùng được trong phiên này.', 'err'); }
    rebuildSelects(); renderFontList(); staged = null; $('#fontNameRow').hidden = true; fileIn.value = '';
    say(rec.vn ? `✓ Đã thêm “${fam}”.` : `✓ Đã thêm “${fam}”. ⚠ Font này có vẻ thiếu dấu tiếng Việt (ệ ữ ở) — chữ có dấu sẽ hiển thị bằng font thay thế.`, rec.vn ? 'ok' : 'warn');
    const o = revertTo && canvas.getObjects().includes(revertTo) ? revertTo : canvas.getActiveObject();
    if (o && isText(o)) { o.set('fontFamily', fam); o.initDimensions?.(); bump(o); canvas.requestRenderAll(); X.snapshot(); X.renderProps(); }
    revertTo = null; cloudPush(rec);
  };
  function renderFontList() {
    const ul = $('#fontList'), all = [...custom.values()].sort((a, b) => b.added - a.added);
    ul.innerHTML = all.length ? all.map(r => `<li data-fid="${r.id}"><span class="fprev" style="font-family:'${esc(r.family)}'">Aa Ệữở</span><b>${esc(r.family)}</b><small class="muted">${r.ext.toUpperCase()} · ${Math.round(r.size / 1024)} KB${r.vn === false ? ' · <span class="warn">⚠ thiếu dấu tiếng Việt</span>' : ''}${r.cloud ? ' · ☁' : ''}</small><button data-fdel title="Xóa font">🗑</button></li>`).join('') : '<li class="muted small">Chưa có font nào. Chọn file ở trên để tải lên.</li>';
  }
  $('#fontList').addEventListener('click', async e => {
    const b = e.target.closest('[data-fdel]'); if (!b) return; const id = b.closest('li').dataset.fid; const rec = [...custom.values()].find(r => r.id === id); if (!rec) return;
    if (!confirm(`Xóa font “${rec.family}”? Các thiết kế đang dùng font này sẽ hiển thị bằng font thay thế.`)) return;
    unregister(rec); try { await DB.fontDel(id); } catch (x) { } cloudDelete(rec); rebuildSelects(); renderFontList(); canvas.getObjects().forEach(o => { if (o.fontFamily === rec.family) { o.initDimensions?.(); bump(o); } }); canvas.requestRenderAll(); say(`Đã xóa “${rec.family}”.`);
  });
  // ---- designs record custom fonts used; gentle notice when missing
  const fontsIn = objsJ => { const s = new Set(); const walk = a => (a || []).forEach(o => { if (o.fontFamily) s.add(o.fontFamily); if (o.objects) walk(o.objects); }); walk(objsJ); return s; };
  const _put = DB.put;
  DB.put = d => { try { const s = new Set(); [].concat(d.pages || [], d.json || []).forEach(j => fontsIn((typeof j === 'string' ? JSON.parse(j) : j)?.objects).forEach(f => s.add(f))); const cf = [...s].filter(f => !BUILTIN.includes(f)); if (cf.length) d.customFonts = cf; else delete d.customFonts; } catch (e) { } return _put(d); };
  let fontsReady = Promise.resolve();
  const H = (window.XTK_HOOKS = window.XTK_HOOKS || {});
  let lastWarn = '';
  function checkMissing() {
    const used = new Set(); canvas.getObjects().forEach(o => { const w = x => { if (x.fontFamily) used.add(x.fontFamily); x.getObjects?.().forEach(w); }; w(o); });
    const miss = [...used].filter(f => !BUILTIN.includes(f) && !custom.has(f));
    const key = miss.join('|'); if (miss.length && key !== lastWarn) { X.toast(`ℹ Thiết kế dùng font chưa có trên máy này: ${miss.join(', ')}. Đang hiển thị bằng font thay thế — tải font lên trong “＋ Tải font của tôi”.`, 5000); }
    lastWarn = key; return miss;
  }
  const prevOpened = H.opened;
  H.opened = function () { prevOpened?.apply(this, arguments); fontsReady.then(() => setTimeout(checkMissing, 50)); refresh(); };
  // ---- startup: register stored fonts (offline-capable)
  fontsReady = (async () => {
    let all = []; try { all = await DB.fontsAll(); } catch (e) { return; }
    for (const r of all) { try { await register(r); } catch (e) { } }
    if (all.length) { rebuildSelects(); fabric.util.clearFabricFontCache?.(); canvas.getObjects().forEach(o => { if (custom.has(o.fontFamily)) { o.initDimensions?.(); bump(o); } }); canvas.requestRenderAll(); }
  })();
  // ---- optional Supabase sync (private bucket 'user-fonts', table 'user_fonts'); degrades silently if missing
  const BUCKET = 'user-fonts'; let cloudOff = false;
  const cs = () => { const c = window.XTK_CLOUDSYNC; return c && c.user && c.client ? c : null; };
  async function cloudPush(rec) {
    const c = cs(); if (!c || cloudOff) return;
    try {
      const path = `${c.user.id}/${rec.id}.${rec.ext}`;
      const up = await c.client.storage.from(BUCKET).upload(path, new Blob([rec.data], { type: MIME[rec.ext] }), { upsert: true, contentType: MIME[rec.ext] });
      if (up.error && !/exists/i.test(up.error.message || '')) throw up.error;
      const r = await c.client.from('user_fonts').upsert({ user_id: c.user.id, sha256: rec.id, family: rec.family, ext: rec.ext, size: rec.size, path }, { onConflict: 'user_id,sha256' });
      if (r.error) throw r.error;
      rec.cloud = true; const { face, ...st } = rec; await DB.fontPut(st); renderFontList();
    } catch (e) { if (/does not exist|not found|bucket|relation/i.test(e?.message || '')) cloudOff = true; console.info('[fonts] cloud sync skipped:', e?.message || e); }
  }
  async function cloudDelete(rec) {
    const c = cs(); if (!c || cloudOff || !rec.cloud) return;
    try { await c.client.from('user_fonts').delete().eq('user_id', c.user.id).eq('sha256', rec.id); await c.client.storage.from(BUCKET).remove?.([`${c.user.id}/${rec.id}.${rec.ext}`]); } catch (e) { }
  }
  async function cloudPull() {
    const c = cs(); if (!c || cloudOff) return;
    try {
      const r = await c.client.from('user_fonts').select('*').eq('user_id', c.user.id); if (r.error) throw r.error;
      let n = 0;
      for (const m of r.data || []) {
        if ([...custom.values()].some(x => x.id === m.sha256)) continue;
        const d = await c.client.storage.from(BUCKET).download(m.path); if (d.error || !d.data) continue;
        const buf = await d.data.arrayBuffer(); if (!sniff(buf) || (await sha256(buf)) !== m.sha256) continue;
        const rec = { id: m.sha256, family: uniqueName(m.family), ext: m.ext, size: buf.byteLength, data: buf, added: Date.now(), cloud: true };
        try { await register(rec); rec.vn = hasVietnamese(rec.family); const { face, ...st } = rec; await DB.fontPut(st); n++; } catch (e) { }
      }
      if (n) { rebuildSelects(); renderFontList(); canvas.requestRenderAll(); checkMissing(); }
    } catch (e) { if (/does not exist|not found|relation/i.test(e?.message || '')) cloudOff = true; }
  }
  let lastUid = null; setInterval(() => { const u = window.XTK_CLOUDSYNC?.user?.id || null; if (u && u !== lastUid) fontsReady.then(cloudPull); lastUid = u; }, 2500);
  rebuildSelects();
  // Command palette entry
  window.XTK_FONTS = { open: openFontDlg, list: () => [...custom.values()].map(({ data, face, ...r }) => r), ready: () => fontsReady, checkMissing, hasVietnamese, sniff, cloudPull };
})();
