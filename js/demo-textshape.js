// Offline DEMO for text + shape booleans and image-in-text: open ?demo=textshape.
// Cloud disabled (cloud-config.js), save/delete are no-ops, the photo is a generated test pattern. Not user content.
(function () {
  if (!/[?&]demo=textshape\b/.test(location.search)) return;
  const X = window.XTK; if (!X || !X.canvas) return;
  if (window.DB) { DB.put = async () => { X.toast('Chế độ DEMO — không lưu', 1200); }; DB.del = async () => { }; }
  function photo(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#0ea5e9'); gr.addColorStop(.45, '#f472b6'); gr.addColorStop(1, '#f59e0b'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { g.fillStyle = `hsla(${(i * 37) % 360},80%,60%,.35)`; g.beginPath(); g.arc((i * 97) % w, (i * 53) % h, 20 + (i * 13) % 60, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(0,0,0,.25)'; for (let x = 0; x <= w; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    g.fillStyle = '#111'; g.font = 'bold 28px sans-serif'; g.fillText('ẢNH THỬ (DEMO)', 16, 40); return c.toDataURL('image/png');
  }
  const txt = (o) => new fabric.Textbox('VIỀN NỔI', { fontFamily: 'Be Vietnam Pro', fontWeight: 700, fontSize: 130, fill: '#facc15', stroke: '#1e293b', strokeWidth: 9, strokeLineJoin: 'round', paintFirst: 'stroke', textAlign: 'center', ...o });
  async function build() {
    try { await document.fonts.load('700 130px "Be Vietnam Pro"', 'VIỀN NỔI'); } catch (e) { }
    X.show('designer'); X.openTemplate({ id: 'demo-textshape', name: 'DEMO chữ + hình', w: 1800, h: 1200 });
    const c = X.canvas;
    c.add(new fabric.Textbox('DEMO – dữ liệu thử, không lưu, không đồng bộ', { left: 40, top: 24, width: 1100, fontSize: 36, fill: '#64748b', name: 'Nhãn DEMO' }));
    // checkerboard under area 1 so cut letters visibly become transparent holes (not white fills)
    const ck = document.createElement('canvas'); ck.width = ck.height = 40; const cg = ck.getContext('2d'); cg.fillStyle = '#e2e8f0'; cg.fillRect(0, 0, 40, 40); cg.fillStyle = '#94a3b8'; cg.fillRect(0, 0, 20, 20); cg.fillRect(20, 20, 20, 20);
    c.add(new fabric.Rect({ left: 40, top: 90, width: 880, height: 420, fill: new fabric.Pattern({ source: ck, repeat: 'repeat' }), selectable: false, evented: false, name: 'Nền ô cờ (DEMO)' }));
    const step = (t, l, tp) => c.add(new fabric.Textbox(t, { left: l, top: tp, width: 860, fontSize: 24, fill: '#334155', name: 'Hướng dẫn DEMO' }));
    step('① Chọn NHÓM → bảng “Kết hợp hình” (cột Thuộc tính) → Sau: Elip, Trước: Chữ → Bắt đầu → Trừ → Áp dụng. Viền ngoài của elip được giữ; lỗ chữ trong suốt (thấy ô cờ). “↺ Khôi phục gốc” trả lại elip + chữ sửa được.', 40, 520);
    step('② Elip viền NÉT ĐỨT + chữ (không nhóm): Shift-chọn cả hai → ⧉ → Trừ: bảng báo không giữ được viền nét đứt và cần tích “Chấp nhận bỏ viền” trước khi Áp dụng.', 980, 520);
    // 1) ellipse + text inside ONE group (choose the 2 children in the Kết hợp hình panel)
    const e1 = new fabric.Ellipse({ rx: 400, ry: 170, fill: '#7c3aed', stroke: '#f97316', strokeWidth: 14, originX: 'center', originY: 'center', left: 0, top: 0, name: 'Elip tím' });
    const t1 = txt({ width: 760, originX: 'center', originY: 'center', left: 0, top: 0, name: 'Chữ VIỀN NỔI' });
    const g = new fabric.Group([e1, t1], { left: 60, top: 110, angle: -4, name: 'Nhóm DEMO (elip + chữ)' }); c.add(g);
    // 2) the same pair NOT grouped (Shift-select both → ⧉ Kết hợp hình)
    c.add(new fabric.Ellipse({ left: 980, top: 120, rx: 380, ry: 160, fill: '#6d28d9', stroke: '#0f172a', strokeWidth: 6, strokeDashArray: [18, 10], name: 'Elip viền nét đứt' }));
    c.add(txt({ left: 1010, top: 185, width: 700, name: 'Chữ rời' }));
    // 3) photo BEHIND live text → select both → 🖼 Lồng ảnh (image appears only inside the letters)
    fabric.Image.fromURL(photo(900, 420), img => {
      img.set({ left: 380, top: 640, name: 'Ảnh thử phía sau' }); c.add(img);
      c.add(txt({ left: 420, top: 760, width: 820, fontSize: 170, name: 'Chữ để lồng ảnh' }));
      c.setActiveObject(g); c.requestRenderAll(); X.resetHistory(); X.snapshot(); X.refreshLayers();
      c.fire('selection:created', { selected: [g] }); // dock opens on the group picker
      X.toast('DEMO: Nhóm đang chọn → bảng “Kết hợp hình” bên phải → Bắt đầu → Trừ. ③ Shift-chọn Ảnh thử + Chữ phía dưới → 🖼 Lồng ảnh.', 4500);
    });
  }
  if (document.readyState === 'complete') setTimeout(build, 300); else window.addEventListener('load', () => setTimeout(build, 300));
})();
