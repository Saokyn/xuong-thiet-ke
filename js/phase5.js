// Phase 5: biểu mẫu QR (vCard/Zalo/Wi-Fi/Maps), hiệu ứng nhũ giả, chế độ in (tràn lề, dấu cắt, bo góc), xem trước nền chuyển sắc.
(() => {
  const X = window.XTK, canvas = X.canvas, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // ================= 1. Biểu mẫu QR
  const FORMS = {
    url: [],
    vcard: [['fn', 'Họ và tên', 'Trần Thu Hà'], ['org', 'Công ty', ''], ['title', 'Chức danh', ''], ['tel', 'Điện thoại', '0901234567'], ['email', 'Email', ''], ['url', 'Website', ''], ['adr', 'Địa chỉ', '']],
    zalo: [['phone', 'Số điện thoại Zalo', '0901234567']],
    wifi: [['ssid', 'Tên Wi-Fi (SSID)', ''], ['pass', 'Mật khẩu', ''], ['sec', 'Bảo mật (WPA/WEP/nopass)', 'WPA'], ['hidden', 'Mạng ẩn? (có/không)', 'không']],
    maps: [['q', 'Địa chỉ hoặc tọa độ', '123 Lê Lợi, Huế']]
  };
  const wesc = s => String(s).replace(/([\\;,:"])/g, '\\$1');
  const vesc = s => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([;,])/g, '\\$1');
  function qrPayload(type, v) {
    if (type === 'vcard') {
      const parts = (v.fn || '').trim().split(/\s+/), last = parts.length > 1 ? parts[0] : '', first = parts.length > 1 ? parts.slice(1).join(' ') : parts[0] || '';
      return ['BEGIN:VCARD', 'VERSION:3.0', `N:${vesc(last)};${vesc(first)};;;`, `FN:${vesc(v.fn || '')}`, v.org && `ORG:${vesc(v.org)}`, v.title && `TITLE:${vesc(v.title)}`, v.tel && `TEL;TYPE=CELL:${v.tel.replace(/[^\d+]/g, '')}`, v.email && `EMAIL:${v.email}`, v.url && `URL:${v.url}`, v.adr && `ADR:;;${vesc(v.adr)};;;;`, 'END:VCARD'].filter(Boolean).join('\n');
    }
    if (type === 'zalo') return 'https://zalo.me/' + String(v.phone || '').replace(/[^\d]/g, '');
    if (type === 'wifi') { const sec = /^(wep|nopass)$/i.test(v.sec) ? v.sec.toUpperCase().replace('NOPASS', 'nopass') : 'WPA'; return `WIFI:T:${sec};S:${wesc(v.ssid || '')};${sec === 'nopass' ? '' : 'P:' + wesc(v.pass || '') + ';'}H:${/^(có|co|yes|true|1)$/i.test(v.hidden) ? 'true' : 'false'};;`; }
    if (type === 'maps') return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(v.q || '');
    return v.text || '';
  }
  function renderQRForm() {
    const ty = $('#qrType').value, f = FORMS[ty];
    $('#qrForm').innerHTML = f.map(([k, l, d]) => `<label class="small">${esc(l)}<input data-q="${k}" value="${esc(d)}" ${k === 'pass' ? 'type="password" autocomplete="off"' : ''}></label>`).join('');
    $('#qrText').hidden = ty !== 'url';
  }
  const qrValues = () => Object.fromEntries($$('#qrForm [data-q]').map(i => [i.dataset.q, i.value.trim()]));
  $('#qrType').onchange = renderQRForm; renderQRForm();
  $('#qrAdd').onclick = () => {
    const ty = $('#qrType').value, text = ty === 'url' ? $('#qrText').value.trim() : qrPayload(ty, qrValues());
    if (!text || (ty === 'wifi' && !qrValues().ssid)) return X.toast(ty === 'wifi' ? 'Nhập tên Wi-Fi' : 'Nhập nội dung cho mã QR');
    const q = X.makeQR(text, X.U() * 0.35, $('#qrColor').value); q.xtk.qrType = ty; X.center(q);
    X.toast({ url: 'Đã thêm mã QR', vcard: 'Đã thêm QR danh bạ (vCard)', zalo: 'Đã thêm QR Zalo', wifi: 'Đã thêm QR Wi-Fi', maps: 'Đã thêm QR Google Maps' }[ty]);
  };

  // ================= 2. Nhũ giả
  const { FOIL, foilGrad } = window.XTK_FOIL;
  const foilTargets = o => o.type === 'group' && !o.xtk?.qr ? o.getObjects() : [o];
  function applyFoil(kind, o = canvas.getActiveObject()) {
    if (!o) return X.toast('Hãy chọn chữ hoặc hình để phủ nhũ'), false;
    const list = o.type === 'activeSelection' ? o.getObjects() : [o];
    list.forEach(obj => foilTargets(obj).forEach(t => {
      if (t.type === 'image' || t.xtk?.qr) return;
      if (kind === 'off') {
        if (!t.xtk?.foil) return; const c = FOIL[t.xtk.foil].stops[1];
        if (t.fill && typeof t.fill === 'object') t.set('fill', c); if (t.stroke && typeof t.stroke === 'object') t.set('stroke', c);
        delete t.xtk.foil; t.set('shadow', null); return;
      }
      const useStroke = (!t.fill || t.fill === 'rgba(0,0,0,0)' || t.fill === 'transparent') && t.stroke;
      t.set(useStroke ? 'stroke' : 'fill', new fabric.Gradient(foilGrad(kind)));
      t.xtk = Object.assign(t.xtk || {}, { foil: kind });
      t.set('shadow', new fabric.Shadow({ color: 'rgba(0,0,0,0.22)', blur: X.U() * 0.004, offsetX: X.U() * 0.001, offsetY: X.U() * 0.0015 }));
      t.dirty = true;
    }));
    if (o.type === 'group') o.dirty = true;
    canvas.requestRenderAll(); X.snapshot(); X.renderProps();
    X.toast(kind === 'off' ? 'Đã bỏ hiệu ứng nhũ' : 'Đã phủ ' + FOIL[kind].name.toLowerCase(), 1200); return true;
  }
  $$('#foilBtns button').forEach(b => b.onclick = () => applyFoil(b.dataset.foil));

  // ================= 3. Chế độ in
  const pm = { get on() { return $('#pmGuides').checked; } };
  const pxPerMm = () => (X.state.tpl?.print ? 300 : 96) / 25.4;
  function drawGuides(opt) {
    const t = X.state.tpl; if (!pm.on || !t || opt.ctx !== canvas.contextContainer) return;
    const ctx = opt.ctx, vt = canvas.viewportTransform, z = vt[0], mm = pxPerMm(), b = +$('#pmBleed').value * mm, safe = 3 * mm, rad = +$('#pmRadius').value * mm;
    const S = (x, y) => [x * z + vt[4], y * z + vt[5]];
    ctx.save();
    // bleed zone (ngoài khổ)
    const [bx, by] = S(-b, -b), bw = (t.w + 2 * b) * z, bh = (t.h + 2 * b) * z;
    ctx.fillStyle = 'rgba(236,0,140,0.12)'; ctx.beginPath(); ctx.rect(bx, by, bw, bh); const [tx, ty] = S(0, 0); ctx.rect(tx + t.w * z, ty, -t.w * z, t.h * z); ctx.fill('evenodd');
    ctx.strokeStyle = '#ec008c'; ctx.setLineDash([6, 4]); ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh);
    // đường cắt (có bo góc)
    ctx.setLineDash([]); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.2; ctx.beginPath();
    if (ctx.roundRect && rad) ctx.roundRect(tx, ty, t.w * z, t.h * z, rad * z); else ctx.rect(tx, ty, t.w * z, t.h * z); ctx.stroke();
    // vùng an toàn
    ctx.strokeStyle = '#06b6d4'; ctx.setLineDash([3, 3]); ctx.strokeRect(tx + safe * z, ty + safe * z, (t.w - 2 * safe) * z, (t.h - 2 * safe) * z);
    // dấu cắt
    if ($('#pmCrop').checked) {
      ctx.setLineDash([]); ctx.strokeStyle = '#111'; ctx.lineWidth = 1; const L = Math.max(10, b * z), g = Math.max(3, b * z * 0.25), x1 = tx, x2 = tx + t.w * z, y1 = ty, y2 = ty + t.h * z; ctx.beginPath();
      [[x1, y1, -1, -1], [x2, y1, 1, -1], [x1, y2, -1, 1], [x2, y2, 1, 1]].forEach(([x, y, sx, sy]) => { ctx.moveTo(x, y + sy * g); ctx.lineTo(x, y + sy * (g + L)); ctx.moveTo(x + sx * g, y); ctx.lineTo(x + sx * (g + L), y); });
      ctx.stroke();
    }
    ctx.font = '11px "Be Vietnam Pro", sans-serif'; ctx.fillStyle = '#ec008c'; ctx.fillText(`Tràn lề ${$('#pmBleed').value} mm`, bx + 4, by - 4 > 10 ? by - 4 : by + 12);
    ctx.restore();
  }
  canvas.on('after:render', drawGuides);
  const pmSync = () => {
    const t = X.state.tpl; $('#pmInfo').textContent = t?.print ? `Khổ ${(t.w / pxPerMm()).toFixed(0)}×${(t.h / pxPerMm()).toFixed(0)} mm · thành phẩm khi in: ${(t.w / pxPerMm() + 2 * $('#pmBleed').value).toFixed(0)}×${(t.h / pxPerMm() + 2 * $('#pmBleed').value).toFixed(0)} mm (kể cả tràn lề)` : 'Khổ này là khổ màn hình; chế độ in dành cho khổ in (300 dpi).';
    if (pm.on && $('#bleed')) $('#bleed').checked = true;
    canvas.requestRenderAll();
  };
  ['#pmGuides', '#pmBleed', '#pmRadius', '#pmCrop'].forEach(s => $(s).addEventListener('change', pmSync));

  // ================= 4. Xem trước nền chuyển sắc
  const gLive = () => { X.previewBegin(); X.setBg({ grad: X.gradObj($('#g1').value, $('#g2').value, $('#gType').value) }); };
  ['#g1', '#g2'].forEach(s => $(s).addEventListener('input', gLive));
  $('#gType').addEventListener('change', () => { if (X.colorPreview.on) gLive(); });
  $('#gApply').onclick = () => { X.setBg({ grad: X.gradObj($('#g1').value, $('#g2').value, $('#gType').value) }); if (!X.previewCommit()) X.toast('Đã đặt nền chuyển sắc', 1200); };

  Object.assign(window.XTK, { qrPayload, applyFoil, printGuides: pm, pmSync });
})();
