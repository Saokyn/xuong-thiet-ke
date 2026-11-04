// Optional Supabase cloud sync. Offline-first: IndexedDB stays the source of truth; changes are queued and
// reconciled when online (last-write-wins by updated_at, soft delete). Only designs (+ their images) sync —
// never localStorage, so the AI API key and other settings never leave the device.
(function () {
  const $ = s => document.querySelector(s), X = window.XTK || {}, toast = X.toast || (() => {});
  const C = window.XTK_CLOUD || {}, configured = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY);
  const LQ = 'xtk.cloud.queue', LT = 'xtk.cloud.tomb';
  const jget = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  const st = $('#cloudStatus'), btnSync = $('#cloudSync'), btnAcct = $('#cloudAcct'), dlg = $('#cloudDlg');
  let sb = null, user = null, busy = false, lastErr = '';
  const queue = () => jget(LQ, []);
  const enqueue = id => { const q = queue(); if (!q.includes(id)) q.push(id); jset(LQ, q); status(); schedule(); };

  // ---- queue local writes (wrap DB; pull writes go through raw* so they are not re-queued)
  const rawPut = DB.put, rawDel = DB.del;
  DB.put = async d => { d.updated = d.updated || Date.now(); if (!d.cloudId) { const o = await DB.get(d.id).catch(() => null); if (o && o.cloudId) d.cloudId = o.cloudId; } const r = await rawPut(d); enqueue(d.id); return r; };
  DB.del = async id => { const d = await DB.get(id); const r = await rawDel(id); if (d && d.cloudId) { const t = jget(LT, {}); t[d.cloudId] = Math.max(Date.now(), d.updated || 0); /* deletion beats any remote version this copy had seen */ jset(LT, t); enqueue('tomb:' + d.cloudId); } return r; };

  function status(s) {
    const n = queue().length;
    if (!configured) { st.textContent = '☁ Chưa cấu hình'; st.className = 'cloudst off'; return; }
    if (!user) { st.textContent = n ? `⏳ Đang chờ (${n}) · chưa đăng nhập` : '☁ Chưa đăng nhập'; st.className = 'cloudst ' + (n ? 'wait' : 'off'); return; }
    if (s === 'busy') { st.textContent = '⟳ Đang đồng bộ…'; st.className = 'cloudst busy'; return; }
    if (lastErr) { st.textContent = '⚠ Lỗi đồng bộ'; st.title = lastErr; st.className = 'cloudst err'; return; }
    st.title = '';
    if (n || !navigator.onLine) { st.textContent = `⏳ Đang chờ (${n})`; st.className = 'cloudst wait'; return; }
    st.textContent = '☁ Đã lưu lên mây'; st.className = 'cloudst ok';
  }

  // ---- images: data URLs in the design JSON are uploaded to Storage {uid}/img/{sha256}; the cloud copy keeps sb:// refs
  const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
  const dataToBlob = u => { const [h, b] = u.split(','), m = h.match(/data:([^;]+)/)[1], bin = atob(b), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: m }); };
  const blobToData = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
  async function mapSrcs(obj, fn) { // walk JSON, replace string values via async fn
    if (Array.isArray(obj)) { for (let i = 0; i < obj.length; i++) obj[i] = await mapSrcs(obj[i], fn); return obj; }
    if (obj && typeof obj === 'object') { for (const k of Object.keys(obj)) obj[k] = await mapSrcs(obj[k], fn); return obj; }
    return typeof obj === 'string' ? fn(obj) : obj;
  }
  const bucket = () => sb.storage.from('user-images');
  async function toCloud(d) {
    const { id, cloudId, thumb, name, updated, ...rest } = JSON.parse(JSON.stringify(d));
    for (const k of Object.keys(rest)) if (/api.?key|secret|token|password/i.test(k)) delete rest[k];
    const data = await mapSrcs(rest, async s => {
      if (!/^data:image\/[a-z+.-]+;base64,/i.test(s) || s.length < 2000) return s;
      const path = `${user.id}/img/${await sha(s)}`;
      const { error } = await bucket().upload(path, dataToBlob(s), { upsert: true, contentType: s.slice(5, s.indexOf(';')) });
      if (error && !/exists|Duplicate/i.test(error.message || '')) throw error;
      return 'sb://user-images/' + path;
    });
    return { id: cloudId, name, data, thumb, updated_at: new Date(updated).toISOString(), deleted: false };
  }
  async function fromCloud(r, local) {
    const data = await mapSrcs(JSON.parse(JSON.stringify(r.data || {})), async s => {
      if (!s.startsWith('sb://user-images/')) return s;
      const { data: b, error } = await bucket().download(s.slice('sb://user-images/'.length)); if (error) throw error; return blobToData(b);
    });
    return { ...data, id: local ? local.id : r.id, cloudId: r.id, name: r.name, thumb: r.thumb, updated: Date.parse(r.updated_at) };
  }

  async function sync() {
    if (!configured || !sb || !user || busy) return status();
    if (!navigator.onLine) return status();
    busy = true; status('busy');
    try {
      const { data: rows, error } = await sb.from('designs').select('id,name,data,thumb,updated_at,deleted');
      if (error) throw error;
      const remote = new Map((rows || []).map(r => [r.id, r])), locals = await DB.all(), byCloud = new Map();
      for (const l of locals) { if (!l.cloudId) { l.cloudId = crypto.randomUUID(); await rawPut(l); } byCloud.set(l.cloudId, l); }
      const tomb = jget(LT, {}), ups = [];
      for (const r of remote.values()) { // pull: remote newer wins
        const l = byCloud.get(r.id), rt = Date.parse(r.updated_at);
        if (tomb[r.id]) continue;
        if (r.deleted) { if (l && l.updated <= rt) { await rawDel(l.id); byCloud.delete(r.id); } continue; }
        if (!l || l.updated < rt) { await rawPut(await fromCloud(r, l)); byCloud.delete(r.id); }
      }
      for (const l of byCloud.values()) { const r = remote.get(l.cloudId); if (!r || (!r.deleted && Date.parse(r.updated_at) < l.updated) || (r.deleted && Date.parse(r.updated_at) < l.updated)) ups.push(await toCloud(l)); }
      for (const [cid, at] of Object.entries(tomb)) { const r = remote.get(cid); if (!r || Date.parse(r.updated_at) <= at) ups.push({ id: cid, name: r ? r.name : '', data: {}, thumb: null, updated_at: new Date(Math.max(at, r ? Date.parse(r.updated_at) + 1 : 0)).toISOString(), deleted: true }); }
      if (ups.length) { const { error: e2 } = await sb.from('designs').upsert(ups, { onConflict: 'id' }); if (e2) throw e2; }
      jset(LT, {}); jset(LQ, []); lastErr = '';
      if ($('#view-saved')?.classList.contains('active')) document.querySelector('.nav[data-view=saved]')?.click(); document.dispatchEvent(new CustomEvent('xtk:cloudsynced', { detail: { pushed: ups.length } }));
    } catch (e) { lastErr = (e && e.message) || String(e); }
    finally { busy = false; status(); }
  }
  let tmr; function schedule() { clearTimeout(tmr); tmr = setTimeout(sync, 1500); }

  // ---- account dialog
  function renderDlg() {
    const body = $('#cloudBody');
    if (!configured) { body.innerHTML = '<p><b>Đồng bộ đám mây chưa cấu hình.</b></p><p class="small muted">Điền SUPABASE_URL và SUPABASE_ANON_KEY trong <code>js/cloud-config.js</code> (xem README). Thiết kế vẫn được lưu an toàn trên máy.</p>'; return; }
    if (user) { body.innerHTML = `<p>Đã đăng nhập: <b></b></p><p class="small muted">Thiết kế, các trang, ảnh thu nhỏ và ảnh tải lên được đồng bộ. Khóa API AI không bao giờ được đồng bộ.</p><div class="row"><button id="cloudNow" class="primary">⟳ Đồng bộ ngay</button><button id="cloudOut">Đăng xuất</button></div>`; body.querySelector('b').textContent = user.email || user.id; $('#cloudNow').onclick = sync; $('#cloudOut').onclick = async () => { await sb.auth.signOut(); }; return; }
    body.innerHTML = `<label>Email<input id="cloudEmail" type="email" autocomplete="email" placeholder="ban@vidu.vn"></label>
      <label>Mật khẩu (bỏ trống nếu dùng liên kết)<input id="cloudPass" type="password" autocomplete="current-password"></label>
      <div class="row wrap"><button id="cloudLogin" class="primary">Đăng nhập</button><button id="cloudSignup">Đăng ký</button><button id="cloudMagic">✉ Gửi liên kết đăng nhập</button></div>
      <p id="cloudMsg" class="small muted"></p>`;
    const em = () => $('#cloudEmail').value.trim(), pw = () => $('#cloudPass').value, msg = t => $('#cloudMsg').textContent = t;
    const run = async (fn, ok) => { if (!/.+@.+\..+/.test(em())) return msg('Nhập email hợp lệ.'); msg('Đang xử lý…'); try { const { error } = await fn(); msg(error ? 'Lỗi: ' + error.message : ok); } catch (e) { msg('Lỗi: ' + e.message); } };
    $('#cloudLogin').onclick = () => pw() ? run(() => sb.auth.signInWithPassword({ email: em(), password: pw() }), 'Đã đăng nhập.') : msg('Nhập mật khẩu, hoặc dùng “Gửi liên kết đăng nhập”.');
    $('#cloudSignup').onclick = () => pw().length >= 6 ? run(() => sb.auth.signUp({ email: em(), password: pw() }), 'Đã đăng ký — kiểm tra email để xác nhận (nếu dự án yêu cầu).') : msg('Mật khẩu tối thiểu 6 ký tự.');
    $('#cloudMagic').onclick = () => run(() => sb.auth.signInWithOtp({ email: em(), options: { emailRedirectTo: location.origin + location.pathname } }), 'Đã gửi liên kết đăng nhập — mở email để tiếp tục.');
  }
  btnAcct.onclick = () => { renderDlg(); dlg.showModal(); };
  $('#cloudClose').onclick = () => dlg.close();
  btnSync.onclick = () => sync();
  function setUser(u) { user = u || null; btnSync.hidden = !user; btnAcct.textContent = user ? '☁ ' + (user.email || 'Tài khoản').split('@')[0] : '☁ Tài khoản'; status(); if (dlg.open) renderDlg(); if (user) sync(); }
  addEventListener('online', () => { status(); sync(); }); addEventListener('offline', () => status());
  status();
  window.XTK_CLOUDSYNC = { sync, status, configured, queue, get user() { return user; } };
  if (!configured) return;
  const start = () => {
    try {
      sb = (window.XTK_SUPABASE_FACTORY || ((u, k) => window.supabase.createClient(u, k, { auth: { persistSession: true, detectSessionInUrl: true } })))(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
      sb.auth.onAuthStateChange((_e, s) => setUser(s && s.user));
      sb.auth.getSession().then(({ data }) => setUser(data && data.session && data.session.user));
    } catch (e) { lastErr = e.message; status(); }
  };
  if (window.XTK_SUPABASE_FACTORY || window.supabase) start();
  else { const s = document.createElement('script'); s.src = 'vendor/supabase.js'; s.onload = start; s.onerror = () => { lastErr = 'Không tải được thư viện Supabase'; status(); }; document.head.appendChild(s); }
})();
