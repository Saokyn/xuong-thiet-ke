// Đồng bộ đám mây (tùy chọn) — điền thông tin dự án Supabase của bạn.
// SUPABASE_ANON_KEY là khóa "anon/public" (an toàn để để ở client nhờ RLS). KHÔNG BAO GIỜ dán service_role key vào đây.
// Để trống cả hai = tắt đồng bộ, ứng dụng chạy hoàn toàn trên máy.
window.XTK_CLOUD = window.XTK_CLOUD || {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
};
