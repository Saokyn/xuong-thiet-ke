// Offline demo for hit-testing review: open ?demo=pick. Cloud is disabled (cloud-config.js) and saving is a no-op,
// so nothing touches real designs or Supabase. Contents: overlapping rotated stars, a PNG with transparent holes, text, a locked shape.
(function () {
  if (!/[?&]demo=pick\b/.test(location.search)) return;
  const X = window.XTK; if (!X || !X.canvas) return;
  if (window.DB) { DB.put = async () => { X.toast('Chế độ demo — không lưu', 1200); }; DB.del = async () => { }; }
  const star = (cx, cy, R, r, n) => Array.from({ length: n * 2 }, (_, i) => { const a = Math.PI * i / n - Math.PI / 2, d = i % 2 ? r : R; return { x: cx + d * Math.cos(a), y: cy + d * Math.sin(a) }; });
  function ringPng() { // 400x400 PNG: opaque ring, fully transparent centre & corners
    const c = document.createElement('canvas'); c.width = c.height = 400; const g = c.getContext('2d');
    g.fillStyle = '#0ea5e9'; g.beginPath(); g.arc(200, 200, 190, 0, 7); g.arc(200, 200, 110, 0, 7, true); g.fill('evenodd');
    return c.toDataURL('image/png');
  }
  function build() {
    X.show('designer'); X.openTemplate({ id: 'demo-pick', name: 'Demo chọn đối tượng', w: 1800, h: 1200 });
    const c = X.canvas;
    c.add(new fabric.Polygon(star(0, 0, 320, 130, 5), { left: 300, top: 200, angle: 15, fill: '#f59e0b', name: 'Sao vàng' }));
    c.add(new fabric.Polygon(star(0, 0, 320, 130, 5), { left: 480, top: 300, angle: -20, fill: '#ef4444', opacity: .85, name: 'Sao đỏ' }));
    c.add(new fabric.Polygon(star(0, 0, 260, 100, 6), { left: 620, top: 160, angle: 40, fill: 'transparent', stroke: '#16a34a', strokeWidth: 6, name: 'Sao viền xanh' }));
    const lk = new fabric.Rect({ left: 1150, top: 650, width: 500, height: 400, fill: '#a78bfa', name: 'Khối khóa' }); lk.xtk = { locked: true }; lk.set({ selectable: false, evented: false }); c.add(lk);
    c.add(new fabric.Textbox('XIN CHÀO ĐÀ LẠT', { left: 900, top: 820, width: 800, fontSize: 90, fontWeight: 700, fill: '#1e293b', name: 'Chữ' }));
    fabric.Image.fromURL(ringPng(), img => {
      img.set({ left: 1000, top: 250, name: 'Vòng PNG trong suốt' }); c.add(img);
      c.discardActiveObject(); c.requestRenderAll(); X.snapshot(); X.refreshLayers();
      X.zoomAt(0.1); X.toast('Demo: zoom 10% — cuộn để phóng, chuột phải lên chỗ chồng nhau', 2500);
    });
  }
  if (document.readyState === 'complete') setTimeout(build, 300); else window.addEventListener('load', () => setTimeout(build, 300));
})();
