// Admin round: app settings (all users), public templates "Mẫu từ Xưởng" (all users, cached offline),
// and the "Quản trị" view (only when the server-side rpc is_admin() returns true; RLS enforces everything).
(function () {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)], X = window.XTK, CS = () => window.XTK_CLOUDSYNC || {};
  const sb = () => CS().client, esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const jget = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const LS = 'xtk.settings', LP = 'xtk.pubtpl', LA = 'xtk.ann.dismissed';
  const DEF = { accent: '#4f46e5', app_name: 'Xưởng Thiết Kế', logo_text: '🎨', default_font: 'Be Vietnam Pro', greeting: '', announcement: '', features: { ai: true, stock: true, bg_remove: true, signup: true } };
  const fmt = t => new Date(t).toLocaleString('vi-VN');

  // ---------------- settings (fetched on load, cached, applied; offline uses cache)
  let S = { ...DEF, ...jget(LS, {}) };
  const greet = document.createElement('p'); greet.id = 'homeGreeting'; greet.className = 'greeting'; greet.hidden = true; $('#view-picker h1').after(greet);
  const ann = document.createElement('div'); ann.id = 'annBar'; ann.className = 'annbar'; ann.hidden = true; ann.innerHTML = '<span></span><button title="Ẩn">✕</button>'; $('header.topbar').after(ann);
  ann.querySelector('button').onclick = () => { localStorage.setItem(LA, S.announcement || ''); ann.hidden = true; };
  function applySettings() {
    const f = { ...DEF.features, ...(S.features || {}) }, acc = /^#[0-9a-f]{3,8}$/i.test(S.accent || '') ? S.accent : DEF.accent;
    let st = $('#xtkAccent'); if (!st) { st = document.createElement('style'); st.id = 'xtkAccent'; document.head.appendChild(st); }
    st.textContent = `:root{--accent:${acc}}button.primary,.chip.on,.nav.active{background:${acc}!important;border-color:${acc}!important;color:#fff}button.primary:hover{filter:brightness(.9)}`;
    const name = S.app_name || DEF.app_name; $('#logoHome').textContent = ((S.logo_text ?? DEF.logo_text) + ' ' + name).trim(); document.title = name;
    greet.textContent = S.greeting || ''; greet.hidden = !S.greeting;
    ann.querySelector('span').textContent = S.announcement || ''; ann.hidden = !S.announcement || localStorage.getItem(LA) === S.announcement;
    document.body.classList.toggle('no-ai', !f.ai); document.body.classList.toggle('no-stock', !f.stock);
    document.body.classList.toggle('no-bgremove', !f.bg_remove); document.body.classList.toggle('no-signup', !f.signup);
    if (!f.ai) { const p = $('#aiPanel'); if (p) p.hidden = true; }
  }
  // default font for newly added text (text tab buttons)
  $('#view-designer')?.addEventListener('click', e => {
    if (!e.target.closest('.tab[data-tab=text] button') || !S.default_font || S.default_font === DEF.default_font) return;
    setTimeout(() => { const o = X.canvas.getActiveObject(); if (o && o.type === 'textbox' && o.fontFamily === DEF.default_font) { o.set('fontFamily', S.default_font); X.canvas.requestRenderAll(); } }, 0);
  }, true);
  async function loadSettings() {
    if (!sb() || !navigator.onLine) return;
    const { data, error } = await sb().from('app_settings').select('key,value');
    if (error || !Array.isArray(data)) return;
    const o = {}; data.forEach(r => o[r.key] = r.value); S = { ...DEF, ...o }; jset(LS, o); applySettings();
  }

  // ---------------- public templates: "Mẫu từ Xưởng"
  const wrap = document.createElement('div'); wrap.id = 'pubTplWrap'; wrap.hidden = true;
  wrap.innerHTML = '<h2>⭐ Mẫu từ Xưởng</h2><div id="pubTplGrid" class="grid lib"></div>'; $('#view-picker .libbar').before(wrap);
  const openPub = t => { const d = t.data || {}; if (!d.tpl) return X.toast('Mẫu bị lỗi.'); X.openDoc({ name: t.name, tpl: d.tpl, json: d.json || (d.pages || [])[0], pages: d.pages }); X.state.id = null; };
  function renderPub(list) {
    const g = $('#pubTplGrid'); g.innerHTML = ''; wrap.hidden = !list.length;
    list.forEach(t => {
      const el = document.createElement('div'); el.className = 'card libcard pubtpl'; el.dataset.id = t.id;
      el.innerHTML = `<div class="thumb"><img alt=""></div><b>${esc(t.name)}</b><small>${esc(t.category || 'Mẫu từ Xưởng')}${t.data?.tpl ? ' · ' + t.data.tpl.w + '×' + t.data.tpl.h : ''}</small>`;
      if (t.thumb) el.querySelector('img').src = t.thumb; el.onclick = () => openPub(t); g.appendChild(el);
    });
  }
  async function loadPub() {
    if (!sb() || !navigator.onLine) return;
    const { data, error } = await sb().from('public_templates').select('id,name,category,data,thumb,updated_at,published').eq('published', true).order('updated_at', { ascending: false });
    if (error || !Array.isArray(data)) return;
    if (!jset(LP, data)) jset(LP, data.map(t => ({ ...t, thumb: null }))); // quota: keep data, drop thumbs
    renderPub(data);
  }

  // ---------------- admin view
  const nav = document.createElement('button'); nav.className = 'nav'; nav.dataset.view = 'admin'; nav.id = 'navAdmin'; nav.hidden = true; nav.textContent = '🛡 Quản trị';
  $('header.topbar nav').appendChild(nav); nav.onclick = () => { X.show('admin'); renderAdmin(); };
  const view = document.createElement('section'); view.id = 'view-admin'; view.className = 'view';
  view.innerHTML = `<h1>🛡 Quản trị</h1><p class="small muted">Chỉ tài khoản quản trị (đã xác minh email) thấy mục này; quyền được máy chủ kiểm tra bằng RLS.</p>
    <div class="chips" id="admTabs"><button class="chip on" data-t="designs">Thiết kế người dùng</button><button class="chip" data-t="tpls">Mẫu chung</button><button class="chip" data-t="settings">Cài đặt ứng dụng</button></div>
    <div data-p="designs"><div class="row"><input id="admSearch" type="search" placeholder="Tìm theo tên hoặc email…"><label class="small"><input type="checkbox" id="admShowDel"> Hiện cả đã xóa</label><button id="admReload">↻ Tải lại</button></div><div id="admDesigns" class="admlist"></div></div>
    <div data-p="tpls" hidden><div class="row"><button id="admTplFromCur" class="primary">＋ Đăng thiết kế đang mở thành mẫu</button><button id="admTplReload">↻ Tải lại</button></div><div id="admTpls" class="admlist"></div></div>
    <div data-p="settings" hidden><form id="admSettings" class="admform">
      <label>Màu nhấn <input type="color" name="accent"></label>
      <label>Tên ứng dụng <input name="app_name" maxlength="60"></label>
      <label>Chữ/biểu tượng logo <input name="logo_text" maxlength="12"></label>
      <label>Font mặc định <select name="default_font"></select></label>
      <label>Lời chào trang chủ <input name="greeting" maxlength="200"></label>
      <label>Thông báo chung (để trống = tắt) <textarea name="announcement" rows="2" maxlength="500"></textarea></label>
      <fieldset><legend>Tính năng</legend>
        <label><input type="checkbox" name="f_ai"> ✨ Ý tưởng AI</label><label><input type="checkbox" name="f_stock"> 📷 Ảnh miễn phí</label>
        <label><input type="checkbox" name="f_bg_remove"> ✂️ Xóa nền</label><label><input type="checkbox" name="f_signup"> Cho phép nút Đăng ký</label></fieldset>
      <div class="row"><button class="primary" type="submit">💾 Lưu cài đặt</button><span id="admSetMsg" class="small muted"></span></div></form></div>`;
  $('main').appendChild(view);
  const tabs = t => { $$('#admTabs .chip').forEach(b => b.classList.toggle('on', b.dataset.t === t)); $$('#view-admin [data-p]').forEach(p => p.hidden = p.dataset.p !== t); renderAdmin(t); };
  $$('#admTabs .chip').forEach(b => b.onclick = () => tabs(b.dataset.t));
  let isAdmin = false, rows = [], tpls = [], adminEdit = null;
  const cur = () => $('#admTabs .chip.on').dataset.t;
  async function checkAdmin() {
    isAdmin = false;
    if (sb() && CS().user && navigator.onLine) { try { const { data, error } = await sb().rpc('is_admin'); isAdmin = !error && data === true; } catch (e) { } }
    nav.hidden = !isAdmin; if (!isAdmin && view.classList.contains('active')) X.show('picker');
  }
  function renderAdmin(t = cur()) { if (!isAdmin) return; if (t === 'designs') loadDesigns(); else if (t === 'tpls') loadTpls(); else fillSettings(); }
  const err = (e, m = 'Lỗi') => X.toast(m + ': ' + ((e && e.message) || e));

  async function loadDesigns() {
    const { data, error } = await sb().from('designs').select('id,user_id,owner_email,name,thumb,updated_at,deleted').order('updated_at', { ascending: false });
    if (error) return err(error, 'Không tải được danh sách'); rows = data || []; drawDesigns();
  }
  function drawDesigns() {
    const q = $('#admSearch').value.trim().toLowerCase(), all = $('#admShowDel').checked, g = $('#admDesigns'); g.innerHTML = '';
    const list = rows.filter(r => (all || !r.deleted) && (!q || ((r.name || '') + ' ' + (r.owner_email || '')).toLowerCase().includes(q)));
    if (!list.length) g.innerHTML = '<p class="muted">Không có thiết kế nào.</p>';
    list.forEach(r => {
      const el = document.createElement('div'); el.className = 'admrow' + (r.deleted ? ' del' : ''); el.dataset.id = r.id;
      el.innerHTML = `<img alt=""><div class="meta"><b></b><small>${esc(r.owner_email || r.user_id)} · ${fmt(r.updated_at)}${r.deleted ? ' · <i>đã xóa</i>' : ''}</small></div>
        <div class="row"><button data-a="open" class="primary">Mở</button><button data-a="del">${r.deleted ? 'Khôi phục' : 'Xóa'}</button><button data-a="pub">Đăng thành mẫu chung</button></div>`;
      if (r.thumb) el.querySelector('img').src = r.thumb; el.querySelector('b').textContent = r.name || '(không tên)';
      el.querySelector('[data-a=open]').onclick = () => openUser(r);
      el.querySelector('[data-a=del]').onclick = () => setDeleted(r, !r.deleted);
      el.querySelector('[data-a=pub]').onclick = () => publishRow(r);
      g.appendChild(el);
    });
  }
  $('#admSearch').oninput = drawDesigns; $('#admShowDel').onchange = drawDesigns; $('#admReload').onclick = loadDesigns;
  const fullRow = async r => { const { data, error } = await sb().from('designs').select('*').eq('id', r.id).single(); if (error) throw error; return CS().fromCloud(data, null); };
  async function openUser(r) {
    try { const d = await fullRow(r); X.openDoc({ name: d.name, tpl: d.tpl, json: d.json, pages: d.pages }); X.state.id = null; adminEdit = { id: r.id, user_id: r.user_id, email: r.owner_email }; bar(); }
    catch (e) { err(e, 'Không mở được'); }
  }
  async function setDeleted(r, del) {
    if (del && !confirm('Xóa (mềm) thiết kế “' + (r.name || '') + '”? Có thể khôi phục sau.')) return;
    const { error } = await sb().from('designs').update({ deleted: del, updated_at: new Date().toISOString() }).eq('id', r.id);
    if (error) return err(error); X.toast(del ? 'Đã xóa (mềm).' : 'Đã khôi phục.'); loadDesigns();
  }
  async function publishRow(r) {
    try { const d = await fullRow(r); await publish(r.name, { tpl: d.tpl, json: d.json, pages: d.pages }, r.thumb); } catch (e) { err(e, 'Không đăng được'); }
  }
  const curDoc = () => { const st = X.state; st.pages[st.cur] = X.canvas.toJSON(window.XTK_FX.PROPS); return { tpl: st.tpl, json: st.pages[0], pages: st.pages.length > 1 ? st.pages.slice() : undefined }; };
  async function publish(name, data, thumb) {
    const n = prompt('Tên mẫu chung:', name || ''); if (n === null) return;
    const cat = prompt('Nhóm (danh mục):', 'Mẫu từ Xưởng'); if (cat === null) return;
    const { error } = await sb().from('public_templates').insert({ name: n, category: cat || 'Mẫu từ Xưởng', data: JSON.parse(JSON.stringify(data)), thumb, published: true });
    if (error) throw error; X.toast('Đã đăng “' + n + '” thành mẫu chung.'); loadPub(); if (cur() === 'tpls') loadTpls();
  }
  // edit bar: save changes back into the user's cloud design (never into the admin's local library)
  const eb = document.createElement('div'); eb.id = 'admEditBar'; eb.className = 'admeditbar'; eb.hidden = true;
  eb.innerHTML = '<span></span><button class="primary" data-a="save">💾 Lưu vào bản của người dùng</button><button data-a="exit">Thoát</button>'; document.body.appendChild(eb);
  function bar() { eb.hidden = !adminEdit; if (adminEdit) eb.querySelector('span').textContent = '🛡 Đang sửa thiết kế của ' + (adminEdit.email || adminEdit.user_id); }
  eb.querySelector('[data-a=exit]').onclick = () => { adminEdit = null; bar(); X.show('admin'); renderAdmin('designs'); };
  eb.querySelector('[data-a=save]').onclick = async () => {
    try {
      const row = await CS().toCloud({ ...curDoc(), id: null, cloudId: adminEdit.id, name: $('#designName').value || 'Không tên', thumb: X.thumb(), updated: Date.now() }, adminEdit.user_id);
      const { id, ...upd } = row; const { error } = await sb().from('designs').update(upd).eq('id', adminEdit.id);
      if (error) throw error; X.toast('Đã lưu vào thiết kế của người dùng.');
    } catch (e) { err(e, 'Không lưu được'); }
  };
  document.addEventListener('click', e => { if (adminEdit && e.target.closest('.nav[data-view], #logoHome')) { adminEdit = null; bar(); } }, true);

  async function loadTpls() {
    const { data, error } = await sb().from('public_templates').select('id,name,category,thumb,updated_at,published').order('updated_at', { ascending: false });
    if (error) return err(error, 'Không tải được mẫu'); tpls = data || [];
    const g = $('#admTpls'); g.innerHTML = tpls.length ? '' : '<p class="muted">Chưa có mẫu chung nào.</p>';
    tpls.forEach(t => {
      const el = document.createElement('div'); el.className = 'admrow' + (t.published ? '' : ' del'); el.dataset.id = t.id;
      el.innerHTML = `<img alt=""><div class="meta"><b></b><small>${esc(t.category)} · ${fmt(t.updated_at)} · ${t.published ? 'đang hiển thị' : '<i>ẩn</i>'}</small></div>
        <div class="row"><button data-a="pub">${t.published ? 'Ẩn' : 'Hiển thị'}</button><button data-a="ren">Đổi tên/nhóm</button><button data-a="del">Xóa</button></div>`;
      if (t.thumb) el.querySelector('img').src = t.thumb; el.querySelector('b').textContent = t.name;
      const up = async v => { const { error } = await sb().from('public_templates').update(v).eq('id', t.id); if (error) return err(error); loadTpls(); loadPub(); };
      el.querySelector('[data-a=pub]').onclick = () => up({ published: !t.published });
      el.querySelector('[data-a=ren]').onclick = () => { const n = prompt('Tên mẫu:', t.name); if (n === null) return; const c = prompt('Nhóm:', t.category); if (c === null) return; up({ name: n, category: c }); };
      el.querySelector('[data-a=del]').onclick = async () => { if (!confirm('Xóa hẳn mẫu “' + t.name + '”?')) return; const { error } = await sb().from('public_templates').delete().eq('id', t.id); if (error) return err(error); loadTpls(); loadPub(); };
      g.appendChild(el);
    });
  }
  $('#admTplReload').onclick = loadTpls;
  $('#admTplFromCur').onclick = async () => { if (!X.state.tpl) return X.toast('Hãy mở một thiết kế trước.'); try { await publish($('#designName').value, curDoc(), X.thumb()); } catch (e) { err(e, 'Không đăng được'); } };

  const form = $('#admSettings');
  form.default_font.innerHTML = (X.FONTS || [DEF.default_font]).map(f => `<option>${esc(f)}</option>`).join('');
  function fillSettings() {
    const f = { ...DEF.features, ...(S.features || {}) };
    form.accent.value = S.accent || DEF.accent; form.app_name.value = S.app_name || ''; form.logo_text.value = S.logo_text ?? '';
    form.default_font.value = S.default_font || DEF.default_font; form.greeting.value = S.greeting || ''; form.announcement.value = S.announcement || '';
    ['ai', 'stock', 'bg_remove', 'signup'].forEach(k => form['f_' + k].checked = f[k] !== false);
  }
  form.onsubmit = async e => {
    e.preventDefault();
    const v = { accent: form.accent.value, app_name: form.app_name.value.trim() || DEF.app_name, logo_text: form.logo_text.value.trim(), default_font: form.default_font.value,
      greeting: form.greeting.value.trim(), announcement: form.announcement.value.trim(), features: Object.fromEntries(['ai', 'stock', 'bg_remove', 'signup'].map(k => [k, form['f_' + k].checked])) };
    const { error } = await sb().from('app_settings').upsert(Object.entries(v).map(([key, value]) => ({ key, value })), { onConflict: 'key' });
    if (error) { $('#admSetMsg').textContent = 'Lỗi: ' + error.message; return; }
    $('#admSetMsg').textContent = 'Đã lưu — áp dụng cho mọi người dùng.'; jset(LS, v); S = { ...DEF, ...v }; applySettings();
  };

  // ---------------- boot
  applySettings(); renderPub(jget(LP, []));
  const online = () => { loadSettings(); loadPub(); };
  if (sb()) online(); document.addEventListener('xtk:cloudready', online);
  if (CS() && CS().user) checkAdmin(); // session may resolve before this script loads
  document.addEventListener('xtk:cloudauth', checkAdmin); addEventListener('online', () => { online(); checkAdmin(); });
  window.XTK_ADMIN = { checkAdmin, loadSettings, loadPub, get isAdmin() { return isAdmin; }, get settings() { return S; } };
})();
