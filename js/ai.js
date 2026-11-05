// AI via Google Gemini. API key lives only in localStorage and is sent only to generativelanguage.googleapis.com (never logged).
const AI = (() => {
  const K = { model: 'xtk.ai.model', key: 'xtk.ai.key', img: 'xtk.ai.imgModel', extra: 'xtk.ai.extraModels', extraImg: 'xtk.ai.extraImgModels' };
  const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
  // Curated generateContent text models confirmed in official docs (Nov 2026). Sources:
  // https://ai.google.dev/gemini-api/docs/models , pricing, rate-limits, image-generation.
  const CATALOG = [
    { id: 'gemini-3.8-flash', group: 'Mới nhất', note: 'Mới nhất · Ổn định · Free', label: 'gemini-3.8-flash — Flash mới nhất' },
    { id: 'gemini-3.5-flash-lite', group: 'Free cao / Nhanh', note: 'Nhanh · Free cao', label: 'gemini-3.5-flash-lite — Nhanh, free cao (mặc định)' },
    { id: 'gemini-3.6-flash', group: 'Ổn định', note: 'Ổn định', label: 'gemini-3.6-flash — Flash ổn định' },
    { id: 'gemini-3.1-flash-lite', group: 'Free cao / Nhanh', note: 'Nhanh · Free', label: 'gemini-3.1-flash-lite — Nhanh, có free' },
    { id: 'gemini-2.5-flash', group: 'Ổn định', note: 'Ổn định · Free', label: 'gemini-2.5-flash — Ổn định 2.5' },
    { id: 'gemini-2.5-flash-lite', group: 'Free cao / Nhanh', note: 'Nhanh · Free', label: 'gemini-2.5-flash-lite — Rất nhanh / tiết kiệm' },
    { id: 'gemini-2.5-pro', group: 'Chất lượng', note: 'Pro · Free', label: 'gemini-2.5-pro — Pro, suy luận sâu' },
  ];
  const IMG_CATALOG = [
    { id: 'gemini-nano-banana-2.1', group: 'Mới nhất', note: 'Mới nhất', label: 'gemini-nano-banana-2.1 — Nano Banana 2.1 (mặc định)' },
    { id: 'gemini-3.1-flash-image', group: 'Ổn định', note: 'Ổn định', label: 'gemini-3.1-flash-image — Nano Banana 2' },
    { id: 'gemini-3.1-flash-lite-image', group: 'Nhanh', note: 'Nhanh', label: 'gemini-3.1-flash-lite-image — Nhanh / rẻ' },
    { id: 'gemini-3-pro-image', group: 'Chất lượng', note: 'Chất lượng', label: 'gemini-3-pro-image — Nano Banana Pro' },
    { id: 'gemini-2.5-flash-image', group: 'Ổn định', note: 'Legacy', label: 'gemini-2.5-flash-image — Legacy Nano Banana' },
  ];
  const MODELS = CATALOG.map(m => m.id);
  const IMG_MODELS = IMG_CATALOG.map(m => m.id);
  const DEFAULTS = { model: 'gemini-3.5-flash-lite', imgModel: 'gemini-nano-banana-2.1' };
  const IMG_MODEL = DEFAULTS.imgModel; // alias for callers
  const SYSTEM = `Bạn là giám đốc sáng tạo cho một xưởng thiết kế đồ họa Việt Nam.
Trả lời CHỈ bằng một đối tượng JSON hợp lệ (không markdown) với các khóa:
"brief" (string, tiếng Việt), "layout" (string, tiếng Việt, mô tả bố cục cụ thể theo kích thước đã cho),
"colors" (mảng 5 mã hex như "#1A2B3C"), "fonts" (mảng tên font, ưu tiên: Be Vietnam Pro, Montserrat, Lora, Roboto),
"copy" (object: "headline", "subheadline", "body", "cta" — tiếng Việt có dấu),
"image_prompts" (mảng 2-3 prompt tạo ảnh bằng TIẾNG ANH).
QUY TẮC BẮT BUỘC cho image_prompts:
- Nếu có người, chỉ mô tả người trưởng thành hư cấu, rõ ràng từ 25 tuổi trở lên (ghi rõ "adult, aged 25+" hoặc độ tuổi cụ thể ≥25).
- Không bao giờ mô tả người thật, người nổi tiếng, chính trị gia, nhân vật có thật, hay khuôn mặt của bất kỳ ai có thật.
- Tuyệt đối không có nội dung tình dục, khỏa thân, gợi dục hay khiêu khích.
- Không có trẻ em hoặc trẻ vị thành niên.
Nếu yêu cầu người dùng vi phạm các quy tắc trên, hãy thay bằng một ý tưởng an toàn và nêu lý do ngắn trong "brief".`;

  const okId = s => typeof s === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(s.trim());
  const readExtras = (k) => { try { return JSON.parse(localStorage.getItem(k) || '[]').filter(okId); } catch (e) { return []; } };
  const writeExtras = (k, arr) => localStorage.setItem(k, JSON.stringify([...new Set(arr.filter(okId))].slice(0, 80)));

  // One-time migrate off Grok/xAI: drop old base URL, grok models, and the old provider key.
  // Also migrate previous default gemini-2.5-flash → new free/fast default only when still at the old default.
  (function migrateFromGrok() {
    try {
      const base = localStorage.getItem('xtk.ai.base') || '';
      const model = localStorage.getItem(K.model) || '';
      const img = localStorage.getItem(K.img) || '';
      const wasGrok = /x\.ai|grok/i.test(base + ' ' + model + ' ' + img);
      localStorage.removeItem('xtk.ai.base');
      if (wasGrok) {
        localStorage.removeItem(K.key);
        if (/grok/i.test(model)) localStorage.removeItem(K.model);
        if (/grok/i.test(img)) localStorage.removeItem(K.img);
      }
    } catch (e) {}
  })();

  const settings = () => {
    const model = localStorage.getItem(K.model);
    const imgModel = localStorage.getItem(K.img);
    return {
      model: okId(model) ? model.trim() : DEFAULTS.model,
      imgModel: okId(imgModel) ? imgModel.trim() : DEFAULTS.imgModel,
      hasKey: !!localStorage.getItem(K.key),
      endpoint: ENDPOINT,
      extras: readExtras(K.extra),
      extraImgs: readExtras(K.extraImg),
    };
  };
  function save({ model, imgModel, key }) {
    if (okId(model)) localStorage.setItem(K.model, model.trim());
    if (okId(imgModel)) localStorage.setItem(K.img, imgModel.trim());
    if (key) localStorage.setItem(K.key, key);
  }
  const clearKey = () => localStorage.removeItem(K.key);

  function parseJSON(text) {
    try { return JSON.parse(text); } catch (e) {}
    const m = String(text || '').match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]);
    throw new Error('Phản hồi không phải JSON hợp lệ');
  }

  const needKey = () => {
    const key = localStorage.getItem(K.key);
    if (!key) throw new Error('Chưa có Gemini API key. Mở "Cài đặt API" để nhập khóa.');
    return key;
  };

  function mapError(res, data) {
    const code = res.status;
    const msg = (data && data.error && data.error.message) || '';
    const status = (data && data.error && data.error.status) || '';
    if (code === 404 || /not found|NOT_FOUND|is not found|does not exist|unsupported/i.test(msg + status))
      return new Error('Model không tồn tại hoặc không hỗ trợ generateContent. Hãy chọn model khác, nhập ID tùy chỉnh, hoặc bấm “Tải danh sách model”.');
    if (code === 401 || code === 403 || /API[_ ]?key|PERMISSION|UNAUTHENTICATED|invalid/i.test(msg + status))
      return new Error('Khóa API Gemini không hợp lệ hoặc đã bị thu hồi. Lấy khóa mới tại Google AI Studio.');
    if (code === 429 || /RESOURCE_EXHAUSTED|quota|rate limit/i.test(msg + status))
      return new Error('Đã hết hạn mức Gemini (429). Thử lại sau hoặc kiểm tra hạn mức tại Google AI Studio.');
    if (code === 400 && /safety|blocked|SAFETY/i.test(msg + status))
      return new Error('Gemini đã chặn yêu cầu vì chính sách an toàn. Hãy chỉnh lại mô tả (chỉ người lớn hư cấu 25+, không người thật, không nội dung tình dục).');
    return new Error('Lỗi Gemini: HTTP ' + code);
  }

  function checkSafety(data) {
    const br = data?.promptFeedback?.blockReason;
    if (br) throw new Error('Gemini đã chặn yêu cầu vì chính sách an toàn (' + br + '). Hãy chỉnh lại mô tả.');
    const fr = data?.candidates?.[0]?.finishReason;
    if (fr === 'SAFETY' || fr === 'BLOCKLIST' || fr === 'PROHIBITED_CONTENT')
      throw new Error('Gemini đã chặn phản hồi vì chính sách an toàn. Hãy chỉnh lại mô tả (chỉ người lớn hư cấu 25+, không người thật, không nội dung tình dục).');
  }

  function textFrom(data) {
    checkSafety(data);
    const parts = data?.candidates?.[0]?.content?.parts || [];
    return parts.map(p => p.text || '').join('') || '';
  }

  async function generateContent(model, body) {
    const key = needKey();
    const res = await fetch(ENDPOINT + '/' + encodeURIComponent(model) + ':generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
    });
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok) throw mapError(res, data);
    return data;
  }

  // List models supporting generateContent (GET /v1beta/models). Never logs the key.
  async function listModels() {
    const key = needKey();
    const out = []; let pageToken = '';
    do {
      const url = ENDPOINT + '?pageSize=100' + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
      const res = await fetch(url, { headers: { 'x-goog-api-key': key } });
      let data = null; try { data = await res.json(); } catch (e) { data = null; }
      if (!res.ok) throw mapError(res, data);
      for (const m of (data.models || [])) {
        const methods = m.supportedGenerationMethods || m.supported_generation_methods || [];
        if (!methods.includes('generateContent')) continue;
        const id = String(m.name || '').replace(/^models\//, '');
        if (!okId(id)) continue;
        out.push({ id, displayName: m.displayName || m.display_name || id, methods });
      }
      pageToken = data.nextPageToken || data.next_page_token || '';
    } while (pageToken && out.length < 200);
    const known = new Set([...MODELS, ...IMG_MODELS]);
    const textExtra = [], imgExtra = [];
    for (const m of out) {
      if (known.has(m.id)) continue;
      if (/image|banana|imagen/i.test(m.id + ' ' + (m.displayName || ''))) imgExtra.push(m.id);
      else textExtra.push(m.id);
    }
    writeExtras(K.extra, [...readExtras(K.extra), ...textExtra]);
    writeExtras(K.extraImg, [...readExtras(K.extraImg), ...imgExtra]);
    return { all: out, textExtra, imgExtra };
  }

  async function chat(system, user, temperature = 0.8) {
    const { model } = settings();
    const data = await generateContent(model, {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature, responseMimeType: 'application/json' },
    });
    return parseJSON(textFrom(data));
  }

  async function generate(userPrompt, ctx) {
    const out = await chat(SYSTEM, `Kích thước: ${ctx.name} (${ctx.w}×${ctx.h}px${ctx.print ? ', in 300dpi' : ''}).\nYêu cầu: ${userPrompt}`);
    out.image_prompts = (out.image_prompts || []).map(p => /\b(nude|naked|sexy|erotic|child|teen|kid|minor)\b/i.test(p)
      ? '[Đã lọc: prompt không phù hợp chính sách]' : p);
    return out;
  }

  async function generateImage({ prompt, imageDataUrl, mimeType }) {
    const parts = [];
    if (imageDataUrl) {
      const m = String(imageDataUrl).match(/^data:([^;]+);base64,(.+)$/);
      if (!m) throw new Error('Ảnh đầu vào không hợp lệ');
      parts.push({ inlineData: { mimeType: mimeType || m[1], data: m[2] } });
    }
    parts.push({ text: prompt });
    const model = settings().imgModel || DEFAULTS.imgModel;
    const data = await generateContent(model, {
      contents: [{ role: 'user', parts }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    });
    checkSafety(data);
    const outParts = data?.candidates?.[0]?.content?.parts || [];
    for (const p of outParts) {
      const inline = p.inlineData || p.inline_data;
      if (inline && inline.data) {
        const mt = inline.mimeType || inline.mime_type || 'image/png';
        return 'data:' + mt + ';base64,' + String(inline.data).replace(/\s/g, '');
      }
    }
    throw new Error('Gemini không trả về ảnh');
  }

  return {
    settings, save, clearKey, generate, chat, needKey, parseJSON, generateContent, generateImage, listModels,
    SYSTEM, K, MODELS, IMG_MODELS, CATALOG, IMG_CATALOG, DEFAULTS, ENDPOINT, IMG_MODEL, okId,
  };
})();
window.AI = AI;
