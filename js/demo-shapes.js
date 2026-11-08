// Offline DEMO for "Kết hợp hình" + "Sửa điểm": open ?demo=shapes. Cloud disabled (cloud-config.js), saving is a no-op.
(function () {
  if (!/[?&]demo=shapes\b/.test(location.search)) return;
  const X = window.XTK; if (!X || !X.canvas) return;
  if (window.DB) { DB.put = async () => { X.toast('Chế độ DEMO — không lưu', 1200); }; DB.del = async () => { }; }
  function build() {
    X.show('designer'); X.openTemplate({ id: 'demo-shapes', name: 'DEMO kết hợp hình', w: 1800, h: 1200 });
    const c = X.canvas, add = o => c.add(o);
    add(new fabric.Textbox('DEMO – dữ liệu thử, không lưu', { left: 40, top: 30, width: 900, fontSize: 40, fill: '#64748b', name: 'Nhãn DEMO' }));
    add(new fabric.Rect({ left: 120, top: 200, width: 360, height: 300, fill: '#6366f1', name: 'Vuông tím' }));
    add(new fabric.Circle({ left: 330, top: 260, radius: 170, fill: '#f97316', name: 'Tròn cam' }));
    add(new fabric.Rect({ left: 800, top: 200, width: 400, height: 260, rx: 40, ry: 40, angle: 15, fill: '#10b981', name: 'Bo góc xanh (xoay)' }));
    add(new fabric.Ellipse({ left: 980, top: 320, rx: 200, ry: 110, angle: -25, scaleX: 1.3, flipX: true, fill: '#f43f5e', name: 'Elip đỏ (lật, kéo giãn)' }));
    add(new fabric.Triangle({ left: 1400, top: 220, width: 300, height: 260, fill: '#eab308', name: 'Tam giác' }));
    add(new fabric.Polygon([{ x: 0, y: 0 }, { x: 260, y: 40 }, { x: 220, y: 240 }, { x: 40, y: 200 }], { left: 200, top: 700, angle: 10, fill: '#0ea5e9', name: 'Đa giác' }));
    add(new fabric.Rect({ left: 700, top: 720, width: 240, height: 240, fill: '#a855f7', angle: 30, name: 'Vuông xoay (thử Sửa điểm)' }));
    add(new fabric.Rect({ left: 1150, top: 700, width: 260, height: 260, fill: '', stroke: '#334155', strokeWidth: 6, name: 'Chỉ viền (bị từ chối)' }));
    add(new fabric.Textbox('Chữ thử', { left: 1450, top: 760, width: 300, fontSize: 80, fill: '#1e293b', name: 'Chữ (bị từ chối)' }));
    c.discardActiveObject(); c.requestRenderAll(); X.resetHistory(); X.snapshot(); X.refreshLayers();
    X.toast('DEMO: Shift-chọn 2 hình chồng nhau → ⧉ Kết hợp hình. Chọn 1 hình vuông/đa giác → ✎ Sửa điểm.', 3500);
  }
  if (document.readyState === 'complete') setTimeout(build, 300); else window.addEventListener('load', () => setTimeout(build, 300));
})();
