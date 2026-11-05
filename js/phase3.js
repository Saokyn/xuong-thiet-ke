// Xưởng Thiết Kế — Phase 3: stock photos, AI copy/design/images, image tools, community templates, animation.
// Privacy: every API key is typed by the user, kept only in localStorage and sent only to the provider it belongs to.
(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const X = window.XTK, canvas = X.canvas, st = X.state, H = window.XTK_HOOKS, PROPS = window.XTK_FX.PROPS;
  const toast = X.toast, U = () => X.U();
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  const clamp = (v, a, b, d) => { v = Number(v); return Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : d; };
  const str = (v, max = 220) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';
  const arr = (v, n) => Array.isArray(v) ? v.slice(0, n) : [];
  const ensureTpl = () => { if (!st.tpl) X.openTemplate(TEMPLATES.find(t => t.id === 'post-sq')); };
  const openAndWait = (T, json) => new Promise(r => { const prev = H.opened; H.opened = () => { H.opened = prev; prev?.(); r(); }; X.openTemplate(T, json); });
  const blobToDataURL = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
  const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('Không tải được ảnh')); i.src = src; });
  const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 60000); }
  const fname = () => ($('#designName').value || 'thiet-ke').replace(/[\\/:*?"<>|]/g, '_');
  async function fetchAsDataURL(url) { const r = await fetch(url, { mode: 'cors', credentials: 'omit' }); if (!r.ok) throw new Error('HTTP ' + r.status); return blobToDataURL(await r.blob()); }

  // ================= 1. Stock photos
  const SK = { pexels: 'xtk.stock.pexels', unsplash: 'xtk.stock.unsplash' };
  const keyOf = p => localStorage.getItem(SK[p]) || '';
  const keyPh = () => { for (const p of ['pexels', 'unsplash']) $('#' + p + 'Key').placeholder = keyOf(p) ? '•••••• (đã lưu)' : 'Dán khóa (tùy chọn)'; };
  keyPh();
  $('#stockSaveKeys').onclick = () => { for (const p of ['pexels', 'unsplash']) { const v = $('#' + p + 'Key').value.trim(); if (v) localStorage.setItem(SK[p], v); $('#' + p + 'Key').value = ''; } keyPh(); toast('Đã lưu khóa trên thiết bị này'); };
  $('#stockClearKeys').onclick = () => { Object.values(SK).forEach(k => localStorage.removeItem(k)); keyPh(); toast('Đã xóa khóa ảnh'); };
  const STOCK = {
    async openverse(q, page) {
      const r = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=20&page=${page}&mature=false`, { credentials: 'omit' });
      if (!r.ok) throw new Error('Openverse HTTP ' + r.status);
      const d = await r.json();
      return arr(d.results, 40).map(x => ({ thumb: x.thumbnail || x.url, full: x.url, fallback: x.thumbnail, author: str(x.creator, 80) || 'Không rõ', authorUrl: x.creator_url, link: x.foreign_landing_url, source: 'Openverse/' + str(x.source, 30), license: ('CC ' + str(x.license, 20).toUpperCase() + ' ' + str(x.license_version, 6)).trim() }));
    },
    async pexels(q, page) {
      const k = keyOf('pexels'); if (!k) throw new Error('Pexels cần API key (miễn phí tại pexels.com/api). Mở mục khóa API bên dưới.');
      const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=20&page=${page}`, { headers: { Authorization: k }, credentials: 'omit' });
      if (!r.ok) throw new Error('Pexels HTTP ' + r.status);
      const d = await r.json();
      return arr(d.photos, 40).map(x => ({ thumb: x.src?.medium, full: x.src?.large2x || x.src?.large, fallback: x.src?.medium, author: str(x.photographer, 80), authorUrl: x.photographer_url, link: x.url, source: 'Pexels', license: 'Pexels License' }));
    },
    async unsplash(q, page) {
      const k = keyOf('unsplash'); if (!k) throw new Error('Unsplash cần Access Key (unsplash.com/developers). Mở mục khóa API bên dưới.');
      const r = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=20&page=${page}&content_filter=high`, { headers: { Authorization: 'Client-ID ' + k, 'Accept-Version': 'v1' }, credentials: 'omit' });
      if (!r.ok) throw new Error('Unsplash HTTP ' + r.status);
      const d = await r.json();
      return arr(d.results, 40).map(x => ({ thumb: x.urls?.small, full: x.urls?.regular, fallback: x.urls?.small, author: str(x.user?.name, 80), authorUrl: x.user?.links?.html && x.user.links.html + '?utm_source=xuong_thiet_ke&utm_medium=referral', link: x.links?.html, track: x.links?.download_location, source: 'Unsplash', license: 'Unsplash License' }));
    },
  };
  const safeUrl = u => typeof u === 'string' && /^https:\/\//.test(u) ? u : '';
  let stockPage = 1, stockItems = [];
  async function stockSearch(more) {
    const q = $('#stockQ').value.trim(), src = $('#stockSrc').value; if (!q) return toast('Nhập từ khóa tìm ảnh');
    stockPage = more ? stockPage + 1 : 1; if (!more) { stockItems = []; $('#stockGrid').innerHTML = ''; }
    $('#stockStatus').textContent = 'Đang tìm…';
    try {
      const items = (await STOCK[src](q, stockPage)).filter(x => safeUrl(x.thumb) && safeUrl(x.full));
      stockItems.push(...items);
      for (const it of items) {
        const f = document.createElement('figure'); f.title = `${it.author} · ${it.source} · ${it.license}`;
        f.innerHTML = `<img loading="lazy" alt="" src="${esc(it.thumb)}" referrerpolicy="no-referrer"><figcaption>📷 ${safeUrl(it.authorUrl) ? `<a href="${esc(it.authorUrl)}" target="_blank" rel="noopener">${esc(it.author)}</a>` : esc(it.author)} · ${esc(it.source)}</figcaption>`;
        f.querySelector('img').onclick = () => addStock(it); $('#stockGrid').appendChild(f);
      }
      $('#stockStatus').textContent = items.length ? `${stockItems.length} ảnh — bấm để thêm. Hãy ghi công tác giả.` : 'Không tìm thấy ảnh.';
      $('#stockMore').hidden = !items.length;
    } catch (e) { $('#stockStatus').textContent = (navigator.onLine ? '' : 'Đang ngoại tuyến. ') + e.message; }
  }
  async function addStock(it) {
    ensureTpl(); $('#stockStatus').textContent = 'Đang tải ảnh…';
    let data; try { data = await fetchAsDataURL(it.full); } catch (e) { try { data = await fetchAsDataURL(it.fallback); } catch (e2) { $('#stockStatus').textContent = 'Không tải được ảnh (máy chủ chặn CORS hoặc mất mạng).'; return null; } }
    if (it.track && keyOf('unsplash')) fetch(it.track, { headers: { Authorization: 'Client-ID ' + keyOf('unsplash') }, credentials: 'omit' }).catch(() => {}); // Unsplash API guideline: trigger download event
    const img = await X.placeImage(data, 'Ảnh: ' + it.author.slice(0, 30));
    const credit = `Ảnh: ${it.author} / ${it.source} (${it.license})`;
    if (img) { img.xtk = { ...(img.xtk || {}), credit, creditUrl: safeUrl(it.link) }; }
    if ($('#stockAttr').checked) {
      const t = new fabric.Textbox(credit, { fontFamily: 'Be Vietnam Pro', fontSize: Math.max(14, U() * 0.018), fill: '#ffffff', backgroundColor: '#00000066', padding: 4, width: st.tpl.w * 0.6, textAlign: 'right', name: 'Ghi công ảnh' });
      canvas.add(t); t.set({ left: st.tpl.w - t.width - U() * 0.02, top: st.tpl.h - t.height - U() * 0.02 }); t.setCoords(); canvas.requestRenderAll(); X.snapshot();
    }
    $('#stockStatus').textContent = 'Đã thêm. ' + credit; return img;
  }
  $('#stockGo').onclick = () => stockSearch(false); $('#stockMore').onclick = () => stockSearch(true);
  $('#stockQ').onkeydown = e => { if (e.key === 'Enter') stockSearch(false); };

  // ================= AI panel sub-tabs
  $$('.aitabs button').forEach(b => b.onclick = () => { $$('.aitabs button').forEach(x => x.classList.toggle('on', x === b)); $$('.aisec').forEach(s => s.hidden = s.dataset.ai !== b.dataset.ai); });
  const busy = async (btn, status, msg, fn) => { $(status).textContent = msg; $(btn).disabled = true; try { const r = await fn(); return r; } catch (e) { $(status).textContent = e.message; } finally { $(btn).disabled = false; } };

  // ================= 2a. AI copywriting
  const COPY_SYS = `[XTK:copy] Bạn là copywriter quảng cáo người Việt. Trả lời CHỈ bằng JSON hợp lệ (không markdown):
{"headlines":[5 tiêu đề ngắn],"slogans":[5 slogan],"captions":[3 đoạn quảng cáo 1-3 câu cho mạng xã hội],"ctas":[4 lời kêu gọi hành động],"hashtags":[8-12 hashtag không dấu cách, bắt đầu bằng #]}
Viết tiếng Việt có dấu, tự nhiên, không phóng đại sai sự thật, không nội dung phản cảm, không nhắc tên người thật/người nổi tiếng.`;
  function sanitizeCopy(o) {
    o = o && typeof o === 'object' ? o : {};
    const list = (k, n, m) => arr(o[k], n).map(x => str(x, m)).filter(Boolean);
    const tags = arr(o.hashtags, 15).map(x => str(x, 40).replace(/\s+/g, '')).map(x => x.startsWith('#') ? x : '#' + x).filter(x => /^#[\p{L}\p{N}_]{2,}$/u.test(x));
    return { headlines: list('headlines', 6, 90), slogans: list('slogans', 6, 90), captions: list('captions', 4, 400), ctas: list('ctas', 5, 60), hashtags: [...new Set(tags)] };
  }
  function addText(text, big) {
    ensureTpl();
    X.center(new fabric.Textbox(text, { fontFamily: 'Be Vietnam Pro', fontWeight: big ? 700 : 400, fontSize: U() * (big ? 0.08 : 0.04), fill: '#111827', width: st.tpl.w * 0.8, textAlign: 'center', name: big ? 'Tiêu đề AI' : 'Chữ AI' }));
  }
  function renderCopy(c) {
    const sec = (title, items, big) => items.length ? `<div class="ai-sec"><h5>${title}</h5>${items.map((t, i) => `<div class="copy-item">${esc(t)} <button class="small" data-t="${esc(t)}" data-big="${big ? 1 : ''}">+ Thêm</button></div>`).join('')}</div>` : '';
    $('#aiCopyResult').innerHTML = sec('Tiêu đề', c.headlines, 1) + sec('Slogan', c.slogans, 1) + sec('Nội dung quảng cáo', c.captions) + sec('Kêu gọi hành động', c.ctas) +
      (c.hashtags.length ? `<div class="ai-sec"><h5>Hashtag</h5><div class="copy-item">${esc(c.hashtags.join(' '))} <button class="small" data-t="${esc(c.hashtags.join(' '))}">+ Thêm</button></div></div>` : '');
    $('#aiCopyResult').querySelectorAll('[data-t]').forEach(b => b.onclick = () => addText(b.dataset.t, !!b.dataset.big));
  }
  async function aiCopy(q, tone) {
    const c = sanitizeCopy(await AI.chat(COPY_SYS, `Sản phẩm/dịch vụ: ${q}\nGiọng văn: ${tone}`));
    renderCopy(c); $('#aiCopyStatus').textContent = ''; return c;
  }
  $('#aiCopyGo').onclick = () => { const q = $('#aiCopyQ').value.trim(); if (!q) return toast('Hãy mô tả sản phẩm'); busy('#aiCopyGo', '#aiCopyStatus', 'Đang viết…', () => aiCopy(q, $('#aiTone').value)); };

  // ================= 2b. AI design from description -> structured JSON -> Fabric objects
  const designSys = () => `[XTK:design] Bạn là nhà thiết kế đồ họa. Trả lời CHỈ bằng JSON hợp lệ (không markdown) theo lược đồ:
{"template": "<id mẫu có sẵn hoặc 'none'>",
 "background": "#hex" hoặc {"gradient":["#hex","#hex"],"angle":0|45|90},
 "palette": ["#hex", ...tối đa 6],
 "fonts": {"heading": "<font>", "body": "<font>"},
 "elements": [ tối đa 20 phần tử, vẽ theo thứ tự:
   {"type":"shape","shape":"rect"|"circle"|"line","x":0-1,"y":0-1,"w":0-1,"h":0-1,"color":"#hex","radius":0-0.5,"opacity":0-1},
   {"type":"text","role":"headline"|"subheadline"|"body"|"cta"|"hashtag","text":"tiếng Việt có dấu","x":0-1,"y":0-1,"w":0-1,"size":0.02-0.2,"color":"#hex","align":"left"|"center"|"right","bold":true|false,"font":"<font>"},
   {"type":"image","x":0-1,"y":0-1,"w":0-1,"h":0-1,"prompt":"English image prompt"} ] }
x,y,w,h là tỉ lệ theo chiều rộng/cao trang (x,y = góc trên trái); size là tỉ lệ theo cạnh ngắn.
Font chỉ chọn trong: ${X.FONTS.join(', ')}.
Mẫu có sẵn (nếu một mẫu hợp, đặt "template" là id đó; khi đó chỉ cần các phần tử text để thay nội dung): ${window.LIBRARY.map(t => t.id + ' (' + t.cat + ': ' + t.name + ')').join('; ')}.
Prompt ảnh bằng tiếng Anh; nếu có người chỉ là người lớn hư cấu từ 25 tuổi trở lên, không người thật/người nổi tiếng, không nội dung tình dục, không trẻ em.`;
  function sanitizeDesign(d, brand) {
    d = d && typeof d === 'object' ? d : {};
    const col = (c, def) => typeof c === 'string' && HEX.test(c.trim()) ? c.trim() : def;
    const font = (f, def) => X.FONTS.includes(f) ? f : def;
    const out = { template: window.LIBRARY.some(t => t.id === d.template) ? d.template : null };
    const palette = arr(d.palette, 6).map(c => col(c)).filter(Boolean);
    out.palette = palette.length ? palette : ['#111827', '#4f46e5', '#f59e0b'];
    if (brand?.colors?.length) out.palette = brand.colors.slice(0, 6);
    const b = d.background;
    out.background = typeof b === 'string' ? col(b, '#ffffff') : b && Array.isArray(b.gradient) ? { gradient: [col(b.gradient[0], '#4f46e5'), col(b.gradient[1], '#ec4899')], angle: [0, 45, 90].includes(b.angle) ? b.angle : 90 } : '#ffffff';
    if (brand?.colors?.length > 1) out.background = { gradient: [brand.colors[0], brand.colors[1]], angle: 90 };
    out.fonts = { heading: font(brand?.fontH, font(d.fonts?.heading, 'Montserrat')), body: font(brand?.fontB, font(d.fonts?.body, 'Be Vietnam Pro')) };
    const ROLES = ['headline', 'subheadline', 'body', 'cta', 'hashtag'];
    out.elements = arr(d.elements, 20).map(e => {
      if (!e || typeof e !== 'object') return null;
      const base = { x: clamp(e.x, 0, 1, 0.1), y: clamp(e.y, 0, 1, 0.1), w: clamp(e.w, 0.02, 1, 0.8) };
      if (e.type === 'text') { const text = str(e.text, 300); if (!text) return null; return { type: 'text', ...base, role: ROLES.includes(e.role) ? e.role : 'body', text, size: clamp(e.size, 0.015, 0.2, 0.05), color: col(e.color, out.palette[0]), align: ['left', 'center', 'right'].includes(e.align) ? e.align : 'center', bold: !!e.bold, font: font(e.font, e.role === 'headline' ? out.fonts.heading : out.fonts.body) }; }
      if (e.type === 'shape') return { type: 'shape', ...base, h: clamp(e.h, 0.002, 1, 0.1), shape: ['rect', 'circle', 'line'].includes(e.shape) ? e.shape : 'rect', color: col(e.color, out.palette[1] || '#4f46e5'), radius: clamp(e.radius, 0, 0.5, 0), opacity: clamp(e.opacity, 0.05, 1, 1) };
      if (e.type === 'image') return { type: 'image', ...base, h: clamp(e.h, 0.05, 1, 0.3), prompt: str(e.prompt, 400) };
      return null;
    }).filter(Boolean);
    return out;
  }
  function designJSON(s, T) {
    const W = T.w, Hh = T.h, M = Math.min(W, Hh), objects = [];
    const bg = s.background;
    if (typeof bg === 'object') { const a = bg.angle, co = a === 0 ? { x1: 0, y1: 0, x2: W, y2: 0 } : a === 45 ? { x1: 0, y1: 0, x2: W, y2: Hh } : { x1: 0, y1: 0, x2: 0, y2: Hh }; objects.push({ type: 'rect', left: 0, top: 0, width: W, height: Hh, fill: { type: 'linear', coords: co, colorStops: [{ offset: 0, color: bg.gradient[0] }, { offset: 1, color: bg.gradient[1] }] }, name: '__bg', selectable: false, evented: false, xtk: { bg: 1 } }); }
    for (const e of s.elements) {
      const L = e.x * W, Tp = e.y * Hh, w = Math.min(e.w, 1 - e.x + 0.001) * W;
      if (e.type === 'text') objects.push({ type: 'textbox', text: e.text, left: L, top: Tp, width: Math.max(w, M * 0.1), fontSize: e.size * M, fontFamily: e.font, fontWeight: e.bold || e.role === 'headline' ? 700 : 400, fill: e.color, textAlign: e.align, lineHeight: 1.15, name: { headline: 'Tiêu đề', subheadline: 'Tiêu đề phụ', body: 'Nội dung', cta: 'Kêu gọi', hashtag: 'Hashtag' }[e.role], styles: {} });
      else if (e.type === 'shape') {
        const h = e.h * Hh;
        if (e.shape === 'circle') objects.push({ type: 'circle', left: L, top: Tp, radius: Math.min(w, h) / 2, fill: e.color, opacity: e.opacity, name: 'Hình tròn' });
        else if (e.shape === 'line') objects.push({ type: 'rect', left: L, top: Tp, width: w, height: Math.max(2, M * 0.006), fill: e.color, opacity: e.opacity, name: 'Đường kẻ' });
        else objects.push({ type: 'rect', left: L, top: Tp, width: w, height: h, rx: e.radius * Math.min(w, h), ry: e.radius * Math.min(w, h), fill: e.color, opacity: e.opacity, name: 'Khối' });
      } else objects.push({ type: 'rect', left: L, top: Tp, width: w, height: e.h * Hh, fill: '#e5e7eb', stroke: '#9ca3af', strokeWidth: Math.max(2, M * 0.004), strokeDashArray: [M * 0.02, M * 0.012], name: 'Ô ảnh AI', xtk: { aiPrompt: e.prompt } });
    }
    return { version: fabric.version, objects, background: typeof bg === 'string' ? bg : '#ffffff' };
  }
  async function applyDesign(spec, desc) {
    ensureTpl(); const T = st.tpl;
    let json;
    if (spec.template) {
      json = X.libJSON(window.LIBRARY.find(t => t.id === spec.template), T);
      const texts = spec.elements.filter(e => e.type === 'text');
      const order = ['headline', 'subheadline', 'body', 'cta', 'hashtag'];
      texts.sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));
      const boxes = json.objects.filter(o => /text/.test(o.type)).sort((a, b) => b.fontSize - a.fontSize);
      boxes.forEach((o, i) => { if (texts[i]) { o.text = texts[i].text; o.styles = {}; } });
    } else json = designJSON(spec, T);
    await openAndWait(T, json); $('#designName').value = 'AI: ' + str(desc, 40);
    return { objects: canvas.getObjects().length, template: spec.template };
  }
  async function aiDesign(desc) {
    const brand = $('#aiUseBrand').checked ? await DB.getBrand() : null;
    ensureTpl();
    const raw = await AI.chat(designSys(), `Kích thước: ${st.tpl.name} (${st.tpl.w}×${st.tpl.h}px).\nMô tả: ${desc}`, 0.7);
    const spec = sanitizeDesign(raw, brand && brand.colors.length ? brand : null);
    if (!spec.elements.length && !spec.template) throw new Error('AI không trả về phần tử hợp lệ, hãy thử lại.');
    const r = await applyDesign(spec, desc); $('#aiDesignStatus').textContent = `Đã tạo thiết kế (${r.objects} đối tượng${r.template ? ', dựa trên mẫu ' + r.template : ''}). Ô ảnh xám: chọn rồi dùng “Tạo ảnh”.`; return r;
  }
  $('#aiDesignGo').onclick = () => { const q = $('#aiDesignQ').value.trim(); if (!q) return toast('Hãy mô tả thiết kế'); busy('#aiDesignGo', '#aiDesignStatus', 'Đang thiết kế…', () => aiDesign(q)); };
  canvas.on('selection:created', e => { const o = e.selected?.[0]; if (o?.xtk?.aiPrompt && !$('#aiImgQ').value) $('#aiImgQ').value = o.xtk.aiPrompt; });

  // ================= 3. AI image generation (with policy checks)
  const IMG_K = 'xtk.ai.imgModel', IMG_DEF = AI.IMG_MODEL || 'gemini-2.5-flash-image';
  (function () { const cur = localStorage.getItem(IMG_K) || ''; if (/grok/i.test(cur) || !cur) localStorage.setItem(IMG_K, IMG_DEF); })();
  $('#aiImgModel').value = localStorage.getItem(IMG_K) || IMG_DEF;
  $('#aiImgModel').onchange = () => localStorage.setItem(IMG_K, $('#aiImgModel').value.trim() || IMG_DEF);
  const POLICY = 'Safety rules: any person shown must be a fictional adult clearly aged 25 or older; never depict real people, celebrities, politicians or look-alikes; no nudity or sexual or suggestive content; no children or minors.';
  const IMG_SYS = `[XTK:imgprompt] You write image-generation prompts in ENGLISH for a Vietnamese design studio. ${POLICY}
If the request violates these rules, rewrite it into a safe alternative. Reply ONLY with JSON: {"prompt":"<English prompt, max 400 chars>"}.`;
  const BAD = [
    [/\b(child|children|kid|kids|minor|minors|teen|teens|teenager|teenage|underage|baby|babies|toddler|infant|boy|girl|schoolgirl|schoolboy|loli|lolita|preteen|youngster|juvenile|little (?:boy|girl)|student in (?:school )?uniform)\b/i, 'Không cho phép trẻ em/vị thành niên (chỉ người lớn hư cấu từ 25 tuổi).'],
    [/\b(nude|nudity|naked|nsfw|sexy|sexual|sex|erotic|porn|porno|lingerie|topless|bottomless|seductive|sensual|fetish|undressed|strip(?:per|tease)?|breasts?|cleavage|onlyfans|explicit)\b/i, 'Không cho phép nội dung tình dục/gợi dục.'],
    [/\b(celebrity|celebrities|famous|real person|real people|look-?alike|resembl\w*|politician|president|prime minister|deepfake|actor|actress|singer|influencer|footballer)\b/i, 'Không cho phép người thật hoặc người nổi tiếng.'],
    [/\b(of|as|like|resembling|by)\s+[A-Z][a-z]+\s+[A-Z][a-z]+/, 'Prompt có vẻ nhắc tên một người thật — hãy mô tả nhân vật hư cấu.'],
  ];
  function checkImagePrompt(p) {
    p = String(p || '').trim();
    if (p.length < 3) return 'Prompt quá ngắn.';
    if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(p)) return 'Prompt ảnh phải viết bằng tiếng Anh (bấm “Viết prompt từ mô tả tiếng Việt”).';
    for (const [re, msg] of BAD) if (re.test(p)) return msg;
    const ages = [...p.matchAll(/\b(\d{1,2})\s*(?:-|\s)?(?:years?[\s-]*old|y\/?o|yrs?)\b|\baged?\s*(\d{1,2})\b/gi)].map(m => +(m[1] || m[2]));
    if (ages.some(a => a < 25)) return 'Người trong ảnh phải từ 25 tuổi trở lên.';
    return null;
  }
  async function refinePrompt(desc) { const r = await AI.chat(IMG_SYS, desc, 0.6); const p = str(r?.prompt, 400); const bad = checkImagePrompt(p); if (bad) throw new Error('Prompt AI bị chặn: ' + bad); return p; }
  async function genImage(prompt) {
    const bad = checkImagePrompt(prompt); if (bad) throw new Error(bad);
    return AI.generateImage({ prompt: prompt + '\n\n' + POLICY });
  }
  $('#aiImgRefine').onclick = () => { const q = $('#aiImgQ').value.trim(); if (!q) return toast('Nhập mô tả'); busy('#aiImgRefine', '#aiImgStatus', 'Đang viết prompt tiếng Anh…', async () => { $('#aiImgQ').value = await refinePrompt(q); $('#aiImgStatus').textContent = 'Đã viết prompt. Bấm “Tạo ảnh”.'; }); };
  $('#aiImgGo').onclick = () => busy('#aiImgGo', '#aiImgStatus', 'Đang tạo ảnh…', async () => {
    const url = await genImage($('#aiImgQ').value.trim());
    const f = document.createElement('figure'); f.innerHTML = `<img alt="" src="${url}"><figcaption>Ảnh AI — bấm để thêm</figcaption>`;
    f.onclick = () => placeAI(url); $('#aiImgResult').prepend(f); $('#aiImgStatus').textContent = 'Xong. Bấm ảnh để thêm vào thiết kế.';
    return url;
  });
  async function placeAI(url) {
    ensureTpl(); const sel = canvas.getActiveObject();
    if (sel?.xtk?.aiPrompt) { // fill AI placeholder box (cover-crop)
      const img = await new Promise(r => fabric.Image.fromURL(url, r));
      const w = sel.getScaledWidth(), h = sel.getScaledHeight(), s = Math.max(w / img.width, h / img.height);
      img.set({ left: sel.left, top: sel.top, scaleX: s, scaleY: s, cropX: (img.width - w / s) / 2, cropY: (img.height - h / s) / 2, width: w / s, height: h / s, name: 'Ảnh AI' });
      const i = canvas.getObjects().indexOf(sel); canvas.remove(sel); canvas.insertAt(img, i); canvas.setActiveObject(img); canvas.requestRenderAll(); X.snapshot(); return img;
    }
    return X.placeImage(url, 'Ảnh AI');
  }

  // ================= 4. Image tools
  const selImg = () => { const o = canvas.getActiveObject(); if (!o || o.type !== 'image') { toast('Hãy chọn một ảnh trên thiết kế'); return null; } return o; };
  const srcEl = o => o._originalElement || o.getElement();
  function setSrc(o, dataUrl, f, extra = {}) {
    const prev = { w: o.width, h: o.height, cx: o.cropX || 0, cy: o.cropY || 0, sx: o.scaleX, sy: o.scaleY, c: o.getCenterPoint() };
    return new Promise(res => o.setSrc(dataUrl, () => {
      o.set({ width: (extra.w ?? prev.w) * f, height: (extra.h ?? prev.h) * f, cropX: (extra.cx ?? prev.cx) * f, cropY: (extra.cy ?? prev.cy) * f, scaleX: prev.sx / f, scaleY: prev.sy / f });
      if (o.filters?.length) o.applyFilters();
      o.setPositionByOrigin(prev.c, 'center', 'center'); o.setCoords(); canvas.requestRenderAll(); X.snapshot(); X.checkDpi(); X.renderProps(); res(o);
    }));
  }
  // On-device upscale: progressive high-quality resampling + unsharp mask
  function upscaleCanvas(el, f) {
    const MAX = 8192; f = Math.min(f, MAX / Math.max(el.width || el.naturalWidth, el.height || el.naturalHeight));
    let cur = el, w = el.naturalWidth || el.width, h = el.naturalHeight || el.height; const tw = Math.round(w * f), th = Math.round(h * f);
    while (w < tw) { const nw = Math.min(tw, w * 2), nh = Math.min(th, h * 2), c = mkCanvas(nw, nh), g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(cur, 0, 0, nw, nh); cur = c; w = nw; h = nh; }
    const out = cur.getContext ? cur : (() => { const c = mkCanvas(tw, th); c.getContext('2d').drawImage(cur, 0, 0, tw, th); return c; })();
    const bl = mkCanvas(tw, th), bg = bl.getContext('2d'); bg.filter = `blur(${Math.max(0.6, f / 2)}px)`; bg.drawImage(out, 0, 0);
    const g = out.getContext('2d'), A = g.getImageData(0, 0, tw, th), B = bg.getImageData(0, 0, tw, th), a = A.data, b = B.data, k = 0.6;
    for (let i = 0; i < a.length; i += 4) for (let j = 0; j < 3; j++) a[i + j] = a[i + j] + k * (a[i + j] - b[i + j]);
    g.putImageData(A, 0, 0); return { canvas: out, f: tw / (el.naturalWidth || el.width) };
  }
  const tick = () => new Promise(r => setTimeout(r, 0));
  // Same algorithm as upscaleCanvas, but yields between steps/strips so the % progress bar can repaint (real progress)
  async function upscaleCanvasAsync(el, f, report = () => {}) {
    const MAX = 8192; f = Math.min(f, MAX / Math.max(el.width || el.naturalWidth, el.height || el.naturalHeight));
    let cur = el, w = el.naturalWidth || el.width, h = el.naturalHeight || el.height; const tw = Math.round(w * f), th = Math.round(h * f);
    const steps = Math.max(1, Math.ceil(Math.log2(Math.max(1, tw / w)))); let k = 0;
    while (w < tw) { const nw = Math.min(tw, w * 2), nh = Math.min(th, h * 2), c = mkCanvas(nw, nh), g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(cur, 0, 0, nw, nh); cur = c; w = nw; h = nh; report(0.3 * ++k / steps, `Đang phóng to: bước ${k}/${steps}`); await tick(); }
    const out = cur.getContext ? cur : (() => { const c = mkCanvas(tw, th); c.getContext('2d').drawImage(cur, 0, 0, tw, th); return c; })();
    const bl = mkCanvas(tw, th), bg = bl.getContext('2d'); bg.filter = `blur(${Math.max(0.6, f / 2)}px)`; bg.drawImage(out, 0, 0); report(0.35, 'Đang làm nét'); await tick();
    const g = out.getContext('2d'), S = Math.max(1, Math.floor(1.5e6 / tw)), kk = 0.6;
    for (let y = 0; y < th; y += S) {
      const hh = Math.min(S, th - y), A = g.getImageData(0, y, tw, hh), B = bg.getImageData(0, y, tw, hh), a = A.data, b = B.data;
      for (let i = 0; i < a.length; i += 4) for (let j = 0; j < 3; j++) a[i + j] = a[i + j] + kk * (a[i + j] - b[i + j]);
      g.putImageData(A, 0, y); report(0.35 + 0.55 * (y + hh) / th, 'Đang làm nét'); await tick();
    }
    bl.width = bl.height = 0; return { canvas: out, f: tw / (el.naturalWidth || el.width) };
  }
  async function upscale(o, f) {
    o = o || selImg(); if (!o) return;
    const r = await X.prog.run('Đang phóng to ảnh', async rep => { const r = await upscaleCanvasAsync(srcEl(o), f, rep); rep(0.93, 'Đang cập nhật ảnh'); await tick(); await setSrc(o, r.canvas.toDataURL('image/png'), r.f); rep(1, 'Xong'); return r; });
    if (!r) return;
    toast(`Đã phóng to ${r.f.toFixed(1)}× trên thiết bị (${r.canvas.width}×${r.canvas.height}px)`); return [r.canvas.width, r.canvas.height];
  }
  $('#itUp2').onclick = () => upscale(null, 2); $('#itUp4').onclick = () => upscale(null, 4);
  // Remove object: user marks a rectangle, then onion-peel inpainting fills it from the surroundings
  let eraseTarget = null;
  function markErase(o) {
    o = o || selImg(); if (!o) return; eraseTarget = o;
    canvas.getObjects().filter(x => x.name === '__erase').forEach(x => canvas.remove(x));
    const b = o.getBoundingRect(true, true);
    const r = new fabric.Rect({ left: b.left + b.width * 0.35, top: b.top + b.height * 0.35, width: b.width * 0.3, height: b.height * 0.3, fill: '#ef444455', stroke: '#ef4444', strokeWidth: 2, strokeUniform: true, strokeDashArray: [8, 6], name: '__erase', excludeFromExport: true });
    canvas.add(r); canvas.setActiveObject(r); canvas.requestRenderAll(); toast('Kéo/co giãn khung đỏ phủ vật thể, rồi bấm “Xóa vật thể”'); return r;
  }
  async function inpaint(c, x0, y0, x1, y1, report = () => {}) {
    const W = c.width, Hh = c.height, g = c.getContext('2d'), img = g.getImageData(0, 0, W, Hh), d = img.data;
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(W, Math.ceil(x1)); y1 = Math.min(Hh, Math.ceil(y1));
    const M = new Uint8Array(W * Hh); let todo = [];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { M[y * W + x] = 1; todo.push(y * W + x); }
    const N = [-1, 1, -W, W, -W - 1, -W + 1, W - 1, W + 1], total = todo.length || 1; let t0 = performance.now();
    while (todo.length) {
      if (performance.now() - t0 > 40) { report(0.9 * (1 - todo.length / total), 'Đang xóa vật thể'); await tick(); t0 = performance.now(); }
      const front = [], rest = [];
      for (const p of todo) { const x = p % W; let n = 0; for (const o of N) { const q = p + o, qx = q % W; if (q >= 0 && q < W * Hh && Math.abs(qx - x) <= 1 && !M[q]) n++; } (n ? front : rest).push(p); }
      if (!front.length) break;
      const vals = front.map(p => { const x = p % W; let r = 0, gg = 0, b = 0, a = 0, n = 0; for (const o of N) { const q = p + o, qx = q % W; if (q >= 0 && q < W * Hh && Math.abs(qx - x) <= 1 && !M[q]) { r += d[q * 4]; gg += d[q * 4 + 1]; b += d[q * 4 + 2]; a += d[q * 4 + 3]; n++; } } return [r / n, gg / n, b / n, a / n]; });
      front.forEach((p, i) => { d.set(vals[i].map(v => v + (Math.random() - 0.5) * 3), p * 4); M[p] = 0; });
      todo = rest;
    }
    g.putImageData(img, 0, 0);
    // soften: blurred copy of the patched region
    const pad = 3, bw = x1 - x0 + pad * 2, bh = y1 - y0 + pad * 2, t = mkCanvas(bw, bh), tg = t.getContext('2d'); tg.filter = 'blur(2px)'; tg.drawImage(c, x0 - pad, y0 - pad, bw, bh, 0, 0, bw, bh);
    g.drawImage(t, pad, pad, bw - pad * 2, bh - pad * 2, x0, y0, bw - pad * 2, bh - pad * 2);
  }
  async function eraseObject() {
    const r = canvas.getObjects().find(x => x.name === '__erase'), o = eraseTarget;
    if (!r || !o || !canvas.getObjects().includes(o)) return toast('Hãy chọn ảnh rồi bấm “Chọn vùng cần xóa” trước');
    const inv = fabric.util.invertTransform(o.calcTransformMatrix());
    const pts = r.getCoords(true, true).map(p => fabric.util.transformPoint(p, inv)).map(p => ({ x: p.x + o.width / 2 + (o.cropX || 0), y: p.y + o.height / 2 + (o.cropY || 0) }));
    const el = srcEl(o), W = el.naturalWidth || el.width, Hh = el.naturalHeight || el.height, c = mkCanvas(W, Hh); c.getContext('2d').drawImage(el, 0, 0);
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const ok = await X.prog.run('Đang xóa vật thể', async rep => {
      await inpaint(c, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), rep);
      rep(0.93, 'Đang cập nhật ảnh'); await tick();
      canvas.remove(r); eraseTarget = null; await setSrc(o, c.toDataURL('image/png'), 1); rep(1, 'Xong'); return true;
    });
    if (!ok) return; canvas.setActiveObject(o); toast('Đã xóa vật thể (trên thiết bị)'); return true;
  }
  $('#itEraseArea').onclick = () => markErase(); $('#itEraseGo').onclick = () => eraseObject();
  // Expand / outpaint
  function expandLocal(el, p) {
    const w = el.naturalWidth || el.width, h = el.naturalHeight || el.height, dx = Math.round(w * p), dy = Math.round(h * p), W = w + dx * 2, Hh = h + dy * 2;
    const m = mkCanvas(W, Hh), g = m.getContext('2d');
    for (const i of [-1, 0, 1]) for (const j of [-1, 0, 1]) { g.save(); g.translate(dx + i * w + (i ? w : 0), dy + j * h + (j ? h : 0)); g.scale(i ? -1 : 1, j ? -1 : 1); g.drawImage(el, 0, 0, w, h); g.restore(); }
    const out = mkCanvas(W, Hh), og = out.getContext('2d'); og.filter = `blur(${Math.round(Math.max(w, h) * 0.02)}px)`; og.drawImage(m, 0, 0); og.filter = 'none';
    og.drawImage(m, dx, dy, w, h, dx, dy, w, h); return { canvas: out, dx, dy, w, h };
  }
  async function expand(o, p, useAI) {
    o = o || selImg(); if (!o) return;
    return X.prog.run('Đang mở rộng ảnh', rep => expandRun(o, p, useAI, rep));
  }
  async function expandRun(o, p, useAI, rep) {
    const el = srcEl(o);
    let result = null, how = 'trên thiết bị';
    if (useAI) {
      try {
        const w = el.naturalWidth || el.width, h = el.naturalHeight || el.height;
        const s = Math.min(1, 1024 / (Math.max(w, h) * (1 + 2 * p))), W = Math.round(w * (1 + 2 * p) * s), Hh = Math.round(h * (1 + 2 * p) * s);
        const c = mkCanvas(W, Hh); c.getContext('2d').drawImage(el, Math.round(w * p * s), Math.round(h * p * s), Math.round(w * s), Math.round(h * s));
        const extra = ($('#itExpPrompt').value || '').trim(); const bad = extra && checkImagePrompt(extra); if (bad) throw new Error(bad);
        const prompt = 'Extend the scene naturally into the transparent border, matching style and lighting. ' + extra + ' ' + POLICY;
        const stop = X.prog.fake('Đang chờ AI mở rộng ảnh'); let url;
        try { url = await AI.generateImage({ prompt, imageDataUrl: c.toDataURL('image/png') }); } finally { stop(); }
        if (!url) throw new Error('phản hồi không hợp lệ');
        const im = await loadImg(url), out = mkCanvas(im.width, im.height); out.getContext('2d').drawImage(im, 0, 0);
        const k = im.width / (w * (1 + 2 * p)); result = { canvas: out, dx: w * p * k, dy: h * p * k, w: w * k, h: h * k }; how = 'bằng AI';
      } catch (e) { toast('Mở rộng bằng AI không khả dụng (' + e.message + ') — dùng cách trên thiết bị'); }
    }
    if (!result) { rep(0.3, 'Đang mở rộng trên thiết bị'); await tick(); result = expandLocal(el, p); }
    rep(0.9, 'Đang cập nhật ảnh'); await tick();
    const k = result.w / (el.naturalWidth || el.width); // pixels per source pixel
    const cx = (o.cropX || 0) * k + result.dx - o.width * k * p, cy = (o.cropY || 0) * k + result.dy - o.height * k * p;
    await setSrc(o, result.canvas.toDataURL('image/png'), k, { w: o.width * (1 + 2 * p), h: o.height * (1 + 2 * p), cx: Math.max(0, cx / k), cy: Math.max(0, cy / k) });
    toast('Đã mở rộng ảnh ' + how); return how;
  }
  $('#itExpLocal').onclick = () => expand(null, +$('#itExpPct').value, false);
  $('#itExpAI').onclick = () => expand(null, +$('#itExpPct').value, true);

  // ================= 5. Community templates
  const COM_K = 'xtk.community.url', COM_DEF = 'community/index.json';
  $('#comUrl').value = localStorage.getItem(COM_K) || COM_DEF;
  const ALLOWED = new Set(['textbox', 'i-text', 'text', 'rect', 'circle', 'ellipse', 'triangle', 'line', 'polygon', 'polyline', 'path', 'group', 'image']);
  function sanitizeFabric(objs, depth = 0) {
    return arr(objs, 300).filter(o => o && typeof o === 'object' && ALLOWED.has(o.type) && depth < 4).map(o => {
      const c = {}; for (const [k, v] of Object.entries(o)) if (!/^(on|__proto__|constructor|prototype)/i.test(k)) c[k] = v;
      if (c.type === 'image' && !(typeof c.src === 'string' && (/^data:image\/(png|jpe?g|webp|gif);base64,/.test(c.src) || /^https:\/\//.test(c.src)))) return null;
      if (/text/.test(c.type)) { c.text = String(c.text ?? '').slice(0, 2000); if (!c.styles || typeof c.styles !== 'object') c.styles = {}; if (c.fontFamily && !X.FONTS.includes(c.fontFamily)) c.fontFamily = 'Be Vietnam Pro'; }
      if (c.objects) c.objects = sanitizeFabric(c.objects, depth + 1);
      if (c.clipPath && !ALLOWED.has(c.clipPath.type)) delete c.clipPath;
      return c;
    }).filter(Boolean);
  }
  let comItems = [], comBase = '';
  async function loadCommunity(url) {
    url = (url || $('#comUrl').value.trim() || COM_DEF); localStorage.setItem(COM_K, url);
    $('#comStatus').textContent = 'Đang tải…'; $('#comGrid').innerHTML = '';
    try {
      comBase = new URL(url, location.href).href;
      if (!/^https?:/.test(comBase)) throw new Error('URL không hợp lệ');
      const r = await fetch(comBase, { credentials: 'omit', cache: 'no-cache' }); if (!r.ok) throw new Error('HTTP ' + r.status);
      const idx = await r.json();
      comItems = arr(idx.templates, 200).filter(t => t && typeof t.file === 'string' && TEMPLATES.some(T => T.id === t.size)).map(t => ({ name: str(t.name, 80) || 'Mẫu', author: str(t.author, 60) || 'Ẩn danh', cat: str(t.cat, 40), size: t.size, file: t.file, thumb: typeof t.thumb === 'string' ? t.thumb : '', license: str(t.license, 30) || 'CC0' }));
      for (const t of comItems) {
        const b = document.createElement('button'); b.className = 'com-card'; const T = TEMPLATES.find(x => x.id === t.size);
        b.innerHTML = `${t.thumb ? `<img alt="" src="${esc(new URL(t.thumb, comBase).href)}">` : ''}<b>${esc(t.name)}</b><br><small>${esc(t.cat)} · ${esc(T.name)} · bởi ${esc(t.author)} (${esc(t.license)})</small>`;
        b.onclick = () => openCommunity(t); $('#comGrid').appendChild(b);
      }
      $('#comStatus').textContent = `${comItems.length} mẫu từ ${esc(new URL(comBase).host)}${idx.name ? ' — ' + str(idx.name, 60) : ''}`;
      return comItems.length;
    } catch (e) { $('#comStatus').textContent = 'Không tải được chỉ mục: ' + e.message; return 0; }
  }
  async function openCommunity(t) {
    try {
      const r = await fetch(new URL(t.file, comBase).href, { credentials: 'omit' }); if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json(), j = d.json || d;
      const json = { version: fabric.version, objects: sanitizeFabric(j.objects), background: typeof j.background === 'string' && (HEX.test(j.background) || /^rgba?\(/.test(j.background)) ? j.background : '#ffffff' };
      await openAndWait(TEMPLATES.find(x => x.id === t.size), json); $('#designName').value = t.name; X.show('designer');
      toast(`Đã mở mẫu cộng đồng “${t.name}” của ${t.author}`); return canvas.getObjects().length;
    } catch (e) { toast('Không mở được mẫu: ' + e.message); return 0; }
  }
  $('#comLoad').onclick = () => loadCommunity(); $('#comReset').onclick = () => { $('#comUrl').value = COM_DEF; loadCommunity(COM_DEF); };
  $('.rail [data-tab=community]').addEventListener('click', () => { if (!comItems.length) loadCommunity(); });

  // ================= 6. Animation (enter effects) + WebM / GIF export
  const ease = { out: t => 1 - Math.pow(1 - t, 3), back: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); } };
  const animOf = o => o?.xtk?.anim;
  function setAnim(o, type, delay, dur) {
    if (!o) return; const x = { ...(o.xtk || {}) };
    if (type === 'none') delete x.anim; else x.anim = { type, delay: clamp(delay, 0, 10, 0), dur: clamp(dur, 0.1, 5, 0.6) };
    o.xtk = x; X.snapshot(); animInfo();
  }
  function animInfo() {
    const o = canvas.getActiveObject(), a = animOf(o);
    $$('#animEffects button').forEach(b => b.classList.toggle('on', !!o && (a ? a.type : 'none') === b.dataset.anim));
    if (a) { $('#animDelay').value = a.delay; $('#animDur').value = a.dur; }
    const n = canvas.getObjects().filter(animOf).length;
    $('#animInfo').textContent = (o ? `Đang chọn: ${o.name || o.type}${a ? ' — ' + a.type : ''}. ` : '') + `${n} đối tượng có hiệu ứng, tổng ${totalDur(canvas.getObjects()).toFixed(1)}s.`;
  }
  canvas.on('selection:created', animInfo); canvas.on('selection:updated', animInfo); canvas.on('selection:cleared', animInfo);
  $$('#animEffects button').forEach(b => b.onclick = () => { const o = canvas.getActiveObject(); if (!o) return toast('Hãy chọn một đối tượng'); (o.type === 'activeSelection' ? o.getObjects() : [o]).forEach(x => setAnim(x, b.dataset.anim, +$('#animDelay').value, +$('#animDur').value)); });
  ['#animDelay', '#animDur'].forEach(s => $(s).onchange = () => { const o = canvas.getActiveObject(), a = animOf(o); if (a) setAnim(o, a.type, +$('#animDelay').value, +$('#animDur').value); });
  function autoAnim() {
    const os = canvas.getObjects().filter(o => o.selectable !== false && o.name !== '__erase'); let d = 0;
    os.forEach(o => { const type = /text/.test(o.type) ? (o.fontSize > U() * 0.07 ? 'pop' : 'slide-up') : o.type === 'image' ? 'zoom' : (o.width * o.scaleX < st.tpl.w * 0.3 ? 'pop' : 'fade'); o.xtk = { ...(o.xtk || {}), anim: { type, delay: +d.toFixed(2), dur: 0.6 } }; d += 0.25; });
    X.snapshot(); animInfo(); return os.length;
  }
  $('#animAuto').onclick = () => { autoAnim(); toast('Đã gán hiệu ứng cho mọi đối tượng'); };
  const totalDur = objs => Math.max(2, ...objs.map(o => animOf(o) ? animOf(o).delay + animOf(o).dur : 0)) + 1;
  // Apply animation state at time t (seconds) to objects using their recorded base state
  function prepare(objs, W, Hh) { return objs.map(o => ({ o, a: animOf(o), b: { opacity: o.opacity, scaleX: o.scaleX, scaleY: o.scaleY, c: o.getCenterPoint() } })); }
  function frameAt(items, t, W) {
    for (const { o, a, b } of items) {
      if (!a) continue;
      const p = clamp((t - a.delay) / a.dur, 0, 1, 1), e = ease.out(p); let op = 1, s = 1, dx = 0, dy = 0;
      if (a.type === 'fade') op = e;
      else if (a.type === 'slide-left') { op = e; dx = (1 - e) * W * 0.2; }
      else if (a.type === 'slide-up') { op = e; dy = (1 - e) * W * 0.12; }
      else if (a.type === 'zoom') { op = e; s = 0.6 + 0.4 * e; }
      else if (a.type === 'pop') { op = Math.min(1, p * 3); s = Math.max(0.001, ease.back(p)); }
      o.set({ opacity: b.opacity * op, scaleX: b.scaleX * s, scaleY: b.scaleY * s });
      o.setPositionByOrigin(new fabric.Point(b.c.x + dx, b.c.y + dy), 'center', 'center');
    }
  }
  function restoreItems(items) { for (const { o, b } of items) { o.set({ opacity: b.opacity, scaleX: b.scaleX, scaleY: b.scaleY }); o.setPositionByOrigin(b.c, 'center', 'center'); o.setCoords(); } }
  let previewing = false;
  async function preview() {
    if (previewing) return; previewing = true; canvas.discardActiveObject();
    const items = prepare(canvas.getObjects()), T = totalDur(canvas.getObjects()), t0 = performance.now();
    X.setRestoring(true);
    await new Promise(r => { const step = () => { const t = (performance.now() - t0) / 1000; frameAt(items, Math.min(t, T), st.tpl.w); canvas.renderAll(); t < T ? requestAnimationFrame(step) : r(); }; requestAnimationFrame(step); });
    restoreItems(items); canvas.renderAll(); X.setRestoring(false); previewing = false;
  }
  $('#animPreview').onclick = preview;
  async function renderer(maxSide) {
    const T = st.tpl, s = Math.min(1, maxSide / Math.max(T.w, T.h)), W = Math.round(T.w * s) & ~1, Hh = Math.round(T.h * s) & ~1;
    const sc = new fabric.StaticCanvas(null, { width: W, height: Hh, enableRetinaScaling: false, renderOnAddRemove: false });
    sc.setZoom(s); X.savePage?.();
    const json = canvas.toJSON(PROPS); json.objects = json.objects.filter(o => o.name !== '__erase');
    await new Promise(r => sc.loadFromJSON(json, r));
    const items = prepare(sc.getObjects()), dur = totalDur(sc.getObjects());
    return { sc, el: sc.getElement(), W, Hh, dur, at: t => { frameAt(items, t, T.w); sc.renderAll(); } };
  }
  async function exportWebM(maxSide = +$('#animSize').value) {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) throw new Error('Trình duyệt không hỗ trợ MediaRecorder');
    const R = await renderer(maxSide); R.at(0);
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
    const stream = R.el.captureStream(30), rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4e6 }), chunks = [];
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    const done = new Promise(r => rec.onstop = r); rec.start(200);
    const t0 = performance.now();
    await new Promise(r => { const step = () => { const t = (performance.now() - t0) / 1000; R.at(Math.min(t, R.dur)); $('#progress').hidden = false; $('#progress div').style.width = Math.min(100, t / R.dur * 100) + '%'; $('#progress span').textContent = 'Đang ghi WebM…'; t < R.dur ? requestAnimationFrame(step) : r(); }; requestAnimationFrame(step); });
    rec.stop(); await done; stream.getTracks().forEach(t => t.stop()); $('#progress').hidden = true; R.sc.dispose();
    const blob = new Blob(chunks, { type: 'video/webm' }); download(blob, `${fname()}_${R.W}x${R.Hh}.webm`); toast(`Đã xuất WebM ${R.W}×${R.Hh}, ${R.dur.toFixed(1)}s`); return blob.size;
  }
  async function exportGIF(maxSide = Math.min(640, +$('#animSize').value), fps = 12) {
    const { GIFEncoder, quantize, applyPalette } = window.gifenc;
    const R = await renderer(maxSide), g = R.el.getContext('2d', { willReadFrequently: true }), gif = GIFEncoder(), n = Math.ceil(R.dur * fps);
    for (let i = 0; i <= n; i++) {
      R.at(i / fps); const d = g.getImageData(0, 0, R.W, R.Hh).data, pal = quantize(d, 256), idx = applyPalette(d, pal);
      gif.writeFrame(idx, R.W, R.Hh, { palette: pal, delay: i === n ? 1500 : Math.round(1000 / fps) });
      if (i % 4 === 0) { $('#progress').hidden = false; $('#progress div').style.width = (i / n * 100) + '%'; $('#progress span').textContent = `Đang mã hóa GIF ${i}/${n}`; await new Promise(r => setTimeout(r, 0)); }
    }
    gif.finish(); $('#progress').hidden = true; R.sc.dispose();
    const blob = new Blob([gif.bytes()], { type: 'image/gif' }); download(blob, `${fname()}_${R.W}x${R.Hh}.gif`); toast(`Đã xuất GIF ${R.W}×${R.Hh}, ${n + 1} khung`); return blob.size;
  }
  $('#animWebm').onclick = () => exportWebM().catch(e => toast('Xuất WebM thất bại: ' + e.message));
  $('#animGif').onclick = () => exportGIF().catch(e => toast('Xuất GIF thất bại: ' + e.message));

  Object.assign(window.XTK, { upscaleCanvas, upscaleCanvasAsync, inpaint, stockSearch, addStock, sanitizeCopy, aiCopy, sanitizeDesign, designJSON, applyDesign, aiDesign, checkImagePrompt, genImage, refinePrompt, placeAI, upscale, markErase, eraseObject, expand, sanitizeFabric, loadCommunity, openCommunity, setAnim, autoAnim, preview, exportWebM, exportGIF });
})();
