// ?demo=fx — 3D+outline, Tách lớp, presets on dark|light panels.
// ?pop=effects opens Hiệu ứng with Chữ khối 3D selected (retry until ready).
(function () {
  if (!/[?&]demo=fx\b/.test(location.search)) return;
  const X = window.XTK; if (!X || !X.canvas) return;
  if (window.DB) { DB.put = async () => { X.toast('Chế độ DEMO — không lưu', 1200); }; DB.del = async () => { }; }
  function wantPop() {
    try { return new URLSearchParams(location.search).get('pop') === 'effects'; }
    catch (e) { return /[?&]pop=effects\b/.test(location.search); }
  }
  async function build() {
    X.show('designer'); X.openTemplate({ id: 'demo-fx', name: 'DEMO hiệu ứng', w: 1700, h: 1300 });
    const c = X.canvas; c.backgroundColor = '#e2e8f0';
    c.add(new fabric.Rect({ left: 0, top: 0, width: 840, height: 1300, fill: '#0f172a', selectable: false, evented: false, name: '__bgDark' }));
    c.add(new fabric.Rect({ left: 840, top: 0, width: 860, height: 1300, fill: '#f1f5f9', selectable: false, evented: false, name: '__bgLight' }));
    const TF = window.XTK_TEXT_FX;
    const mk = (text, left, top, fill, fs) => new fabric.Textbox(text, {
      left, top, width: 720, fontSize: fs || 60, fontFamily: 'Montserrat', fontWeight: 800, fill, name: text
    });
    const objs = [];
    const rows = [
      ['extrude', 'Khối + viền', 40, 60, '#ffffff', { depth: 28, step: 1, outline: 0.04, outlineColor: '#22d3ee', color: '#64748b', light: 315, contrast: 0.7, persp: 0.15, ground: 0.3 }],
      ['longShadow', 'Bóng dài', 40, 200, '#fde047', null],
      ['splice', 'Tách lớp', 40, 340, '#f8fafc', { color: '#a78bfa', offset: 12, strokeW: 0.05, stroke: '#f8fafc' }],
      ['glitch', 'Lỗi nhiễu', 40, 480, '#f8fafc', null]
    ];
    rows.forEach(([kind, label, x, y, fill, params]) => {
      const t = mk(label, x, y, fill);
      c.add(t); if (TF) TF.apply(t, kind, params || {}); objs.push(t);
    });
    if (TF && TF.PRESETS) {
      TF.PRESETS.filter(p => p.fx && p.fx.kind === 'extrude').slice(0, 5).forEach((p, i) => {
        const t = mk(p.label, 880, 50 + i * 130, p.fill || '#0f172a', 60);
        c.add(t); TF.applyPreset(t, p.id); objs.push(t);
      });
    }
    c.add(mk('Chữ rỗng', 880, 720, '#0f172a', 56));
    if (TF) TF.apply(c.getObjects()[c.getObjects().length - 1], 'hollow');
    objs.push(c.getObjects()[c.getObjects().length - 1]);
    c.add(new fabric.Textbox('DEMO FX — khối 3D sắc · presets', {
      left: 40, top: 16, width: 700, fontSize: 18, fill: '#94a3b8', name: 'Nhãn', selectable: false, evented: false
    }));
    c.setActiveObject(objs[0]); c.requestRenderAll();
    X.resetHistory(); X.snapshot(); X.refreshLayers();

    function openEffectsReliable() {
      const UI = window.XTK_CTX_UI;
      if (!UI) return false;
      if (UI.holdPop) UI.holdPop(8000);
      c.setActiveObject(objs[0]);
      if (UI.refresh) UI.refresh();
      const ok = UI.openPopWhenReady ? UI.openPopWhenReady('effects', 60) : (UI.openPop && UI.openPop('effects'));
      // Ensure Chữ khối 3D (extrude) params visible
      if (ok && TF && objs[0]) {
        const fx = objs[0].xtk && objs[0].xtk.fx;
        if (!fx || fx.kind !== 'extrude') TF.apply(objs[0], 'extrude', rows[0][5] || {});
        if (UI.popEl && UI.popEl() && !UI.popEl().hidden) {
          const pop = UI.popEl();
          if (!pop.querySelector('[data-fx="extrude"].on') && pop.querySelector('[data-fx="extrude"]')) {
            pop.querySelector('[data-fx="extrude"]').click();
          }
          if (UI.placePop) UI.placePop(document.querySelector('#fbTextFx'));
          if (UI.layoutPopSize) UI.layoutPopSize();
        }
      }
      return !!(UI.popEl && UI.popEl() && !UI.popEl().hidden);
    }

    // Always open effects once (legacy demo); ?pop=effects retries until visible
    const tries = wantPop() ? [150, 400, 800, 1200, 2000, 3000, 4500] : [300, 900];
    tries.forEach((ms) => setTimeout(() => {
      if (openEffectsReliable()) window.__xtkFxPopOpen = true;
    }, ms));
    X.toast(wantPop() ? 'DEMO FX: mở Hiệu ứng · Chữ khối 3D' : 'DEMO FX: khối 3D thực · presets', 3200);
  }
  if (document.readyState === 'complete') setTimeout(build, 350); else window.addEventListener('load', () => setTimeout(build, 350));
})();
