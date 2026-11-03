// Template sizes (px). print=true => 300dpi print template (DPI warnings apply)
const mm2px = mm => Math.round(mm / 25.4 * 300);
window.TEMPLATES = [
  { id: 'fb-cover', name: 'Ảnh bìa Facebook', w: 851, h: 315, group: 'Mạng xã hội' },
  { id: 'yt-art', name: 'Ảnh bìa kênh YouTube', w: 2560, h: 1440, group: 'Mạng xã hội' },
  { id: 'yt-thumb', name: 'Thumbnail YouTube', w: 1280, h: 720, group: 'Mạng xã hội' },
  { id: 'tiktok', name: 'Video/ảnh TikTok', w: 1080, h: 1920, group: 'Mạng xã hội' },
  { id: 'post-sq', name: 'Bài đăng FB/IG vuông', w: 1080, h: 1080, group: 'Mạng xã hội' },
  { id: 'post-45', name: 'Bài đăng FB/IG 4:5', w: 1080, h: 1350, group: 'Mạng xã hội' },
  { id: 'story', name: 'Story FB/IG', w: 1080, h: 1920, group: 'Mạng xã hội' },
  { id: 'a4', name: 'Poster A4 (300dpi)', w: mm2px(210), h: mm2px(297), print: true, group: 'In ấn' },
  { id: 'a3', name: 'Poster A3 (300dpi)', w: mm2px(297), h: mm2px(420), print: true, group: 'In ấn' },
  { id: 'p60x160', name: 'Poster 60×160 cm', w: 7087, h: 18898, print: true, group: 'In khổ lớn' },
  { id: 'p80x180', name: 'Poster 80×180 cm', w: 9449, h: 21260, print: true, group: 'In khổ lớn' },
];
window.mm2px = mm2px;
