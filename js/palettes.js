// Bộ màu thiết kế tự sáng tạo (~48 bảng × 4 màu), phong cách bảng màu phổ biến — không sao chép tên/hex của Canva.
// Pure data + apply helpers (Node-testable). UI lives in palette-ui.js.
(function (root) {
  const CATS = ['Ấm', 'Lạnh', 'Trung tính', 'Pastel', 'Tươi', 'Sang', 'Thiên nhiên', 'Tối'];
  // Hàng màu nhanh (~24): đen/trắng/xám + accent thường dùng
  const QUICK = [
    '#111827', '#1f2937', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#f3f4f6', '#ffffff',
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6',
    '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
  ];
  // 48 bảng × 4 hex — tên tiếng Việt tự đặt, hex tự chọn
  const PALETTES = [
    // Ấm
    { name: 'Hoàng hôn phố', cat: 'Ấm', colors: ['#1c1917', '#9a3412', '#ea580c', '#fdba74'] },
    { name: 'Lửa trại', cat: 'Ấm', colors: ['#292524', '#b45309', '#f59e0b', '#fef3c7'] },
    { name: 'Đất nung', cat: 'Ấm', colors: ['#44403c', '#c2410c', '#fb923c', '#ffedd5'] },
    { name: 'Cam mật ong', cat: 'Ấm', colors: ['#431407', '#c2410c', '#f97316', '#fed7aa'] },
    { name: 'Gạch đỏ cổ', cat: 'Ấm', colors: ['#450a0a', '#991b1b', '#dc2626', '#fecaca'] },
    { name: 'Nắng chiều', cat: 'Ấm', colors: ['#422006', '#a16207', '#eab308', '#fef9c3'] },
    // Lạnh
    { name: 'Biển khơi', cat: 'Lạnh', colors: ['#0c4a6e', '#0284c7', '#38bdf8', '#e0f2fe'] },
    { name: 'Băng giá', cat: 'Lạnh', colors: ['#164e63', '#0891b2', '#67e8f9', '#ecfeff'] },
    { name: 'Sương xanh', cat: 'Lạnh', colors: ['#1e3a5f', '#3b82f6', '#93c5fd', '#dbeafe'] },
    { name: 'Đại dương sâu', cat: 'Lạnh', colors: ['#0f172a', '#1d4ed8', '#60a5fa', '#bfdbfe'] },
    { name: 'Tím sương', cat: 'Lạnh', colors: ['#312e81', '#6366f1', '#a5b4fc', '#e0e7ff'] },
    { name: 'Bạc hà lạnh', cat: 'Lạnh', colors: ['#134e4a', '#0d9488', '#5eead4', '#ccfbf1'] },
    // Trung tính
    { name: 'Than chì', cat: 'Trung tính', colors: ['#18181b', '#52525b', '#a1a1aa', '#f4f4f5'] },
    { name: 'Cát mịn', cat: 'Trung tính', colors: ['#292524', '#78716c', '#d6d3d1', '#fafaf9'] },
    { name: 'Xám bạc', cat: 'Trung tính', colors: ['#1f2937', '#6b7280', '#d1d5db', '#f9fafb'] },
    { name: 'Be nhạt', cat: 'Trung tính', colors: ['#44403c', '#a8a29e', '#e7e5e4', '#fafaf9'] },
    { name: 'Khói trắng', cat: 'Trung tính', colors: ['#374151', '#9ca3af', '#e5e7eb', '#ffffff'] },
    { name: 'Đá phiến', cat: 'Trung tính', colors: ['#0f172a', '#475569', '#94a3b8', '#f1f5f9'] },
    // Pastel
    { name: 'Kẹo bông', cat: 'Pastel', colors: ['#831843', '#f9a8d4', '#fbcfe8', '#fdf2f8'] },
    { name: 'Sữa dâu', cat: 'Pastel', colors: ['#9f1239', '#fda4af', '#fecdd3', '#fff1f2'] },
    { name: 'Bạc hà kem', cat: 'Pastel', colors: ['#065f46', '#6ee7b7', '#a7f3d0', '#ecfdf5'] },
    { name: 'Trời mây', cat: 'Pastel', colors: ['#1e40af', '#93c5fd', '#bfdbfe', '#eff6ff'] },
    { name: 'Oải hương', cat: 'Pastel', colors: ['#5b21b6', '#c4b5fd', '#ddd6fe', '#f5f3ff'] },
    { name: 'Chanh mật', cat: 'Pastel', colors: ['#854d0e', '#fde047', '#fef08a', '#fefce8'] },
    // Tươi
    { name: 'Chợ hoa', cat: 'Tươi', colors: ['#14532d', '#16a34a', '#facc15', '#fef3c7'] },
    { name: 'Năng lượng', cat: 'Tươi', colors: ['#1e1b4b', '#7c3aed', '#f43f5e', '#fb923c'] },
    { name: 'Trái cây hè', cat: 'Tươi', colors: ['#7f1d1d', '#ef4444', '#f97316', '#84cc16'] },
    { name: 'Neon phố', cat: 'Tươi', colors: ['#0f172a', '#22d3ee', '#a3e635', '#f472b6'] },
    { name: 'Cờ hội', cat: 'Tươi', colors: ['#1e3a8a', '#2563eb', '#eab308', '#ef4444'] },
    { name: 'Sáng chói', cat: 'Tươi', colors: ['#312e81', '#8b5cf6', '#ec4899', '#fbbf24'] },
    // Sang
    { name: 'Vàng đen', cat: 'Sang', colors: ['#0a0a0a', '#1c1917', '#a16207', '#fef3c7'] },
    { name: 'Tím hoàng gia', cat: 'Sang', colors: ['#1e1b4b', '#4c1d95', '#a78bfa', '#f5f3ff'] },
    { name: 'Ngọc lục', cat: 'Sang', colors: ['#022c22', '#065f46', '#34d399', '#ecfdf5'] },
    { name: 'Rượu vang', cat: 'Sang', colors: ['#1c1917', '#7f1d1d', '#be123c', '#fecdd3'] },
    { name: 'Bạc ánh kim', cat: 'Sang', colors: ['#18181b', '#3f3f46', '#a1a1aa', '#fafafa'] },
    { name: 'Đồng cổ', cat: 'Sang', colors: ['#1c1917', '#78350f', '#d97706', '#fde68a'] },
    // Thiên nhiên
    { name: 'Rừng mưa', cat: 'Thiên nhiên', colors: ['#14532d', '#166534', '#4ade80', '#dcfce7'] },
    { name: 'Đồi trà', cat: 'Thiên nhiên', colors: ['#365314', '#4d7c0f', '#a3e635', '#ecfccb'] },
    { name: 'Cát biển', cat: 'Thiên nhiên', colors: ['#78350f', '#d97706', '#fde68a', '#fffbeb'] },
    { name: 'Rêu đá', cat: 'Thiên nhiên', colors: ['#1a2e05', '#3f6212', '#65a30d', '#d9f99d'] },
    { name: 'Hồ trong', cat: 'Thiên nhiên', colors: ['#164e63', '#0e7490', '#22d3ee', '#cffafe'] },
    { name: 'Lá thu', cat: 'Thiên nhiên', colors: ['#7c2d12', '#c2410c', '#fb923c', '#fef3c7'] },
    // Tối
    { name: 'Đêm tím', cat: 'Tối', colors: ['#0f0a1a', '#2e1065', '#7c3aed', '#c4b5fd'] },
    { name: 'Than hồng', cat: 'Tối', colors: ['#0c0a09', '#44403c', '#e11d48', '#fda4af'] },
    { name: 'Mực xanh', cat: 'Tối', colors: ['#020617', '#0f172a', '#1d4ed8', '#93c5fd'] },
    { name: 'Rừng đêm', cat: 'Tối', colors: ['#052e16', '#14532d', '#16a34a', '#86efac'] },
    { name: 'Hoàng cung tối', cat: 'Tối', colors: ['#0c0a09', '#292524', '#b45309', '#fcd34d'] },
    { name: 'Sóng đêm', cat: 'Tối', colors: ['#042f2e', '#134e4a', '#14b8a6', '#99f6e4'] }
  ];

  // ---------- pure helpers ----------
  const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  const normHex = h => {
    if (!h || typeof h !== 'string') return null;
    let s = h.trim().toLowerCase();
    if (!HEX.test(s)) return null;
    if (s.length === 4) s = '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
    return s;
  };
  // Vietnamese diacritics-insensitive fold (NFD strip marks + đ/Đ)
  const fold = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();

  function filterPalettes(list, opts) {
    opts = opts || {};
    const cat = opts.cat || null, q = fold(opts.q || '');
    return (list || PALETTES).filter(p => (!cat || p.cat === cat) && (!q || fold(p.name).includes(q) || fold(p.cat).includes(q)));
  }

  // Relative luminance (sRGB, WCAG)
  function lum(hex) {
    const h = normHex(hex); if (!h) return 0.5;
    const n = parseInt(h.slice(1), 16), ch = [n >> 16, (n >> 8) & 255, n & 255].map(v => {
      const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }
  const contrastRatio = (a, b) => { const L1 = lum(a), L2 = lum(b), hi = Math.max(L1, L2), lo = Math.min(L1, L2); return (hi + 0.05) / (lo + 0.05); };

  // Light palettes → lightest as bg; dark palettes → darkest as bg
  function pickBg(colors) {
    const cs = colors.map(normHex).filter(Boolean);
    if (!cs.length) return '#ffffff';
    const sorted = cs.slice().sort((a, b) => lum(a) - lum(b));
    const avg = cs.reduce((s, c) => s + lum(c), 0) / cs.length;
    return avg < 0.42 ? sorted[0] : sorted[sorted.length - 1];
  }
  function pickTextColor(colors, bg) {
    const cs = colors.map(normHex).filter(Boolean);
    if (!cs.length) return lum(bg) > 0.5 ? '#111827' : '#ffffff';
    return cs.slice().sort((a, b) => contrastRatio(b, bg) - contrastRatio(a, bg))[0];
  }

  const isLocked = o => !!(o && o.xtk && o.xtk.locked);
  const isComposite = o => !!(o && o.xtk && o.xtk.composite);
  const isSolidStr = v => typeof v === 'string' && /^#|^rgb/i.test(v) && !/^(transparent|none)$/i.test(v.trim()) && !/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/i.test(v);
  // Gradient or Pattern fill (Fabric object)
  const isObjectFill = o => !!(o && o.fill && typeof o.fill === 'object');

  // Walk canvas → recolorable solid shapes / stroke-only lines / texts. Skips images, composites, gradients/patterns, locked, __bg.
  function collectTargets(canvas) {
    const shapes = [], texts = [], strokes = [];
    function walk(o) {
      if (!o || o.name === '__bg' || isLocked(o)) return;
      if (o.type === 'group' && !(o.xtk && o.xtk.curved)) { (o.getObjects ? o.getObjects() : o._objects || []).forEach(walk); return; }
      if (o.type === 'image' || isComposite(o) || isObjectFill(o)) return;
      if (/text/i.test(o.type || '')) { if (isSolidStr(o.fill)) texts.push(o); return; }
      if (o.type === 'line' || (o.type === 'path' && !isSolidStr(o.fill))) { if (isSolidStr(o.stroke)) strokes.push(o); return; }
      if (isSolidStr(o.fill)) shapes.push(o);
    }
    (canvas.getObjects ? canvas.getObjects() : []).forEach(walk);
    return { shapes, texts, strokes };
  }

  // Does the page currently have a pattern/gradient background rect? If so, leave it alone.
  function hasSpecialBg(canvas) {
    const objs = canvas.getObjects ? canvas.getObjects() : [];
    return objs.some(o => o.name === '__bg');
  }
  function currentSolidBg(canvas) {
    const bg = canvas.backgroundColor;
    return typeof bg === 'string' ? normHex(bg) || bg : null;
  }

  // Pure plan: { bg: hex|null, changes:[{ref, prop, color}] } — refs are the live objects (for apply) or null in tests that pass stubs
  function planApply(palette, canvas) {
    const colors = (palette.colors || []).map(normHex).filter(Boolean);
    if (colors.length < 2) return { error: 'Bảng màu cần ít nhất 2 màu.' };
    const bg = hasSpecialBg(canvas) ? null : pickBg(colors);
    const effectiveBg = bg || currentSolidBg(canvas) || '#ffffff';
    const pool = colors.filter(c => c !== bg);
    const shapeColors = pool.length ? pool : colors;
    const textColor = pickTextColor(colors, effectiveBg);
    const { shapes, texts, strokes } = collectTargets(canvas);
    const changes = [];
    shapes.forEach((o, i) => changes.push({ ref: o, prop: 'fill', color: shapeColors[i % shapeColors.length] }));
    strokes.forEach((o, i) => changes.push({ ref: o, prop: 'stroke', color: shapeColors[i % shapeColors.length] }));
    texts.forEach(o => changes.push({ ref: o, prop: 'fill', color: textColor }));
    return { bg, textColor, shapeColors, changes, counts: { shapes: shapes.length, texts: texts.length, strokes: strokes.length } };
  }

  // Apply to a live XTK session: one history step (withRestoring suppresses intermediate snapshots)
  function applyPalette(palette, X) {
    if (!X || !X.canvas) return { error: 'Chưa mở thiết kế.' };
    const plan = planApply(palette, X.canvas); if (plan.error) return plan;
    const U = root.XTK_UTIL, quiet = f => (U && U.withRestoring ? U.withRestoring(X, f) : f());
    quiet(() => {
      if (plan.bg) {
        const r = X.canvas.getObjects().find(o => o.name === '__bg');
        if (r) X.canvas.remove(r);
        X.canvas.backgroundColor = plan.bg;
      }
      plan.changes.forEach(ch => { ch.ref.set(ch.prop, ch.color); ch.ref.dirty = true; });
      X.canvas.getObjects().forEach(o => { if (o.type === 'group') { o.dirty = true; if (o.addWithUpdate) o.addWithUpdate(); } });
    });
    X.canvas.requestRenderAll();
    if (X.snapshot) X.snapshot();
    if (X.refreshLayers) X.refreshLayers();
    if (X.toast) X.toast('Đã áp bộ màu «' + palette.name + '»', 2200);
    return plan;
  }

  function validateData(list) {
    list = list || PALETTES;
    const errs = [], names = new Set();
    if (list.length < 40 || list.length > 64) errs.push('count ' + list.length);
    list.forEach((p, i) => {
      if (!p.name || !p.cat || !CATS.includes(p.cat)) errs.push('cat #' + i);
      if (names.has(p.name)) errs.push('dup ' + p.name); names.add(p.name);
      if (!Array.isArray(p.colors) || p.colors.length !== 4) errs.push('colors #' + i);
      else p.colors.forEach(c => { if (!normHex(c)) errs.push('hex ' + c); });
    });
    CATS.forEach(c => { const n = list.filter(p => p.cat === c).length; if (n < 4 || n > 10) errs.push('catsize ' + c + '=' + n); });
    return errs;
  }

  const api = {
    CATS, QUICK, PALETTES, HEX, normHex, fold, filterPalettes, lum, contrastRatio,
    pickBg, pickTextColor, isLocked, isComposite, isSolidStr, isObjectFill,
    collectTargets, hasSpecialBg, planApply, applyPalette, validateData
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.XTK_PALETTES = api;
})(typeof window !== 'undefined' ? window : globalThis);
