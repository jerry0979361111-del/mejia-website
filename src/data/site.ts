// 全站共用的公司資訊。電話、地址、社群連結改這裡即可。
export const site = {
  name: 'Mejia 美家',
  tagline: '實現你的澳洲夢想家',
  // 預覽階段禁止搜尋引擎收錄；正式上線時改成 false
  noindex: true,
  tel: '+886 2 2932 1111',
  email: 'admin@mejia.au',
  offices: [
    { title: '台灣｜澳大利亞美家國際股份有限公司', lines: ['台北市文山區羅斯福路五段 88 號', '+886 2 2932 1111'] },
    { title: '澳洲｜Mejia Property Co Pty Ltd', lines: ['PO Box 763, Runaway Bay, QLD 4216', '+61 433 024 808'] },
  ],
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
