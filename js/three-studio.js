// ✨ Chữ 3D studio — Three.js (lazy). file:// OK via IIFE bundle.
(function (root) {
  'use strict';
  const BUNDLE = 'vendor/three/xtk-three.bundle.js';
  let loaded = false, loading = null, studio = null;

  const DEFAULTS = {
    text: 'C',
    fontId: 'playfair',
    mode: 'bevel', // bevel | puff | star | heart | sphere
    depth: 28,
    bevelSize: 4,
    bevelSegments: 4,
    size: 120,
    faceColor: '#f7b733',
    sideColor: '#6b0f1a',
    material: 'plastic', // plastic | rubber | metal | stone
    lightAngle: 35,
    lightIntensity: 1.15,
    env: true,
    contactShadow: true,
    rotX: -0.25,
    rotY: 0.45,
    rotZ: 0,
    viewBg: 'light' // light cream viewport (export still transparent)
  };

  const PRESETS = [
    // ExtrudeGeometry: group0=lids/bevel caps, group1=depth sides → materials [face, side]
    { id: 'vangVatDo', label: 'Vàng vát đỏ', thumb: 'C', settings: {
      text: 'C', fontId: 'playfair', mode: 'bevel', depth: 52, bevelSize: 7, bevelSegments: 6,
      faceColor: '#f7b733', sideColor: '#6b0f1a', material: 'plastic',
      lightAngle: 40, lightIntensity: 1.15, env: true, contactShadow: true,
      rotX: -0.22, rotY: 0.55, viewBg: 'light'
    } },
    { id: 'phongHong', label: 'Phồng hồng', thumb: 'H', settings: {
      text: 'H', fontId: 'baloo', mode: 'puff', depth: 36, bevelSize: 22, bevelSegments: 12,
      faceColor: '#ff7eb6', sideColor: '#e84a8a', material: 'plastic',
      lightAngle: 50, lightIntensity: 1.4, env: true, contactShadow: true,
      rotX: -0.18, rotY: -0.3, viewBg: 'light'
    } },
    { id: 'saoPhong', label: 'Sao phồng vàng', thumb: '★', settings: {
      text: '★', fontId: 'nunito', mode: 'star', depth: 24, bevelSize: 12, bevelSegments: 10,
      faceColor: '#fde047', sideColor: '#facc15', material: 'plastic',
      rotX: -0.3, rotY: 0.2, viewBg: 'light'
    } },
    { id: 'daDen', label: 'Đá đen', thumb: 'S', settings: {
      text: 'S', fontId: 'montserrat', mode: 'bevel', depth: 40, bevelSize: 5, bevelSegments: 4,
      faceColor: '#57534e', sideColor: '#292524', material: 'stone',
      lightAngle: 45, lightIntensity: 1.4, env: true, contactShadow: true,
      rotX: -0.22, rotY: 0.42, viewBg: 'light'
    } },
    { id: 'kimLoaiA', label: 'Kim loại A', thumb: 'A', settings: {
      text: 'A', fontId: 'bevietnam', mode: 'bevel', depth: 30, bevelSize: 3, bevelSegments: 4,
      faceColor: '#e2e8f0', sideColor: '#64748b', material: 'metal',
      rotX: -0.25, rotY: 0.5, viewBg: 'dark'
    } },
    { id: 'timHong', label: 'Tim phồng', thumb: '♥', settings: {
      text: '♥', fontId: 'nunito', mode: 'heart', depth: 26, bevelSize: 14, bevelSegments: 10,
      faceColor: '#fb7185', sideColor: '#fb7185', material: 'plastic',
      rotX: -0.2, rotY: 0.15, viewBg: 'light'
    } },
    { id: 'vietNam', label: 'Việt Nam', thumb: 'VN', settings: {
      text: 'Việt', fontId: 'bevietnam', mode: 'bevel', depth: 28, bevelSize: 3.5, bevelSegments: 4,
      faceColor: '#dc2626', sideColor: '#fbbf24', material: 'plastic',
      rotX: -0.2, rotY: 0.35, viewBg: 'light'
    } }
  ];

  function loadBundle() {
    if (loaded && root.THREE && root.XTK_THREE) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      if (root.THREE && root.XTK_THREE) { loaded = true; resolve(); return; }
      const s = document.createElement('script');
      s.src = BUNDLE;
      s.async = true;
      s.onload = () => { loaded = true; resolve(); };
      s.onerror = () => reject(new Error('Không tải được Three.js'));
      document.head.appendChild(s);
    });
    return loading;
  }

  function webglOk() {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
    } catch (e) { return false; }
  }

  function noiseTexture(THREE, size) {
    size = size || 128;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const img = g.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      // High-contrast grain for stone bump (visible facets + grit)
      const v = (Math.random() < 0.08 ? 30 + Math.random() * 40 : 40 + Math.random() * 180) | 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  }

  function makeMaterial(THREE, kind, color, opts) {
    opts = opts || {};
    const col = new THREE.Color(color);
    if (kind === 'metal') {
      return new THREE.MeshPhysicalMaterial({
        color: col, metalness: 0.95, roughness: 0.22, envMapIntensity: 1.4,
        clearcoat: 0.35, clearcoatRoughness: 0.25
      });
    }
    if (kind === 'rubber') {
      return new THREE.MeshStandardMaterial({
        color: col, metalness: 0.02, roughness: 0.78, envMapIntensity: 0.4
      });
    }
    if (kind === 'stone') {
      const bump = opts.noise || noiseTexture(THREE, 256);
      return new THREE.MeshStandardMaterial({
        color: col, metalness: 0.12, roughness: 0.88, bumpMap: bump, bumpScale: 1.35,
        envMapIntensity: 0.45
      });
    }
    // glossy plastic — clearcoat + low roughness + env (keep base colour saturated)
    return new THREE.MeshPhysicalMaterial({
      color: col, metalness: 0.02, roughness: 0.22, envMapIntensity: 0.85,
      clearcoat: 0.95, clearcoatRoughness: 0.18, reflectivity: 0.45
    });
  }

  function starShape(THREE, r) {
    const s = new THREE.Shape();
    const spikes = 4;
    const r0 = r, r1 = r * 0.38;
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const rad = i % 2 === 0 ? r0 : r1;
      const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
      if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
    }
    s.closePath();
    return s;
  }

  function heartShape(THREE, r) {
    const s = new THREE.Shape();
    const k = r / 60;
    s.moveTo(0, -30 * k);
    s.bezierCurveTo(0, -50 * k, -40 * k, -50 * k, -40 * k, -20 * k);
    s.bezierCurveTo(-40 * k, 10 * k, 0, 30 * k, 0, 50 * k);
    s.bezierCurveTo(0, 30 * k, 40 * k, 10 * k, 40 * k, -20 * k);
    s.bezierCurveTo(40 * k, -50 * k, 0, -50 * k, 0, -30 * k);
    return s;
  }

  function normalizeText(t) {
    t = String(t == null ? '' : t);
    try { t = t.normalize('NFC'); } catch (e) {}
    return t;
  }

  function extrudeParams(settings, hint) {
    hint = hint || {};
    const mode = settings.mode || 'bevel';
    const puff = mode === 'puff' || mode === 'star' || mode === 'heart' || mode === 'sphere';
    const letterCount = hint.letterCount != null ? hint.letterCount
      : (root.XTK_THREE_FONTS && root.XTK_THREE_FONTS.countLetters
        ? root.XTK_THREE_FONTS.countLetters(settings.text || '') : 1);
    const multi = letterCount > 1;
    let depth = Math.max(4, +(settings.depth != null ? settings.depth : 28));
    let bevelSize = puff ? Math.max(4, +settings.bevelSize || 18) : Math.max(0.5, +settings.bevelSize || 4);
    const stroke = hint.strokeMin != null ? hint.strokeMin : null;
    const strokeHalf = stroke != null ? stroke * 0.5 : null;
    let shapeInset = 0;

    if (puff && multi && strokeHalf != null && isFinite(strokeHalf)) {
      // Middle ground: rounded balloon (~70% stroke half-width) + auto tracking
      const cap = Math.max(3.5, strokeHalf * 0.7);
      bevelSize = Math.min(bevelSize, cap);
      // Circular cross-section (quarter-circle bevel rings); short mid-band = balloon
      const r = bevelSize;
      depth = Math.max(r * 1.05, Math.min(Math.max(depth * 0.55, r * 1.05), r * 2.0));
      // Inset 2D outline so outward bevel restores ~original silhouette (counters stay open)
      shapeInset = r * 0.68;
    } else if (puff) {
      // Single glyph / shape: keep very puffy balloon
      bevelSize = Math.max(bevelSize, depth * 0.55);
      depth = Math.max(depth, bevelSize * 1.1);
    }

    let bevelOffset = 0;
    if (puff && !multi) bevelOffset = -bevelSize * 0.12;

    const tracking = multi
      ? Math.max(bevelSize * 2.35 + 6, strokeHalf ? strokeHalf * 1.1 : 6)
      : 0;

    const segs = Math.max(1, Math.min(16, +(settings.bevelSegments != null ? settings.bevelSegments : (puff ? 12 : 4))));
    return {
      depth,
      bevelEnabled: true,
      // Circular bevel profile (quarter-circle rings)
      bevelThickness: puff ? bevelSize : bevelSize * 0.75,
      bevelSize,
      bevelOffset,
      bevelSegments: puff && multi ? Math.max(segs, 12) : segs,
      curveSegments: puff ? (multi ? 20 : 16) : 8,
      tracking,
      shapeInset,
      strokeMin: stroke,
      letterCount,
      multi
    };
  }

  /** Approximate 2D inset: shrink outer contours, expand holes about centroid. */
  function insetShapes(THREE, shapes, amount) {
    if (!amount || amount < 0.4 || !shapes || !shapes.length) return shapes;
    function centroid(pts) {
      let x = 0, y = 0, n = pts.length || 1;
      for (let i = 0; i < pts.length; i++) { x += pts[i].x; y += pts[i].y; }
      return { x: x / n, y: y / n };
    }
    function avgR(pts, c) {
      let r = 0;
      for (let i = 0; i < pts.length; i++) r += Math.hypot(pts[i].x - c.x, pts[i].y - c.y);
      return r / (pts.length || 1);
    }
    function scaledPath(srcPath, c, factor, Ctor) {
      const pts = srcPath.getPoints ? srcPath.getPoints(28) : [];
      if (pts.length < 3) return null;
      const p = new Ctor();
      for (let i = 0; i < pts.length; i++) {
        const x = c.x + (pts[i].x - c.x) * factor;
        const y = c.y + (pts[i].y - c.y) * factor;
        if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
      }
      p.closePath && p.closePath();
      return p;
    }
    const out = [];
    for (let i = 0; i < shapes.length; i++) {
      const sh = shapes[i];
      const pts = sh.getPoints ? sh.getPoints(32) : [];
      if (pts.length < 3) { out.push(sh); continue; }
      const c = centroid(pts);
      const ar = avgR(pts, c);
      if (ar < amount * 1.8) { out.push(sh); continue; }
      const outerF = Math.max(0.5, 1 - amount / ar);
      const ns = scaledPath(sh, c, outerF, THREE.Shape);
      if (!ns) { out.push(sh); continue; }
      ns.holes = [];
      const holes = sh.holes || [];
      for (let h = 0; h < holes.length; h++) {
        const hp = holes[h].getPoints ? holes[h].getPoints(24) : [];
        if (hp.length < 3) continue;
        const hc = centroid(hp);
        const har = avgR(hp, hc) || ar * 0.3;
        // Expand hole so counter stays open after outward bevel
        const holeF = Math.min(1.55, 1 + (amount * 0.85) / har);
        const nh = scaledPath(holes[h], hc, holeF, THREE.Path || THREE.Shape);
        if (nh) ns.holes.push(nh);
      }
      out.push(ns);
    }
    return out;
  }

  /**
   * ExtrudeGeometry groups: 0 = lids, 1 = sides+bevel rings.
   * Reclassify by face normal so bevel chamfers use face material (gold),
   * and only near-vertical depth walls use side material (maroon).
   */
  function assignFaceSideGroups(THREE, geo) {
    if (!geo || !geo.attributes || !geo.attributes.position) return geo;
    geo.computeVertexNormals();
    const pos = geo.attributes.position;
    const idx = geo.index ? geo.index.array : null;
    const triCount = idx ? (idx.length / 3) : (pos.count / 3);
    const faceTris = [];
    const sideTris = [];
    const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
    const ab = new THREE.Vector3(), ac = new THREE.Vector3(), n = new THREE.Vector3();
    for (let t = 0; t < triCount; t++) {
      let i0, i1, i2;
      if (idx) { i0 = idx[t * 3]; i1 = idx[t * 3 + 1]; i2 = idx[t * 3 + 2]; }
      else { i0 = t * 3; i1 = t * 3 + 1; i2 = t * 3 + 2; }
      va.fromBufferAttribute(pos, i0);
      vb.fromBufferAttribute(pos, i1);
      vc.fromBufferAttribute(pos, i2);
      ab.subVectors(vb, va);
      ac.subVectors(vc, va);
      n.crossVectors(ab, ac).normalize();
      // |nz| significant → lid or bevel slope → face material
      if (Math.abs(n.z) > 0.22) faceTris.push(i0, i1, i2);
      else sideTris.push(i0, i1, i2);
    }
    const newIndex = faceTris.concat(sideTris);
    geo.setIndex(newIndex);
    geo.clearGroups();
    if (faceTris.length) geo.addGroup(0, faceTris.length, 0);
    if (sideTris.length) geo.addGroup(faceTris.length, sideTris.length, 1);
    return geo;
  }

  async function buildGeometry(THREE, settings) {
    const mode = settings.mode || 'bevel';
    const size = +(settings.size || 120);

    if (mode === 'star') {
      const ep = extrudeParams(settings, { letterCount: 1 });
      const geo = new THREE.ExtrudeGeometry(starShape(THREE, size * 0.55), ep);
      return assignFaceSideGroups(THREE, geo);
    }
    if (mode === 'heart') {
      const ep = extrudeParams(settings, { letterCount: 1 });
      const geo = new THREE.ExtrudeGeometry(heartShape(THREE, size * 0.7), ep);
      return assignFaceSideGroups(THREE, geo);
    }
    if (mode === 'sphere') {
      return new THREE.SphereGeometry(size * 0.4, 48, 32);
    }

    const F = root.XTK_THREE_FONTS;
    const pack = await F.loadFont(settings.fontId || 'playfair');
    const text = normalizeText(settings.text || 'A');
    settings.text = text;
    const strokeMin = F.estimateMinStroke(pack.font, text, size);
    const letterCount = F.countLetters(text);
    const ep = extrudeParams(settings, { strokeMin, letterCount });
    const lay = F.layoutText(pack.font, text, size, {
      tracking: ep.tracking,
      diacriticLift: (ep.multi && mode === 'puff') ? Math.max(2, ep.bevelSize * 0.4) : 0
    });
    if (!lay.shapes.length) throw new Error('Không tạo được hình chữ — kiểm tra font/ký tự.');
    let shapes = lay.shapes;
    if (ep.shapeInset > 0) shapes = insetShapes(THREE, shapes, ep.shapeInset);
    settings._layout = {
      tracking: ep.tracking, bevelSize: ep.bevelSize, strokeMin, letterCount,
      shapeInset: ep.shapeInset,
      glyphs: lay.glyphs.map(g => ({
        ch: g.ch, bbox: g.bbox, holes: g.holes, stroke: g.stroke
      }))
    };
    const geo = new THREE.ExtrudeGeometry(shapes, ep);
    return assignFaceSideGroups(THREE, geo);
  }

  function centerGeo(THREE, geo) {
    geo.computeBoundingBox();
    const b = geo.boundingBox;
    const cx = (b.max.x + b.min.x) / 2;
    const cy = (b.max.y + b.min.y) / 2;
    const cz = (b.max.z + b.min.z) / 2;
    geo.translate(-cx, -cy, -cz);
    return geo;
  }

  /** Place a new object in free canvas space (template coords), prefer center. */
  function findFreeInsertPos(X, imgW, imgH) {
    const tw = (X.state && X.state.tpl && X.state.tpl.w) || 1080;
    const th = (X.state && X.state.tpl && X.state.tpl.h) || 1080;
    const pad = 24;
    const w = imgW || 400, h = imgH || 300;
    const objs = (X.canvas.getObjects && X.canvas.getObjects()) || [];

    function rectOf(o) {
      try {
        if (o.getBoundingRect) {
          const r = o.getBoundingRect(true, true);
          return { l: r.left, t: r.top, r: r.left + r.width, b: r.top + r.height };
        }
      } catch (e) {}
      const sw = (o.width || 0) * (o.scaleX || 1);
      const sh = (o.height || 0) * (o.scaleY || 1);
      return { l: o.left || 0, t: o.top || 0, r: (o.left || 0) + sw, b: (o.top || 0) + sh };
    }
    function overlaps(l, t) {
      const A = { l: l, t: t, r: l + w, b: t + h };
      for (let i = 0; i < objs.length; i++) {
        const B = rectOf(objs[i]);
        if (A.l < B.r + pad && A.r > B.l - pad && A.t < B.b + pad && A.b > B.t - pad) return true;
      }
      return false;
    }
    // Prefer visual center of template
    const candidates = [];
    candidates.push({ l: (tw - w) / 2, t: (th - h) / 2 });
    // Spiral / grid search
    const stepX = Math.max(80, w * 0.35);
    const stepY = Math.max(80, h * 0.35);
    for (let ring = 0; ring < 8; ring++) {
      for (let dy = -ring; dy <= ring; dy++) {
        for (let dx = -ring; dx <= ring; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring && ring > 0) continue;
          const l = (tw - w) / 2 + dx * stepX;
          const t = (th - h) / 2 + dy * stepY;
          if (l < pad || t < pad || l + w > tw - pad || t + h > th - pad) continue;
          candidates.push({ l, t });
        }
      }
    }
    // Also try top-right / bottom rows often free after demo grid
    candidates.push({ l: tw * 0.55, t: th * 0.55 });
    candidates.push({ l: tw * 0.35, t: th * 0.55 });
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      const l = Math.max(pad, Math.min(tw - w - pad, c.l));
      const t = Math.max(pad, Math.min(th - h - pad, c.t));
      if (!overlaps(l, t)) return { left: l, top: t };
    }
    // Fallback: canvas center even if overlapping slightly
    return { left: (tw - w) / 2, top: (th - h) / 2 };
  }

  function createStudioDom() {
    if (document.getElementById('xtk3dStudio')) return document.getElementById('xtk3dStudio');
    const el = document.createElement('div');
    el.id = 'xtk3dStudio';
    el.className = 'xtk3d-overlay';
    el.hidden = true;
    el.innerHTML = `
      <div class="xtk3d-modal" role="dialog" aria-label="Chữ 3D">
        <header class="xtk3d-head">
          <b>✨ Chữ 3D</b>
          <span class="xtk3d-sub">Xoay · chất liệu · đưa vào thiết kế</span>
          <button type="button" class="xtk3d-close" data-act="close" title="Đóng">✕</button>
        </header>
        <div class="xtk3d-body">
          <div class="xtk3d-view">
            <canvas id="xtk3dCanvas"></canvas>
            <div id="xtk3dFallback" class="xtk3d-fallback" hidden>
              Máy này không hỗ trợ WebGL — không mở được studio 3D. Hãy dùng trình duyệt có WebGL hoặc cập nhật driver đồ họa.
            </div>
            <div id="xtk3dErr" class="xtk3d-err" hidden></div>
            <div class="xtk3d-viewbar">
              <button type="button" data-act="resetView">↺ Đặt lại góc nhìn</button>
              <button type="button" data-act="toggleBg" title="Nền viewport">☀/🌙 Nền</button>
              <label>X <input data-k="rotX" type="number" step="0.05"></label>
              <label>Y <input data-k="rotY" type="number" step="0.05"></label>
              <label>Z <input data-k="rotZ" type="number" step="0.05"></label>
            </div>
          </div>
          <aside class="xtk3d-side">
            <label>Chữ <input data-k="text" type="text" maxlength="24"></label>
            <label>Font <select data-k="fontId"></select></label>
            <label>Kiểu
              <select data-k="mode">
                <option value="bevel">Khối vát cạnh</option>
                <option value="puff">Phồng (balloon)</option>
                <option value="star">Ngôi sao 4 cánh</option>
                <option value="heart">Trái tim phồng</option>
                <option value="sphere">Cầu phồng</option>
              </select>
            </label>
            <label>Độ sâu <input data-k="depth" type="range" min="6" max="80"></label>
            <label>Vát / phồng <input data-k="bevelSize" type="range" min="0" max="28" step="0.5"></label>
            <label>Đoạn vát <input data-k="bevelSegments" type="range" min="1" max="14"></label>
            <label>Cỡ <input data-k="size" type="range" min="40" max="200"></label>
            <div class="xtk3d-row">
              <label>Mặt <input data-k="faceColor" type="color"></label>
              <label>Cạnh <input data-k="sideColor" type="color"></label>
            </div>
            <label>Chất liệu
              <select data-k="material">
                <option value="plastic">Nhựa bóng</option>
                <option value="rubber">Cao su mờ</option>
                <option value="metal">Kim loại</option>
                <option value="stone">Đá nhám</option>
              </select>
            </label>
            <label>Góc đèn <input data-k="lightAngle" type="range" min="0" max="360"></label>
            <label>Cường độ đèn <input data-k="lightIntensity" type="range" min="0.2" max="2.5" step="0.05"></label>
            <label class="xtk3d-check"><input data-k="env" type="checkbox"> Phản chiếu môi trường</label>
            <label class="xtk3d-check"><input data-k="contactShadow" type="checkbox"> Đổ bóng tiếp xúc</label>
            <h5>Preset</h5>
            <div class="xtk3d-presets" id="xtk3dPresets"></div>
            <div class="xtk3d-actions">
              <button type="button" class="primary" data-act="insert">Đưa vào thiết kế</button>
              <button type="button" data-act="close">Hủy</button>
            </div>
          </aside>
        </div>
      </div>`;
    document.body.appendChild(el);
    return el;
  }

  function Studio() {
    this.settings = Object.assign({}, DEFAULTS);
    this.editing = null; // fabric object being replaced
    this.noise = null;
    this.ready = false;
    this._meshGen = 0;
    this._needsRender = true;
    this._ctxLost = false;
    this._lastError = null;
  }

  Studio.prototype.mount = async function () {
    this.el = createStudioDom();
    if (!webglOk()) {
      this.el.hidden = false;
      this.el.querySelector('#xtk3dFallback').hidden = false;
      this.el.querySelector('#xtk3dCanvas').hidden = true;
      return;
    }
    await loadBundle();
    const THREE = root.THREE;
    const { OrbitControls, RoomEnvironment } = root.XTK_THREE;
    const canvas = this.el.querySelector('#xtk3dCanvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, premultipliedAlpha: true
    });
    this.renderer.setPixelRatio(Math.min(2, root.devicePixelRatio || 1));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setClearAlpha(0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 5000);
    this.camera.position.set(0, 40, 320);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0, 0);

    this.amb = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(this.amb);
    this.key = new THREE.DirectionalLight(0xffffff, 1.2);
    this.key.position.set(120, 180, 100);
    this.scene.add(this.key);
    this.fill = new THREE.DirectionalLight(0xa5b4fc, 0.45);
    this.fill.position.set(-100, 40, -80);
    this.scene.add(this.fill);
    // Rim / back light so dark stone reads on any bg
    this.rim = new THREE.DirectionalLight(0xfff7ed, 0.85);
    this.rim.position.set(-80, 60, -160);
    this.scene.add(this.rim);

    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    try {
      const envScene = new RoomEnvironment();
      this.envRT = this.pmrem.fromScene(envScene, 0.04);
      this.scene.environment = this.envRT.texture;
      this.scene.background = null;
    } catch (e) { console.warn('RoomEnvironment', e); }
    // WebGL restore
    canvas.addEventListener('webglcontextlost', (ev) => { ev.preventDefault(); this._ctxLost = true; }, false);
    canvas.addEventListener('webglcontextrestored', () => {
      this._ctxLost = false;
      this._loopAlive = false;
      this._onResize();
      this.rebuildMesh();
      this.ensureLoop();
      this.invalidate();
    }, false);

    this.noise = noiseTexture(THREE);
    // Soft radial contact shadow (alpha fades — no hard dark rectangle in PNG)
    const sc = document.createElement('canvas'); sc.width = sc.height = 256;
    const sgx = sc.getContext('2d');
    const grd = sgx.createRadialGradient(128, 128, 10, 128, 128, 120);
    grd.addColorStop(0, 'rgba(0,0,0,0.45)');
    grd.addColorStop(0.45, 'rgba(0,0,0,0.18)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    sgx.fillStyle = grd; sgx.fillRect(0, 0, 256, 256);
    const sTex = new THREE.CanvasTexture(sc);
    const sg = new THREE.PlaneGeometry(400, 400);
    const sm = new THREE.MeshBasicMaterial({
      map: sTex, transparent: true, opacity: 0.85, depthSide: THREE.DoubleSide,
      depthWrite: false
    });
    this.shadow = new THREE.Mesh(sg, sm);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = -80;
    this.shadow.renderOrder = -1;
    this.scene.add(this.shadow);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this._fillFonts();
    this._fillPresets();
    this._bind();
    this.ready = true;
    this._onResize();
    this._tick = this._tick.bind(this);
    this._loopAlive = false;
    this.ensureLoop();
    // Watchdog: if rAF stops (exception) or canvas idle>2s while open, restart
    if (!this._watchdog && typeof setInterval === 'function') {
      this._watchdog = setInterval(() => {
        if (!this.el || this.el.hidden) return;
        const age = Date.now() - (this._lastTick || 0);
        if (age > 2000) {
          this._loopAlive = false;
          this.ensureLoop();
          this._onResize();
          this.invalidate();
        }
      }, 1500);
    }
  };

  Studio.prototype._fillFonts = function () {
    const sel = this.el.querySelector('[data-k=fontId]');
    sel.innerHTML = '';
    (root.XTK_THREE_FONTS.FONTS || []).forEach(f => {
      const o = document.createElement('option');
      o.value = f.id; o.textContent = f.label;
      sel.appendChild(o);
    });
  };

  Studio.prototype._fillPresets = function () {
    const box = this.el.querySelector('#xtk3dPresets');
    box.innerHTML = '';
    PRESETS.forEach(p => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'xtk3d-preset';
      b.title = p.label;
      b.innerHTML = '<span>' + p.thumb + '</span><small>' + p.label + '</small>';
      b.onclick = () => {
        this.el.querySelectorAll('.xtk3d-preset').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        this.applySettings(Object.assign({}, DEFAULTS, p.settings));
      };
      box.appendChild(b);
    });
  };

  Studio.prototype._bind = function () {
    const self = this;
    this.el.querySelectorAll('[data-act]').forEach(btn => {
      btn.addEventListener('click', () => {
        const a = btn.getAttribute('data-act');
        if (a === 'close') self.close();
        if (a === 'resetView') self.resetView();
        if (a === 'toggleBg') {
          self.settings.viewBg = self.settings.viewBg === 'light' ? 'dark' : 'light';
          self.applyViewBg();
        }
        if (a === 'insert') self.insertIntoDesign();
      });
    });
    this.el.querySelectorAll('[data-k]').forEach(inp => {
      const k0 = inp.getAttribute('data-k');
      const isText = k0 === 'text' || (inp.type === 'text' || inp.tagName === 'TEXTAREA');
      // Text: listen to input + compositionend (IME). Others: input/change as before.
      const ev = (inp.type === 'color' || inp.type === 'range' || inp.tagName === 'SELECT' || isText)
        ? 'input' : 'change';
      const applyVal = () => {
        const k = inp.getAttribute('data-k');
        let v;
        if (inp.type === 'checkbox') v = !!inp.checked;
        else if (inp.type === 'number' || inp.type === 'range') v = +inp.value;
        else if (k === 'text') v = normalizeText(inp.value);
        else v = inp.value;
        if (k === 'text' && inp.value !== v) inp.value = v; // keep NFC in the field
        self.settings[k] = v;
        if (k === 'rotX' || k === 'rotY' || k === 'rotZ') self._applyRot();
        else if (k === 'lightAngle' || k === 'lightIntensity') self._applyLight();
        else if (k === 'env' || k === 'contactShadow') self._applyEnvShadow();
        else self.rebuildMesh();
      };
      inp.addEventListener(ev, () => {
        if (isText && self._composing) return; // wait for compositionend
        applyVal();
      });
      if (isText) {
        inp.addEventListener('compositionstart', () => { self._composing = true; });
        inp.addEventListener('compositionend', () => {
          self._composing = false;
          applyVal();
        });
      }
    });
    window.addEventListener('resize', () => self._onResize());
  };

  Studio.prototype._syncForm = function () {
    const s = this.settings;
    this.el.querySelectorAll('[data-k]').forEach(inp => {
      const k = inp.getAttribute('data-k');
      if (!(k in s)) return;
      if (inp.type === 'checkbox') inp.checked = !!s[k];
      else inp.value = s[k];
    });
  };

  Studio.prototype._applyRot = function () {
    if (!this.mesh) return;
    this.mesh.rotation.set(+this.settings.rotX || 0, +this.settings.rotY || 0, +this.settings.rotZ || 0);
    this.invalidate();
  };

  Studio.prototype._applyLight = function () {
    if (!this.key) return;
    const a = ((+this.settings.lightAngle || 0) * Math.PI) / 180;
    const r = 200;
    this.key.position.set(Math.cos(a) * r, 160, Math.sin(a) * r);
    this.key.intensity = +this.settings.lightIntensity || 1;
    this.invalidate();
  };

  Studio.prototype.applyViewBg = function () {
    if (!this.scene || !root.THREE) return;
    const THREE = root.THREE;
    const mode = this.settings.viewBg || 'light';
    if (mode === 'light') {
      this.scene.background = new THREE.Color('#f5efe8');
      if (this.el) this.el.querySelector('.xtk3d-view')?.classList.add('light');
    } else {
      this.scene.background = new THREE.Color('#0b1220');
      if (this.el) this.el.querySelector('.xtk3d-view')?.classList.remove('light');
    }
    this.invalidate();
  };

  Studio.prototype._applyEnvShadow = function () {
    if (this.scene) {
      this.scene.environment = this.settings.env && this.envRT ? this.envRT.texture : null;
      this.applyViewBg();
      if (this.mesh) {
        const mats = this.mesh.material;
        const list = Array.isArray(mats) ? mats : [mats];
        list.forEach(m => {
          if (!m) return;
          m.envMap = this.scene.environment;
          m.needsUpdate = true;
        });
      }
    }
    if (this.shadow) this.shadow.visible = !!this.settings.contactShadow;
    this.invalidate();
  };

  Studio.prototype.applySettings = function (s) {
    this.settings = Object.assign({}, DEFAULTS, s || {});
    if (this.settings.text != null) this.settings.text = normalizeText(this.settings.text);
    this._syncForm();
    this._applyLight();
    this._applyEnvShadow();
    return this.rebuildMesh();
  };

  /** Set text (NFC) and rebuild — used by demo / tests without typing. */
  Studio.prototype.setText = function (t) {
    this.settings.text = normalizeText(t);
    this._syncForm();
    return this.rebuildMesh();
  };

  Studio.prototype.invalidate = function () {
    this._needsRender = true;
    if (this.el && !this.el.hidden && this.renderer && !this._ctxLost) {
      try {
        this.controls && this.controls.update();
        this.renderer.render(this.scene, this.camera);
      } catch (e) { /* ignore */ }
    }
  };

  Studio.prototype.fitCamera = function () {
    if (!this.mesh || !this.camera) return;
    const THREE = root.THREE;
    const box = new THREE.Box3().setFromObject(this.mesh);
    if (!isFinite(box.min.x) || box.isEmpty()) return;
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z, 1);
    if (!isFinite(maxDim) || maxDim <= 0) return;
    const dist = maxDim * 2.4;
    this.controls.target.copy(center);
    this.camera.position.set(center.x + dist * 0.15, center.y + dist * 0.25, center.z + dist);
    this.camera.near = Math.max(0.1, dist / 100);
    this.camera.far = dist * 20;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  };

  Studio.prototype.clearMesh = function () {
    if (!this.mesh) return;
    this.group.remove(this.mesh);
    try { this.mesh.geometry.dispose(); } catch (e) {}
    const old = this.mesh.material;
    try {
      if (Array.isArray(old)) old.forEach(m => m.dispose());
      else if (old) old.dispose();
    } catch (e2) {}
    this.mesh = null;
  };

  Studio.prototype.showError = function (msg) {
    this._lastError = msg;
    if (root.XTK && root.XTK.toast) root.XTK.toast(msg, 4200);
    const fb = this.el && this.el.querySelector('#xtk3dErr');
    if (fb) { fb.hidden = false; fb.textContent = msg; }
  };

  Studio.prototype.clearError = function () {
    this._lastError = null;
    const fb = this.el && this.el.querySelector('#xtk3dErr');
    if (fb) { fb.hidden = true; fb.textContent = ''; }
  };

  Studio.prototype.rebuildMesh = async function () {
    if (!this.ready) return null;
    const THREE = root.THREE;
    const gen = ++this._meshGen;
    const settings = Object.assign({}, this.settings);
    try {
      this.clearError();
      const geo = centerGeo(THREE, await buildGeometry(THREE, settings));
      if (gen !== this._meshGen) { geo.dispose(); return null; } // stale
      const face = makeMaterial(THREE, settings.material, settings.faceColor, { noise: this.noise });
      const side = makeMaterial(THREE, settings.material, settings.sideColor, { noise: this.noise });
      // Ensure env map intensity uses scene.environment
      const matsArr = [face, side];
      matsArr.forEach(m => { if (m && this.scene.environment) m.envMap = this.scene.environment; });
      // ExtrudeGeometry: addGroup(...,0)=lids/caps+bevel rings; addGroup(...,1)=depth sidewalls
      const mats = settings.mode === 'sphere' ? face : [face, side];
      this.clearMesh();
      this.mesh = new THREE.Mesh(geo, mats);
      this._applyRot();
      this.group.add(this.mesh);
      geo.computeBoundingBox();
      const b = geo.boundingBox;
      if (this.shadow && b) {
        this.shadow.position.y = b.min.y - 2;
        const span = Math.max(b.max.x - b.min.x, b.max.z - b.min.z, 40);
        this.shadow.scale.setScalar(span / 180);
      }
      this.fitCamera();
      this._onResize();
      this.ensureLoop();
      this.invalidate();
      // double-rAF to catch modal layout
      requestAnimationFrame(() => { this._onResize(); this.ensureLoop(); this.invalidate(); });
      return this.mesh;
    } catch (e) {
      console.error(e);
      // Do NOT silently keep/fallback to star — clear and show VN error
      this.clearMesh();
      this.invalidate();
      const msg = (e && e.message) ? e.message : String(e);
      const vn = /fetch|Failed|HTTP|XHR|file:\/\//i.test(msg)
        ? ('Không tải được font 3D. ' + msg + ' — trên file:// hãy dùng bản nhúng vendor/fonts-3d/data/*.js.')
        : ('Không tạo được chữ 3D: ' + msg);
      this.showError(vn);
      return null;
    }
  };

  Studio.prototype.resetView = function () {
    if (this.mesh) this.fitCamera();
    else {
      this.camera.position.set(0, 40, 320);
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    }
    this.invalidate();
  };

  Studio.prototype._onResize = function () {
    if (!this.renderer) return;
    const wrap = this.el.querySelector('.xtk3d-view');
    let w = Math.max(0, wrap.clientWidth);
    let h = Math.max(0, wrap.clientHeight - 40);
    if (w < 8 || h < 8) {
      // Modal may still be laying out — retry soon
      clearTimeout(this._resizeRetry);
      this._resizeRetry = setTimeout(() => this._onResize(), 50);
      return;
    }
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.invalidate();
  };

  Studio.prototype.ensureLoop = function () {
    if (this._loopAlive && this._raf) return;
    this._loopAlive = true;
    if (this._raf) { try { cancelAnimationFrame(this._raf); } catch (e) {} this._raf = null; }
    this._tick();
  };

  Studio.prototype._tick = function () {
    this._raf = null;
    this._lastTick = Date.now();
    this._loopAlive = true;
    try {
      if (this.el && !this.el.hidden && this.renderer && !this._ctxLost) {
        this.controls && this.controls.update();
        this.renderer.render(this.scene, this.camera);
      }
    } catch (e) {
      console.warn('xtk3d render', e);
      this._lastError = 'render: ' + (e && e.message ? e.message : e);
    }
    // Always re-schedule — an uncaught throw used to kill the rAF chain (~10s blank)
    this._raf = requestAnimationFrame(this._tick);
  };

  Studio.prototype.open = async function (opts) {
    opts = opts || {};
    this.editing = opts.editing || null;
    this._meshGen = this._meshGen || 0;
    if (!this.el) await this.mount();
    else this.el.hidden = false;
    this.el.hidden = false;
    if (!webglOk()) return;
    await this.applySettings(Object.assign({}, DEFAULTS, opts.settings || (this.editing && this.editing.xtk && this.editing.xtk.three) || {}));
    this._onResize();
    this.resetView();
    this.applyViewBg();
    this.ensureLoop();
    this.invalidate();
  };

  Studio.prototype.close = function () {
    if (this.el) this.el.hidden = true;
    this.editing = null;
  };

  /** Render transparent PNG, trimmed, long side = maxSide. Contact shadow excluded. */
  Studio.prototype.renderPNG = function (maxSide) {
    maxSide = maxSide || 2048;
    const THREE = root.THREE;
    if (!this.mesh || !this.renderer) throw new Error('Chưa có mesh 3D để xuất.');
    const prevShadow = this.shadow.visible;
    this.shadow.visible = false; // no dark rectangle behind PNG
    const prevBg = this.scene.background;
    this.scene.background = null;

    const side = Math.max(512, Math.min(2048, maxSide));
    const prevSize = new THREE.Vector2();
    this.renderer.getSize(prevSize);
    const prevAspect = this.camera.aspect;

    this.renderer.setSize(side, side, false);
    this.camera.aspect = 1;
    this.camera.updateProjectionMatrix();
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setClearAlpha(0);
    this.renderer.clear(true, true, true);
    this.renderer.render(this.scene, this.camera);

    const out = document.createElement('canvas');
    out.width = side; out.height = side;
    const ctx = out.getContext('2d', { alpha: true });
    ctx.clearRect(0, 0, side, side);
    ctx.drawImage(this.renderer.domElement, 0, 0);

    // restore view
    this.shadow.visible = prevShadow;
    this.scene.background = prevBg;
    this.applyViewBg(); // restore studio viewport bg (export used null)
    this._onResize();
    this.ensureLoop();
    this.invalidate();

    // Trim by alpha
    const id = ctx.getImageData(0, 0, side, side);
    const d = id.data;
    let minX = side, minY = side, maxX = 0, maxY = 0, ink = 0;
    for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
      const a = d[((y * side + x) << 2) + 3];
      if (a > 10) {
        ink++;
        if (x < minX) minX = x; if (y < minY) minY = y;
        if (x > maxX) maxX = x; if (y > maxY) maxY = y;
      }
    }
    if (ink < 8) throw new Error('Xuất PNG trống — mesh không vẽ được pixel.');
    const pad = 8;
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
    maxX = Math.min(side - 1, maxX + pad); maxY = Math.min(side - 1, maxY + pad);
    const tw = maxX - minX + 1, th = maxY - minY + 1;
    const trim = document.createElement('canvas');
    trim.width = tw; trim.height = th;
    const tctx = trim.getContext('2d', { alpha: true });
    tctx.clearRect(0, 0, tw, th);
    tctx.drawImage(out, minX, minY, tw, th, 0, 0, tw, th);
    const long = Math.max(tw, th);
    if (long > maxSide) {
      const sc = maxSide / long;
      const f = document.createElement('canvas');
      f.width = Math.max(1, Math.round(tw * sc));
      f.height = Math.max(1, Math.round(th * sc));
      const fctx = f.getContext('2d', { alpha: true });
      fctx.clearRect(0, 0, f.width, f.height);
      fctx.drawImage(trim, 0, 0, f.width, f.height);
      return { dataUrl: f.toDataURL('image/png'), ink: ink, w: f.width, h: f.height };
    }
    return { dataUrl: trim.toDataURL('image/png'), ink: ink, w: tw, h: th };
  };

  Studio.prototype.insertIntoDesign = function () {
    const X = root.XTK;
    if (!X || !X.canvas) { alert('Chưa mở thiết kế.'); return; }
    let rendered;
    try { rendered = this.renderPNG(2048); }
    catch (e) { this.showError(e.message || String(e)); return; }
    const dataUrl = rendered.dataUrl;
    const settings = JSON.parse(JSON.stringify(this.settings));
    const editing = this.editing;
    fabric.Image.fromURL(dataUrl, img => {
      img.set({ name: 'Chữ 3D', xtk: { three: settings } });
      const maxW = (X.state && X.state.tpl && X.state.tpl.w) ? X.state.tpl.w * 0.45 : 600;
      if (img.width > maxW) img.scaleToWidth(maxW);
      if (editing && editing.canvas === X.canvas) {
        img.set({
          left: editing.left, top: editing.top,
          scaleX: editing.scaleX, scaleY: editing.scaleY,
          angle: editing.angle,
          xtk: Object.assign({}, editing.xtk || {}, { three: settings })
        });
        const i = X.canvas.getObjects().indexOf(editing);
        X.canvas.remove(editing);
        if (i >= 0 && typeof X.canvas.insertAt === 'function') {
          try { X.canvas.insertAt(img, i); } catch (e) { X.canvas.add(img); if (X.canvas.moveTo) X.canvas.moveTo(img, i); }
        } else X.canvas.add(img);
      } else {
        const sw = img.getScaledWidth ? img.getScaledWidth() : (img.width * (img.scaleX || 1));
        const sh = img.getScaledHeight ? img.getScaledHeight() : (img.height * (img.scaleY || 1));
        const pos = findFreeInsertPos(X, sw, sh);
        img.set({ left: pos.left, top: pos.top });
        X.canvas.add(img);
      }
      X.canvas.setActiveObject(img);
      X.canvas.requestRenderAll();
      if (X.snapshot) X.snapshot();
      if (X.refreshLayers) X.refreshLayers();
      if (X.toast) X.toast('Đã đưa chữ 3D vào thiết kế', 2000);
      this.close();
    }, { crossOrigin: 'anonymous' });
  };

  async function openStudio(opts) {
    if (!studio) {
      studio = new Studio();
      await studio.mount();
    }
    await studio.open(opts || {});
    return studio;
  }

  function serializeSettings(s) { return JSON.parse(JSON.stringify(s || DEFAULTS)); }

  function wireUI() {
    // Text tab button
    let b = document.getElementById('btn3dStudio');
    if (!b) {
      const textTab = document.querySelector('.tab[data-tab=text]');
      if (textTab) {
        b = document.createElement('button');
        b.id = 'btn3dStudio';
        b.className = 'primary-ish';
        b.textContent = '✨ Chữ 3D';
        b.title = 'Mở studio chữ / khối 3D';
        const h = textTab.querySelector('h4');
        if (h && h.nextSibling) textTab.insertBefore(b, h.nextSibling);
        else textTab.appendChild(b);
      }
    }
    if (b && !b._xtk3dBound) { b._xtk3dBound = true; b.addEventListener('click', () => openStudio()); }
    // Elements: inject shortcut card once when elBody renders — also listen
    document.addEventListener('click', (e) => {
      const t = e.target.closest && e.target.closest('[data-open-3d]');
      if (t) openStudio();
    });
    // Double-click image with xtk.three → edit
    const tryBind = () => {
      const X = root.XTK;
      if (!X || !X.canvas || X.canvas._xtk3dBound) return;
      X.canvas._xtk3dBound = true;
      X.canvas.on('mouse:dblclick', opt => {
        const o = opt && opt.target;
        if (o && o.xtk && o.xtk.three) openStudio({ editing: o, settings: o.xtk.three });
      });
      // Context / float: Sửa 3D
      const fb = document.getElementById('floatBar');
      if (fb && !document.getElementById('fbEdit3d')) {
        const btn = document.createElement('button');
        btn.id = 'fbEdit3d';
        btn.textContent = '✨ Sửa 3D';
        btn.hidden = true;
        btn.onclick = () => {
          const o = X.canvas.getActiveObject();
          if (o && o.xtk && o.xtk.three) openStudio({ editing: o, settings: o.xtk.three });
        };
        fb.appendChild(btn);
        X.canvas.on('selection:created', syncFb);
        X.canvas.on('selection:updated', syncFb);
        X.canvas.on('selection:cleared', syncFb);
        function syncFb() {
          const o = X.canvas.getActiveObject();
          btn.hidden = !(o && o.xtk && o.xtk.three);
        }
      }
    };
    if (document.readyState === 'complete') setTimeout(tryBind, 400);
    else window.addEventListener('load', () => setTimeout(tryBind, 400));
    if (typeof setInterval === "function") setInterval(tryBind, 2000);
  }

  if (typeof document !== 'undefined' && document && document.body && typeof document.body.appendChild === 'function' && !root.__XTK_NODE_TEST) {
    try {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireUI);
      else wireUI();
    } catch (e) { /* ignore */ }
  }

  function getStatus() {
    const F = root.XTK_THREE_FONTS || {};
    return {
      webgl: webglOk(),
      open: !!(studio && studio.el && !studio.el.hidden),
      hasMesh: !!(studio && studio.mesh),
      lastError: studio && studio._lastError,
      settings: studio ? Object.assign({}, studio.settings) : null,
      fontStatus: Object.assign({}, F.loadStatus || {}),
      preferEmbed: F.preferEmbed ? F.preferEmbed() : null,
      protocol: (typeof location !== 'undefined' && location.protocol) || null,
      loopAlive: !!(studio && studio._loopAlive),
      lastTickAge: studio && studio._lastTick ? (Date.now() - studio._lastTick) : null,
      viewBg: studio && studio.settings && studio.settings.viewBg
    };
  }

  root.XTK_THREE_STUDIO = {
    DEFAULTS, PRESETS, open: openStudio, loadBundle, webglOk,
    serializeSettings, buildGeometry, extrudeParams, makeMaterial,
    assignFaceSideGroups, findFreeInsertPos, normalizeText, insetShapes,
    starShape, heartShape, getStatus,
    get studio() { return studio; }
  };
  try { root.__xtk3dStatus = getStatus; } catch (e) {}
})(typeof window !== 'undefined' ? window : globalThis);
