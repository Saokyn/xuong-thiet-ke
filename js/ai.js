// AI idea generator. API key lives only in localStorage and is sent only to the configured base URL.
const AI = (() => {
  const K = { base: 'xtk.ai.base', model: 'xtk.ai.model', key: 'xtk.ai.key' };
  const DEFAULTS = { base: 'https://api.x.ai/v1', model: 'grok-4' };
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

  const settings = () => ({
    base: localStorage.getItem(K.base) || DEFAULTS.base,
    model: localStorage.getItem(K.model) || DEFAULTS.model,
    hasKey: !!localStorage.getItem(K.key),
  });
  function save({ base, model, key }) {
    localStorage.setItem(K.base, (base || DEFAULTS.base).replace(/\/+$/, ''));
    localStorage.setItem(K.model, model || DEFAULTS.model);
    if (key) localStorage.setItem(K.key, key);
  }
  const clearKey = () => localStorage.removeItem(K.key);

  function parseJSON(text) {
    try { return JSON.parse(text); } catch (e) {}
    const m = text.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]);
    throw new Error('Phản hồi không phải JSON hợp lệ');
  }

  async function generate(userPrompt, ctx) {
    const key = localStorage.getItem(K.key);
    if (!key) throw new Error('Chưa có API key. Mở "Cài đặt API" để nhập khóa.');
    const { base, model } = settings();
    const res = await fetch(base + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model, temperature: 0.8,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Kích thước: ${ctx.name} (${ctx.w}×${ctx.h}px${ctx.print ? ', in 300dpi' : ''}).\nYêu cầu: ${userPrompt}` },
        ],
      }),
    });
    if (!res.ok) throw new Error('Lỗi API: HTTP ' + res.status);   // never echo request headers/key
    const data = await res.json();
    const out = parseJSON(data.choices?.[0]?.message?.content || '');
    // Defensive client-side guard on image prompts
    out.image_prompts = (out.image_prompts || []).map(p => /\b(nude|naked|sexy|erotic|child|teen|kid|minor)\b/i.test(p)
      ? '[Đã lọc: prompt không phù hợp chính sách]' : p);
    return out;
  }
  return { settings, save, clearKey, generate, SYSTEM };
})();
window.AI = AI;
