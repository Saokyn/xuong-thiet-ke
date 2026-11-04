// Self-drawn vector elements (original artwork, no third-party assets) + Tabler icons + Twemoji list.
(() => {
  // Paths in a 100×100 box
  const P = {
    star: 'M50 3 L62 37 L98 38 L69 60 L79 95 L50 74 L21 95 L31 60 L2 38 L38 37 Z',
    heart: 'M50 92 C20 70 2 52 2 30 C2 14 14 3 28 3 C38 3 46 9 50 17 C54 9 62 3 72 3 C86 3 98 14 98 30 C98 52 80 70 50 92 Z',
    hexagon: 'M25 4 L75 4 L99 50 L75 96 L25 96 L1 50 Z',
    pentagon: 'M50 2 L98 38 L80 97 L20 97 L2 38 Z',
    diamond: 'M50 1 L99 50 L50 99 L1 50 Z',
    blob: 'M52 3 C74 2 95 16 97 40 C99 62 88 86 62 95 C38 103 12 90 5 66 C-2 42 10 22 26 11 C34 6 43 3 52 3 Z',
    blob2: 'M30 6 C48 -2 74 6 88 22 C102 38 98 66 82 82 C66 98 36 100 18 86 C0 72 -2 46 8 28 C13 18 20 11 30 6 Z',
    arch: 'M2 98 L2 50 C2 22 24 2 50 2 C76 2 98 22 98 50 L98 98 Z',
    bubble: 'M8 6 L92 6 C96 6 98 8 98 12 L98 64 C98 68 96 70 92 70 L40 70 L20 94 L24 70 L8 70 C4 70 2 68 2 64 L2 12 C2 8 4 6 8 6 Z',
    burst: (() => { let d = ''; for (let i = 0; i < 32; i++) { const r = i % 2 ? 40 : 50, a = i / 32 * Math.PI * 2; d += (i ? 'L' : 'M') + (50 + r * Math.sin(a)).toFixed(1) + ' ' + (50 - r * Math.cos(a)).toFixed(1) + ' '; } return d + 'Z'; })(),
    arrowBlock: 'M2 35 L60 35 L60 12 L98 50 L60 88 L60 65 L2 65 Z',
    cross: 'M35 2 L65 2 L65 35 L98 35 L98 65 L65 65 L65 98 L35 98 L35 65 L2 65 L2 35 L35 35 Z',
    cloud: 'M25 80 C10 80 2 70 2 58 C2 46 12 38 24 39 C26 24 38 14 52 14 C66 14 76 23 79 35 C91 35 98 45 98 57 C98 70 89 80 76 80 Z',
    leaf: 'M5 95 C5 45 35 5 95 5 C95 60 60 95 5 95 Z',
  };
  const svg = (inner, vb = '0 0 100 100') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${inner}</svg>`;
  // Decorative SVG artwork (self-drawn)
  const petal = (c) => [0, 72, 144, 216, 288].map(a => `<ellipse cx="50" cy="28" rx="15" ry="24" fill="${c}" transform="rotate(${a} 50 50)"/>`).join('');
  const MOTIFS = {
    'Tết': [
      ['Hoa mai', svg(petal('#facc15') + '<circle cx="50" cy="50" r="10" fill="#ea580c"/>' + [0, 60, 120, 180, 240, 300].map(a => `<line x1="50" y1="50" x2="50" y2="34" stroke="#b45309" stroke-width="2" transform="rotate(${a} 50 50)"/>`).join(''))],
      ['Hoa đào', svg(petal('#f9a8d4') + '<circle cx="50" cy="50" r="9" fill="#db2777"/>')],
      ['Đèn lồng', svg('<line x1="50" y1="0" x2="50" y2="14" stroke="#7c2d12" stroke-width="2"/><rect x="38" y="12" width="24" height="7" rx="2" fill="#f59e0b"/><ellipse cx="50" cy="48" rx="32" ry="30" fill="#dc2626"/><path d="M50 18 C35 30 35 66 50 78 M50 18 C65 30 65 66 50 78" stroke="#991b1b" stroke-width="2" fill="none"/><rect x="38" y="76" width="24" height="7" rx="2" fill="#f59e0b"/><path d="M44 83 L42 99 M50 83 L50 99 M56 83 L58 99" stroke="#f59e0b" stroke-width="2"/>')],
      ['Bao lì xì', svg('<rect x="18" y="4" width="64" height="92" rx="6" fill="#dc2626"/><path d="M18 10 Q50 44 82 10" fill="#b91c1c"/><circle cx="50" cy="38" r="12" fill="#facc15"/><text x="50" y="44" font-size="16" text-anchor="middle" fill="#b91c1c" font-family="Lora" font-weight="700">₫</text><rect x="28" y="66" width="44" height="4" rx="2" fill="#facc15"/><rect x="34" y="76" width="32" height="4" rx="2" fill="#facc15"/>')],
      ['Pháo hoa', svg([...Array(12)].map((_, i) => `<line x1="50" y1="50" x2="50" y2="8" stroke="${['#f59e0b', '#ef4444', '#facc15'][i % 3]}" stroke-width="4" stroke-linecap="round" stroke-dasharray="6 6" transform="rotate(${i * 30} 50 50)"/>`).join('') + '<circle cx="50" cy="50" r="6" fill="#fde047"/>')],
      ['Bánh chưng', svg('<rect x="12" y="12" width="76" height="76" rx="6" fill="#15803d"/><rect x="12" y="44" width="76" height="12" fill="#facc15"/><rect x="44" y="12" width="12" height="76" fill="#facc15"/><rect x="18" y="18" width="64" height="64" rx="4" fill="none" stroke="#166534" stroke-width="2"/>')],
    ],
    'Trung thu': [
      ['Trăng rằm', svg('<circle cx="50" cy="50" r="44" fill="#fde68a"/><circle cx="36" cy="38" r="7" fill="#fcd34d"/><circle cx="62" cy="60" r="10" fill="#fcd34d"/><circle cx="58" cy="30" r="4" fill="#fcd34d"/>')],
      ['Đèn ông sao', svg('<path d="' + P.star + '" fill="#ef4444" stroke="#facc15" stroke-width="3"/><path d="M50 22 L50 74 M24 40 L76 40 M32 80 L50 50 L68 80" stroke="#facc15" stroke-width="2" fill="none"/>')],
      ['Bánh trung thu', svg('<circle cx="50" cy="50" r="44" fill="#d97706"/>' + [...Array(12)].map((_, i) => `<circle cx="50" cy="10" r="8" fill="#d97706" transform="rotate(${i * 30} 50 50)"/>`).join('') + '<circle cx="50" cy="50" r="30" fill="#f59e0b"/><path d="M50 30 L56 44 L70 50 L56 56 L50 70 L44 56 L30 50 L44 44 Z" fill="#b45309"/>')],
      ['Thỏ ngọc', svg('<ellipse cx="38" cy="22" rx="7" ry="20" fill="#f1f5f9" stroke="#cbd5e1"/><ellipse cx="56" cy="22" rx="7" ry="20" fill="#f1f5f9" stroke="#cbd5e1"/><ellipse cx="48" cy="66" rx="30" ry="26" fill="#f8fafc" stroke="#cbd5e1"/><circle cx="48" cy="44" r="16" fill="#f8fafc" stroke="#cbd5e1"/><circle cx="42" cy="42" r="2" fill="#334155"/><circle cx="54" cy="42" r="2" fill="#334155"/><circle cx="48" cy="48" r="2" fill="#f472b6"/>')],
      ['Đèn lồng cá chép', svg('<path d="M10 50 C25 20 65 20 80 50 C65 80 25 80 10 50 Z" fill="#f97316"/><path d="M80 50 L98 34 L94 50 L98 66 Z" fill="#ef4444"/><circle cx="26" cy="46" r="4" fill="#111"/><path d="M40 36 C46 46 46 54 40 64 M54 34 C60 46 60 54 54 66" stroke="#fde047" stroke-width="3" fill="none"/>')],
    ],
    'Cưới': [
      ['Nhẫn cưới', svg('<circle cx="38" cy="58" r="22" fill="none" stroke="#d4a017" stroke-width="7"/><circle cx="62" cy="58" r="22" fill="none" stroke="#eab308" stroke-width="7"/><path d="M58 28 L66 18 L74 28 L66 36 Z" fill="#bae6fd" stroke="#38bdf8"/>')],
      ['Hai trái tim', svg('<path d="' + P.heart + '" fill="#f43f5e" transform="translate(4 18) scale(.6)"/><path d="' + P.heart + '" fill="#fb7185" transform="translate(38 30) scale(.6)"/>')],
      ['Hoa hồng', svg('<circle cx="50" cy="40" r="26" fill="#e11d48"/><path d="M50 22 C62 26 64 40 54 46 C44 52 36 42 44 34 C50 30 56 36 52 40" stroke="#9f1239" stroke-width="3" fill="none"/><path d="M50 66 L50 98" stroke="#15803d" stroke-width="4"/><path d="M50 80 C36 70 26 74 22 82 C34 88 44 86 50 80" fill="#16a34a"/>')],
      ['Vòng hoa', svg([...Array(16)].map((_, i) => `<ellipse cx="50" cy="12" rx="6" ry="10" fill="${i % 2 ? '#86efac' : '#22c55e'}" transform="rotate(${i * 22.5} 50 50)"/>`).join('') + [0, 90, 180, 270].map(a => `<circle cx="50" cy="10" r="6" fill="#fda4af" transform="rotate(${a + 45} 50 50)"/>`).join(''))],
      ['Chim bồ câu', svg('<path d="M10 60 C30 58 40 40 60 40 C72 40 80 32 86 28 L82 40 C90 44 94 52 90 60 C76 76 46 78 30 70 Z" fill="#f8fafc" stroke="#94a3b8" stroke-width="2"/><path d="M44 46 C40 26 50 12 64 8 C62 24 60 36 52 46" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/><circle cx="80" cy="36" r="2" fill="#334155"/>')],
    ],
    'Ruy băng & nhãn': [
      ['Ruy băng', svg('<path d="M2 20 L22 20 L22 50 L2 50 L10 35 Z" fill="#b91c1c"/><path d="M98 20 L78 20 L78 50 L98 50 L90 35 Z" fill="#b91c1c"/><rect x="14" y="12" width="72" height="30" fill="#ef4444"/><path d="M14 42 L22 50 L22 42 Z M86 42 L78 50 L78 42 Z" fill="#7f1d1d"/>', '0 0 100 56')],
      ['Ruy băng cong', svg('<path d="M4 34 Q50 4 96 34 L96 54 Q50 24 4 54 Z" fill="#7c3aed"/><path d="M4 34 L-0 58 L8 52 Z M96 34 L100 58 L92 52 Z" fill="#5b21b6"/>', '-2 0 104 62')],
      ['Nhãn sale', svg('<path d="' + P.burst + '" fill="#ef4444"/><text x="50" y="58" font-size="22" text-anchor="middle" fill="#fff" font-family="Bungee">SALE</text>')],
      ['Tem giảm giá', svg('<path d="M10 10 L70 10 L95 50 L70 90 L10 90 Z" fill="#f59e0b"/><circle cx="72" cy="50" r="6" fill="#fff"/><text x="38" y="58" font-size="22" text-anchor="middle" fill="#fff" font-family="Bungee">-30%</text>')],
      ['Khung tên viền kép', svg('<rect x="3" y="3" width="194" height="74" rx="8" fill="#fff" stroke="#1e3a8a" stroke-width="3"/><rect x="10" y="10" width="180" height="60" rx="5" fill="none" stroke="#1e3a8a" stroke-width="1.5"/>', '0 0 200 80')],
      ['Khung tên hoa văn', svg('<path d="M20 4 L180 4 Q182 20 196 22 L196 58 Q182 60 180 76 L20 76 Q18 60 4 58 L4 22 Q18 20 20 4 Z" fill="#fffbeb" stroke="#b45309" stroke-width="3"/><path d="M28 12 L172 12 M28 68 L172 68" stroke="#d97706" stroke-width="1.5" stroke-dasharray="4 4"/>', '0 0 200 80')],
      ['Khung tên bầu dục', svg('<ellipse cx="100" cy="40" rx="96" ry="36" fill="#fdf2f8" stroke="#db2777" stroke-width="3"/><ellipse cx="100" cy="40" rx="88" ry="29" fill="none" stroke="#f9a8d4" stroke-width="1.5"/>', '0 0 200 80')],
      ['Góc trang trí', svg('<path d="M4 96 L4 30 Q4 4 30 4 L96 4" fill="none" stroke="#b45309" stroke-width="4"/><path d="M14 96 L14 36 Q14 14 36 14 L96 14" fill="none" stroke="#d97706" stroke-width="2"/><circle cx="30" cy="30" r="6" fill="#d97706"/>')],
      ['Đường phân cách hoa', svg('<path d="M2 20 L80 20 M120 20 L198 20" stroke="#b45309" stroke-width="2"/><path d="M100 6 L108 20 L100 34 L92 20 Z" fill="#d97706"/><circle cx="84" cy="20" r="3" fill="#d97706"/><circle cx="116" cy="20" r="3" fill="#d97706"/>', '0 0 200 40')],
    ],
  };
  const SHAPES = [['Hình chữ nhật', 'rect'], ['Bo góc', 'round'], ['Hình tròn', 'circle'], ['Tam giác', 'triangle'], ...['star', 'heart', 'hexagon', 'pentagon', 'diamond', 'blob', 'blob2', 'arch', 'bubble', 'burst', 'arrowBlock', 'cross', 'cloud', 'leaf'].map(k => [({ star: 'Ngôi sao', heart: 'Trái tim', hexagon: 'Lục giác', pentagon: 'Ngũ giác', diamond: 'Hình thoi', blob: 'Hình mềm', blob2: 'Hình mềm 2', arch: 'Vòm cửa', bubble: 'Bong bóng thoại', burst: 'Tem nổ', arrowBlock: 'Mũi tên khối', cross: 'Dấu cộng', cloud: 'Đám mây', leaf: 'Chiếc lá' })[k], k])];
  const LINES = [['Đường thẳng', 'line'], ['Nét đứt', 'dash'], ['Chấm', 'dot'], ['Mũi tên', 'arrow'], ['Mũi tên 2 đầu', 'arrow2'], ['Đường lượn sóng', 'wave']];
  const EMOJI = ['1f389', '1f38a', '1f381', '1f388', '2764', '1f496', '1f495', '2b50', '1f31f', '2728', '1f525', '1f44d', '1f600', '1f60d', '1f970', '1f602', '1f60e', '1f4af', '2705', '1f4e3', '1f6d2', '1f4b0', '1f3f7', '2615', '1f370', '1f382', '1f355', '1f37b', '1f9e7', '1f3ee', '1f386', '1f387', '1f338', '1f33c', '1f409', '1f34a', '1f96e', '1f315', '1f407', '1f38b', '1f48d', '1f490', '1f492', '1f942', '1f54a', '1f339', '1f337', '1f340', '1f308', '2600', '1f343'];
  const EMOJI_KW = { '1f389': 'tiệc chúc mừng', '1f381': 'quà', '1f388': 'bóng bay', '2764': 'tim yêu', '2b50': 'sao', '1f525': 'lửa hot', '1f6d2': 'giỏ hàng mua sắm', '2615': 'cà phê', '1f382': 'bánh sinh nhật', '1f9e7': 'lì xì tết', '1f3ee': 'đèn lồng tết trung thu', '1f386': 'pháo hoa tết', '1f338': 'hoa đào', '1f409': 'rồng', '1f96e': 'bánh trung thu', '1f315': 'trăng trung thu', '1f407': 'thỏ', '1f48d': 'nhẫn cưới', '1f490': 'hoa cưới', '1f492': 'nhà thờ cưới', '1f942': 'cụng ly', '1f54a': 'bồ câu', '1f339': 'hoa hồng' };
  window.XTK_ELEMENTS = { P, MOTIFS, SHAPES, LINES, EMOJI, EMOJI_KW, svg };
})();
