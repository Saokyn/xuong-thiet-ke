// Offline DEMO for palette library: open ?demo=palette. Cloud off, save/delete no-ops. Works via file:// (no fetch).
(function () {
  if (!/[?&]demo=palette\b/.test(location.search)) return;
  const X = window.XTK; if (!X || !X.canvas) return;
  if (window.DB) { DB.put = async () => { X.toast('Chế độ DEMO — không lưu', 1200); }; DB.del = async () => { }; }
  function photo(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#38bdf8'); gr.addColorStop(1, '#a78bfa');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; g.font = 'bold 22px sans-serif'; g.fillText('ẢNH DEMO', 16, 36); return c.toDataURL('image/png');
  }
  function openBgTab() {
    const btn = document.querySelector('.rail button[data-tab="bg"]');
    if (btn) btn.click();
  }
  async function build() {
    X.show('designer'); X.openTemplate({ id: 'demo-palette', name: 'DEMO bộ màu', w: 1600, h: 1000 });
    const c = X.canvas;
    c.backgroundColor = '#f8fafc';
    c.add(new fabric.Textbox('DEMO – Bộ màu thiết kế', { left: 40, top: 24, width: 900, fontSize: 32, fill: '#64748b', name: 'Nhãn DEMO' }));
    c.add(new fabric.Rect({ left: 60, top: 100, width: 320, height: 200, fill: '#ef4444', rx: 16, ry: 16, name: 'Hình đỏ' }));
    c.add(new fabric.Ellipse({ left: 420, top: 120, rx: 140, ry: 90, fill: '#3b82f6', name: 'Elip xanh' }));
    c.add(new fabric.Triangle({ left: 740, top: 110, width: 200, height: 180, fill: '#10b981', name: 'Tam giác' }));
    c.add(new fabric.Textbox('Tiêu đề mẫu', { left: 60, top: 340, width: 500, fontSize: 56, fontWeight: 700, fontFamily: 'Be Vietnam Pro', fill: '#111827', name: 'Chữ lớn' }));
    c.add(new fabric.Textbox('Đoạn phụ — chọn bảng màu rồi bấm «Áp bộ màu».', { left: 60, top: 420, width: 700, fontSize: 28, fontFamily: 'Be Vietnam Pro', fill: '#475569', name: 'Chữ phụ' }));
    // locked shape (must be skipped by apply)
    const locked = new fabric.Rect({ left: 1000, top: 100, width: 160, height: 100, fill: '#f59e0b', name: 'Khóa (giữ nguyên)' });
    locked.xtk = { locked: true }; locked.selectable = false; locked.evented = false; c.add(locked);
    // group with two solid children
    const g = new fabric.Group([
      new fabric.Rect({ left: 0, top: 0, width: 120, height: 80, fill: '#8b5cf6', originX: 'center', originY: 'center' }),
      new fabric.Textbox('Nhóm', { left: 0, top: 0, width: 100, fontSize: 22, fill: '#ffffff', textAlign: 'center', originX: 'center', originY: 'center', fontFamily: 'Be Vietnam Pro' })
    ], { left: 1000, top: 240, name: 'Nhóm DEMO' }); c.add(g);
    fabric.Image.fromURL(photo(360, 220), img => {
      img.set({ left: 60, top: 520, name: 'Ảnh DEMO (không đổi màu)' }); c.add(img);
      c.discardActiveObject(); c.requestRenderAll(); X.resetHistory(); X.snapshot(); X.refreshLayers();
      openBgTab();
      X.toast('DEMO: tab Nền đã mở — chọn một bảng → «Áp bộ màu». Ảnh và hình khóa giữ nguyên.', 4500);
    });
  }
  if (document.readyState === 'complete') setTimeout(build, 300); else window.addEventListener('load', () => setTimeout(build, 300));
})();
