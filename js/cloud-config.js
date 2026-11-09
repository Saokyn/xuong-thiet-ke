// Demo/kiểm thử cục bộ (?demo=pick | composite | shapes | textshape | palette | toolbar): tắt hẳn đồng bộ đám mây.
if (/[?&]demo=(pick|composite|shapes|textshape|palette|toolbar|fx|3d)\b/.test(location.search)) window.XTK_CLOUD = {};
// Đồng bộ đám mây (tùy chọn) — điền thông tin dự án Supabase của bạn.
// SUPABASE_ANON_KEY là khóa "anon/public" (an toàn để để ở client nhờ RLS). KHÔNG BAO GIỜ dán service_role key vào đây.
// Để trống cả hai = tắt đồng bộ, ứng dụng chạy hoàn toàn trên máy.
window.XTK_CLOUD = window.XTK_CLOUD || {
  SUPABASE_URL: 'https://yygzotircszhsosiuxwv.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_4TFGeVypLmaYx_tyhvPYVA_6gcJmT9V',
};
