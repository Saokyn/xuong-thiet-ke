// Phase 9: compact header (tabs + icon-only right side, avatar menu), compact canvas info bar with a low-dpi badge,
// Ctrl/Cmd+K command palette and a collapse handle for the properties panel.
(() => {
  const X = window.XTK, canvas = X.canvas, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const CS = () => window.XTK_CLOUDSYNC || {};

  // ================= 1. info bar: dpi badge popover + click-to-select
  const badge = $('#dpiWarn'), pop = $('#dpiPop');
  let popT; const showPop = on => { clearTimeout(popT); if (on && !badge.hidden) { pop.hidden = false; } else popT = setTimeout(() => pop.hidden = true, on === false ? 150 : 0); };
  badge.addEventListener('mouseenter', () => showPop(true)); badge.addEventListener('mouseleave', () => showPop(false));
  badge.addEventListener('focus', () => showPop(true)); badge.addEventListener('blur', () => showPop(false));
  pop.addEventListener('mouseenter', () => clearTimeout(popT)); pop.addEventListener('mouseleave', () => showPop(false));
  badge.addEventListener('click', () => { X.selectLowDpi(); });
  let dT; canvas.on('object:removed', () => { clearTimeout(dT); dT = setTimeout(X.checkDpi, 50); });

  // ================= 2. header
  const right = $('#hdrRight'), nav = $('header.topbar nav');
  // admin tab (created by admin.js inside <nav>) → icon on the right, visibility still driven by admin.js
  const adm = $('#navAdmin');
  if (adm) { adm.textContent = '🛡'; adm.title = 'Quản trị'; adm.setAttribute('aria-label', 'Quản trị'); adm.classList.add('hicon'); right.insertBefore(adm, $('#cloudAcct')); }

  // sync icon mirrors #cloudStatus (kept in DOM, visually hidden, still updated by cloud.js)
  const st = $('#cloudStatus'), sic = $('#syncIcon');
  function syncIcon() {
    const c = st.className, off = !navigator.onLine || / off\b/.test(c) || / wait\b/.test(c) && !CS().user;
    const state = / busy\b/.test(c) ? 'busy' : / err\b/.test(c) ? 'err' : off ? 'off' : / wait\b/.test(c) ? 'wait' : / ok\b/.test(c) ? 'ok' : 'off';
    sic.className = 'hicon sync ' + state; sic.dataset.state = state;
    const label = { ok: 'Đã lưu lên mây', busy: 'Đang đồng bộ…', err: 'Lỗi đồng bộ', off: navigator.onLine ? (st.textContent.replace(/^\W+\s*/, '') || 'Chưa đồng bộ') : 'Ngoại tuyến', wait: st.textContent.replace(/^\W+\s*/, '') }[state];
    sic.title = '☁ ' + label + (st.title ? ' — ' + st.title : '') + (CS().user ? ' · bấm để đồng bộ ngay' : ' · bấm để đăng nhập');
  }
  new MutationObserver(syncIcon).observe(st, { attributes: true, childList: true, characterData: true, subtree: true });
  addEventListener('online', syncIcon); addEventListener('offline', syncIcon); syncIcon();

  // avatar: #cloudAcct keeps its id; cloud.js writes "☁ name" into it → normalise to an initial
  const av = $('#cloudAcct'), menu = $('#acctMenu');
  const openAcctDlg = av.onclick; // original handler from cloud.js (renders + opens the account dialog)
  let busyAv = false;
  function renderAvatar() {
    if (busyAv) return; busyAv = true;
    const u = CS().user, em = u && (u.email || u.id) || '';
    av.textContent = u ? (em[0] || '?').toUpperCase() : '👤'; av.classList.toggle('in', !!u);
    av.title = u ? 'Tài khoản: ' + em : 'Chưa đăng nhập — bấm để mở menu tài khoản';
    $('#amEmail').textContent = u ? em : 'Chưa đăng nhập';
    $('#amLogin').hidden = !!u; $('#amLogout').hidden = !u;
    busyAv = false; syncIcon();
  }
  new MutationObserver(() => { if (!busyAv) renderAvatar(); }).observe(av, { childList: true, characterData: true, subtree: true });
  document.addEventListener('xtk:cloudauth', () => setTimeout(renderAvatar, 0));
  const setMenu = on => { menu.hidden = !on; av.setAttribute('aria-expanded', String(on)); if (on) renderAvatar(); };
  av.onclick = e => { e.stopPropagation(); setMenu(menu.hidden); };
  document.addEventListener('click', e => { if (!menu.hidden && !e.target.closest('#acctMenu')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });
  const acct = () => { setMenu(false); openAcctDlg && openAcctDlg(); };
  $('#amLogin').onclick = acct; $('#amAccount').onclick = acct;
  $('#cloudSync').addEventListener('click', () => setMenu(false));
  $('#amLogout').onclick = async () => { setMenu(false); try { await CS().client?.auth.signOut(); } catch (e) { X.toast?.('Lỗi đăng xuất: ' + e.message); } };
  menu.querySelector('.credits-link').addEventListener('click', () => setMenu(false));
  sic.onclick = () => { if (CS().user && CS().sync) CS().sync(); else openAcctDlg && openAcctDlg(); };
  renderAvatar();

  // ================= 3c. collapse handle on the properties panel (uses phase 4's setPanel → xtk-panels in localStorage)
  const props = $('#view-designer .props'), wrap = $('#view-designer .stage-wrap');
  const hc = document.createElement('button'); hc.id = 'propsCollapse'; hc.className = 'pcollapse'; hc.title = 'Thu gọn bảng thuộc tính (Ctrl+])'; hc.textContent = '»';
  hc.onclick = () => X.setPanel('right', false); props.prepend(hc);
  const ho = document.createElement('button'); ho.id = 'propsExpand'; ho.className = 'pexpand'; ho.title = 'Mở bảng thuộc tính (Ctrl+])'; ho.textContent = '«';
  ho.onclick = () => X.setPanel('right', true); wrap.appendChild(ho);
  // ================= 3b. command palette
  const fold = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const inDesigner = fn => () => { if (!X.state.tpl || !$('#view-designer').classList.contains('active')) X.show('designer'); return fn(); };
  const CMDS = [
    ['🗂 Mở tab Mẫu & kích thước', 'mau template kich thuoc trang chu', () => X.show('picker')],
    ['✏️ Mở tab Thiết kế', 'thiet ke designer', () => X.show('designer')],
    ['📁 Mở tab Đã lưu', 'da luu saved thiet ke', () => X.show('saved')],
    ['✨ Ý tưởng AI', 'ai y tuong', () => $('#toggleAI').click()],
    ['🔤 Thêm chữ (tiêu đề)', 'them chu text tieu de heading', inDesigner(() => $('#addHeading').click())],
    ['🔤 Thêm đoạn văn', 'them chu text doan van', inDesigner(() => $('#addText').click())],
    ['⬛ Thêm hình chữ nhật', 'them hinh shape rect chu nhat', inDesigner(() => X.center(new fabric.Rect({ width: X.state.tpl.w * 0.3, height: X.state.tpl.h * 0.2, fill: '#6366f1', rx: 0, name: 'Hình chữ nhật' })))],
    ['⚪ Thêm hình tròn', 'them hinh shape circle tron', inDesigner(() => X.center(new fabric.Circle({ radius: Math.min(X.state.tpl.w, X.state.tpl.h) * 0.15, fill: '#f59e0b', name: 'Hình tròn' })))],
    ['🖼 Thêm ảnh từ máy', 'them anh image tai len upload', inDesigner(() => $('#uploadImg').click())],
    ['⬇ Xuất PNG', 'xuat export png tai', inDesigner(() => X.doExport2('png'))],
    ['⬇ Xuất JPG', 'xuat export jpg jpeg tai', inDesigner(() => X.doExport2('jpg'))],
    ['⬇ Xuất… (tùy chọn)', 'xuat export pdf svg tuy chon', inDesigner(() => X.openExport ? X.openExport() : $('#exportBtn').click())],
    ['💾 Lưu thiết kế', 'luu save', inDesigner(() => $('#save').click())],
    ['↶ Hoàn tác', 'hoan tac undo', () => $('#undo').click()],
    ['↷ Làm lại', 'lam lai redo', () => $('#redo').click()],
    ['⛶ Chế độ tập trung', 'che do tap trung focus', inDesigner(() => X.setFocus ? X.setFocus(!document.body.classList.contains('focus')) : $('#focusBtn').click())],
    ['◨ Thu gọn / mở bảng thuộc tính', 'thu gon bang thuoc tinh panel properties', inDesigner(() => X.setPanel('right'))],
    ['☁ Đồng bộ đám mây ngay', 'dong bo sync cloud may', () => sic.click()],
    ['👤 Tài khoản / đăng nhập', 'tai khoan dang nhap login account', () => openAcctDlg && openAcctDlg()],
  ].map(([label, kw, run]) => ({ label, kw: fold(label + ' ' + kw), run, kind: 'Lệnh' }));
  const tplItems = () => [
    ...(window.LIBRARY || []).map(t => ({ label: '📄 ' + t.name, kw: fold(t.name + ' ' + (t.cat || '') + ' ' + (t.tags || '') + ' mau'), run: () => X.openLib(t), kind: 'Mẫu' })),
    ...(window.TEMPLATES || []).map(t => ({ label: '▭ ' + t.name, kw: fold(t.name + ' kich thuoc trong'), run: () => { X.openTemplate(t); X.show('designer'); }, kind: 'Khổ trống' })),
  ];
  const dlg = document.createElement('div'); dlg.id = 'cmdk'; dlg.className = 'cmdk'; dlg.hidden = true; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-label', 'Bảng lệnh');
  dlg.innerHTML = '<div class="cmdk-box"><input id="cmdkInput" type="search" placeholder="Gõ lệnh hoặc tên mẫu… (↑↓ chọn, Enter chạy, Esc đóng)" autocomplete="off" role="combobox" aria-controls="cmdkList"><ul id="cmdkList" role="listbox"></ul></div>';
  document.body.appendChild(dlg);
  const inp = $('#cmdkInput'), list = $('#cmdkList'); let items = [], sel = 0, lastFocus = null;
  function filter() {
    const q = fold(inp.value.trim()), words = q.split(/\s+/).filter(Boolean);
    const all = CMDS.concat(tplItems());
    items = (words.length ? all.filter(i => words.every(w => i.kw.includes(w))) : CMDS).slice(0, 50);
    sel = Math.min(sel, Math.max(0, items.length - 1)); draw();
  }
  function draw() {
    list.innerHTML = '';
    if (!items.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'Không tìm thấy lệnh hoặc mẫu phù hợp'; list.appendChild(li); return; }
    items.forEach((it, i) => { const li = document.createElement('li'); li.setAttribute('role', 'option'); li.className = i === sel ? 'on' : ''; li.setAttribute('aria-selected', String(i === sel));
      const a = document.createElement('span'); a.textContent = it.label; const b = document.createElement('small'); b.textContent = it.kind; li.append(a, b);
      li.onmousemove = () => { if (sel !== i) { sel = i; draw(); } }; li.onclick = () => runSel(i); list.appendChild(li); });
    list.children[sel]?.scrollIntoView({ block: 'nearest' });
  }
  function open() { lastFocus = document.activeElement; dlg.hidden = false; inp.value = ''; sel = 0; filter(); inp.focus(); }
  function close() { dlg.hidden = true; if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) { } }
  function runSel(i) { const it = items[i]; if (!it) return; close(); try { it.run(); } catch (e) { X.toast?.('Lỗi: ' + e.message); } }
  inp.addEventListener('input', () => { sel = 0; filter(); });
  inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(1, items.length); draw(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + items.length) % Math.max(1, items.length); draw(); }
    else if (e.key === 'Enter') { e.preventDefault(); runSel(sel); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
  });
  dlg.addEventListener('mousedown', e => { if (e.target === dlg) close(); });
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 'k' || e.key === 'K' || e.code === 'KeyK')) {
      const o = canvas.getActiveObject(); if (o && o.isEditing) return;
      e.preventDefault(); e.stopPropagation(); dlg.hidden ? open() : close();
    }
  }, true);
  Object.assign(X, { commandPalette: { open, close, get open_() { return !dlg.hidden; } }, foldVi: fold });
})();
