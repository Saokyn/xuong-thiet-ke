// Export: native path for normal sizes, tiled + streaming encoders for very large canvases.
const Exporter = (() => {
  const TILE_THRESHOLD = 8000;        // px per side
  const AREA_THRESHOLD = 40e6;        // px total
  const DPI = 300;

  // ---- CRC32 for PNG chunks
  const CRC = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; }
  function crc32(bufs) { let c = 0xffffffff; for (const b of bufs) for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
  function chunk(type, data) {
    const t = new TextEncoder().encode(type), len = new Uint8Array(4), crc = new Uint8Array(4);
    new DataView(len.buffer).setUint32(0, data.length);
    new DataView(crc.buffer).setUint32(0, crc32([t, data]));
    return [len, t, data, crc];
  }
  function pHYs(dpi) { const d = new Uint8Array(9), v = new DataView(d.buffer), ppm = Math.round(dpi / 0.0254); v.setUint32(0, ppm); v.setUint32(4, ppm); d[8] = 1; return d; }
  const PNG_SIG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

  // Insert/replace pHYs in an existing PNG (after IHDR)
  async function pngWithDpi(blob, dpi) {
    const b = new Uint8Array(await blob.arrayBuffer());
    const ihdrEnd = 8 + 8 + 13 + 4;
    const parts = [b.subarray(0, ihdrEnd), ...chunk('pHYs', pHYs(dpi))];
    let p = ihdrEnd; const dv = new DataView(b.buffer);
    while (p < b.length) { const L = dv.getUint32(p); const type = String.fromCharCode(...b.subarray(p + 4, p + 8)); if (type !== 'pHYs') parts.push(b.subarray(p, p + 12 + L)); p += 12 + L; }
    return new Blob(parts, { type: 'image/png' });
  }
  // Patch JFIF APP0 density (Chrome writes JFIF APP0 at offset 2)
  async function jpgWithDpi(blob, dpi) {
    const b = new Uint8Array(await blob.arrayBuffer());
    if (b[2] === 0xff && b[3] === 0xe0 && String.fromCharCode(...b.subarray(6, 10)) === 'JFIF') {
      b[13] = 1; b[14] = dpi >> 8; b[15] = dpi & 255; b[16] = dpi >> 8; b[17] = dpi & 255;
      return new Blob([b], { type: 'image/jpeg' });
    }
    const app0 = new Uint8Array([0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 1, dpi >> 8, dpi & 255, dpi >> 8, dpi & 255, 0, 0]);
    return new Blob([b.subarray(0, 2), app0, b.subarray(2)], { type: 'image/jpeg' });
  }

  // Render a region of the design (design px) at given scale into a new canvas element.
  function renderRegion(canvas, x, y, w, h, scale) {
    const saved = canvas.viewportTransform.slice();
    const objs = canvas.getObjects(); const caching = objs.map(o => o.objectCaching);
    objs.forEach(o => { o.objectCaching = false; });          // avoid down-scaled caches
    canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
    try {
      return canvas.toCanvasElement(scale, { left: x, top: y, width: w, height: h });
    } finally {
      canvas.viewportTransform = saved;
      objs.forEach((o, i) => { o.objectCaching = caching[i]; });
    }
  }

  const tick = () => new Promise(r => setTimeout(r, 0));

  async function exportDesign(canvas, W, H, { format = 'png', scale = 1, quality = 0.92, onProgress = () => {} } = {}) {
    const ow = Math.round(W * scale), oh = Math.round(H * scale);
    const big = ow > TILE_THRESHOLD || oh > TILE_THRESHOLD || ow * oh > AREA_THRESHOLD;
    canvas.discardActiveObject(); canvas.requestRenderAll();
    if (!big) {
      onProgress(0.2, 'Đang dựng ảnh…');
      const el = renderRegion(canvas, 0, 0, W, H, scale);
      if (format === 'jpg') {
        const c2 = document.createElement('canvas'); c2.width = el.width; c2.height = el.height;
        const g = c2.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c2.width, c2.height); g.drawImage(el, 0, 0);
        const blob = await new Promise(r => c2.toBlob(r, 'image/jpeg', quality));
        onProgress(1, 'Xong'); return { blob: await jpgWithDpi(blob, DPI), width: el.width, height: el.height, tiled: false };
      }
      const blob = await new Promise(r => el.toBlob(r, 'image/png'));
      onProgress(1, 'Xong'); return { blob: await pngWithDpi(blob, DPI), width: el.width, height: el.height, tiled: false };
    }
    // ---- Tiled: render horizontal strips, stream them into an encoder, never hold the full bitmap.
    let stripH = Math.max(8, Math.min(2048, Math.floor(12e6 / ow / 8) * 8));   // ~48MB RGBA per strip
    const strips = Math.ceil(oh / stripH);
    const tile = document.createElement('canvas'); tile.width = ow; tile.height = stripH;
    const tg = tile.getContext('2d', { willReadFrequently: true });
    const getStrip = (i) => {
      const y0 = i * stripH, h = Math.min(stripH, oh - y0);
      const el = renderRegion(canvas, 0, y0 / scale, W, h / scale, scale);
      tg.clearRect(0, 0, ow, stripH);
      if (format === 'jpg') { tg.fillStyle = '#fff'; tg.fillRect(0, 0, ow, h); }
      tg.drawImage(el, 0, 0);
      el.width = el.height = 0;
      return { data: tg.getImageData(0, 0, ow, h).data, h };
    };
    if (format === 'jpg') {
      const enc = new window.StreamJPEGEncoder(Math.round(quality * 100), DPI);
      const parts = [enc.begin(ow, oh)];
      for (let i = 0; i < strips; i++) {
        const { data, h } = getStrip(i); parts.push(enc.addStrip(data, h));
        onProgress((i + 1) / strips, `Mảnh ${i + 1}/${strips}`); await tick();
      }
      parts.push(enc.finish());
      return { blob: new Blob(parts, { type: 'image/jpeg' }), width: ow, height: oh, tiled: true, strips };
    }
    // PNG streaming: zlib via CompressionStream('deflate'), each output chunk -> one IDAT
    const ihdr = new Uint8Array(13); const dv = new DataView(ihdr.buffer);
    dv.setUint32(0, ow); dv.setUint32(4, oh); ihdr[8] = 8; ihdr[9] = 6; // RGBA
    const parts = [PNG_SIG, ...chunk('IHDR', ihdr), ...chunk('pHYs', pHYs(DPI))];
    const cs = new CompressionStream('deflate'); const writer = cs.writable.getWriter(); const reader = cs.readable.getReader();
    const reading = (async () => { for (;;) { const { value, done } = await reader.read(); if (done) break; parts.push(...chunk('IDAT', value)); } })();
    const rowLen = ow * 4 + 1;
    for (let i = 0; i < strips; i++) {
      const { data, h } = getStrip(i);
      const raw = new Uint8Array(rowLen * h);
      for (let r = 0; r < h; r++) { raw[r * rowLen] = 0; raw.set(data.subarray(r * ow * 4, (r + 1) * ow * 4), r * rowLen + 1); }
      await writer.write(raw);
      onProgress((i + 1) / strips, `Mảnh ${i + 1}/${strips}`); await tick();
    }
    await writer.close(); await reading;
    parts.push(...chunk('IEND', new Uint8Array(0)));
    return { blob: new Blob(parts, { type: 'image/png' }), width: ow, height: oh, tiled: true, strips };
  }
  return { exportDesign, TILE_THRESHOLD };
})();
window.Exporter = Exporter;
