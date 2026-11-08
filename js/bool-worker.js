// Dedicated local Web Worker for "Kết hợp hình": runs polygon-clipping off the main thread.
// Protocol: in {id, op, shapes:[ [ring,...] per shape ]} → out {id, geom} | {id, error}. Main thread enforces timeout + terminate.
importScripts('../vendor/polygon-clipping.min.js', '../vendor/clipper.js', 'shape-boolean.js');
self.onmessage = e => { const d = e.data || {}; self.postMessage(self.XTK_BOOL_LIB.runJob(self.polygonClipping, d, self.ClipperLib)); };
