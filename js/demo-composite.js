// Offline DEMO for "Lồng ảnh" review: open ?demo=composite. Cloud disabled (cloud-config.js), saving is a no-op,
// image is a generated test pattern (gradient + grid), not user content.
(function () {
  if (!/[?&]demo=composite\b/.test(location.search)) return;
  const X = window.XTK, C = window.XTK_COMPOSITE; if (!X || !X.canvas || !C) return;
  if (window.DB) { DB.put = async () => { X.toast('Chế độ DEMO — không lưu', 1200); }; DB.del = async () => { }; }
  function testImage(w, h, seed) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, seed ? '#f43f5e' : '#0ea5e9'); gr.addColorStop(.5, '#facc15'); gr.addColorStop(1, seed ? '#6366f1' : '#22c55e');
    g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2;
    for (let x = 0; x <= w; x += 50) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += 50) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = '#111'; g.font = 'bold 40px sans-serif'; g.fillText('TEST ' + w + '×' + h, 20, 60); g.beginPath(); g.arc(w / 2, h / 2, 30, 0, 7); g.fill();
    return c.toDataURL('image/png');
  }
  const star = (R, r, n) => Array.from({ length: n * 2 }, (_, i) => { const a = Math.PI * i / n - Math.PI / 2, d = i % 2 ? r : R; return { x: d * Math.cos(a), y: d * Math.sin(a) }; });
  const img = (url, o) => new Promise(r => fabric.Image.fromURL(url, i => { i.set(o); X.canvas.add(i); r(i); }));
  async function build() {
    X.show('designer'); X.openTemplate({ id: 'demo-composite', name: 'DEMO lồng ảnh', w: 1800, h: 1200 });
    const c = X.canvas;
    c.add(new fabric.Textbox('DEMO – dữ liệu thử, không lưu', { left: 40, top: 30, width: 900, fontSize: 40, fill: '#64748b', name: 'Nhãn DEMO' }));
    const circle = new fabric.Circle({ left: 80, top: 160, radius: 220, fill: '#cbd5e1', name: 'Hình tròn (đã lồng)' }); c.add(circle);
    const i1 = await img(testImage(800, 600, 0), { left: 60, top: 140, scaleX: .6, scaleY: .6, name: 'Ảnh thử 1' });
    await C.nest([i1, circle]);
    const txt = new fabric.Textbox('XIN CHÀO\nĐÀ LẠT', { left: 620, top: 160, width: 1000, fontSize: 210, fontWeight: 800, fontFamily: 'Montserrat', lineHeight: .95, fill: '#334155', angle: -6, name: 'Chữ (đã lồng)' }); c.add(txt);
    const i2 = await img(testImage(1200, 700, 1), { left: 600, top: 150, name: 'Ảnh thử 2' });
    await C.nest([i2, txt]);
    c.add(new fabric.Polygon(star(240, 100, 5), { left: 260, top: 640, angle: 18, scaleX: 1.2, fill: '#fde68a', name: 'Sao (chưa lồng)' }));
    await img(testImage(600, 600, 1), { left: 1000, top: 700, scaleX: .5, scaleY: .5, angle: 12, name: 'Ảnh thử 3 (chưa lồng)' });
    c.add(new fabric.Rect({ left: 1450, top: 700, width: 280, height: 380, rx: 30, ry: 30, fill: '#a7f3d0', name: 'Thẻ bo góc (chưa lồng)' }));
    c.discardActiveObject(); c.requestRenderAll(); X.resetHistory(); X.snapshot(); X.refreshLayers();
    X.toast('DEMO: chọn Ảnh thử 3 + Sao (Shift) → 🖼 Lồng ảnh. Bấm đúp hình tròn để chỉnh ảnh.', 3500);
  }
  if (document.readyState === 'complete') setTimeout(build, 300); else window.addEventListener('load', () => setTimeout(build, 300));
})();
