// Phase 12: sharper on-screen editing preview (does not change export).
// Diagnosis (Fabric 5.3 source): object caches are capped at fabric.perfLimitSizeTotal (2 MP) / maxCacheSideLimit (4096 px);
// when an object is big on screen (zoomed in, large text/group) its cache is rendered at a REDUCED zoom and stretched → blur.
// Fix: an object whose cache would be capped is drawn directly (vector, full resolution) instead of from a cache.
// Also: re-init retina scaling when devicePixelRatio changes (browser zoom / moving to another monitor), and render the
// photo inside image-filled TEXT at screen resolution (Fabric renders that pattern at 1 unit = 1 px, blurry when zoomed).
(function (root) {
  // Would Fabric cap this cache? (pure: dims from _getCacheCanvasDimensions)
  const wouldCap = (d, F) => d.width > F.maxCacheSideLimit || d.height > F.maxCacheSideLimit || d.width * d.height > F.perfLimitSizeTotal;
  // Supersampling factor for the text-pattern canvas: screen scale, ≥1, bounded by pixel budget
  const patternScale = (scale, w, h, budget) => Math.max(1, Math.min(scale, 8, Math.sqrt((budget || 16e6) / Math.max(1, w * h))));
  // Object (or any descendant of a group) that MUST render through its own cache
  function needsCache(o, depth) {
    if (!o) return false; if (o.clipPath || (o.needsItsOwnCache && o.needsItsOwnCache())) return true;
    if ((depth || 0) > 20) return true;
    const kids = o._objects || (o.getObjects && o.type === 'group' ? o.getObjects() : null);
    return !!(kids && kids.some(k => needsCache(k, (depth || 0) + 1)));
  }
  function patchFabric(F) {
    const P = F.Object.prototype; if (P.__xtkSharp) return; P.__xtkSharp = true;
    const orig = P.shouldCache;
    P.shouldCache = function () {
      const r = orig.call(this); if (!r || !this.canvas || !this._getCacheCanvasDimensions) return r;
      if (needsCache(this)) return r; // clipPath / stroke-first+shadow etc.: Fabric's clip uses destination-in on the cache — never bypass
      let d; try { d = this._getCacheCanvasDimensions(); } catch (e) { return r; }
      if (wouldCap(d, F)) { this.ownCaching = false; return false; } // draw directly → crisp
      return r;
    };
    const T = F.Text && F.Text.prototype, origPT = T && T._applyPatternGradientTransformText;
    if (origPT) T._applyPatternGradientTransformText = function (filler) {
      if (!(this.xtk && this.xtk.composite) || !filler.patternTransform || typeof DOMMatrix === 'undefined') return origPT.call(this, filler);
      const w = Math.max(1, this.width), h = Math.max(1, this.height), ts = this.getTotalObjectScaling ? this.getTotalObjectScaling() : { scaleX: 1, scaleY: 1 };
      const k = +patternScale(Math.max(Math.abs(ts.scaleX), Math.abs(ts.scaleY)), w, h).toFixed(3), m = filler.patternTransform;
      const pad = Math.max(0, (this.strokeWidth || 0) / 2) + 2; // glyph/stroke overhang past the box stays painted
      const key = [k, w, h, pad, m.join(',')].join('|'), hit = memo.get(this);
      if (hit && hit.key === key && hit.src === filler.source) { touch(hit); return hit.pat; } // one canvas per text, reused across lines/renders
      const c = F.util.createCanvasElement(); c.width = Math.ceil((w + 2 * pad) * k); c.height = Math.ceil((h + 2 * pad) * k);
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
      g.setTransform(k, 0, 0, k, pad * k, pad * k); g.transform(m[0], m[1], m[2], m[3], m[4], m[5]); g.drawImage(filler.source, 0, 0);
      const pat = g.createPattern(c, 'no-repeat'); try { pat.setTransform(new DOMMatrix([1 / k, 0, 0, 1 / k, -pad, -pad])); } catch (e) { return origPT.call(this, filler); }
      // origin = text box top-left (handleFiller translated ctx to -width/2,-height/2): the SAME frame-box origin used for
      // image-filled shapes and by composite.js placement maths. Deliberate deviation: Fabric 5.3's own
      // _applyPatternGradientTransformText shifts the photo by +strokeWidth/2; we don't, so a photo does not jump when the outline is toggled.
      remember(this, { key, src: filler.source, pat, px: c.width * c.height }); return pat;
    };
  }
  // bounded memo: WeakMap per text object + LRU over total pixels (≤ 48 MP ≈ 192 MB worst case)
  const memo = new WeakMap(), lru = [], BUDGET = 48e6;
  function touch(e) { const i = lru.indexOf(e); if (i >= 0) { lru.splice(i, 1); lru.push(e); } }
  function remember(obj, e) {
    const old = memo.get(obj); if (old) { const i = lru.indexOf(old); if (i >= 0) lru.splice(i, 1); }
    e.obj = new (typeof WeakRef !== 'undefined' ? WeakRef : function (o) { this.deref = () => o; })(obj); memo.set(obj, e); lru.push(e);
    let tot = lru.reduce((t, x) => t + x.px, 0);
    while (tot > BUDGET && lru.length > 1) { const x = lru.shift(); tot -= x.px; const o = x.obj.deref(); if (o && memo.get(o) === x) memo.delete(o); }
  }
  function install(X) {
    const canvas = X.canvas, F = root.fabric; patchFabric(F);
    let mq = null;
    const watch = () => {
      if (mq) mq.removeEventListener ? mq.removeEventListener('change', onDpr) : mq.removeListener(onDpr);
      mq = root.matchMedia && root.matchMedia(`(resolution: ${root.devicePixelRatio || 1}dppx)`);
      if (mq) mq.addEventListener ? mq.addEventListener('change', onDpr) : mq.addListener(onDpr);
    };
    function onDpr() {
      F.devicePixelRatio = root.devicePixelRatio || 1;
      canvas.setDimensions({ width: canvas.getWidth(), height: canvas.getHeight() }); // re-inits retina backing store
      canvas.getObjects().forEach(o => { o.dirty = true; }); canvas.calcOffset(); canvas.requestRenderAll(); watch();
    }
    watch();
    return { onDpr };
  }
  const api = { memoSize: () => lru.length, memoPixels: () => lru.reduce((t, x) => t + x.px, 0), needsCache, wouldCap, patternScale, patchFabric, install };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else { root.XTK_SHARP = api; if (root.XTK && root.XTK.canvas && root.fabric) api.install(root.XTK); }
})(typeof window !== 'undefined' ? window : globalThis);
