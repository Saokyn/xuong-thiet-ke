// ?demo=3d — open studio + insert presets without overlap (file:// OK).
(function () {
  if (!/[?&]demo=3d\b/.test(location.search)) return;
  const X = window.XTK; if (!X || !X.canvas) return;
  if (window.DB) { DB.put = async () => { X.toast('Chế độ DEMO — không lưu', 1200); }; DB.del = async () => { }; }

  window.__xtk3dStatus = window.__xtk3dStatus || function () {
    return (window.XTK_THREE_STUDIO && window.XTK_THREE_STUDIO.getStatus)
      ? window.XTK_THREE_STUDIO.getStatus()
      : { error: 'studio missing' };
  };

  async function build() {
    X.show('designer');
    X.openTemplate({ id: 'demo-3d', name: 'DEMO chữ 3D', w: 1800, h: 1200 });
    X.canvas.backgroundColor = '#f5efe8';
    // Clear any leftover objects so inserts don't overlap
    try {
      const doomed = X.canvas.getObjects().slice();
      doomed.forEach(o => X.canvas.remove(o));
    } catch (e) { /* ignore */ }

    const S = window.XTK_THREE_STUDIO;
    const status = { presets: [], fonts: {}, ok: false, errors: [], loop: null };
    window.__xtk3dDemo = status;

    if (!S) { status.errors.push('missing studio'); X.toast('Thiếu three-studio', 2000); return; }
    if (!S.webglOk()) { status.errors.push('no webgl'); X.toast('WebGL không khả dụng', 3000); return; }

    try {
      await S.loadBundle();
      const fontIds = ['playfair', 'baloo', 'montserrat', 'bevietnam', 'nunito'];
      for (const id of fontIds) {
        try {
          await window.XTK_THREE_FONTS.loadFont(id);
          status.fonts[id] = 'ok';
        } catch (e) {
          status.fonts[id] = String(e.message || e);
          status.errors.push(id + ': ' + e.message);
        }
      }

      const studio = await S.open({
        settings: Object.assign({}, S.DEFAULTS, S.PRESETS[0].settings, { viewBg: 'light' })
      });
      await new Promise(r => setTimeout(r, 250));

      const gallery = [
        S.PRESETS.find(p => p.id === 'vangVatDo'),
        S.PRESETS.find(p => p.id === 'phongHong'),
        S.PRESETS.find(p => p.id === 'saoPhong'),
        S.PRESETS.find(p => p.id === 'daDen'),
        {
          id: 'xinChaoPhong', label: 'Xin chào Phồng',
          settings: Object.assign({}, (S.PRESETS.find(p => p.id === 'phongHong') || {}).settings || {}, {
            text: 'Xin chào', fontId: 'baloo', mode: 'puff', viewBg: 'light'
          })
        },
        {
          id: 'conCaLoc', label: 'Con cá lóc',
          settings: Object.assign({}, (S.PRESETS.find(p => p.id === 'vangVatDo') || {}).settings || {}, {
            text: 'Con cá lóc', fontId: 'playfair', mode: 'bevel', viewBg: 'light',
            rotX: -0.22, rotY: 0.55
          })
        }
      ].filter(Boolean);

      // 3 columns × 2 rows, generous gaps, centered in free space
      const cellW = 520, cellH = 420, marginX = 80, marginY = 70;
      for (let i = 0; i < gallery.length; i++) {
        const preset = gallery[i];
        const col = i % 3, row = Math.floor(i / 3);
        const left = marginX + col * cellW;
        const top = marginY + row * cellH;
        const entry = { id: preset.id || preset.label, ink: 0, ok: false, error: null };
        try {
          await studio.applySettings(Object.assign({}, S.DEFAULTS, preset.settings, { viewBg: 'light' }));
          await new Promise(r => setTimeout(r, 550));
          if (!studio.mesh) throw new Error(studio._lastError || 'no mesh');
          const rendered = studio.renderPNG(1024);
          entry.ink = rendered.ink;
          entry.ok = rendered.ink > 40;
          await new Promise(res => {
            fabric.Image.fromURL(rendered.dataUrl, img => {
              img.set({
                left, top,
                name: '3D ' + (preset.label || preset.id),
                xtk: { three: JSON.parse(JSON.stringify(studio.settings)) }
              });
              const maxW = 400;
              if (img.width > maxW) img.scaleToWidth(maxW);
              // Keep inside cell
              if (img.getScaledHeight && img.getScaledHeight() > 340) {
                img.scaleToHeight(340);
              }
              X.canvas.add(img);
              res();
            });
          });
        } catch (e) {
          entry.error = String(e.message || e);
          status.errors.push(entry.id + ': ' + entry.error);
        }
        status.presets.push(entry);
      }

      // URL ?text=… overrides final studio text (e.g. Con%20cá%20lóc); default Phồng "Xin chào"
      let urlText = null;
      try {
        const q = new URLSearchParams(location.search);
        urlText = q.get('text');
      } catch (e) { urlText = null; }
      const vv = S.PRESETS.find(p => p.id === 'vangVatDo') || S.PRESETS[0];
      const ph = S.PRESETS.find(p => p.id === 'phongHong') || S.PRESETS[1];
      if (urlText && urlText.trim()) {
        await studio.applySettings(Object.assign({}, S.DEFAULTS, vv.settings, {
          text: urlText, viewBg: 'light'
        }));
        if (studio.setText) await studio.setText(urlText);
      } else {
        await studio.applySettings(Object.assign({}, S.DEFAULTS, ph.settings, {
          text: 'Xin chào', viewBg: 'light'
        }));
        if (studio.setText) await studio.setText('Xin chào');
      }
      studio.ensureLoop && studio.ensureLoop();
      status.loop = S.getStatus();
      status.studioText = studio.settings && studio.settings.text;
      X.canvas.requestRenderAll();
      X.resetHistory && X.resetHistory();
      X.snapshot && X.snapshot();
      status.ok = status.presets.filter(p => p.ok).length >= 4;
      status.studio = S.getStatus();
      X.toast(status.ok
        ? 'DEMO 3D: ' + status.presets.length + ' preset · studio: Xin chào Phồng'
        : 'DEMO 3D lỗi: ' + status.errors.slice(0, 2).join(' · '), 4200);
    } catch (e) {
      status.errors.push(String(e.message || e));
      X.toast('DEMO 3D thất bại: ' + e.message, 4000);
    }
  }

  if (document.readyState === 'complete') setTimeout(build, 500);
  else window.addEventListener('load', () => setTimeout(build, 500));
})();
