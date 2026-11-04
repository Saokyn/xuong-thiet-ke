// Fabric helpers: frames/cells, clip shapes, curved text, shapes, lines, collage layouts.
(() => {
  const E = () => window.XTK_ELEMENTS;
  const PROPS = ['name', 'xtk', 'selectable', 'evented', 'lockMovementX', 'lockMovementY', 'lockScalingX', 'lockScalingY', 'lockRotation', 'hasControls', 'cropX', 'cropY'];
  // Placeholder image for empty frame cells
  const PH = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 400; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 400, 400); gr.addColorStop(0, '#e5e7eb'); gr.addColorStop(1, '#cbd5e1');
    g.fillStyle = gr; g.fillRect(0, 0, 400, 400);
    g.strokeStyle = '#94a3b8'; g.lineWidth = 10; g.lineJoin = 'round';
    g.strokeRect(140, 150, 120, 96); g.beginPath(); g.moveTo(150, 236); g.lineTo(190, 196); g.lineTo(215, 220); g.lineTo(232, 204); g.lineTo(252, 236); g.stroke();
    g.beginPath(); g.arc(230, 176, 10, 0, 7); g.stroke();
    g.fillStyle = '#64748b'; g.font = '600 22px "Be Vietnam Pro", sans-serif'; g.textAlign = 'center'; g.fillText('Thả ảnh vào đây', 200, 290);
    return c.toDataURL('image/png');
  })();
  function clipJSON(shape, w, h, rad = 0) {
    const base = { left: 0, top: 0, originX: 'center', originY: 'center', fill: '#000' };
    if (shape === 'circle') return { ...base, type: 'ellipse', rx: w / 2, ry: h / 2 };
    if (shape === 'rect' || shape === 'round' || !E().P[shape]) return { ...base, type: 'rect', width: w, height: h, rx: rad, ry: rad };
    const pth = new fabric.Path(E().P[shape]);
    return { ...base, type: 'path', path: E().P[shape], scaleX: w / pth.width, scaleY: h / pth.height };
  }
  function cellJSON(left, top, w, h, shape = 'rect', rad = 0) {
    let cw = 400, ch = 400; if (w / h > 1) ch = 400 * h / w; else cw = 400 * w / h;
    const s = w / cw;
    return { type: 'image', src: PH, left, top, width: cw, height: ch, cropX: (400 - cw) / 2, cropY: (400 - ch) / 2, scaleX: s, scaleY: s, clipPath: clipJSON(shape, cw, ch, rad / s), xtk: { cell: true, shape, rad }, name: 'Khung ảnh' };
  }
  const enliven = (objs) => new Promise(r => fabric.util.enlivenObjects(objs, r));
  async function makeCell(left, top, w, h, shape, rad) { return (await enliven([cellJSON(left, top, w, h, shape, rad)]))[0]; }
  const loadEl = url => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('Không tải được ảnh')); i.src = url; });
  // Put an image into a frame cell (cover fit, keeps the cell's box & clip shape)
  async function fillCell(o, url) {
    const el = await loadEl(url);
    const BW = o.width * o.scaleX, BH = o.height * o.scaleY, a = BW / BH, nw = el.naturalWidth, nh = el.naturalHeight;
    let cw, ch; if (nw / nh > a) { ch = nh; cw = nh * a; } else { cw = nw; ch = nw / a; }
    o.filters = []; o.setElement(el);
    o.set({ width: cw, height: ch, cropX: (nw - cw) / 2, cropY: (nh - ch) / 2, scaleX: BW / cw, scaleY: BH / ch });
    const x = o.xtk || {}; x.filled = true; x.nat = { w: nw, h: nh }; o.xtk = x;
    o.clipPath = (await enliven([clipJSON(x.shape || 'rect', cw, ch, (x.rad || 0) / (BW / cw))]))[0];
    o.dirty = true; o.setCoords(); return o;
  }
  async function setClip(o, shape, rad = 0) {
    o.xtk = { ...(o.xtk || {}), shape, rad };
    o.clipPath = shape === 'none' ? null : (await enliven([clipJSON(shape, o.width, o.height, rad / o.scaleX)]))[0];
    o.dirty = true;
  }
  // Curved text as a group of glyphs on an arc. radius<0 → bottom arc.
  function curvedText(opt) {
    const { text, radius, fontFamily = 'Be Vietnam Pro', fontSize = 60, fill = '#111827', fontWeight = 700, charSpacing = 0 } = opt;
    const R = Math.abs(radius), up = radius >= 0;
    const chars = [...text].map(ch => new fabric.Text(ch, { fontFamily, fontSize, fill, fontWeight, originX: 'center', originY: up ? 'bottom' : 'top' }));
    const widths = chars.map(c => c.width + fontSize * charSpacing / 1000);
    const total = widths.reduce((a, b) => a + b, 0) / R;
    let acc = -total / 2;
    chars.forEach((c, i) => {
      const phi = acc + widths[i] / R / 2; acc += widths[i] / R;
      if (up) c.set({ left: R * Math.sin(phi), top: -R * Math.cos(phi), angle: phi * 180 / Math.PI });
      else c.set({ left: R * Math.sin(phi), top: R * Math.cos(phi), angle: -phi * 180 / Math.PI });
    });
    if (!up) { /* keep reading order left→right */ }
    return new fabric.Group(chars, { name: 'Chữ cong', xtk: { curved: { text, radius, fontFamily, fontSize, fill, fontWeight, charSpacing } } });
  }
  function shape(kind, U, fill) {
    const P = E().P, n = (E().SHAPES.find(s => s[1] === kind) || [kind])[0];
    if (kind === 'rect') return new fabric.Rect({ width: U * 0.4, height: U * 0.28, fill, name: n });
    if (kind === 'round') return new fabric.Rect({ width: U * 0.4, height: U * 0.28, rx: U * 0.04, ry: U * 0.04, fill, name: n });
    if (kind === 'circle') return new fabric.Circle({ radius: U * 0.15, fill, name: n });
    if (kind === 'triangle') return new fabric.Triangle({ width: U * 0.3, height: U * 0.26, fill, name: n });
    const p = new fabric.Path(P[kind], { fill, name: n }); p.scale(U * 0.3 / Math.max(p.width, p.height)); return p;
  }
  function line(kind, U, stroke) {
    const L = U * 0.5, sw = Math.max(2, U * 0.008), n = (E().LINES.find(s => s[1] === kind) || [kind])[0];
    if (kind === 'wave') { let d = 'M0 10'; for (let i = 0; i < 8; i++) d += ` Q${i * 20 + 5} ${i % 2 ? 20 : 0} ${i * 20 + 10} 10 T${i * 20 + 20} 10`; const p = new fabric.Path(d, { fill: '', stroke, strokeWidth: 3, strokeLineCap: 'round', name: n }); p.scale(L / 160); return p; }
    if (kind === 'arrow' || kind === 'arrow2') {
      const h = sw * 4, parts = [new fabric.Line([kind === 'arrow2' ? h : 0, 0, L - h, 0], { stroke, strokeWidth: sw, originY: 'center' }), new fabric.Triangle({ width: h * 2, height: h * 2, fill: stroke, angle: 90, left: L + h * 0, top: 0, originX: 'center', originY: 'center' })];
      parts[1].set({ left: L - h }); if (kind === 'arrow2') parts.push(new fabric.Triangle({ width: h * 2, height: h * 2, fill: stroke, angle: -90, left: h, top: 0, originX: 'center', originY: 'center' }));
      return new fabric.Group(parts, { name: n });
    }
    return new fabric.Line([0, 0, L, 0], { stroke, strokeWidth: sw, strokeDashArray: kind === 'dash' ? [sw * 4, sw * 3] : kind === 'dot' ? [0, sw * 2.5] : null, strokeLineCap: 'round', name: n });
  }
  // Collage layouts: cells as [x,y,w,h] fractions
  const COLLAGE = {
    '2 dọc': [[0, 0, .5, 1], [.5, 0, .5, 1]], '2 ngang': [[0, 0, 1, .5], [0, .5, 1, .5]],
    '3 cột': [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]], '1 lớn + 2': [[0, 0, .6, 1], [.6, 0, .4, .5], [.6, .5, .4, .5]],
    '4 lưới': [[0, 0, .5, .5], [.5, 0, .5, .5], [0, .5, .5, .5], [.5, .5, .5, .5]], '1 + 3': [[0, 0, 1, .6], [0, .6, 1 / 3, .4], [1 / 3, .6, 1 / 3, .4], [2 / 3, .6, 1 / 3, .4]],
    '5 ô': [[0, 0, .5, .6], [.5, 0, .5, .6], [0, .6, 1 / 3, .4], [1 / 3, .6, 1 / 3, .4], [2 / 3, .6, 1 / 3, .4]],
    '6 lưới': [...Array(6)].map((_, i) => [(i % 3) / 3, Math.floor(i / 3) / 2, 1 / 3, .5]),
    '7 ô': [[0, 0, .5, .5], [.5, 0, .5, .5], ...[...Array(5)].map((_, i) => [i / 5, .5, .2, .5])],
    '8 ô': [...Array(8)].map((_, i) => [(i % 4) / 4, Math.floor(i / 4) / 2, .25, .5]),
    '9 lưới': [...Array(9)].map((_, i) => [(i % 3) / 3, Math.floor(i / 3) / 3, 1 / 3, 1 / 3]),
  };
  async function collage(name, W, H, gap, rad) {
    const cells = [];
    for (const [x, y, w, h] of COLLAGE[name]) cells.push(await makeCell(gap + x * (W - gap), gap + y * (H - gap), w * (W - gap) - gap, h * (H - gap) - gap, rad ? 'round' : 'rect', rad));
    return cells;
  }
  window.XTK_FX = { PROPS, PH, clipJSON, cellJSON, makeCell, fillCell, setClip, curvedText, shape, line, COLLAGE, collage, enliven, loadEl };
})();
