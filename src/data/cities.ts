export type CityId = 'sydney' | 'melbourne' | 'brisbane' | 'goldcoast' | 'perth';

// hidden: true 的城市暫不在網站上顯示（首頁、城市頁、表單、試算、頁尾都會跟著拿掉）；要恢復把 hidden 拿掉即可
export const allCities: { id: CityId; zh: string; en: string; intro: string; hidden?: boolean }[] = [
  { id: 'sydney', zh: '雪梨', en: 'Sydney', intro: '澳洲最大城市與金融中心，學區與地鐵沿線是長期保值的選擇。' },
  { id: 'melbourne', zh: '墨爾本', en: 'Melbourne', intro: '教育與文化之都，名校密集，留學家庭置產首選。' },
  { id: 'brisbane', zh: '布里斯本', en: 'Brisbane', intro: '2032 奧運主辦城市，基礎建設持續到位，陽光充足的亞熱帶氣候。' },
  { id: 'goldcoast', zh: '黃金海岸', en: 'Gold Coast', intro: '海岸線、運河與度假生活，自住與短租都有市場。' },
  { id: 'perth', zh: '珀斯', en: 'Perth', intro: '西澳首府，與台灣零時差，入手門檻相對親民。', hidden: true },
];

// 網站上顯示的城市
export const cities = allCities.filter((c) => !c.hidden);

export const cityName = (id: CityId) => allCities.find((c) => c.id === id)!.zh;

// 城市名稱串成「雪梨、墨爾本、…」與中文數字（「四座城市」）
export const cityList = cities.map((c) => c.zh).join('、');
export const cityCountZh = '零一二三四五六七八九十'[cities.length];

// 「熱銷房產物件」分頁與搜尋列顯示的城市
export const projectCities = cities;
