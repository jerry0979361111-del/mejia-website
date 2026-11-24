// 全站共用的公司資訊。電話、地址、社群連結改這裡即可。
export const site = {
  name: 'Mejia 美家',
  tagline: '實現你的澳洲夢想家',
  // 已正式上線（2026-11-18），允許搜尋引擎收錄
  noindex: false,
  tel: '+886 2 2932 1111',
  email: 'admin@mejia.au',
  offices: [
    { title: '台灣｜澳大利亞美家國際股份有限公司', lines: ['台北市文山區羅斯福路五段 88 號', '+886 2 2932 1111'] },
    { title: '澳洲｜Mejia Property Co Pty Ltd', lines: ['PO Box 763, Runaway Bay, QLD 4216', '+61 433 024 808'] },
  ],
  // Cloudflare Turnstile 的 site key（公開）。留空時表單不顯示驗證框，只適合本機測試
  turnstileSiteKey: '0x4AAAAAAF10gNwfMnzPANwP',
  // 手機版 AI 顧問位置：'bottom'＝畫面最下方整條按鈕；'top'＝頁首搜尋圖示，點開後全螢幕、輸入框在上方
  // 建置時可用環境變數 PUBLIC_CHAT_MOBILE=top 覆蓋（預覽站評估用）
  chatMobile: ((import.meta.env.PUBLIC_CHAT_MOBILE as string) || 'bottom') as 'top' | 'bottom',
  // 追蹤碼（留空即不載入）
  // GA4 直接用 gtag 安裝（不要再在 GTM 容器裡加 GA4 代碼，否則會重複計算）；Google Ads 等其他代碼放 GTM
  ga4Id: 'G-CH75EW8XS1',
  gtmId: 'GTM-WQX5GRB6',
  // ChatGPT 廣告（OpenAI Ads）像素
  openaiPixelId: 'Jt2jdeaFonv4UMpK4QNnVq',
  taxId: '9364-1830',
  abn: '17 673 000 881',
};

// 主選單
export const nav = [
  { label: '新房項目', href: '/projects/' },
  { label: '城市導覽', href: '/#cities' },
  { label: '購房流程', href: '/process/' },
  { label: '試算工具', href: '/calculator/' },
  { label: '房產指南', href: '/insights/' },
  { label: '關於美家', href: '/about/' },
];
