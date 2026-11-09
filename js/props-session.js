// Tentative Thuộc tính edits: sticky Áp dụng / Trở lại / Hủy. Toolbar stays immediate.
// One session owner with colour preview — props session wins when active.
(function (root) {
  function init(X) {
    if (!X || !X.canvas) return;
    const $ = s => document.querySelector(s);
    const canvas = X.canvas;
    const pane = $('#paneProps') || $('.props');
    let bar = $('#propsSessionBar');
    if (!bar && pane) {
      bar = document.createElement('div');
      bar.id = 'propsSessionBar';
      bar.className = 'props-session-bar';
      bar.hidden = true;
      bar.innerHTML = `<span class="small">Đang chỉnh (chưa áp dụng)</span>
        <button type="button" data-a="apply" class="primary">Áp dụng</button>
        <button type="button" data-a="back">Trở lại</button>
        <button type="button" data-a="cancel">Hủy</button>`;
      const body = $('#propsBody');
      if (body && body.parentNode) body.parentNode.insertBefore(bar, body);
      else pane.appendChild(bar);
    }
    let dlg = $('#propsAskDlg');
    if (!dlg) {
      dlg = document.createElement('div');
      dlg.id = 'propsAskDlg';
      dlg.className = 'props-ask';
      dlg.hidden = true;
      dlg.innerHTML = `<div class="props-ask-card" role="dialog" aria-modal="true" aria-labelledby="propsAskTitle">
        <h4 id="propsAskTitle">Có thay đổi chưa áp dụng</h4>
        <p class="small muted">Áp dụng để giữ, hoặc Hủy để bỏ các chỉnh trong Thuộc tính.</p>
        <div class="row"><button type="button" data-a="apply" class="primary">Áp dụng</button>
        <button type="button" data-a="cancel">Hủy</button>
        <button type="button" data-a="stay">Ở lại</button></div>
      </div>`;
      document.body.appendChild(dlg);
    }

    const state = {
      on: false,
      baselineJson: null,
      micro: [], // stack of canvas JSON (after each discrete props change)
      dirty: false,
      suppressSnap: false,
      pendingAction: null // resolve fn for ask
    };

    function canvasJson() {
      try { return JSON.stringify(canvas.toJSON(window.XTK_FX && window.XTK_FX.PROPS)); } catch (e) { return null; }
    }
    function loadJson(j, cb) {
      if (!j) return;
      state.suppressSnap = true;
      if (X.setRestoring) X.setRestoring(true);
      canvas.loadFromJSON(j, () => {
        if (X.setRestoring) X.setRestoring(false);
        state.suppressSnap = false;
        canvas.renderAll();
        if (X.refreshLayers) X.refreshLayers();
        if (typeof cb === 'function') cb();
      });
    }
    function showBar() {
      if (!bar) return;
      bar.hidden = !state.dirty;
      document.body.classList.toggle('props-session-on', state.on && state.dirty);
    }
    function beginIfNeeded() {
      if (state.on) return;
      // close colour preview without committing if open
      if (X.colorPreview && X.colorPreview.on && X.previewCancel) {
        // absorb into props session: keep live colours, just end colour bar
        try { X.previewEnd && X.previewEnd(); } catch (e) { }
      }
      state.on = true;
      state.baselineJson = canvasJson();
      state.micro = [];
      state.dirty = false;
      showBar();
    }
    function noteChange() {
      beginIfNeeded();
      state.dirty = true;
      showBar();
    }
    function commitMicro() {
      beginIfNeeded();
      const j = canvasJson();
      if (!j) return;
      if (!state.micro.length || state.micro[state.micro.length - 1] !== j) state.micro.push(j);
      state.dirty = true;
      showBar();
    }
    function apply(quiet) {
      if (!state.on) return false;
      state.suppressSnap = false;
      state.on = false; state.dirty = false; state.micro = []; state.baselineJson = null;
      showBar();
      if (X.snapshot) X.snapshot();
      if (X.refreshLayers) X.refreshLayers();
      if (X.renderProps) X.renderProps();
      if (!quiet && X.toast) X.toast('Đã áp dụng thuộc tính', 1200);
      return true;
    }
    function back() {
      if (!state.on) return false;
      if (state.micro.length > 1) {
        state.micro.pop();
        loadJson(state.micro[state.micro.length - 1], () => { if (X.renderProps) X.renderProps(); });
        state.dirty = state.micro.length > 0;
        showBar();
        return true;
      }
      if (state.micro.length === 1) {
        state.micro.pop();
        loadJson(state.baselineJson, () => { if (X.renderProps) X.renderProps(); });
        state.dirty = false; showBar();
        return true;
      }
      // nothing to step back — same as cancel soft
      loadJson(state.baselineJson, () => { if (X.renderProps) X.renderProps(); });
      state.dirty = false; showBar();
      return true;
    }
    function cancel(quiet) {
      if (!state.on) return false;
      const base = state.baselineJson;
      state.on = false; state.dirty = false; state.micro = []; state.baselineJson = null;
      showBar();
      loadJson(base, () => { if (X.renderProps) X.renderProps(); if (root.XTK_CTX_UI) root.XTK_CTX_UI.refresh(); });
      if (!quiet && X.toast) X.toast('Đã hủy chỉnh thuộc tính', 1200);
      return true;
    }
    function askThen(action) {
      return new Promise(resolve => {
        if (!state.on || !state.dirty) { resolve(true); if (action) action(); return; }
        state.pendingAction = { action, resolve };
        dlg.hidden = false;
      });
    }
    function finishAsk(choice) {
      const p = state.pendingAction; state.pendingAction = null; dlg.hidden = true;
      if (!p) return;
      if (choice === 'apply') { apply(true); if (p.action) p.action(); p.resolve(true); }
      else if (choice === 'cancel') { cancel(true); if (p.action) p.action(); p.resolve(true); }
      else { p.resolve(false); } // stay
    }

    if (bar) bar.addEventListener('click', e => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'apply') apply();
      else if (a.dataset.a === 'back') back();
      else if (a.dataset.a === 'cancel') cancel();
    });
    dlg.addEventListener('click', e => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      finishAsk(a.dataset.a);
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && state.on && state.dirty && !dlg.hidden === false) {
        // if ask open, stay; else cancel
      }
      if (e.key === 'Escape' && state.on && state.dirty && dlg.hidden) {
        e.preventDefault(); cancel();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && state.on && state.dirty) {
        if (/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) return;
        e.preventDefault(); e.stopPropagation(); back();
      }
    }, true);

    // Guard selection changes / save / export
    const guard = (fn) => function () {
      if (state.on && state.dirty) {
        const args = arguments;
        askThen(() => fn.apply(this, args));
        return;
      }
      return fn.apply(this, arguments);
    };

    // Hook selection: before renderProps on selection change
    ['selection:created', 'selection:updated', 'selection:cleared'].forEach(ev => {
      canvas.on(ev, () => {
        if (!(state.on && state.dirty)) return;
        // defer ask — selection already changed; offer apply/cancel of previous edits
        askThen(null);
      });
    });

    const saveBtn = $('#save'), expBtn = $('#exportBtn');
    if (saveBtn) {
      const orig = saveBtn.onclick;
      saveBtn.addEventListener('click', e => {
        if (state.on && state.dirty) {
          e.stopImmediatePropagation(); e.preventDefault();
          askThen(() => saveBtn.click());
        }
      }, true);
    }
    if (expBtn) {
      expBtn.addEventListener('click', e => {
        if (state.on && state.dirty) {
          e.stopImmediatePropagation(); e.preventDefault();
          askThen(() => expBtn.click());
        }
      }, true);
    }

    // Patch snapshot to no-op while props session wants to suppress (after live edit before apply)
    const _snap = X.snapshot;
    // We don't wrap snapshot globally — callers in props use noteChange/commitMicro instead of snapshot.

    // Wrap previewBegin: if props session active, fold into it
    if (X.previewBegin) {
      const pb = X.previewBegin;
      X.previewBegin = function () {
        if (state.on) { noteChange(); return; }
        return pb.apply(this, arguments);
      };
    }

    root.XTK_PROPS_SESSION = {
      init: () => {},
      active: () => state.on,
      dirty: () => state.dirty,
      noteChange, commitMicro, apply, back, cancel, askThen, beginIfNeeded,
      _state: state
    };
    // Mark props panel inputs
    document.addEventListener('input', e => {
      const t = e.target;
      if (!t || !t.closest) return;
      if (t.closest('#propsBody') || t.closest('#paneProps .psec')) {
        if (t.closest('#propsSessionBar')) return;
        noteChange();
      }
    }, true);
    document.addEventListener('change', e => {
      const t = e.target;
      if (!t || !t.closest) return;
      if (t.closest('#propsBody') || t.closest('#paneProps .psec')) {
        if (t.closest('#propsSessionBar')) return;
        commitMicro();
      }
    }, true);
  }

  root.XTK_PROPS_SESSION_BOOT = { init };
  if (typeof module !== 'undefined' && module.exports) module.exports = { init };
})(typeof window !== 'undefined' ? window : globalThis);
