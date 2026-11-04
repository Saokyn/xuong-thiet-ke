// Bộ mẫu in ấn (ưu tiên 1): bộ thiệp cưới theo chủ đề, danh thiếp QR, menu QR nhà hàng.
// Tất cả là thiết kế gốc của dự án (vẽ bằng mã), không sao chép từ dịch vụ nào.
(() => {
  // ---- Phủ nhũ giả (faux foil): dải gradient kim loại nhiều điểm dừng
  const FOIL = {
    gold: { name: 'Nhũ vàng', stops: ['#7a5a12', '#c9a227', '#fff2b0', '#b8892d', '#f7e08a', '#8a6a1f'] },
    silver: { name: 'Nhũ bạc', stops: ['#6b7280', '#c7ccd4', '#ffffff', '#9aa1ab', '#e5e7eb', '#5f6670'] },
    rose: { name: 'Nhũ vàng hồng', stops: ['#8c4a3f', '#d99a8a', '#ffe1d6', '#b8706a', '#f2c2b3', '#7d3f37'] }
  };
  const foilGrad = (kind = 'gold', ang = 35) => {
    const f = FOIL[kind] || FOIL.gold, a = ang * Math.PI / 180, dx = Math.cos(a) / 2, dy = Math.sin(a) / 2, n = f.stops.length - 1;
    return { type: 'linear', gradientUnits: 'percentage', coords: { x1: 0.5 - dx, y1: 0.5 - dy, x2: 0.5 + dx, y2: 0.5 + dy }, colorStops: f.stops.map((c, i) => ({ offset: i / n, color: c })) };
  };
  window.XTK_FOIL = { FOIL, foilGrad };

  // ---- Mã QR dạng JSON (dùng qrcode-generator MIT, đã có trong vendor/)
  function qrJSON(text, cx, cy, size, fg = '#111827', bgc = '#ffffff') {
    const q = qrcode(0, 'M'); q.addData(unescape(encodeURIComponent(text))); q.make();
    const n = q.getModuleCount(), m = size / (n + 8); let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return { type: 'group', left: cx, top: cy, width: size, height: size, originX: 'center', originY: 'center', name: 'Mã QR', xtk: { qr: text }, objects: [
      { type: 'rect', left: -size / 2, top: -size / 2, width: size, height: size, fill: bgc },
      { type: 'path', path: d, fill: fg, scaleX: m, scaleY: m, left: -size / 2 + 4 * m, top: -size / 2 + 4 * m, objectCaching: false }] };
  }
  window.XTK_QRJSON = qrJSON;

  const L = window.LIBRARY, KIT = window.LIBRARY_KIT;
  const add = (cat, size, name, tags, build) => L.push({ id: 'lib-p' + (L.length + 1), cat, size, name, tags, build });
  const NONE = 'rgba(0,0,0,0)';
  const LOTUS = 'M50 8 C61 28 61 50 50 70 C39 50 39 28 50 8 Z M50 70 C31 61 19 46 15 29 C31 34 44 49 50 70 Z M50 70 C69 61 81 46 85 29 C69 34 56 49 50 70 Z M50 70 C34 69 15 63 4 50 C21 47 40 57 50 70 Z M50 70 C66 69 85 63 96 50 C79 47 60 57 50 70 Z M18 78 L82 78 C72 86 28 86 18 78 Z';
  const SPRIG = 'M50 98 C50 70 50 40 50 4 L52 4 C52 40 52 70 52 98 Z M50 80 C34 76 24 66 22 54 C36 56 46 66 50 80 Z M52 66 C68 62 78 52 80 40 C66 42 56 52 52 66 Z M50 50 C36 46 28 36 27 26 C39 28 47 37 50 50 Z M52 36 C64 32 71 24 72 14 C62 16 55 24 52 36 Z';
  const fx = (o, kind) => Object.assign(o, { fill: foilGrad(kind), xtk: Object.assign(o.xtk || {}, { foil: kind }), shadow: { color: 'rgba(0,0,0,0.18)', blur: 2, offsetX: 0.6, offsetY: 0.8 } });

  // ---- 3 chủ đề cưới
  const THEMES = [
    { key: 'sen', cat: 'Thiệp cưới · Sen Đỏ', tags: 'truyền thống đỏ sen song hỷ vu quy', bg: k => k.g('#7f1d1d', '#b91c1c', 120), ink: '#fde68a', soft: '#fecaca', foil: 'gold',
      script: 'Dancing Script', serif: 'Playfair Display', orn: (k, cx, cy, s) => [fx(k.p(LOTUS, cx, cy, s, '#fff'), 'gold')] },
    { key: 'la', cat: 'Thiệp cưới · Lá Xanh', tags: 'thiên nhiên lá xanh rustic vườn', bg: () => '#f5f2e9', ink: '#2f4a35', soft: '#6b8f71', foil: 'gold',
      script: 'Charm', serif: 'Lora', orn: (k, cx, cy, s) => [k.p(SPRIG, cx - s * 0.18 * k.U / k.W, cy, s, '#7a9a6b', { ang: -28 }), k.p(SPRIG, cx + s * 0.18 * k.U / k.W, cy, s, '#4f7a58', { ang: 28 })] },
    { key: 'kim', cat: 'Thiệp cưới · Tối Giản Ánh Kim', tags: 'tối giản minimal hiện đại nhũ bạc vàng hồng', bg: () => '#fffdf9', ink: '#3a3530', soft: '#8b8178', foil: 'rose',
      script: 'Dancing Script', serif: 'Montserrat', orn: (k, cx, cy, s) => [fx(k.p('diamond', cx, cy, s * 0.35, '#fff'), 'rose'), fx(k.r(cx - s * 0.9 * k.U / k.W, cy, s * 0.6 * k.U / k.W, 0.0012 * k.U / k.H * 2, '#fff'), 'rose'), fx(k.r(cx + s * 0.3 * k.U / k.W, cy, s * 0.6 * k.U / k.W, 0.0012 * k.U / k.H * 2, '#fff'), 'rose')] }
  ];
  const frame = (k, T, inset = 0.045) => {
    const ix = inset * k.U / k.W, iy = inset * k.U / k.H, o = [fx(k.r(ix, iy, 1 - 2 * ix, 1 - 2 * iy, NONE, { st: '#fff', sw: 0.006, n: 'Khung nhũ' }), T.foil)];
    o[0].stroke = foilGrad(T.foil); o[0].fill = NONE;
    o.push(k.r(ix * 1.45, iy * 1.45, 1 - 2.9 * ix, 1 - 2.9 * iy, NONE, { st: T.soft, sw: 0.0018, n: 'Khung trong' }));
    return o;
  };
  const NAMES = 'Minh Anh & Hoàng Long', DATE = 'Thứ Bảy · 12.12.2026', VENUE = 'Trung tâm tiệc cưới Hoa Sen\n123 Đường Lê Lợi, TP. Huế';
  const DISHES = ['Súp cua gà xé', 'Gỏi ngó sen tôm thịt', 'Tôm sú hấp nước dừa', 'Gà ta hấp lá chanh', 'Bò lúc lắc khoai tây', 'Lẩu hải sản thập cẩm', 'Chè hạt sen long nhãn'];
  THEMES.forEach(T => {
    const B = T.cat, tg = 'cưới wedding bộ thiệp ' + T.tags;
    add(B, 'w-1217', 'Thiệp mời ' + T.cat.split('· ')[1], tg + ' thiệp mời', k => ({ bg: T.bg(k), o: [...frame(k, T), ...T.orn(k, 0.5, 0.15, 0.2),
      k.t('TRÂN TRỌNG KÍNH MỜI', 0.5, 0.25, 0.04, { f: T.serif, c: T.soft, cs: 300 }),
      fx(k.t('Minh Anh\n&\nHoàng Long', 0.5, 0.31, 0.13, { f: T.script, b: 1, lh: 1, n: 'Tên cô dâu chú rể' }), T.foil),
      k.t('LỄ THÀNH HÔN', 0.5, 0.64, 0.055, { f: T.serif, b: 1, c: T.ink, cs: 300 }),
      k.t('18:00 · ' + DATE, 0.5, 0.7, 0.045, { f: T.serif, c: T.ink }),
      k.t(VENUE, 0.5, 0.78, 0.036, { f: 'Be Vietnam Pro', c: T.ink, w: 0.72 }),
      ...T.orn(k, 0.5, 0.9, 0.09)] }));
    add(B, 'w-1116', 'Ruột thiệp ' + T.cat.split('· ')[1], tg + ' ruột thiệp nhà trai nhà gái', k => ({ bg: T.key === 'sen' ? '#fff8ef' : T.bg(k), o: [...frame(k, T, 0.035), ...T.orn(k, 0.5, 0.09, 0.12),
      k.t('NHÀ TRAI', 0.27, 0.16, 0.04, { f: T.serif, b: 1, c: T.key === 'sen' ? '#991b1b' : T.ink, w: 0.4, cs: 200 }), k.t('Ông Nguyễn Văn An\nBà Trần Thị Bình\nPhường Vĩnh Ninh, TP. Huế', 0.27, 0.205, 0.03, { c: '#44403c', w: 0.42 }),
      k.t('NHÀ GÁI', 0.73, 0.16, 0.04, { f: T.serif, b: 1, c: T.key === 'sen' ? '#991b1b' : T.ink, w: 0.4, cs: 200 }), k.t('Ông Lê Văn Cường\nBà Phạm Thị Dung\nPhường Phú Hội, TP. Huế', 0.73, 0.205, 0.03, { c: '#44403c', w: 0.42 }),
      k.t('Trân trọng báo tin lễ thành hôn của con chúng tôi', 0.5, 0.36, 0.034, { f: T.serif, c: '#44403c', w: 0.8 }),
      fx(k.t('Hoàng Long', 0.5, 0.42, 0.1, { f: T.script, b: 1 }), T.foil), k.t('&', 0.5, 0.51, 0.06, { f: T.script, c: '#78716c' }), fx(k.t('Minh Anh', 0.5, 0.56, 0.1, { f: T.script, b: 1 }), T.foil),
      k.t('Hôn lễ được cử hành tại tư gia\nvào lúc 09:00 · ' + DATE, 0.5, 0.7, 0.034, { f: T.serif, c: '#44403c' }),
      k.t('Sự hiện diện của quý khách là niềm vinh hạnh cho gia đình chúng tôi', 0.5, 0.82, 0.03, { c: '#57534e', w: 0.74 })] }));
    add(B, 'w-env', 'Phong bì ' + T.cat.split('· ')[1], tg + ' phong bì envelope', k => ({ bg: T.bg(k), o: [
      { type: 'polygon', points: [{ x: 0, y: 0 }, { x: k.W, y: 0 }, { x: k.W / 2, y: k.H * 0.48 }], left: 0, top: 0, fill: T.key === 'sen' ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.05)', stroke: T.soft, strokeWidth: 0.003 * k.U, name: 'Nắp phong bì' },
      fx(k.c(0.5, 0.48, 0.1, '#fff', { n: 'Con dấu' }), T.foil), k.t('A & L', 0.5, 0.445, 0.055, { f: T.script, b: 1, c: T.key === 'sen' ? '#7f1d1d' : '#ffffff' }),
      k.t('Kính gửi: ...............................................', 0.5, 0.68, 0.045, { f: T.serif, c: T.ink, w: 0.7 }),
      k.t('Địa chỉ: ...............................................', 0.5, 0.78, 0.04, { f: T.serif, c: T.ink, w: 0.7 }),
      k.t(NAMES + ' · 12.12.2026', 0.06, 0.92, 0.03, { f: T.serif, c: T.soft, ox: 'left', al: 'left', w: 0.6 })] }));
    add(B, 'w-menu', 'Thực đơn tiệc ' + T.cat.split('· ')[1], tg + ' thực đơn menu tiệc', k => ({ bg: T.bg(k), o: [...frame(k, T), ...T.orn(k, 0.5, 0.09, 0.22),
      fx(k.t('Thực Đơn', 0.5, 0.15, 0.17, { f: T.script, b: 1 }), T.foil), k.t(NAMES.toUpperCase(), 0.5, 0.245, 0.04, { f: T.serif, c: T.soft, cs: 150 }),
      k.r(0.35, 0.29, 0.3, 0.0015, T.soft),
      k.t(DISHES.join('\n\n'), 0.5, 0.33, 0.058, { f: T.serif, c: T.ink, lh: 1.15, n: 'Danh sách món' }),
      k.t('Bia · Nước ngọt · Rượu vang', 0.5, 0.86, 0.045, { f: T.serif, c: T.soft }), k.t(DATE, 0.5, 0.91, 0.04, { c: T.soft })] }));
    add(B, 'w-table', 'Bảng tên bàn ' + T.cat.split('· ')[1], tg + ' bảng tên bàn số bàn', k => ({ bg: T.bg(k), o: [...frame(k, T, 0.06),
      k.t('BÀN SỐ', 0.5, 0.17, 0.08, { f: T.serif, c: T.ink, cs: 400 }), fx(k.t('01', 0.5, 0.29, 0.32, { f: T.serif, b: 1, n: 'Số bàn' }), T.foil),
      k.t('Gia đình nhà trai', 0.5, 0.74, 0.06, { f: T.script, c: T.soft })] }));
    add(B, 'w-sign', 'Bảng chào ' + T.cat.split('· ')[1], tg + ' bảng chào welcome bảng ký tên', k => ({ bg: T.bg(k), o: [...frame(k, T, 0.035), ...T.orn(k, 0.5, 0.12, 0.25),
      k.t('CHÀO MỪNG QUÝ KHÁCH ĐẾN DỰ', 0.5, 0.22, 0.045, { f: T.serif, c: T.soft, cs: 300 }), k.t('LỄ THÀNH HÔN', 0.5, 0.27, 0.075, { f: T.serif, b: 1, c: T.ink, cs: 300 }),
      fx(k.t('Minh Anh\n&\nHoàng Long', 0.5, 0.35, 0.17, { f: T.script, b: 1, lh: 1 }), T.foil),
      k.t(DATE, 0.5, 0.71, 0.055, { f: T.serif, c: T.ink }), k.t('Xin để lại lời chúc phúc tại sổ lưu bút bên cạnh ♡', 0.5, 0.8, 0.036, { c: T.soft, w: 0.7 }), ...T.orn(k, 0.5, 0.9, 0.12)] }));
    add(B, 'w-bottle', 'Nhãn chai ' + T.cat.split('· ')[1], tg + ' nhãn chai rượu nước', k => ({ bg: T.bg(k), o: [...frame(k, T, 0.08),
      ...T.orn(k, 0.12, 0.5, 0.55), fx(k.t('Minh Anh & Hoàng Long', 0.48, 0.2, 0.3, { f: T.script, b: 1, w: 0.6 }), T.foil),
      k.t('CẢM ƠN ĐÃ CHUNG VUI · 12.12.2026', 0.48, 0.66, 0.11, { f: T.serif, c: T.ink, w: 0.6, cs: 150 }), ...T.orn(k, 0.86, 0.5, 0.55)] }));
  });

  // ---- Danh thiếp QR 90×54 mm
  const VCARD = 'BEGIN:VCARD\nVERSION:3.0\nN:Trần;Thu Hà;;;\nFN:Trần Thu Hà\nTITLE:Giám đốc sáng tạo\nORG:Xưởng Mộc Lam\nTEL;TYPE=CELL:0901234567\nEMAIL:thuha@example.com\nURL:https://example.com\nEND:VCARD';
  const CBQ = 'Danh thiếp QR', ctg = 'danh thiếp name card business qr vcard';
  add(CBQ, 'card54', 'Danh thiếp QR tối giản', ctg + ' tối giản trắng', k => ({ bg: '#ffffff', o: [k.r(0, 0, 0.018, 1, '#0f766e'),
    k.t('Trần Thu Hà', 0.07, 0.16, 0.13, { f: 'Montserrat', b: 1, c: '#0f172a', ox: 'left', al: 'left', w: 0.6 }), k.t('GIÁM ĐỐC SÁNG TẠO · XƯỞNG MỘC LAM', 0.07, 0.36, 0.05, { c: '#0f766e', ox: 'left', al: 'left', w: 0.6, cs: 80 }),
    k.t('☎ 0901 234 567\n✉ thuha@example.com\n⌂ example.com', 0.07, 0.56, 0.058, { c: '#334155', ox: 'left', al: 'left', w: 0.55, lh: 1.35 }),
    qrJSON(VCARD, k.W * 0.82, k.H * 0.47, k.U * 0.62, '#0f172a'), k.t('Quét để lưu danh bạ', 0.82, 0.83, 0.045, { c: '#64748b', w: 0.3 })] }));
  add(CBQ, 'card54', 'Danh thiếp QR nhũ vàng', ctg + ' sang trọng tối màu nhũ vàng', k => ({ bg: k.g('#0b1220', '#1e293b', 135), o: [
    fx(k.t('Trần Thu Hà', 0.07, 0.18, 0.14, { f: 'Playfair Display', b: 1, ox: 'left', al: 'left', w: 0.6 }), 'gold'), k.t('Giám đốc sáng tạo', 0.07, 0.4, 0.06, { c: '#cbd5e1', ox: 'left', al: 'left', w: 0.6 }),
    fx(k.r(0.07, 0.52, 0.22, 0.008, '#fff'), 'gold'), k.t('0901 234 567 · thuha@example.com', 0.07, 0.62, 0.05, { c: '#e2e8f0', ox: 'left', al: 'left', w: 0.6 }),
    qrJSON(VCARD, k.W * 0.82, k.H * 0.5, k.U * 0.6, '#0b1220')] }));
  add(CBQ, 'card54', 'Danh thiếp QR Zalo', ctg + ' zalo màu cam cửa hàng', k => ({ bg: k.g('#f97316', '#fb7185', 120), o: [
    k.t('TIỆM HOA NHỎ', 0.07, 0.15, 0.12, { f: 'Baloo 2', b: 1, c: '#fff', ox: 'left', al: 'left', w: 0.6 }), k.t('Hoa tươi · Giao trong 2 giờ', 0.07, 0.38, 0.06, { c: '#fff7ed', ox: 'left', al: 'left', w: 0.6 }),
    k.t('Nhắn Zalo: 0901 234 567', 0.07, 0.62, 0.065, { b: 1, c: '#fff', ox: 'left', al: 'left', w: 0.6 }),
    k.r(0.65, 0.12, 0.33, 0.76, '#ffffff', { rx: 0.04 }), qrJSON('https://zalo.me/0901234567', k.W * 0.815, k.H * 0.44, k.U * 0.55, '#9a3412'), k.t('Quét để nhắn Zalo', 0.815, 0.76, 0.045, { c: '#9a3412', w: 0.3 })] }));

  // ---- Menu QR nhà hàng
  const CM = 'Menu QR nhà hàng', mtg = 'menu thực đơn qr nhà hàng quán cà phê gọi món';
  add(CM, 'qr-tent', 'Bảng QR gọi món', mtg + ' bảng để bàn', k => ({ bg: '#fef3c7', o: [k.r(0, 0, 1, 0.2, '#78350f'),
    k.t('QUÁN MỘC', 0.5, 0.05, 0.12, { f: 'Bungee', c: '#fef3c7' }), k.t('Quét mã để xem thực đơn\n& gọi món tại bàn', 0.5, 0.25, 0.07, { b: 1, c: '#78350f', lh: 1.2 }),
    k.r(0.15, 0.4, 0.7, 0.465, '#ffffff', { rx: 0.04, sh: k.sh('rgba(120,53,15,0.25)') }), qrJSON('https://example.com/thuc-don', k.W / 2, k.H * 0.63, k.U * 0.62, '#451a03'),
    k.t('Bàn số: 05 · Wi-Fi: QuanMoc', 0.5, 0.91, 0.05, { c: '#78350f' })] }));
  add(CM, 'a4', 'Thực đơn nhà hàng kèm QR', mtg + ' a4 bảng giá', k => ({ bg: '#111827', o: [
    k.t('QUÁN MỘC', 0.5, 0.05, 0.11, { f: 'Bungee', c: '#fbbf24' }), k.t('Thực đơn · Cơm nhà & Món nướng', 0.5, 0.13, 0.04, { c: '#e5e7eb' }),
    k.t('MÓN CHÍNH', 0.08, 0.2, 0.045, { b: 1, c: '#fbbf24', ox: 'left', al: 'left', w: 0.5, cs: 200 }),
    k.t('Cơm gà xối mỡ\nBún chả Hà Nội\nBò lá lốt nướng\nCá kho tộ\nCanh chua cá lóc', 0.08, 0.25, 0.04, { c: '#f9fafb', ox: 'left', al: 'left', w: 0.5, lh: 1.6 }),
    k.t('55.000\n50.000\n65.000\n70.000\n60.000', 0.92, 0.25, 0.04, { c: '#fbbf24', ox: 'right', al: 'right', w: 0.3, lh: 1.6 }),
    k.t('ĐỒ UỐNG', 0.08, 0.52, 0.045, { b: 1, c: '#fbbf24', ox: 'left', al: 'left', w: 0.5, cs: 200 }),
    k.t('Trà đá\nCà phê sữa đá\nNước sâm\nSinh tố bơ', 0.08, 0.57, 0.04, { c: '#f9fafb', ox: 'left', al: 'left', w: 0.5, lh: 1.6 }),
    k.t('5.000\n25.000\n20.000\n35.000', 0.92, 0.57, 0.04, { c: '#fbbf24', ox: 'right', al: 'right', w: 0.3, lh: 1.6 }),
    k.r(0.08, 0.8, 0.84, 0.15, '#1f2937', { rx: 0.02 }), qrJSON('https://example.com/thuc-don', k.W * 0.2, k.H * 0.875, k.U * 0.18, '#111827'),
    k.t('Gọi món & thanh toán bằng QR\nQuét mã để xem ảnh món và đặt bàn', 0.33, 0.83, 0.035, { c: '#e5e7eb', ox: 'left', al: 'left', w: 0.6, lh: 1.4 })] }));
})();
