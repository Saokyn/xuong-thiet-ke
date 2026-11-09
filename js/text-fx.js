// Canva-like text/shape FX in xtk.fx; multi-pass _render (editable + PNG export).
(function (root) {
  const KINDS = {
    none: { label: 'Không', thumb: '∅' },
    extrude: { label: 'Chữ khối 3D', thumb: '3D', text: true, shape: true,
      defaults: { depth: 20, step: 1, angle: 45, outline: 0, outlineColor: '#0f172a',
        light: 315, contrast: 0.65, persp: 0.15, ground: 0.35 },
      params: [
        { k: 'depth', label: 'Độ sâu (px)', min: 6, max: 80, step: 1 },
        { k: 'angle', label: 'Góc khối', min: 20, max: 70, step: 1 },
        { k: 'color', label: 'Màu khối', type: 'color' },
        { k: 'light', label: 'Góc đèn', min: 0, max: 360, step: 5 },
        { k: 'contrast', label: 'Độ tương phản', min: 0, max: 1, step: 0.05 },
        { k: 'persp', label: 'Phối cảnh', min: 0, max: 1, step: 0.05 },
        { k: 'ground', label: 'Đổ bóng', min: 0, max: 1, step: 0.05 },
        { k: 'outline', label: 'Viền', min: 0, max: 0.1, step: 0.005 },
        { k: 'outlineColor', label: 'Màu viền', type: 'color' }
      ] },
    longShadow: { label: 'Bóng dài', thumb: '╱', text: true, shape: true,
      defaults: { length: 56, angle: 45 },
      params: [
        { k: 'length', label: 'Dài', min: 16, max: 90, step: 1 },
        { k: 'angle', label: 'Góc', min: 20, max: 70, step: 1 },
        { k: 'color', label: 'Màu bóng', type: 'color' }
      ] },
    lift: { label: 'Nổi lên', thumb: '☁', text: true, shape: true,
      defaults: {},
      params: [
        { k: 'blur', label: 'Nhòe', min: 4, max: 80, step: 1 },
        { k: 'y', label: 'Lệch', min: 2, max: 48, step: 1 },
        { k: 'color', label: 'Màu bóng', type: 'color' }
      ] },
    hollow: { label: 'Chữ rỗng', thumb: '◯', text: true, shape: false,
      defaults: { strokeW: 0.04 },
      params: [
        { k: 'strokeW', label: 'Độ dày', min: 0.02, max: 0.12, step: 0.005 },
        { k: 'stroke', label: 'Màu viền', type: 'color' }
      ] },
    splice: { label: 'Tách lớp', thumb: '⧉', text: true, shape: false,
      defaults: { strokeW: 0.045, offset: 8, angle: 45, color: '#6366f1' },
      params: [
        { k: 'strokeW', label: 'Độ dày viền', min: 0.02, max: 0.12, step: 0.005 },
        { k: 'offset', label: 'Lệch lớp', min: 2, max: 28, step: 1 },
        { k: 'angle', label: 'Hướng', min: 0, max: 360, step: 5 },
        { k: 'color', label: 'Màu lớp sau', type: 'color' },
        { k: 'stroke', label: 'Màu viền', type: 'color' }
      ] },
    emboss: { label: 'Chạm nổi', thumb: '◆', text: true, shape: true,
      defaults: {},
      params: [{ k: 'd', label: 'Cường độ', min: 1, max: 10, step: 0.5 }] },
    echo: { label: 'Tiếng vọng', thumb: 'エコー', text: true, shape: false,
      defaults: { n: 4, gap: 10, color: 'rgba(79,70,229,.55)' },
      params: [
        { k: 'n', label: 'Số lớp', min: 1, max: 6, step: 1 },
        { k: 'gap', label: 'Khoảng', min: 4, max: 20, step: 1 },
        { k: 'color', label: 'Màu', type: 'color' }
      ] },
    glitch: { label: 'Lỗi nhiễu', thumb: '▞', text: true, shape: false,
      defaults: { dx: 5, colorA: '#22d3ee', colorB: '#f472b6' },
      params: [
        { k: 'dx', label: 'Lệch', min: 1, max: 12, step: 1 },
        { k: 'colorA', label: 'Cyan', type: 'color' },
        { k: 'colorB', label: 'Hồng', type: 'color' }
      ] },
    skew: { label: 'Nghiêng phối cảnh', thumb: '▱', text: true, shape: true,
      defaults: { skewX: 22 },
      params: [{ k: 'skewX', label: 'Nghiêng', min: -35, max: 35, step: 1 }] }
  };

  // Self-authored one-click looks (not Canva assets)
  const PRESETS = [
    { id: 'retro', label: 'Retro cam tím', thumb: '🧡', fill: '#fb923c',
      fx: { kind: 'extrude', depth: 28, step: 1, angle: 48, color: '#6d28d9', outline: 0.035, outlineColor: '#1e1b4b',
        light: 320, contrast: 0.7, persp: 0.15, ground: 0.3 } },
    { id: 'goldblack', label: 'Vàng đen', thumb: '🟨', fill: '#facc15',
      fx: { kind: 'extrude', depth: 26, step: 1, angle: 42, color: '#3f3f46', outline: 0.04, outlineColor: '#0a0a0a',
        light: 310, contrast: 0.75, persp: 0.12, ground: 0.32 } },
    { id: 'longblock', label: 'Khối dài nổi', thumb: '📦', fill: '#e2e8f0',
      fx: { kind: 'extrude', depth: 52, step: 1, angle: 50, color: '#475569', outline: 0.03, outlineColor: '#0f172a',
        light: 315, contrast: 0.7, persp: 0.22, ground: 0.35 } },
    { id: 'pastel', label: 'Kẹo pastel', thumb: '🍬', fill: '#fda4af',
      fx: { kind: 'extrude', depth: 22, step: 1, angle: 40, color: '#c4b5fd', outline: 0.03, outlineColor: '#9f1239',
        light: 140, contrast: 0.6, persp: 0.12, ground: 0.28 } },
    { id: 'neon', label: 'Neon khối', thumb: '💜', fill: '#f0abfc',
      fx: { kind: 'extrude', depth: 24, step: 1, angle: 45, color: '#6d28d9', outline: 0.045, outlineColor: '#22d3ee',
        light: 300, contrast: 0.75, persp: 0.15, ground: 0.3 } },
    { id: 'spliceBlue', label: 'Tách indigo', thumb: '⧉', fill: '#0f172a',
      fx: { kind: 'splice', strokeW: 0.05, offset: 10, angle: 40, color: '#6366f1', stroke: '#0f172a' } }
  ];

  function parseRgb(c) {
    if (!c || typeof c !== 'string') return [248, 250, 252];
    c = c.trim();
    if (c[0] === '#') {
      let h = c.slice(1);
      if (h.length === 3) h = h.split('').map(x => x + x).join('');
      if (h.length >= 6) return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    const m = c.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (m) return [+m[1], +m[2], +m[3]];
    return [248, 250, 252];
  }
  function rgbStr(r, g, b, a) {
    r = Math.max(0, Math.min(255, Math.round(r)));
    g = Math.max(0, Math.min(255, Math.round(g)));
    b = Math.max(0, Math.min(255, Math.round(b)));
    if (a == null || a >= 1) return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    return 'rgba(' + r + ',' + g + ',' + b + ',' + Math.max(0, Math.min(1, a)).toFixed(3) + ')';
  }
  function luminance(rgb) { return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255; }
  function mix(a, b, t) { return a + (b - a) * t; }
  function shadeToward(rgb, target, t) {
    return [mix(rgb[0], target[0], t), mix(rgb[1], target[1], t), mix(rgb[2], target[2], t)];
  }
  function extrudeLayerColor(fill, i, depth, override) {
    if (override && typeof override === 'string' && override.startsWith('#') && i === depth) {/* still shade layers */}
    const rgb = parseRgb(override && override.startsWith('#') ? override : fill);
    const base = override && override.startsWith('#') ? parseRgb(override) : shadeToward(parseRgb(fill), [71, 85, 105], 0.45);
    const t = i / Math.max(depth, 1);
    const side = shadeToward(base, [30, 41, 59], 0.15 + 0.45 * t);
    return rgbStr(side[0], side[1], side[2]);
  }
  function contrastShadow(fill, alpha) {
    const rgb = parseRgb(fill);
    const lum = luminance(rgb);
    if (lum > 0.55) {
      const d = shadeToward(rgb, [15, 23, 42], 0.75);
      return rgbStr(d[0], d[1], d[2], alpha != null ? alpha : 0.55);
    }
    const d = shadeToward(rgb, [0, 0, 0], 0.55);
    return rgbStr(Math.min(d[0], 40), Math.min(d[1], 40), Math.min(d[2], 40), alpha != null ? alpha : 0.65);
  }
  function solidFillOf(o) {
    return (typeof o.fill === 'string' && o.fill) ? o.fill : '#f8fafc';
  }

  function ensure(o) {
    if (!o || o._xtkFxWrapped) return;
    const protoRender = o._render;
    if (typeof protoRender !== 'function') return;
    o._xtkFxOrigRender = protoRender.bind(o);
    o._render = function (ctx) {
      const fx = this.xtk && this.xtk.fx;
      if (!fx || !fx.kind || fx.kind === 'none') return this._xtkFxOrigRender(ctx);
      drawFx(this, ctx, fx, this._xtkFxOrigRender);
    };
    // Expand Fabric object-cache canvas for FX overflow; keep geometric/hit dims unchanged.
    if (typeof o._getCacheCanvasDimensions === 'function' && !o._xtkFxCacheDimsWrapped) {
      const origDims = o._getCacheCanvasDimensions.bind(o);
      o._getCacheCanvasDimensions = function () {
        const dims = origDims();
        const fx = this.xtk && this.xtk.fx;
        const pad = fxRenderPad(this, fx);
        if (pad > 0) {
          const zx = dims.zoomX || 1, zy = dims.zoomY || 1;
          dims.width += pad * 2 * zx;
          dims.height += pad * 2 * zy;
        }
        return dims;
      };
      o._xtkFxCacheDimsWrapped = true;
    }
    o._xtkFxWrapped = true;
  }
  function bumpFxCache(o) {
    if (!o) return;
    invalidateExtrudeCache(o);
    o.dirty = true;
    try {
      o._cacheWidth = 0; o._cacheHeight = 0;
      if (typeof o._set === 'function') o._set('dirty', true);
    } catch (e) { /* ignore */ }
  }

  function drawTextLike(o, ctx, fillStyle, strokeStyle, strokeWidth, dx, dy, paintFirst) {
    ctx.save();
    if (dx || dy) ctx.translate(dx || 0, dy || 0);
    const prevF = o.fill, prevS = o.stroke, prevW = o.strokeWidth, prevSh = o.shadow, prevPF = o.paintFirst;
    o.fill = fillStyle;
    o.stroke = strokeStyle;
    o.strokeWidth = strokeWidth == null ? 0 : strokeWidth;
    o.shadow = null;
    if (paintFirst) o.paintFirst = paintFirst;
    try { o._xtkFxOrigRender(ctx); } finally {
      o.fill = prevF; o.stroke = prevS; o.strokeWidth = prevW; o.shadow = prevSh; o.paintFirst = prevPF;
      ctx.restore();
    }
  }

  function extrudeTotalLen(fx) {
    const depth = Math.max(6, Math.min(80, +(fx.depth != null ? fx.depth : 18)));
    const legacy = fx.step != null ? +fx.step : 1;
    // Old presets used step>1 as spacing; convert to total px length once, then stamp at 1px
    const total = legacy > 1.05 ? Math.round(depth * legacy) : Math.round(depth);
    return Math.min(200, Math.max(6, total));
  }
  function extrudeCacheKey(o, fx, fill, totalLen, pxScale) {
    return [o.text, o.fontFamily, o.fontWeight, o.fontSize, o.fontStyle, o.width,
      fill, fx.color || '', fx.angle, totalLen, fx.outline || 0, fx.outlineColor || '',
      fx.light, fx.contrast, fx.persp, fx.ground,
      o.charSpacing || 0, o.lineHeight || 0, o.scaleX || 1, o.scaleY || 1, pxScale].join('\x1f');
  }
  function extrudePixelScale(o) {
    let s = 1;
    try {
      const c = o && o.canvas;
      if (c) {
        const ret = (typeof c.getRetinaScaling === 'function' ? c.getRetinaScaling() : (c.retinaScaling || 1)) || 1;
        const z = (typeof c.getZoom === 'function' ? c.getZoom() : 1) || 1;
        s = Math.max(1, ret * z);
      }
      const sx = Math.abs((o && o.scaleX) || 1), sy = Math.abs((o && o.scaleY) || 1);
      s *= Math.max(sx, sy, 1);
    } catch (e) { /* ignore */ }
    // Cap so we don't stamp thousands of layers
    return Math.min(4, Math.max(1, s));
  }
  function flatExtrudeColor(fill, override) {
    if (override && typeof override === 'string' && override.startsWith('#')) return override;
    return rgbStr(shadeToward(parseRgb(fill), [71, 85, 105], 0.5));
  }
  function invalidateExtrudeCache(o) { if (o) o._xtkExCache = null; }
  // Shadow offset (CSS px) + blur radius matching buildGroundShadow.
  function groundShadowMetrics(fx, totalLen) {
    const ground = Math.max(0, Math.min(1, fx && fx.ground != null ? +fx.ground : 0.35));
    const ang = (((fx && fx.angle) != null ? +fx.angle : 45) * Math.PI) / 180;
    const ux = Math.cos(ang), uy = Math.sin(ang);
    const light = fx && fx.light != null ? +fx.light : 315;
    const la = (light * Math.PI) / 180;
    const ox = ux * (totalLen * 0.35 + 6) - Math.cos(la) * (14 + totalLen * 0.12);
    const oy = uy * (totalLen * 0.35 + 6) - Math.sin(la) * (10 + totalLen * 0.1) + 6;
    const blur = Math.max(2, Math.round(5 + totalLen * 0.04));
    return { ox: ox, oy: oy, blur: blur, ground: ground };
  }
  // Pad so extrusion + soft shadow fade to 0 inside the offscreen / Fabric cache (not clipped).
  function fxRenderPad(o, fx) {
    if (!fx || !fx.kind || fx.kind === 'none') return 0;
    if (fx.kind === 'longShadow') return Math.ceil(Math.max(16, +(fx.length != null ? fx.length : 56)) + 12);
    if (fx.kind === 'lift') {
      const fs = (o && o.fontSize) || 40;
      return Math.ceil((fx.blur != null ? +fx.blur : fs * 0.25) + (fx.y != null ? +fx.y : fs * 0.12) + 8);
    }
    if (fx.kind !== 'extrude') return 8;
    const totalLen = extrudeTotalLen(fx);
    const fs = (o && o.fontSize) || 40;
    const olW = fs * Math.max(0, +(fx.outline != null ? fx.outline : 0));
    const m = groundShadowMetrics(fx, totalLen);
    // shadow offset + blur*3 so gaussian-ish fade reaches ~0; also cover extrude extent
    const shadowReach = Math.hypot(m.ox, m.oy) + m.blur * 3 + 10;
    const bodyReach = totalLen + olW + 8;
    return Math.ceil(Math.max(shadowReach, bodyReach) + (m.ground > 0.02 ? m.blur * 3 + 16 : 8));
  }
  // Build seamless extrusion (+ optional outer silhouette) into an offscreen canvas in object-local space.
  function makeOffscreenCanvas(w, h) {
    let c = null;
    try {
      const fab = (typeof fabric !== 'undefined' && fabric) || root.fabric || (typeof global !== 'undefined' && global.fabric);
      if (fab && fab.util && typeof fab.util.createCanvasElement === 'function') {
        c = fab.util.createCanvasElement();
      }
    } catch (e) { /* ignore */ }
    if (!c && typeof document !== 'undefined' && document.createElement) c = document.createElement('canvas');
    if (!c && typeof require === 'function') {
      try { c = new (require('canvas').Canvas)(w, h); } catch (e2) { /* ignore */ }
    }
    if (!c) throw new Error('no offscreen canvas');
    c.width = w; c.height = h;
    return c;
  }
  function hardThresholdAlpha(ctx, w, h, thr) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3] >= thr ? 255 : 0;
      d[i] = a; d[i + 1] = a; d[i + 2] = a; d[i + 3] = a;
    }
    ctx.putImageData(img, 0, 0);
  }
  function colorizeMask(mask, color, w, h) {
    const out = makeOffscreenCanvas(w, h);
    const g = out.getContext('2d');
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(mask, 0, 0);
    g.globalCompositeOperation = 'source-over';
    return out;
  }
  function dilateMask(mask, radius, color, w, h) {
    const r = Math.max(1, Math.ceil(radius));
    const tinted = colorizeMask(mask, color, w, h);
    const out = makeOffscreenCanvas(w, h);
    const g = out.getContext('2d');
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y > r * r + 0.25) continue;
        g.drawImage(tinted, x, y);
      }
    }
    return out;
  }
  function boxBlur1Ch(src, w, h, passes) {
    const out = new Float32Array(src);
    const tmp = new Float32Array(src.length);
    for (let p = 0; p < passes; p++) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let s = 0, c = 0;
          for (let k = -2; k <= 2; k++) {
            const xx = x + k;
            if (xx < 0 || xx >= w) continue;
            s += out[y * w + xx]; c++;
          }
          tmp[y * w + x] = s / c;
        }
      }
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let s = 0, c = 0;
          for (let k = -2; k <= 2; k++) {
            const yy = y + k;
            if (yy < 0 || yy >= h) continue;
            s += tmp[yy * w + x]; c++;
          }
          out[y * w + x] = s / c;
        }
      }
    }
    return out;
  }
  // Subtle ground shadow: low opacity, offset BEYOND the block, punched out by body so it never merges.
  function buildGroundShadow(fullMask, bodyMask, w, h, ss, lightDeg, ground, totalLen, ux, uy) {
    if (ground < 0.02) return null;
    const m = groundShadowMetrics({ light: lightDeg, ground: ground, angle: Math.atan2(uy, ux) * 180 / Math.PI }, totalLen);
    const ox = Math.round(m.ox * ss);
    const oy = Math.round(m.oy * ss);
    const tinted = colorizeMask(fullMask, '#000000', w, h);
    const out = makeOffscreenCanvas(w, h);
    const g = out.getContext('2d');
    const baseA = 0.10 + ground * 0.16;
    // Blur radius in hi-res px; pad canvas must be >= offset+rad*3 so alpha→0 before border
    const rad = Math.max(2, Math.round(m.blur * ss));
    const step = Math.max(1, Math.floor(rad / 4));
    for (let y = -rad; y <= rad; y += step) {
      for (let x = -rad; x <= rad; x += step) {
        const dist = Math.sqrt(x * x + y * y);
        if (dist > rad) continue;
        g.globalAlpha = baseA * (1 - dist / (rad + 0.01)) * 0.4;
        g.drawImage(tinted, ox + x, oy + y);
      }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'destination-out';
    g.drawImage(fullMask, 0, 0);
    g.drawImage(fullMask, 1, 0); g.drawImage(fullMask, -1, 0);
    g.drawImage(fullMask, 0, 1); g.drawImage(fullMask, 0, -1);
    g.globalCompositeOperation = 'source-over';
    return out;
  }
  // Shade preset colour: amount 1=base, >1 lighten toward white, <1 darken — never crush hue to black mush.
  function shadeBodyColor(base, amount) {
    amount = Math.max(0.5, Math.min(1.35, amount));
    if (amount >= 1) {
      const t = amount - 1; // 0..0.35
      return [
        Math.round(base[0] + (255 - base[0]) * t),
        Math.round(base[1] + (255 - base[1]) * t),
        Math.round(base[2] + (255 - base[2]) * t)
      ];
    }
    return [
      Math.round(base[0] * amount),
      Math.round(base[1] * amount),
      Math.round(base[2] * amount)
    ];
  }
  // Crisp per-face lighting: normals from glyph mask at originating sweep step (no RGB blur).
  function lightExtrudeBody(bodyMask, silMask, depthArr, w, h, bodyCol, lightDeg, contrast, ux, uy, totalLen, ss) {
    const bodyPx = bodyMask.getContext('2d').getImageData(0, 0, w, h).data;
    const silPx = silMask.getContext('2d').getImageData(0, 0, w, h).data;
    const body = new Float32Array(w * h);
    const sil = new Float32Array(w * h);
    for (let i = 0, p = 0; i < bodyPx.length; i += 4, p++) {
      body[p] = bodyPx[i + 3] > 128 ? 1 : 0;
      sil[p] = silPx[i + 3] > 128 ? 1 : 0;
    }
    // Sobel on glyph silhouette (outward)
    const sgx = new Float32Array(w * h);
    const sgy = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (!sil[i] && !sil[i - 1] && !sil[i + 1] && !sil[i - w] && !sil[i + w]) continue;
        const tl = sil[i - w - 1], tc = sil[i - w], tr = sil[i - w + 1];
        const ml = sil[i - 1], mr = sil[i + 1];
        const bl = sil[i + w - 1], bc = sil[i + w], br = sil[i + w + 1];
        sgx[i] = (tr + 2 * mr + br) - (tl + 2 * ml + bl);
        sgy[i] = (bl + 2 * bc + br) - (tl + 2 * tc + tr);
      }
    }
    // Blur normals only (smooth face planes); body RGB / silhouette stay hard — no colour blur
    const ngx = boxBlur1Ch(sgx, w, h, 6);
    const ngy = boxBlur1Ch(sgy, w, h, 6);

    const la = (lightDeg * Math.PI) / 180;
    const Lx = Math.cos(la), Ly = Math.sin(la);
    const k = Math.max(0, Math.min(1, contrast));
    const base = parseRgb(bodyCol);
    const topX = -uy, topY = ux;
    const out = makeOffscreenCanvas(w, h);
    const oid = out.getContext('2d').createImageData(w, h);
    const od = oid.data;

    function sampleN(fx, fy) {
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      if (x0 < 1 || y0 < 1 || x0 >= w - 2 || y0 >= h - 2) return [0, 0];
      const tx = fx - x0, ty = fy - y0;
      const i00 = y0 * w + x0, i10 = i00 + 1, i01 = i00 + w, i11 = i01 + 1;
      const sx = ngx[i00] * (1 - tx) * (1 - ty) + ngx[i10] * tx * (1 - ty) + ngx[i01] * (1 - tx) * ty + ngx[i11] * tx * ty;
      const sy = ngy[i00] * (1 - tx) * (1 - ty) + ngy[i10] * tx * (1 - ty) + ngy[i01] * (1 - tx) * ty + ngy[i11] * tx * ty;
      return [-sx, -sy]; // outward
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!body[i]) continue;
        const depthT = depthArr && depthArr[i] >= 0 ? depthArr[i] : 0.5;
        // Back-project to originating glyph step
        const dist = depthT * totalLen * ss;
        const sx = x - ux * dist;
        const sy = y - uy * dist;
        let nx = 0, ny = 0;
        const sn = sampleN(sx, sy);
        nx = sn[0]; ny = sn[1];
        let n2 = Math.hypot(nx, ny);
        if (n2 < 0.08) {
          // Fallback: body-mask screen normal (side of the swept solid)
          const tl = body[i - w - 1] || 0, tc = body[i - w] || 0, tr = body[i - w + 1] || 0;
          const ml = body[i - 1] || 0, mr = body[i + 1] || 0;
          const bl = body[i + w - 1] || 0, bc = body[i + w] || 0, br = body[i + w + 1] || 0;
          nx = -((tr + 2 * mr + br) - (tl + 2 * ml + bl));
          ny = -((bl + 2 * bc + br) - (tl + 2 * tc + tr));
          n2 = Math.hypot(nx, ny);
        }
        if (n2 > 1e-6) { nx /= n2; ny /= n2; }
        else { nx = topX; ny = topY; }

        const ndot = Math.max(-1, Math.min(1, nx * Lx + ny * Ly));
        // +20% toward light, -35% away (scaled by contrast)
        let amount = ndot >= 0 ? (1 + 0.20 * k * ndot) : (1 + 0.35 * k * ndot);
        // Top vs bottom of block
        const topness = nx * topX + ny * topY;
        amount += 0.08 * k * topness;
        // Gentle depth: lighter near face, darker far (keep hue)
        amount += -0.12 * depthT;
        const rgb = shadeBodyColor(base, amount);
        const o = i * 4;
        od[o] = rgb[0]; od[o + 1] = rgb[1]; od[o + 2] = rgb[2]; od[o + 3] = 255;
      }
    }
    out.getContext('2d').putImageData(oid, 0, 0);
    return out;
  }
  // Thin crisp bevel rim on front face (1 device-px), light-facing bright / away dark.
  function buildFaceBevel(faceMask, w, h, ss, lightDeg, contrast) {
    const r = Math.max(1, Math.round(ss)); // ~1 CSS px after downscale
    const dil = dilateMask(faceMask, r, '#ffffff', w, h);
    const g = dil.getContext('2d');
    g.globalCompositeOperation = 'destination-out';
    g.drawImage(faceMask, 0, 0);
    g.globalCompositeOperation = 'source-over';
    const id = g.getImageData(0, 0, w, h);
    const face = faceMask.getContext('2d').getImageData(0, 0, w, h).data;
    const d = id.data;
    const mask = new Float32Array(w * h);
    for (let i = 0, p = 0; i < face.length; i += 4, p++) mask[p] = face[i + 3] > 128 ? 1 : 0;
    const la = (lightDeg * Math.PI) / 180;
    const Lx = Math.cos(la), Ly = Math.sin(la);
    const k = Math.max(0, Math.min(1, contrast));
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const o = i * 4;
        if (d[o + 3] < 128) { d[o + 3] = 0; continue; }
        const tl = mask[i - w - 1], tc = mask[i - w], tr = mask[i - w + 1];
        const ml = mask[i - 1], mr = mask[i + 1];
        const bl = mask[i + w - 1], bc = mask[i + w], br = mask[i + w + 1];
        let nx = -((tr + 2 * mr + br) - (tl + 2 * ml + bl));
        let ny = -((bl + 2 * bc + br) - (tl + 2 * tc + tr));
        const n2 = Math.hypot(nx, ny) || 1;
        nx /= n2; ny /= n2;
        const ndot = nx * Lx + ny * Ly;
        if (ndot > 0.12) {
          d[o] = 255; d[o + 1] = 255; d[o + 2] = 255; d[o + 3] = Math.round(140 + 80 * ndot * k);
        } else if (ndot < -0.12) {
          d[o] = 0; d[o + 1] = 0; d[o + 2] = 0; d[o + 3] = Math.round(90 + 70 * (-ndot) * k);
        } else {
          d[o + 3] = 0;
        }
      }
    }
    g.putImageData(id, 0, 0);
    return dil;
  }
  // Swept solid with perspective, per-face lighting, ground shadow, face bevel.
  function buildExtrudeOffscreen(o, fx, fill, totalLen, ux, uy, olW, olC, pxScale) {
    const ss = 2;
    const scale = Math.max(1, pxScale) * ss;
    const step = 1 / scale;
    const n = Math.min(500, Math.max(1, Math.round(totalLen / step)));
    const light = fx.light != null ? +fx.light : 315;
    const contrast = fx.contrast != null ? +fx.contrast : 0.55;
    const persp = Math.max(0, Math.min(1, fx.persp != null ? +fx.persp : 0.15));
    const ground = Math.max(0, Math.min(1, fx.ground != null ? +fx.ground : 0.35));
    const pad = Math.max(fxRenderPad(o, Object.assign({}, fx, { depth: fx.depth, ground: ground })),
      Math.ceil(totalLen + olW + 24));
    const bw = Math.max(8, Math.ceil(Math.abs(o.width || 40) + pad * 2));
    const bh = Math.max(8, Math.ceil(Math.abs(o.height || 40) + pad * 2));
    const bw2 = bw * ss, bh2 = bh * ss;
    const bodyCol = flatExtrudeColor(fill, fx.color);

    const sil = makeOffscreenCanvas(bw2, bh2);
    const sg = sil.getContext('2d');
    sg.setTransform(ss, 0, 0, ss, bw2 / 2, bh2 / 2);
    drawTextLike(o, sg, '#ffffff', null, 0, 0, 0);
    sg.setTransform(1, 0, 0, 1, 0, 0);
    hardThresholdAlpha(sg, bw2, bh2, 128);

    const bodyHi = makeOffscreenCanvas(bw2, bh2);
    const fullHi = makeOffscreenCanvas(bw2, bh2);
    const faceHi = makeOffscreenCanvas(bw2, bh2);
    const bg = bodyHi.getContext('2d');
    const fg = fullHi.getContext('2d');
    const fctx = faceHi.getContext('2d');
    const depthArr = new Float32Array(bw2 * bh2);
    depthArr.fill(-1);

    function stampSil(dest, d, sc) {
      dest.save();
      dest.translate(bw2 / 2 + ux * d * ss, bh2 / 2 + uy * d * ss);
      dest.scale(sc, sc);
      dest.drawImage(sil, -bw2 / 2, -bh2 / 2);
      dest.restore();
    }
    for (let i = n; i >= 0; i--) {
      const t = i / Math.max(n, 1);
      const d = i * step;
      const sc = Math.max(0.15, 1 - persp * t);
      if (i === 0) stampSil(fctx, 0, 1); // front face full size
      stampSil(fg, d, sc);
      if (i >= 1) stampSil(bg, d, sc);
    }
    hardThresholdAlpha(bg, bw2, bh2, 1);
    hardThresholdAlpha(fg, bw2, bh2, 1);
    hardThresholdAlpha(fctx, bw2, bh2, 1);

    // Depth field: min t along extrude (near=0) for lighting — scan front→back coverage
    const tmp = makeOffscreenCanvas(bw2, bh2);
    const tg = tmp.getContext('2d');
    const cov = new Uint8Array(bw2 * bh2);
    for (let i = 0; i <= n; i++) {
      const t = i / Math.max(n, 1);
      const d = i * step;
      const sc = Math.max(0.15, 1 - persp * t);
      tg.clearRect(0, 0, bw2, bh2);
      stampSil(tg, d, sc);
      const td = tg.getImageData(0, 0, bw2, bh2).data;
      for (let p = 0, q = 0; p < td.length; p += 4, q++) {
        if (td[p + 3] < 128) continue;
        if (!cov[q]) { cov[q] = 1; depthArr[q] = t; }
      }
    }

    let outlineCanvas = null;
    if (olW > 0.5) {
      const olHi = dilateMask(fullHi, olW * ss, olC, bw2, bh2);
      outlineCanvas = makeOffscreenCanvas(bw, bh);
      const og = outlineCanvas.getContext('2d');
      og.imageSmoothingEnabled = true;
      og.drawImage(olHi, 0, 0, bw2, bh2, 0, 0, bw, bh);
    }

    const litHi = lightExtrudeBody(bodyHi, sil, depthArr, bw2, bh2, bodyCol, light, contrast, ux, uy, totalLen, ss);
    const oc = makeOffscreenCanvas(bw, bh);
    const g = oc.getContext('2d');
    // Smooth only when downscaling supersample → crisp AA outer edge, no interior blur
    g.imageSmoothingEnabled = true;
    g.drawImage(litHi, 0, 0, bw2, bh2, 0, 0, bw, bh);

    let groundCanvas = null;
    const gHi = buildGroundShadow(fullHi, bodyHi, bw2, bh2, ss, light, ground, totalLen, ux, uy);
    if (gHi) {
      groundCanvas = makeOffscreenCanvas(bw, bh);
      const gg = groundCanvas.getContext('2d');
      gg.imageSmoothingEnabled = true;
      gg.drawImage(gHi, 0, 0, bw2, bh2, 0, 0, bw, bh);
    }

    const bevelHi = buildFaceBevel(faceHi, bw2, bh2, ss, light, contrast);
    const bevelCanvas = makeOffscreenCanvas(bw, bh);
    const bvg = bevelCanvas.getContext('2d');
    bvg.imageSmoothingEnabled = true;
    bvg.drawImage(bevelHi, 0, 0, bw2, bh2, 0, 0, bw, bh);

    return {
      canvas: oc, outline: outlineCanvas, ground: groundCanvas, bevel: bevelCanvas,
      ox: bw / 2, oy: bh / 2, totalLen: totalLen, step: step, n: n, bodyCol: bodyCol, ss: ss,
      light: light, contrast: contrast, persp: persp, groundAmt: ground, pad: pad, bw: bw, bh: bh
    };
  }

  function drawFx(o, ctx, fx, orig) {
    const k = fx.kind;
    const fs = o.fontSize || 40;
    const fill = solidFillOf(o);

    if (k === 'extrude') {
      const totalLen = extrudeTotalLen(fx);
      const ang = ((fx.angle != null ? fx.angle : 45) * Math.PI) / 180;
      const ux = Math.cos(ang), uy = Math.sin(ang);
      const ol = Math.max(0, +(fx.outline != null ? fx.outline : 0));
      const olW = ol * fs;
      const olC = fx.outlineColor || '#0f172a';
      const pxScale = extrudePixelScale(o);
      const key = extrudeCacheKey(o, fx, fill, totalLen, pxScale);
      if (!o._xtkExCache || o._xtkExCache.key !== key) {
        const built = buildExtrudeOffscreen(o, fx, fill, totalLen, ux, uy, olW, olC, pxScale);
        built.key = key;
        o._xtkExCache = built;
      }
      const ex = o._xtkExCache;
      if (ex.ground) ctx.drawImage(ex.ground, -ex.ox, -ex.oy);
      if (ex.outline) ctx.drawImage(ex.outline, -ex.ox, -ex.oy);
      ctx.drawImage(ex.canvas, -ex.ox, -ex.oy);
      orig.call(o, ctx);
      if (ex.bevel) ctx.drawImage(ex.bevel, -ex.ox, -ex.oy);
      if (olW > 0.5) drawTextLike(o, ctx, '', olC, olW, 0, 0, 'stroke');
      return;
    }
    if (k === 'longShadow') {
      const len = Math.max(16, Math.min(90, +(fx.length != null ? fx.length : 56)));
      const ang = ((fx.angle != null ? fx.angle : 45) * Math.PI) / 180;
      const dx = Math.cos(ang), dy = Math.sin(ang);
      const base = fx.color ? parseRgb(fx.color) : parseRgb(contrastShadow(fill, 1));
      for (let i = len; i >= 1; i--) {
        const a = 0.7 * (1 - (i - 1) / len);
        drawTextLike(o, ctx, rgbStr(base[0], base[1], base[2], Math.max(0.08, a)), null, 0, dx * i, dy * i);
      }
      return orig.call(o, ctx);
    }
    if (k === 'lift') {
      const y = fx.y != null ? +fx.y : fs * 0.12;
      const blur = fx.blur != null ? +fx.blur : fs * 0.25;
      const col = fx.color || contrastShadow(fill, 0.45);
      const prev = o.shadow;
      const F = root.fabric || (typeof fabric !== 'undefined' ? fabric : null);
      if (F && F.Shadow) o.shadow = new F.Shadow({ color: col, blur, offsetX: 0, offsetY: y });
      else o.shadow = { color: col, blur, offsetX: 0, offsetY: y };
      try { orig.call(o, ctx); } finally { o.shadow = prev; }
      return;
    }
    if (k === 'hollow') {
      const sw = fs * (fx.strokeW != null ? +fx.strokeW : 0.04);
      const st = fx.stroke || (luminance(parseRgb(fill)) > 0.5 ? '#0f172a' : fill);
      drawTextLike(o, ctx, '', st, Math.max(1.5, sw), 0, 0, 'stroke');
      return;
    }
    if (k === 'splice') {
      // Solid colour layer behind + hollow outlined front (Canva Splice-like)
      const off = +(fx.offset != null ? fx.offset : 8);
      const ang = ((fx.angle != null ? fx.angle : 45) * Math.PI) / 180;
      const bx = Math.cos(ang) * off, by = Math.sin(ang) * off;
      const back = fx.color || '#6366f1';
      const sw = fs * (fx.strokeW != null ? +fx.strokeW : 0.045);
      const st = fx.stroke || (luminance(parseRgb(fill)) > 0.5 ? '#0f172a' : (fx._fill || fill || '#0f172a'));
      drawTextLike(o, ctx, back, null, 0, bx, by);
      drawTextLike(o, ctx, '', st, Math.max(1.5, sw), 0, 0, 'stroke');
      return;
    }
    if (k === 'emboss') {
      const d = fx.d != null ? +fx.d : Math.max(2, fs * 0.04);
      drawTextLike(o, ctx, 'rgba(255,255,255,.75)', null, 0, -d, -d);
      drawTextLike(o, ctx, 'rgba(0,0,0,.5)', null, 0, d, d);
      return orig.call(o, ctx);
    }
    if (k === 'echo') {
      const n = Math.max(1, Math.min(6, +(fx.n != null ? fx.n : 4)));
      const gap = +(fx.gap != null ? fx.gap : 10);
      const col = fx.color || 'rgba(79,70,229,.55)';
      for (let i = n; i >= 1; i--) drawTextLike(o, ctx, col, null, 0, gap * i, gap * i * 0.45);
      return orig.call(o, ctx);
    }
    if (k === 'glitch') {
      const dx = +(fx.dx != null ? fx.dx : 5);
      drawTextLike(o, ctx, fx.colorA || '#22d3ee', null, 0, -dx, 0);
      drawTextLike(o, ctx, fx.colorB || '#f472b6', null, 0, dx, 0);
      return orig.call(o, ctx);
    }
    if (k === 'skew') return orig.call(o, ctx);
    return orig.call(o, ctx);
  }

  function apply(o, kind, params) {
    if (!o) return null;
    ensure(o);
    bumpFxCache(o);
    const x = { ...(o.xtk || {}) };
    if (!kind || kind === 'none') {
      if (x.fx && x.fx.kind === 'skew') o.set('skewX', 0);
      if (x.fx && (x.fx.kind === 'hollow' || x.fx.kind === 'splice') && x.fx._fill) o.set('fill', x.fx._fill);
      delete x.fx; o.xtk = x;
      o.dirty = true; return o;
    }
    const def = (KINDS[kind] && KINDS[kind].defaults) || {};
    const prev = (x.fx && x.fx.kind === kind) ? x.fx : {};
    const fx = Object.assign({ kind }, def, prev, params || {});
    if ((kind === 'hollow' || kind === 'splice') && typeof o.fill === 'string' && o.fill && !fx._fill) fx._fill = o.fill;
    if (kind === 'extrude' && !params?.color && !prev.color) delete fx.color;
    if (kind === 'longShadow' && !params?.color && !prev.color) delete fx.color;
    x.fx = fx; o.xtk = x;
    if (kind === 'skew') o.set('skewX', +(fx.skewX != null ? fx.skewX : 22));
    o.dirty = true;
    return o;
  }

  function applyPreset(o, presetId) {
    const p = PRESETS.find(x => x.id === presetId);
    if (!o || !p) return null;
    ensure(o);
    bumpFxCache(o);
    if (p.fill) o.set('fill', p.fill);
    const fx = Object.assign({}, p.fx);
    if ((fx.kind === 'hollow' || fx.kind === 'splice') && typeof o.fill === 'string') fx._fill = o.fill;
    o.xtk = { ...(o.xtk || {}), fx, fxPreset: p.id };
    if (fx.kind === 'skew') o.set('skewX', fx.skewX || 0);
    o.dirty = true;
    return o;
  }

  function updateParam(o, key, value) {
    if (!o || !o.xtk || !o.xtk.fx) return;
    bumpFxCache(o);
    const fx = { ...o.xtk.fx, [key]: value };
    o.xtk = { ...o.xtk, fx };
    if (fx.kind === 'skew' && key === 'skewX') o.set('skewX', +value);
    o.dirty = true;
    return o;
  }

  function paramsHtml(o) {
    const fx = o && o.xtk && o.xtk.fx; if (!fx || !fx.kind || fx.kind === 'none') return '';
    const meta = KINDS[fx.kind]; if (!meta || !meta.params) return '';
    const fill = solidFillOf(o);
    return '<div class="fx-params">' + meta.params.map(p => {
      let val = fx[p.k];
      if (val == null && p.k === 'color' && (fx.kind === 'extrude' || fx.kind === 'longShadow' || fx.kind === 'lift' || fx.kind === 'splice')) {
        val = fx.kind === 'lift' ? contrastShadow(fill, 0.45) : (fx.kind === 'splice' ? '#6366f1' : extrudeLayerColor(fill, 1, 1));
      }
      if (val == null && p.k === 'outlineColor') val = '#0f172a';
      if (val == null && p.k === 'stroke') val = '#0f172a';
      if (val == null) val = (meta.defaults || {})[p.k];
      if (p.type === 'color') {
        let hex = typeof val === 'string' && val.startsWith('#') ? val.slice(0, 7) : '#1e293b';
        return `<label class="small">${p.label} <input type="color" data-fxp="${p.k}" value="${hex}"></label>`;
      }
      if (val == null && (p.k === 'y' || p.k === 'blur' || p.k === 'd')) {
        const fs = o.fontSize || 40;
        if (p.k === 'y') val = Math.round(fs * 0.12);
        if (p.k === 'blur') val = Math.round(fs * 0.25);
        if (p.k === 'd') val = Math.round(fs * 0.04 * 10) / 10;
      }
      if (val == null) val = 0;
      return `<label class="small">${p.label} <input type="range" data-fxp="${p.k}" min="${p.min}" max="${p.max}" step="${p.step}" value="${val}">
        <input type="number" data-fxp="${p.k}" min="${p.min}" max="${p.max}" step="${p.step}" value="${val}"></label>`;
    }).join('') + '</div>';
  }

  function presetsHtml(activeId) {
    return '<div class="fx-presets">' + PRESETS.map(p =>
      `<button type="button" class="fx-preset${activeId === p.id ? ' on' : ''}" data-fxpreset="${p.id}" title="${p.label}"><span>${p.thumb}</span><small>${p.label}</small></button>`
    ).join('') + '</div>';
  }

  function clear(o) { return apply(o, 'none'); }
  function installAll(canvas) { if (!canvas) return; (canvas.getObjects() || []).forEach(ensure); }

  function init(X) {
    if (!X || !X.canvas) return;
    const canvas = X.canvas;
    canvas.on('object:added', e => { if (e.target) ensure(e.target); });
    const H = (root.XTK_HOOKS = root.XTK_HOOKS || {});
    const prev = H.opened;
    H.opened = function () { installAll(canvas); if (typeof prev === 'function') prev.apply(this, arguments); };
    installAll(canvas);
    root.XTK_TEXT_FX = api;
  }

  const listFor = (isText) => Object.keys(KINDS).filter(k => {
    if (k === 'none') return true;
    const m = KINDS[k]; return isText ? m.text : m.shape;
  }).map(k => ({ id: k, ...KINDS[k] }));

  const api = { KINDS, PRESETS, listFor, apply, applyPreset, clear, ensure, installAll, init, drawFx, updateParam, paramsHtml, presetsHtml, parseRgb, shadeToward, extrudeLayerColor, contrastShadow, solidFillOf, extrudeTotalLen, invalidateExtrudeCache, extrudePixelScale, flatExtrudeColor, lightExtrudeBody, buildExtrudeOffscreen, fxRenderPad, groundShadowMetrics, bumpFxCache };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.XTK_TEXT_FX = api;
})(typeof window !== 'undefined' ? window : globalThis);
