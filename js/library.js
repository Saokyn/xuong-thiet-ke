// Built-in template library: self-designed layouts generated as Fabric JSON at any size.
(() => {
  const P = () => window.XTK_ELEMENTS.P;
  function kit(W, H) {
    const U = Math.min(W, H);
    const t = (text, x, y, s, o = {}) => ({ type: 'textbox', text, left: x * W, top: y * H, width: (o.w || 0.84) * W, originX: o.ox || 'center', originY: o.oy || 'top', textAlign: o.al || 'center', fontSize: s * U, fontFamily: o.f || 'Be Vietnam Pro', fontWeight: o.b ? 700 : 400, fill: o.c || '#1f2937', lineHeight: o.lh || 1.15, charSpacing: o.cs || 0, opacity: o.op ?? 1, angle: o.ang || 0, name: o.n || (s > 0.07 ? 'Tiêu đề' : 'Chữ'), stroke: o.st || null, strokeWidth: o.sw ? o.sw * U : 1, paintFirst: 'stroke', shadow: o.sh || null, backgroundColor: o.bgc || '', padding: o.pad ? o.pad * U : 0, splitByGrapheme: false });
    const r = (x, y, w, h, fill, o = {}) => ({ type: 'rect', left: x * W, top: y * H, width: w * W, height: h * H, fill, rx: (o.rx || 0) * U, ry: (o.rx || 0) * U, opacity: o.op ?? 1, angle: o.ang || 0, stroke: o.st || null, strokeWidth: (o.sw || 0) * U, name: o.n || 'Khối', strokeDashArray: o.dash ? [o.dash * U, o.dash * U] : null });
    const c = (cx, cy, rad, fill, o = {}) => ({ type: 'circle', left: cx * W, top: cy * H, originX: 'center', originY: 'center', radius: rad * U, fill, opacity: o.op ?? 1, stroke: o.st || null, strokeWidth: (o.sw || 0) * U, name: o.n || 'Hình tròn' });
    const p = (key, cx, cy, size, fill, o = {}) => ({ type: 'path', path: P()[key] || key, left: cx * W, top: cy * H, originX: 'center', originY: 'center', scaleX: size * U / 100 * (o.sx || 1), scaleY: size * U / 100 * (o.sy || 1), fill, opacity: o.op ?? 1, angle: o.ang || 0, stroke: o.st || null, strokeWidth: o.sw || 0, name: o.n || 'Hình' });
    const e = (code, cx, cy, size, o = {}) => ({ type: 'image', src: 'assets/emoji/' + code + '.svg', left: cx * W, top: cy * H, originX: 'center', originY: 'center', width: 36, height: 36, scaleX: size * U / 36, scaleY: size * U / 36, angle: o.ang || 0, opacity: o.op ?? 1, name: 'Emoji' });
    const cell = (x, y, w, h, shape = 'rect', o = {}) => window.XTK_FX.cellJSON(x * W, y * H, w * W, h * H, shape, o.rad ? o.rad * U : 0);
    const g = (c1, c2, ang = 90, c3) => { const a = ang * Math.PI / 180, dx = Math.cos(a) / 2, dy = Math.sin(a) / 2; return { type: 'linear', gradientUnits: 'percentage', coords: { x1: 0.5 - dx, y1: 0.5 - dy, x2: 0.5 + dx, y2: 0.5 + dy }, colorStops: c3 ? [{ offset: 0, color: c1 }, { offset: 0.5, color: c2 }, { offset: 1, color: c3 }] : [{ offset: 0, color: c1 }, { offset: 1, color: c2 }] }; };
    const rg = (c1, c2) => ({ type: 'radial', gradientUnits: 'percentage', coords: { x1: 0.5, y1: 0.4, r1: 0, x2: 0.5, y2: 0.4, r2: 0.8 }, colorStops: [{ offset: 0, color: c1 }, { offset: 1, color: c2 }] });
    const sh = (color = 'rgba(0,0,0,0.35)', blur = 0.02, oy = 0.008) => ({ color, blur: blur * U, offsetX: 0, offsetY: oy * U });
    return { W, H, U, t, r, c, p, e, cell, g, rg, sh };
  }
  const L = [];
  const add = (cat, size, name, tags, build) => L.push({ id: 'lib-' + (L.length + 1), cat, size, name, tags, build });

  // ===== Thiệp mời / cưới
  add('Thiệp mời/cưới', 'a5', 'Thiệp cưới hoa hồng', 'cưới wedding hồng thanh lịch', k => ({ bg: '#fff7f5', o: [
    k.r(0.05, 0.035, 0.9, 0.93, 'rgba(0,0,0,0)', { st: '#d4a373', sw: 0.006 }), k.r(0.07, 0.05, 0.86, 0.9, 'rgba(0,0,0,0)', { st: '#e9c9a8', sw: 0.002 }),
    k.p('M0 50 C25 0 75 0 100 50', 0.5, 0.11, 0.6, 'rgba(0,0,0,0)', { st: '#d4a373', sw: 1.2 }),
    k.t('Trân trọng kính mời', 0.5, 0.17, 0.045, { f: 'Montserrat', c: '#9a6b4b', cs: 300 }),
    k.t('Minh Anh\n&\nHoàng Long', 0.5, 0.27, 0.13, { f: 'Dancing Script', b: 1, c: '#b5485d', lh: 1 }),
    k.r(0.38, 0.62, 0.24, 0.002, '#d4a373'),
    k.t('LỄ THÀNH HÔN', 0.5, 0.65, 0.05, { f: 'Playfair Display', b: 1, c: '#5b3a29', cs: 400 }),
    k.t('Vào lúc 18:00 · Thứ Bảy\n12 . 12 . 2026', 0.5, 0.71, 0.045, { f: 'Lora', c: '#5b3a29' }),
    k.t('Trung tâm tiệc cưới Hoa Sen · 123 Đường Lê Lợi, TP. Huế', 0.5, 0.83, 0.032, { f: 'Be Vietnam Pro', c: '#7c5a45', w: 0.7 }),
    k.e('1f339', 0.13, 0.9, 0.12, { ang: -20 }), k.e('1f339', 0.87, 0.9, 0.12, { ang: 20 }) ] }));
  add('Thiệp mời/cưới', 'a5', 'Thiệp cưới xanh lá tối giản', 'cưới minimal xanh lá ảnh', k => ({ bg: '#f4f1ea', o: [
    k.cell(0.15, 0.06, 0.7, 0.42, 'arch'),
    k.t('Save the date', 0.5, 0.52, 0.09, { f: 'Dancing Script', c: '#3f5d45' }),
    k.t('THU TRANG  ·  QUỐC BẢO', 0.5, 0.64, 0.05, { f: 'Montserrat', b: 1, c: '#283618', cs: 200 }),
    k.r(0.2, 0.71, 0.6, 0.0015, '#606c38'),
    k.t('CHỦ NHẬT · 20.12.2026 · 11:00', 0.5, 0.735, 0.04, { f: 'Montserrat', c: '#606c38', cs: 150 }),
    k.t('Nhà hàng Vườn Xanh, Quận 2, TP. Hồ Chí Minh', 0.5, 0.8, 0.035, { f: 'Lora', c: '#283618' }),
    k.p('leaf', 0.08, 0.95, 0.18, '#a3b18a', { ang: 30 }), k.p('leaf', 0.93, 0.93, 0.14, '#588157', { ang: -60 }) ] }));
  add('Thiệp mời/cưới', 'a6', 'Thiệp mời sinh nhật', 'sinh nhật party tiệc mời', k => ({ bg: k.g('#fde68a', '#fca5a5', 120), o: [
    k.e('1f388', 0.18, 0.12, 0.25, { ang: -12 }), k.e('1f388', 0.84, 0.1, 0.2, { ang: 10 }), k.e('1f382', 0.5, 0.72, 0.22),
    k.t('Mời bạn đến dự', 0.5, 0.24, 0.06, { f: 'Quicksand', b: 1, c: '#7c2d12' }),
    k.t('TIỆC SINH NHẬT', 0.5, 0.31, 0.11, { f: 'Bungee', c: '#be123c', sh: k.sh('rgba(255,255,255,.8)', 0, 0.008) }),
    k.t('Bé Na tròn 30 tuổi 🎉', 0.5, 0.48, 0.06, { f: 'Pacifico', c: '#7c2d12' }),
    k.t('19:00 · 08/08/2026 · Nhà hàng Ánh Dương', 0.5, 0.86, 0.04, { f: 'Be Vietnam Pro', b: 1, c: '#7c2d12' }) ] }));
  add('Thiệp mời/cưới', 'a5', 'Thư mời sự kiện doanh nghiệp', 'sự kiện hội thảo mời doanh nghiệp', k => ({ bg: '#0f172a', o: [
    k.c(0.9, 0.08, 0.5, '#1e3a8a', { op: 0.6 }), k.c(0.05, 0.95, 0.4, '#0e7490', { op: 0.5 }),
    k.t('THƯ MỜI', 0.12, 0.12, 0.05, { ox: 'left', al: 'left', f: 'Montserrat', b: 1, c: '#38bdf8', cs: 500 }),
    k.t('Hội thảo\nChuyển đổi số 2026', 0.12, 0.2, 0.12, { ox: 'left', al: 'left', f: 'Montserrat', b: 1, c: '#fff', lh: 1.05, w: 0.8 }),
    k.r(0.12, 0.5, 0.15, 0.006, '#38bdf8'),
    k.t('Thời gian: 08:30, 15/11/2026\nĐịa điểm: GEM Center, TP. HCM\nKính mời: Quý đối tác', 0.12, 0.55, 0.045, { ox: 'left', al: 'left', c: '#cbd5e1', lh: 1.6, w: 0.8 }),
    k.t('Xác nhận tham dự: 0909 000 000', 0.12, 0.86, 0.04, { ox: 'left', al: 'left', b: 1, c: '#fff', w: 0.8 }) ] }));

  // ===== Thiệp tri ân
  add('Thiệp tri ân', 'a5l', 'Thiệp cảm ơn khách hàng', 'cảm ơn tri ân khách hàng', k => ({ bg: '#fffaf0', o: [
    k.r(0, 0, 0.36, 1, '#e76f51'), k.p('heart', 0.18, 0.5, 0.3, '#fff', { op: 0.95 }),
    k.t('Cảm ơn bạn!', 0.68, 0.24, 0.13, { f: 'Dancing Script', b: 1, c: '#e76f51', w: 0.56 }),
    k.t('Cảm ơn bạn đã tin chọn sản phẩm của chúng mình. Mỗi đơn hàng là một niềm vui lớn — hẹn gặp lại bạn thật sớm nhé!', 0.68, 0.5, 0.045, { f: 'Lora', c: '#3d405b', w: 0.5, lh: 1.4 }),
    k.t('— Tiệm Nhà Mây —', 0.68, 0.82, 0.045, { f: 'Montserrat', b: 1, c: '#3d405b', cs: 200, w: 0.5 }) ] }));
  add('Thiệp tri ân', 'a6', 'Thiệp 20/11 tri ân thầy cô', '20/11 thầy cô nhà giáo tri ân', k => ({ bg: k.g('#ecfeff', '#cffafe', 90), o: [
    k.e('1f490', 0.5, 0.2, 0.32), k.t('Tri ân\nThầy Cô', 0.5, 0.36, 0.13, { f: 'Playfair Display', b: 1, c: '#155e75', lh: 1 }),
    k.t('Nhân ngày Nhà giáo Việt Nam 20/11', 0.5, 0.62, 0.05, { f: 'Be Vietnam Pro', b: 1, c: '#0e7490' }),
    k.t('Chúc thầy cô luôn mạnh khỏe, hạnh phúc và tràn đầy nhiệt huyết.', 0.5, 0.7, 0.045, { f: 'Lora', c: '#164e63', w: 0.75 }),
    k.r(0.08, 0.95, 0.84, 0.008, '#06b6d4') ] }));
  add('Thiệp tri ân', 'a6', 'Thiệp 8/3 tặng mẹ', '8/3 mẹ phụ nữ hoa', k => ({ bg: '#fdf2f8', o: [
    k.p('blob', 0.5, 0.33, 0.7, '#fbcfe8'), k.e('1f337', 0.5, 0.3, 0.36),
    k.t('Gửi Mẹ yêu', 0.5, 0.6, 0.11, { f: 'Pacifico', c: '#be185d' }),
    k.t('Cảm ơn mẹ vì tất cả. Chúc mẹ ngày 8/3 thật nhiều niềm vui!', 0.5, 0.75, 0.05, { f: 'Quicksand', b: 1, c: '#831843', w: 0.75 }) ] }));

  // ===== Poster sale
  add('Poster sale', 'a4', 'Poster siêu sale cuối năm', 'sale giảm giá black friday', k => ({ bg: '#111827', o: [
    k.p('burst', 0.5, 0.36, 0.95, '#facc15'), k.p('burst', 0.5, 0.36, 0.8, '#ef4444', { ang: 6 }),
    k.t('SIÊU SALE', 0.5, 0.25, 0.14, { f: 'Bungee', c: '#fff', sh: k.sh() }), k.t('-50%', 0.5, 0.36, 0.24, { f: 'Bungee', c: '#fde047', st: '#7f1d1d', sw: 0.008 }),
    k.t('TOÀN BỘ CỬA HÀNG', 0.5, 0.72, 0.06, { f: 'Oswald', b: 1, c: '#fff', cs: 300 }),
    k.t('Từ 01 – 05/12/2026 · Mua online tại shopnhaminh.vn', 0.5, 0.8, 0.035, { c: '#d1d5db' }),
    k.r(0.3, 0.88, 0.4, 0.05, '#facc15', { rx: 0.03 }), k.t('MUA NGAY', 0.5, 0.893, 0.04, { f: 'Montserrat', b: 1, c: '#111827', cs: 200 }) ] }));
  add('Poster sale', 'post-45', 'Poster khai trương quán', 'khai trương cà phê quán', k => ({ bg: '#3e2723', o: [
    k.cell(0.08, 0.06, 0.84, 0.45, 'round', { rad: 0.04 }),
    k.t('KHAI TRƯƠNG', 0.5, 0.55, 0.12, { f: 'Oswald', b: 1, c: '#f5e6cc', cs: 200 }),
    k.t('Cà Phê Sương Mai', 0.5, 0.67, 0.08, { f: 'Dancing Script', b: 1, c: '#d7a86e' }),
    k.r(0.25, 0.8, 0.5, 0.07, '#e76f51', { rx: 0.05 }), k.t('Giảm 20% tuần đầu', 0.5, 0.812, 0.045, { b: 1, c: '#fff' }),
    k.t('12 Hồ Tùng Mậu, Đà Lạt', 0.5, 0.92, 0.035, { c: '#d7ccc8' }) ] }));
  add('Poster sale', 'post-sq', 'Flash sale 12.12', 'flash sale 12.12 deal', k => ({ bg: k.g('#7c3aed', '#db2777', 135), o: [
    k.c(0.85, 0.15, 0.22, '#fff', { op: 0.12 }), k.c(0.1, 0.9, 0.3, '#fff', { op: 0.1 }),
    k.t('⚡ FLASH SALE', 0.5, 0.12, 0.09, { f: 'Bungee', c: '#fde047' }),
    k.t('12.12', 0.5, 0.25, 0.3, { f: 'Bungee', c: '#fff', sh: k.sh('rgba(0,0,0,.3)', 0.02, 0.015) }),
    k.t('Deal sốc chỉ từ 12.000đ · Freeship toàn quốc', 0.5, 0.62, 0.05, { b: 1, c: '#fff', w: 0.8 }),
    k.r(0.28, 0.76, 0.44, 0.1, '#fff', { rx: 0.05 }), k.t('SĂN NGAY', 0.5, 0.785, 0.055, { f: 'Montserrat', b: 1, c: '#7c3aed', cs: 200 }) ] }));

  // ===== Bài đăng FB/IG
  add('Bài đăng FB/IG', 'post-sq', 'Trích dẫn truyền cảm hứng', 'quote trích dẫn động lực', k => ({ bg: '#fef3c7', o: [
    k.t('“', 0.15, 0.08, 0.35, { f: 'Playfair Display', b: 1, c: '#f59e0b', ox: 'left', al: 'left', w: 0.3 }),
    k.t('Mỗi ngày là một cơ hội mới để trở thành phiên bản tốt hơn của chính mình.', 0.5, 0.33, 0.075, { f: 'Lora', b: 1, c: '#422006', w: 0.76, lh: 1.3 }),
    k.r(0.42, 0.75, 0.16, 0.006, '#f59e0b'), k.t('@tiemsachnho', 0.5, 0.8, 0.04, { f: 'Montserrat', c: '#92400e', cs: 150 }) ] }));
  add('Bài đăng FB/IG', 'post-sq', 'Giới thiệu sản phẩm mới', 'sản phẩm mới ra mắt ảnh', k => ({ bg: '#f8fafc', o: [
    k.cell(0.5, 0, 0.5, 1), k.r(0, 0, 0.5, 1, '#0f172a'),
    k.t('MỚI', 0.07, 0.1, 0.05, { ox: 'left', al: 'left', f: 'Montserrat', b: 1, c: '#22d3ee', cs: 400, w: 0.4 }),
    k.t('Bộ sưu tập\nThu Đông', 0.07, 0.18, 0.1, { ox: 'left', al: 'left', f: 'Playfair Display', b: 1, c: '#fff', w: 0.4, lh: 1.05 }),
    k.t('Chất liệu len mềm, phom dáng tối giản, 6 màu trung tính.', 0.07, 0.48, 0.04, { ox: 'left', al: 'left', c: '#cbd5e1', w: 0.38, lh: 1.4 }),
    k.t('Chỉ từ 399.000đ', 0.07, 0.8, 0.055, { ox: 'left', al: 'left', b: 1, c: '#22d3ee', w: 0.4 }) ] }));
  add('Bài đăng FB/IG', 'post-45', 'Mẹo hay – danh sách', 'mẹo tips danh sách giáo dục', k => ({ bg: '#ecfdf5', o: [
    k.t('5 MẸO', 0.5, 0.07, 0.12, { f: 'Bungee', c: '#047857' }), k.t('ngủ ngon mỗi tối', 0.5, 0.18, 0.07, { f: 'Pacifico', c: '#065f46' }),
    ...['Tắt màn hình 30 phút trước khi ngủ', 'Giữ phòng mát và tối', 'Không uống cà phê sau 15 giờ', 'Đi ngủ đúng giờ mỗi ngày', 'Thở sâu 4-7-8 khi nằm'].flatMap((s, i) => [
      k.c(0.15, 0.35 + i * 0.11, 0.045, '#10b981'), k.t(String(i + 1), 0.15, 0.333 + i * 0.11, 0.05, { f: 'Montserrat', b: 1, c: '#fff', w: 0.1 }),
      k.t(s, 0.24, 0.335 + i * 0.11, 0.045, { ox: 'left', al: 'left', c: '#064e3b', b: 1, w: 0.68 })]) ] }));
  add('Bài đăng FB/IG', 'post-sq', 'Thông báo nghỉ lễ', 'thông báo nghỉ lễ tết', k => ({ bg: '#b91c1c', o: [
    k.r(0.06, 0.06, 0.88, 0.88, 'rgba(0,0,0,0)', { st: '#facc15', sw: 0.008 }), k.e('1f3ee', 0.16, 0.18, 0.16), k.e('1f3ee', 0.84, 0.18, 0.16),
    k.t('THÔNG BÁO', 0.5, 0.3, 0.06, { f: 'Montserrat', b: 1, c: '#fde68a', cs: 400 }), k.t('Lịch nghỉ Tết', 0.5, 0.38, 0.12, { f: 'Lobster', c: '#fff' }),
    k.t('Cửa hàng nghỉ từ 27/01 đến hết 04/02/2027\nMở cửa lại: 05/02 (mùng 8 Tết)', 0.5, 0.58, 0.045, { c: '#fff', lh: 1.5, w: 0.75 }),
    k.e('1f338', 0.2, 0.84, 0.12), k.e('1f338', 0.8, 0.84, 0.12) ] }));

  // ===== Story
  add('Story', 'story', 'Story khuyến mãi', 'story sale khuyến mãi', k => ({ bg: k.g('#fb923c', '#f43f5e', 160), o: [
    k.cell(0.1, 0.12, 0.8, 0.4, 'blob'),
    k.t('HÔM NAY', 0.5, 0.56, 0.08, { f: 'Oswald', b: 1, c: '#fff', cs: 300 }), k.t('Mua 1 tặng 1', 0.5, 0.62, 0.14, { f: 'Lobster', c: '#fff', sh: k.sh() }),
    k.r(0.22, 0.82, 0.56, 0.05, '#fff', { rx: 0.06 }), k.t('Vuốt lên để đặt ⬆', 0.5, 0.832, 0.05, { b: 1, c: '#f43f5e' }) ] }));
  add('Story', 'story', 'Story hỏi đáp', 'story hỏi đáp tương tác q&a', k => ({ bg: '#1e1b4b', o: [
    k.c(0.2, 0.15, 0.5, '#4338ca', { op: 0.5 }), k.c(0.9, 0.85, 0.4, '#7c3aed', { op: 0.5 }),
    k.t('Hỏi mình\nbất cứ điều gì!', 0.5, 0.3, 0.12, { f: 'Montserrat', b: 1, c: '#fff', lh: 1.05 }),
    k.r(0.12, 0.5, 0.76, 0.12, '#fff', { rx: 0.05 }), k.t('Nhập câu hỏi của bạn…', 0.5, 0.545, 0.05, { c: '#9ca3af' }), k.e('1f4ac'.replace('1f4ac', '2728'), 0.85, 0.22, 0.15) ] }));
  add('Story', 'story', 'Story du lịch', 'du lịch travel ảnh', k => ({ bg: '#fff', o: [
    k.cell(0, 0, 1, 0.62), k.r(0, 0.6, 1, 0.4, '#fef9c3'),
    k.t('Đà Nẵng', 0.5, 0.64, 0.17, { f: 'Pacifico', c: '#0369a1' }), k.t('3 NGÀY 2 ĐÊM · CHỈ TỪ 2.990K', 0.5, 0.8, 0.05, { f: 'Montserrat', b: 1, c: '#0c4a6e', cs: 150 }) ] }));

  // ===== Thumbnail YouTube
  add('Thumbnail YouTube', 'yt-thumb', 'Thumbnail review công nghệ', 'youtube review công nghệ', k => ({ bg: '#0b1220', o: [
    k.cell(0.52, 0.08, 0.44, 0.84, 'round', { rad: 0.05 }), k.p('arrowBlock', 0.46, 0.6, 0.18, '#facc15', { ang: 180 }),
    k.t('CÓ ĐÁNG\nMUA?', 0.04, 0.12, 0.2, { ox: 'left', al: 'left', f: 'Bungee', c: '#fff', st: '#000', sw: 0.012, w: 0.5, lh: 1 }),
    k.r(0.04, 0.72, 0.36, 0.16, '#ef4444', { rx: 0.02 }), k.t('REVIEW THẬT', 0.22, 0.745, 0.08, { f: 'Oswald', b: 1, c: '#fff', w: 0.36 }) ] }));
  add('Thumbnail YouTube', 'yt-thumb', 'Thumbnail nấu ăn', 'youtube nấu ăn công thức', k => ({ bg: k.g('#fef3c7', '#fdba74', 0), o: [
    k.cell(0.04, 0.08, 0.46, 0.84, 'circle'),
    k.t('PHỞ BÒ', 0.75, 0.15, 0.2, { f: 'Lobster', c: '#9a3412', w: 0.48, sh: k.sh('rgba(255,255,255,.9)', 0, 0.008) }),
    k.t('chuẩn vị Hà Nội', 0.75, 0.48, 0.09, { f: 'Dancing Script', b: 1, c: '#7c2d12', w: 0.48 }),
    k.r(0.56, 0.7, 0.38, 0.14, '#16a34a', { rx: 0.03 }), k.t('CHỈ 30 PHÚT', 0.75, 0.725, 0.08, { f: 'Oswald', b: 1, c: '#fff', w: 0.38 }) ] }));
  add('Thumbnail YouTube', 'yt-thumb', 'Thumbnail vlog', 'youtube vlog cuộc sống', k => ({ bg: '#fde047', o: [
    k.p('blob2', 0.3, 0.5, 0.95, '#fff'), k.cell(0.06, 0.1, 0.48, 0.8, 'blob2'),
    k.t('1 NGÀY\nỞ HỘI AN', 0.77, 0.2, 0.15, { f: 'Bungee', c: '#111', w: 0.45, lh: 1.05 }), k.e('1f3ee', 0.88, 0.8, 0.22) ] }));

  // ===== Banner TMĐT
  add('Banner TMĐT', 'banner-ecom', 'Banner mỹ phẩm', 'tmđt shopee mỹ phẩm banner', k => ({ bg: k.g('#fce7f3', '#fbcfe8', 0), o: [
    k.c(0.8, 0.5, 0.42, '#f9a8d4'), k.cell(0.62, 0.08, 0.34, 0.84, 'circle'),
    k.t('Skincare mùa hanh khô', 0.05, 0.16, 0.13, { ox: 'left', al: 'left', f: 'Playfair Display', b: 1, c: '#831843', w: 0.55 }),
    k.t('Giảm đến 40% · Tặng kèm mini size', 0.05, 0.5, 0.075, { ox: 'left', al: 'left', c: '#9d174d', w: 0.55 }),
    k.r(0.05, 0.7, 0.18, 0.17, '#be185d', { rx: 0.08 }), k.t('MUA NGAY', 0.14, 0.73, 0.07, { f: 'Montserrat', b: 1, c: '#fff', w: 0.18 }) ] }));
  add('Banner TMĐT', 'banner-ecom', 'Banner điện máy', 'tmđt điện máy công nghệ', k => ({ bg: '#0f172a', o: [
    k.r(0.55, 0, 0.45, 1, '#1d4ed8'), k.p('M0 0 L30 0 L0 100 Z', 0.57, 0.5, 1, '#0f172a', { sx: 0.3, sy: 1 }),
    k.t('TUẦN LỄ CÔNG NGHỆ', 0.05, 0.14, 0.09, { ox: 'left', al: 'left', f: 'Oswald', b: 1, c: '#38bdf8', cs: 200, w: 0.5 }),
    k.t('Laptop – Tai nghe – Đồng hồ', 0.05, 0.36, 0.12, { ox: 'left', al: 'left', f: 'Montserrat', b: 1, c: '#fff', w: 0.5 }),
    k.t('Trả góp 0% · Bảo hành 24 tháng', 0.05, 0.72, 0.07, { ox: 'left', al: 'left', c: '#cbd5e1', w: 0.5 }), k.cell(0.66, 0.1, 0.3, 0.8, 'round', { rad: 0.06 }) ] }));
  add('Banner TMĐT', 'banner-ecom', 'Banner thời trang', 'tmđt thời trang quần áo', k => ({ bg: '#fafaf9', o: [
    k.cell(0, 0, 0.38, 1), k.cell(0.62, 0, 0.38, 1),
    k.t('NEW', 0.5, 0.1, 0.12, { f: 'Bungee', c: '#dc2626', w: 0.24 }), k.t('Collection', 0.5, 0.33, 0.16, { f: 'Dancing Script', b: 1, c: '#1c1917', w: 0.3 }),
    k.t('Freeship đơn từ 199K', 0.5, 0.7, 0.065, { b: 1, c: '#44403c', w: 0.24 }) ] }));

  // ===== Menu
  add('Menu', 'a4', 'Menu quán cà phê', 'menu cà phê đồ uống', k => ({ bg: '#f5ebe0', o: [
    k.t('MENU', 0.5, 0.05, 0.12, { f: 'Playfair Display', b: 1, c: '#3e2723', cs: 300 }), k.t('Cà Phê Sương Mai', 0.5, 0.135, 0.05, { f: 'Dancing Script', c: '#8d6e63' }),
    ...[['CÀ PHÊ', [['Đen đá', '25K'], ['Sữa đá', '29K'], ['Bạc xỉu', '32K'], ['Cà phê muối', '35K']]], ['TRÀ & KHÁC', [['Trà đào cam sả', '39K'], ['Trà vải', '39K'], ['Cacao nóng', '35K'], ['Sữa chua dâu', '35K']]]].flatMap(([sec, items], si) => [
      k.t(sec, 0.5, 0.22 + si * 0.36, 0.05, { f: 'Montserrat', b: 1, c: '#bf360c', cs: 300 }),
      ...items.flatMap(([n, pr], i) => [k.t(n, 0.12, 0.29 + si * 0.36 + i * 0.065, 0.045, { ox: 'left', al: 'left', f: 'Lora', c: '#3e2723', w: 0.55 }), k.t(pr, 0.88, 0.29 + si * 0.36 + i * 0.065, 0.045, { ox: 'right', al: 'right', f: 'Lora', b: 1, c: '#3e2723', w: 0.2 }), k.r(0.12, 0.33 + si * 0.36 + i * 0.065, 0.76, 0.0007, '#bcaaa4')])]),
    k.e('2615', 0.5, 0.95, 0.08) ] }));
  add('Menu', 'a4', 'Menu nhà hàng Việt', 'menu nhà hàng món việt', k => ({ bg: '#14532d', o: [
    k.r(0.04, 0.03, 0.92, 0.94, 'rgba(0,0,0,0)', { st: '#facc15', sw: 0.004 }),
    k.t('Thực Đơn', 0.5, 0.06, 0.13, { f: 'Lobster', c: '#fde68a' }), k.t('ẨM THỰC ĐẤT VIỆT', 0.5, 0.16, 0.04, { f: 'Montserrat', b: 1, c: '#bbf7d0', cs: 400 }),
    ...[['Phở bò tái lăn', '75.000'], ['Bún chả Hà Nội', '65.000'], ['Bánh xèo miền Tây', '60.000'], ['Cơm tấm sườn bì', '55.000'], ['Gỏi cuốn tôm thịt', '45.000'], ['Chè ba màu', '30.000']].flatMap(([n, pr], i) => [
      k.t(n, 0.12, 0.26 + i * 0.1, 0.055, { ox: 'left', al: 'left', f: 'Lora', b: 1, c: '#fff', w: 0.55 }), k.t(pr + 'đ', 0.88, 0.26 + i * 0.1, 0.05, { ox: 'right', al: 'right', f: 'Montserrat', b: 1, c: '#facc15', w: 0.3 }),
      k.t('Món đặc trưng · nguyên liệu tươi mỗi ngày', 0.12, 0.3 + i * 0.1, 0.03, { ox: 'left', al: 'left', c: '#bbf7d0', w: 0.6 })]) ] }));
  add('Menu', 'post-45', 'Menu trà sữa (online)', 'menu trà sữa online', k => ({ bg: k.g('#ede9fe', '#fae8ff', 90), o: [
    k.t('Trà Sữa Mây', 0.5, 0.05, 0.11, { f: 'Pacifico', c: '#6d28d9' }),
    ...[['Trà sữa trân châu', '35K'], ['Matcha latte', '42K'], ['Trà sữa khoai môn', '39K'], ['Hồng trà kem cheese', '45K'], ['Sữa tươi đường đen', '42K']].flatMap(([n, pr], i) => [
      k.r(0.08, 0.24 + i * 0.13, 0.84, 0.1, '#fff', { rx: 0.04 }), k.t(n, 0.13, 0.265 + i * 0.13, 0.05, { ox: 'left', al: 'left', b: 1, c: '#4c1d95', w: 0.6 }), k.t(pr, 0.87, 0.265 + i * 0.13, 0.05, { ox: 'right', al: 'right', f: 'Bungee', c: '#db2777', w: 0.2 })]) ] }));

  // ===== CV
  add('CV', 'a4', 'CV hiện đại 2 cột', 'cv hồ sơ xin việc', k => ({ bg: '#fff', o: [
    k.r(0, 0, 0.34, 1, '#1e293b'), k.cell(0.06, 0.04, 0.22, 0.155, 'circle'),
    k.t('LIÊN HỆ', 0.06, 0.24, 0.03, { ox: 'left', al: 'left', f: 'Montserrat', b: 1, c: '#38bdf8', cs: 300, w: 0.26 }),
    k.t('0909 123 456\nban.email@example.com\nQuận 3, TP. HCM', 0.06, 0.27, 0.025, { ox: 'left', al: 'left', c: '#e2e8f0', w: 0.26, lh: 1.6 }),
    k.t('KỸ NĂNG', 0.06, 0.4, 0.03, { ox: 'left', al: 'left', f: 'Montserrat', b: 1, c: '#38bdf8', cs: 300, w: 0.26 }),
    ...['Thiết kế đồ họa', 'Figma / Illustrator', 'Tiếng Anh IELTS 7.0', 'Quản lý dự án'].flatMap((s, i) => [k.t(s, 0.06, 0.43 + i * 0.05, 0.025, { ox: 'left', al: 'left', c: '#e2e8f0', w: 0.26 }), k.r(0.06, 0.455 + i * 0.05, 0.22, 0.004, '#334155'), k.r(0.06, 0.455 + i * 0.05, 0.22 * (0.9 - i * 0.12), 0.004, '#38bdf8')]),
    k.t('NGUYỄN MINH THƯ', 0.4, 0.05, 0.07, { ox: 'left', al: 'left', f: 'Montserrat', b: 1, c: '#0f172a', w: 0.56 }), k.t('Nhà thiết kế đồ họa', 0.4, 0.105, 0.04, { ox: 'left', al: 'left', c: '#0284c7', w: 0.56 }),
    k.t('KINH NGHIỆM', 0.4, 0.2, 0.035, { ox: 'left', al: 'left', f: 'Montserrat', b: 1, c: '#0f172a', cs: 200, w: 0.56 }), k.r(0.4, 0.228, 0.56, 0.002, '#cbd5e1'),
    k.t('2022 – nay · Công ty Sáng Tạo Xanh\nTrưởng nhóm thiết kế, phụ trách nhận diện thương hiệu cho 20+ khách hàng.\n\n2019 – 2022 · Agency Mặt Trời\nThiết kế ấn phẩm in, social và bao bì sản phẩm.', 0.4, 0.245, 0.026, { ox: 'left', al: 'left', c: '#334155', w: 0.56, lh: 1.5 }),
    k.t('HỌC VẤN', 0.4, 0.5, 0.035, { ox: 'left', al: 'left', f: 'Montserrat', b: 1, c: '#0f172a', cs: 200, w: 0.56 }), k.r(0.4, 0.528, 0.56, 0.002, '#cbd5e1'),
    k.t('Đại học Kiến trúc TP. HCM — Thiết kế đồ họa (2015 – 2019)', 0.4, 0.545, 0.026, { ox: 'left', al: 'left', c: '#334155', w: 0.56, lh: 1.5 }) ] }));
  add('CV', 'a4', 'CV tối giản', 'cv tối giản minimal', k => ({ bg: '#fafaf9', o: [
    k.t('Trần Quốc Huy', 0.08, 0.06, 0.09, { ox: 'left', al: 'left', f: 'Playfair Display', b: 1, c: '#1c1917', w: 0.84 }),
    k.t('KỸ SƯ PHẦN MỀM · 0912 345 678 · huy.dev@example.com', 0.08, 0.14, 0.025, { ox: 'left', al: 'left', f: 'Montserrat', c: '#78716c', cs: 100, w: 0.84 }),
    k.r(0.08, 0.18, 0.84, 0.002, '#1c1917'),
    ...[['Giới thiệu', 'Hơn 6 năm phát triển web và ứng dụng di động, yêu thích sản phẩm tối giản và hiệu năng cao.'], ['Kinh nghiệm', 'Senior Developer — Công ty Phần mềm Hòa Bình (2021 – nay)\nDeveloper — Startup Lúa Vàng (2018 – 2021)'], ['Kỹ năng', 'JavaScript, TypeScript, React, Node.js, PostgreSQL, Docker'], ['Học vấn', 'Đại học Bách khoa Hà Nội — Khoa học máy tính']].flatMap(([h, b], i) => [
      k.t(h.toUpperCase(), 0.08, 0.22 + i * 0.16, 0.028, { ox: 'left', al: 'left', f: 'Montserrat', b: 1, c: '#b45309', cs: 200, w: 0.25 }), k.t(b, 0.34, 0.22 + i * 0.16, 0.027, { ox: 'left', al: 'left', f: 'Lora', c: '#292524', w: 0.58, lh: 1.5 })]) ] }));

  // ===== Danh thiếp
  add('Danh thiếp', 'card', 'Danh thiếp tối giản', 'danh thiếp name card', k => ({ bg: '#fff', o: [
    k.r(0, 0, 0.04, 1, '#4f46e5'),
    k.t('Lê Thu Hà', 0.1, 0.18, 0.15, { ox: 'left', al: 'left', f: 'Montserrat', b: 1, c: '#111827', w: 0.8 }), k.t('Giám đốc Marketing', 0.1, 0.4, 0.08, { ox: 'left', al: 'left', c: '#4f46e5', w: 0.8 }),
    k.t('0909 000 111 · ha.le@example.com\nwww.congtyabc.vn', 0.1, 0.62, 0.065, { ox: 'left', al: 'left', c: '#4b5563', w: 0.85, lh: 1.4 }) ] }));
  add('Danh thiếp', 'card', 'Danh thiếp sang trọng', 'danh thiếp vàng đen luxury', k => ({ bg: '#111111', o: [
    k.r(0.04, 0.07, 0.92, 0.86, 'rgba(0,0,0,0)', { st: '#d4af37', sw: 0.008 }),
    k.t('HOÀNG GIA', 0.5, 0.2, 0.14, { f: 'Playfair Display', b: 1, c: '#d4af37', cs: 400 }), k.t('Kim hoàn – Trang sức', 0.5, 0.45, 0.075, { f: 'Lora', c: '#e5e7eb' }),
    k.t('Phạm Đức Anh · 0988 888 999', 0.5, 0.66, 0.065, { f: 'Montserrat', c: '#d4af37' }) ] }));
  add('Danh thiếp', 'card', 'Danh thiếp sáng tạo', 'danh thiếp màu sáng tạo', k => ({ bg: k.g('#06b6d4', '#3b82f6', 30), o: [
    k.c(0.85, 0.2, 0.55, '#fff', { op: 0.15 }), k.t('Studio Ánh Sáng', 0.07, 0.15, 0.13, { ox: 'left', al: 'left', f: 'Comfortaa', b: 1, c: '#fff', w: 0.8 }),
    k.t('Chụp ảnh · Quay phim · Dựng video', 0.07, 0.42, 0.07, { ox: 'left', al: 'left', c: '#e0f2fe', w: 0.8 }), k.t('☎ 0912 222 333   ✉ hello@anhsang.vn', 0.07, 0.75, 0.065, { ox: 'left', al: 'left', b: 1, c: '#fff', w: 0.9 }) ] }));

  // ===== Voucher / thẻ tích điểm
  add('Voucher/thẻ tích điểm', 'voucher', 'Voucher giảm giá', 'voucher phiếu giảm giá quà tặng', k => ({ bg: '#fff7ed', o: [
    k.r(0, 0, 0.32, 1, '#ea580c'), ...[...Array(9)].map((_, i) => k.c(0.32, 0.06 + i * 0.11, 0.025, '#fff7ed')),
    k.t('GIẢM', 0.16, 0.18, 0.12, { f: 'Oswald', b: 1, c: '#fff', w: 0.3 }), k.t('100K', 0.16, 0.38, 0.22, { f: 'Bungee', c: '#fff', w: 0.32 }),
    k.t('PHIẾU QUÀ TẶNG', 0.66, 0.14, 0.1, { f: 'Montserrat', b: 1, c: '#9a3412', cs: 200, w: 0.6 }), k.t('Áp dụng cho hóa đơn từ 500.000đ\nHạn dùng: 31/12/2026', 0.66, 0.42, 0.075, { c: '#7c2d12', w: 0.6, lh: 1.4 }),
    k.r(0.46, 0.75, 0.4, 0.15, 'rgba(0,0,0,0)', { st: '#ea580c', sw: 0.006, dash: 0.02, rx: 0.02 }), k.t('MÃ: TRIAN100', 0.66, 0.78, 0.07, { f: 'Montserrat', b: 1, c: '#ea580c', w: 0.4 }) ] }));
  add('Voucher/thẻ tích điểm', 'loyalty', 'Thẻ tích điểm cà phê', 'thẻ tích điểm loyalty cà phê', k => ({ bg: '#3e2723', o: [
    k.t('Tích 9 ly – Tặng 1 ly', 0.5, 0.08, 0.11, { f: 'Lobster', c: '#f5e6cc' }),
    ...[...Array(10)].map((_, i) => k.c(0.14 + (i % 5) * 0.18, 0.47 + Math.floor(i / 5) * 0.26, 0.1, i === 9 ? '#d7a86e' : 'rgba(0,0,0,0)', { st: '#d7a86e', sw: 0.012 })),
    k.t('Cà Phê Sương Mai · 0909 000 222', 0.5, 0.86, 0.06, { c: '#d7ccc8' }) ] }));
  add('Voucher/thẻ tích điểm', 'voucher', 'Voucher spa', 'voucher spa làm đẹp', k => ({ bg: k.g('#fdf2f8', '#fce7f3', 0), o: [
    k.cell(0.66, 0, 0.34, 1), k.p('leaf', 0.06, 0.82, 0.25, '#f9a8d4', { ang: 20 }),
    k.t('Gift Voucher', 0.06, 0.12, 0.2, { ox: 'left', al: 'left', f: 'Dancing Script', b: 1, c: '#9d174d', w: 0.58 }),
    k.t('Liệu trình chăm sóc da 60 phút', 0.06, 0.48, 0.08, { ox: 'left', al: 'left', b: 1, c: '#831843', w: 0.58 }), k.t('Trị giá 650.000đ · Hạn 3 tháng', 0.2, 0.7, 0.065, { ox: 'left', al: 'left', c: '#9d174d', w: 0.45 }) ] }));

  // ===== Nhãn sticker
  add('Nhãn sticker', 'label-round', 'Nhãn tròn handmade', 'nhãn tròn sticker handmade', k => ({ bg: '#fef3c7', o: [
    k.c(0.5, 0.5, 0.47, 'rgba(0,0,0,0)', { st: '#92400e', sw: 0.015 }), k.c(0.5, 0.5, 0.42, 'rgba(0,0,0,0)', { st: '#92400e', sw: 0.005 }),
    k.t('HANDMADE', 0.5, 0.18, 0.1, { f: 'Oswald', b: 1, c: '#92400e', cs: 300 }), k.p('heart', 0.5, 0.48, 0.2, '#dc2626'),
    k.t('Bánh Nhà Mây', 0.5, 0.62, 0.11, { f: 'Dancing Script', b: 1, c: '#78350f' }) ] }));
  add('Nhãn sticker', 'label-rect', 'Nhãn mật ong', 'nhãn chai lọ mật ong thực phẩm', k => ({ bg: '#facc15', o: [
    k.r(0.04, 0.06, 0.92, 0.88, '#fffbeb', { rx: 0.06 }), k.p('hexagon', 0.18, 0.5, 0.36, '#f59e0b'),
    k.t('Mật Ong Rừng', 0.62, 0.18, 0.15, { f: 'Lobster', c: '#78350f', w: 0.6 }), k.t('NGUYÊN CHẤT · 500ML', 0.62, 0.5, 0.075, { f: 'Montserrat', b: 1, c: '#a16207', cs: 150, w: 0.6 }),
    k.t('Đắk Lắk · HSD 12/2027', 0.62, 0.7, 0.07, { c: '#78350f', w: 0.6 }) ] }));
  add('Nhãn sticker', 'label-round', 'Sticker cảm ơn', 'sticker cảm ơn thank you đóng gói', k => ({ bg: '#ec4899', o: [
    k.c(0.5, 0.5, 0.44, '#fff'), k.t('Cảm ơn\nbạn!', 0.5, 0.24, 0.17, { f: 'Pacifico', c: '#ec4899', lh: 1.1 }), k.e('2764', 0.5, 0.78, 0.12) ] }));
  add('Nhãn sticker', 'fan', 'Quạt cầm tay sự kiện', 'quạt cầm tay sự kiện quảng cáo', k => ({ bg: k.rg('#fef9c3', '#fb923c'), o: [
    k.e('2600', 0.5, 0.25, 0.25), k.t('Mùa hè\nrực rỡ', 0.5, 0.42, 0.14, { f: 'Lobster', c: '#9a3412', lh: 1 }), k.t('Lễ hội âm nhạc biển 2026', 0.5, 0.75, 0.05, { b: 1, c: '#7c2d12' }) ] }));
  add('Nhãn sticker', 'tshirt', 'Hình in áo thun', 'áo thun đồng phục in', k => ({ bg: 'rgba(0,0,0,0)', o: [
    k.p('burst', 0.5, 0.4, 0.8, '#f59e0b'), k.t('SÀI GÒN', 0.5, 0.28, 0.15, { f: 'Bungee', c: '#111827' }), k.t('since 2026', 0.5, 0.44, 0.08, { f: 'Dancing Script', b: 1, c: '#111827' }),
    k.t('TEAM BUILDING', 0.5, 0.72, 0.08, { f: 'Oswald', b: 1, c: '#111827', cs: 300 }) ] }));
  add('Bài đăng FB/IG', 'avatar', 'Ảnh đại diện thương hiệu', 'avatar logo đại diện', k => ({ bg: k.g('#4f46e5', '#7c3aed', 135), o: [
    k.c(0.5, 0.5, 0.4, '#fff', { op: 0.12 }), k.t('NM', 0.5, 0.3, 0.3, { f: 'Comfortaa', b: 1, c: '#fff' }), k.t('NHÀ MÂY STUDIO', 0.5, 0.68, 0.06, { f: 'Montserrat', b: 1, c: '#e0e7ff', cs: 300 }) ] }));
  add('Story', 'wallpaper', 'Hình nền điện thoại', 'hình nền wallpaper điện thoại', k => ({ bg: k.g('#0f172a', '#312e81', 180, '#7c3aed'), o: [
    k.c(0.75, 0.2, 0.18, '#fde68a', { op: 0.9 }), k.c(0.72, 0.18, 0.15, '#0f172a', { op: 0.0 }),
    ...[...Array(14)].map((_, i) => k.c((i * 37 % 100) / 100, (i * 53 % 60) / 100, 0.006 + (i % 3) * 0.003, '#fff', { op: 0.8 })),
    k.p('M0 100 L0 60 L20 40 L35 55 L55 30 L75 50 L100 35 L100 100 Z', 0.5, 0.85, 1, '#1e1b4b', { sy: 0.5 }),
    k.t('Bình yên', 0.5, 0.42, 0.18, { f: 'Dancing Script', b: 1, c: '#fff', op: 0.9 }) ] }));

  window.LIBRARY = L; window.LIBRARY_KIT = kit;
})();
