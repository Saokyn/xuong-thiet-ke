// AI via Google Gemini. API key lives only in localStorage and is sent only to generativelanguage.googleapis.com (never logged).
const AI = (() => {
  const K = { model: 'xtk.ai.model', key: 'xtk.ai.key' };
  const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
  const MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro'];
  const DEFAULTS = { model: 'gemini-2.5-flash' };
  const IMG_MODEL = 'gemini-2.5-flash-image';
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

  // One-time migrate off Grok/xAI: drop old base URL, grok models, and the old provider key.
  (function migrateFromGrok() {
    try {
      const base = localStorage.getItem('xtk.ai.base') || '';
      const model = localStorage.getItem(K.model) || '';
      const img = localStorage.getItem('xtk.ai.imgModel') || '';
      const wasGrok = /x\.ai|grok/i.test(base + ' ' + model + ' ' + img);
      localStorage.removeItem('xtk.ai.base');
      if (wasGrok) {
        localStorage.removeItem(K.key);
        if (/grok/i.test(model) || !MODELS.includes(model)) localStorage.removeItem(K.model);
        if (/grok/i.test(img)) localStorage.removeItem('xtk.ai.imgModel');
      } else if (model && !MODELS.includes(model)) {
        localStorage.removeItem(K.model);
      }
    } catch (e) {}
  })();

  const settings = () => ({
    model: MODELS.includes(localStorage.getItem(K.model)) ? localStorage.getItem(K.model) : DEFAULTS.model,
    hasKey: !!localStorage.getItem(K.key),
    endpoint: ENDPOINT,
    imgModel: IMG_MODEL,
  });
  function save({ model, key }) {
    const m = MODELS.includes(model) ? model : DEFAULTS.model;
    localStorage.setItem(K.model, m);
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

  // Chat-style JSON call. Key is sent only via x-goog-api-key to Google Gemini.
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

  // Image generation / edit via Gemini image model (Nano Banana). Returns a data: URL.
  async function generateImage({ prompt, imageDataUrl, mimeType }) {
    const parts = [];
    if (imageDataUrl) {
      const m = String(imageDataUrl).match(/^data:([^;]+);base64,(.+)$/);
      if (!m) throw new Error('Ảnh đầu vào không hợp lệ');
      parts.push({ inlineData: { mimeType: mimeType || m[1], data: m[2] } });
    }
    parts.push({ text: prompt });
    const data = await generateContent(IMG_MODEL, {
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

  return { settings, save, clearKey, generate, chat, needKey, parseJSON, generateContent, generateImage, SYSTEM, K, MODELS, DEFAULTS, ENDPOINT, IMG_MODEL };
})();
window.AI = AI;
