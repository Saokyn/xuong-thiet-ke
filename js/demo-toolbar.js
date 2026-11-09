// ?demo=toolbar[&sel=text|shape|image|multi][&color=1][&pop=effects|spacing] — file:// OK, cloud off.
(function () {
  if (!/[?&]demo=toolbar\b/.test(location.search)) return;
  const X = window.XTK; if (!X || !X.canvas) return;
  if (window.DB) { DB.put = async () => { X.toast('Chế độ DEMO — không lưu', 1200); }; DB.del = async () => { }; }
  const q = new URLSearchParams(location.search);
  const sel = q.get('sel') || 'text';
  const openColor = q.get('color') === '1';
  const pop = q.get('pop'); // effects | spacing
  function photo(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.fillStyle = '#6366f1'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = 'bold 20px sans-serif'; g.fillText('IMG', 12, 28); return c.toDataURL('image/png');
  }
  function applySel(c, text, shape, shape2, img) {
    if (sel === 'multi') c.setActiveObject(new fabric.ActiveSelection([shape, shape2], { canvas: c }));
    else if (sel === 'shape') c.setActiveObject(shape);
    else if (sel === 'image' && img) c.setActiveObject(img);
    else c.setActiveObject(text);
    c.requestRenderAll();
    if (window.XTK_CTX_UI) {
      if (window.XTK_CTX_UI.orderBar) window.XTK_CTX_UI.orderBar();
      window.XTK_CTX_UI.refresh();
    }
  }
  function openExtras(c) {
    if (openColor && window.XTK_COLOR_PANEL) {
      const t = sel === 'shape' ? 'fill' : sel === 'image' ? 'fill' : sel === 'multi' ? 'fill' : 'text';
      window.XTK_COLOR_PANEL.open(t, c.getActiveObject());
    }
    if (pop && window.XTK_CTX_UI) {
      const kind = pop === 'spacing' ? 'spacing' : 'effects';
      const open = window.XTK_CTX_UI.openPopWhenReady || window.XTK_CTX_UI.openPop;
      // After refresh/order — retry until anchors exist
      setTimeout(() => open.call(window.XTK_CTX_UI, kind), 50);
      setTimeout(() => open.call(window.XTK_CTX_UI, kind), 300);
      setTimeout(() => open.call(window.XTK_CTX_UI, kind), 700);
    }
  }
  async function build() {
    X.show('designer'); X.openTemplate({ id: 'demo-toolbar', name: 'DEMO thanh ngữ cảnh', w: 1600, h: 1000 });
    const c = X.canvas; c.backgroundColor = '#f1f5f9';
    const text = new fabric.Textbox('Thanh ngữ cảnh', { left: 80, top: 120, width: 600, fontSize: 64, fontFamily: 'Be Vietnam Pro', fontWeight: 700, fill: '#1e293b', name: 'Chữ DEMO' });
    const shape = new fabric.Rect({ left: 80, top: 280, width: 280, height: 160, fill: '#ef4444', rx: 20, ry: 20, stroke: '#111827', strokeWidth: 4, name: 'Hình DEMO' });
    const shape2 = new fabric.Ellipse({ left: 400, top: 300, rx: 100, ry: 70, fill: '#3b82f6', name: 'Elip DEMO' });
    c.add(text, shape, shape2);
    c.add(new fabric.Textbox('DEMO toolbar — chọn đối tượng hoặc ?sel=', { left: 40, top: 24, width: 900, fontSize: 24, fill: '#64748b', name: 'Nhãn' }));
    // Select immediately (do NOT wait for image) so &pop= works even if Image.fromURL is slow/fails on file://
    applySel(c, text, shape, shape2, null);
    X.resetHistory(); X.snapshot(); X.refreshLayers();
    openExtras(c);
    X.toast('DEMO toolbar: sel=' + sel + (openColor ? ' · màu' : '') + (pop ? ' · pop=' + pop : ''), 3500);
    fabric.Image.fromURL(photo(240, 160), img => {
      img.set({ left: 80, top: 520, name: 'Ảnh DEMO' }); c.add(img);
      if (sel === 'image') applySel(c, text, shape, shape2, img);
      c.requestRenderAll();
      if (sel === 'image') openExtras(c);
    }, { crossOrigin: 'anonymous' });
  }
  if (document.readyState === 'complete') setTimeout(build, 300); else window.addEventListener('load', () => setTimeout(build, 300));
})();
