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
    // Colourful recognisable landscape (not a flat swatch) so Lồng ảnh is obvious in screenshots
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    const sky = g.createLinearGradient(0, 0, 0, h * 0.55);
    sky.addColorStop(0, '#38bdf8'); sky.addColorStop(0.55, '#fef3c7'); sky.addColorStop(1, '#fdba74');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fde047'; g.beginPath(); g.arc(w * 0.78, h * 0.22, Math.min(w, h) * 0.12, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#16a34a'; g.beginPath(); g.moveTo(0, h * 0.62); g.quadraticCurveTo(w * 0.25, h * 0.4, w * 0.5, h * 0.58); g.quadraticCurveTo(w * 0.75, h * 0.78, w, h * 0.55); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    g.fillStyle = '#15803d'; g.beginPath(); g.moveTo(0, h * 0.78); g.quadraticCurveTo(w * 0.4, h * 0.65, w, h * 0.85); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    g.fillStyle = '#0ea5e9'; g.fillRect(0, h * 0.88, w, h * 0.12);
    g.fillStyle = 'rgba(255,255,255,.85)'; g.font = 'bold ' + Math.round(Math.min(w, h) * 0.09) + 'px sans-serif';
    g.fillText('Đà Lạt', 12, h * 0.18);
    // checker corner so pattern vs solid is unmistakable
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      g.fillStyle = (x + y) % 2 ? '#f43f5e' : '#fff'; g.fillRect(w - 48 + x * 10, h - 48 + y * 10, 10, 10);
    }
    return c.toDataURL('image/png');
  }
  function applySel(c, text, shape, shape2, img, nested) {
    if (sel === 'multi') c.setActiveObject(new fabric.ActiveSelection([shape, shape2], { canvas: c }));
    else if (sel === 'shape' || sel === 'composite') c.setActiveObject(nested || shape);
    else if (sel === 'image' && img) c.setActiveObject(img);
    else if (sel === 'props') c.setActiveObject(text);
    else c.setActiveObject(text);
    c.requestRenderAll();
    if (window.XTK_CTX_UI) {
      if (window.XTK_CTX_UI.orderBar) window.XTK_CTX_UI.orderBar();
      window.XTK_CTX_UI.refresh();
    }
  }
  function openExtras(c, preferObj) {
    if (openColor && window.XTK_COLOR_PANEL) {
      const t = sel === 'shape' ? 'fill' : sel === 'image' ? 'fill' : sel === 'multi' ? 'fill' : 'text';
      window.XTK_COLOR_PANEL.open(t, c.getActiveObject());
    }
    if (!pop || !window.XTK_CTX_UI) return;
    const kind = pop === 'spacing' ? 'spacing' : 'effects';
    // Root cause on file://: document.fonts.ready can hang forever when @font-face fails,
    // so kicks never ran. Race with a short timeout; always schedule independent retries.
    const kick = () => {
      try {
        if (preferObj && c.getObjects().includes(preferObj)) c.setActiveObject(preferObj);
        const o = c.getActiveObject();
        if (!o) return false;
        if (window.XTK_CTX_UI.orderBar) window.XTK_CTX_UI.orderBar();
        if (window.XTK_CTX_UI.refresh) window.XTK_CTX_UI.refresh();
        const te = document.getElementById('fbTextExtra');
        const tt = document.getElementById('fbText');
        const st = document.getElementById('fbShapeTools');
        const fx = document.getElementById('fbTextFx') || document.getElementById('fbShapeFx');
        if (te && /text/i.test(o.type)) te.hidden = false;
        if (tt && /text/i.test(o.type)) tt.hidden = false;
        if (st && !/text|image|activeSelection/i.test(o.type)) st.hidden = false;
        if (!fx) return false;
        if (window.XTK_CTX_UI.holdPop) window.XTK_CTX_UI.holdPop(2500);
        if (window.XTK_CTX_UI.openPopWhenReady) return !!window.XTK_CTX_UI.openPopWhenReady(kind, 50);
        return !!(window.XTK_CTX_UI.openPop && window.XTK_CTX_UI.openPop(kind, fx));
      } catch (e) { return false; }
    };
    const schedule = () => {
      kick();
      [50, 150, 350, 700, 1200, 2000, 3200].forEach(ms => setTimeout(kick, ms));
    };
    const fontsRace = Promise.race([
      (document.fonts && document.fonts.ready) ? document.fonts.ready.catch(() => {}) : Promise.resolve(),
      new Promise(r => setTimeout(r, 400))
    ]);
    fontsRace.then(schedule);
    // Also kick immediately (don't wait for fonts at all)
    schedule();
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
    openExtras(c, text);
    const wantProps = q.get('props') === '1' || sel === 'props';
    X.toast('DEMO toolbar: sel=' + sel + (openColor ? ' · màu' : '') + (pop ? ' · pop=' + pop : '') + (wantProps ? ' · props' : ''), 3500);
    fabric.Image.fromURL(photo(240, 160), async img => {
      img.set({ left: 80, top: 520, name: 'Ảnh DEMO' }); c.add(img);
      if (sel === 'image') applySel(c, text, shape, shape2, img);
      if (sel === 'composite' && window.XTK_COMPOSITE) {
        const frame = new fabric.Rect({ left: 700, top: 240, width: 320, height: 220, fill: '#94a3b8', rx: 20, ry: 20, name: 'Hình lồng', stroke: null, strokeWidth: 0 });
        c.add(frame);
        const img2 = await new Promise(r => fabric.Image.fromURL(photo(420, 300), r, { crossOrigin: 'anonymous' }));
        img2.set({ left: 680, top: 220, name: 'Ảnh phong cảnh' }); c.add(img2);
        await window.XTK_COMPOSITE.nest([img2, frame], 'fill');
        if (q.get('zombie') === '1') {
          // Simulate lost Pattern while keeping xtk.composite → shows «Khôi phục ảnh lồng»
          frame.set('fill', '#cbd5e1'); frame.dirty = true;
          X.toast('DEMO zombie: tô mất Pattern — bấm Khôi phục ảnh lồng', 3500);
        }
        applySel(c, text, shape, shape2, img, frame);
        X.renderProps && X.renderProps();
        openExtras(c);
      }
      c.requestRenderAll();
      if (sel === 'image') openExtras(c);
      if (wantProps) {
        // nudge a prop to show session bar
        setTimeout(() => {
          const o = c.getActiveObject() || text; c.setActiveObject(o);
          X.renderProps && X.renderProps();
          o.set('opacity', 0.85); c.requestRenderAll();
          if (window.XTK_PROPS_SESSION) { window.XTK_PROPS_SESSION.noteChange(); window.XTK_PROPS_SESSION.commitMicro(); }
          X.toast('DEMO: thanh Áp dụng / Trở lại / Hủy trên Thuộc tính', 2800);
        }, 500);
      }
    }, { crossOrigin: 'anonymous' });
  }
  if (document.readyState === 'complete') setTimeout(build, 300); else window.addEventListener('load', () => setTimeout(build, 300));
})();
