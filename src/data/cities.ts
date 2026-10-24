export type CityId = 'sydney' | 'melbourne' | 'brisbane' | 'goldcoast' | 'perth';

export const cities: { id: CityId; zh: string; en: string; intro: string }[] = [
  { id: 'sydney', zh: '雪梨', en: 'Sydney', intro: '澳洲最大城市與金融中心，學區與地鐵沿線是長期保值的選擇。' },
  { id: 'melbourne', zh: '墨爾本', en: 'Melbourne', intro: '教育與文化之都，名校密集，留學家庭置產首選。' },
  { id: 'brisbane', zh: '布里斯本', en: 'Brisbane', intro: '2032 奧運主辦城市，基礎建設持續到位，陽光充足的亞熱帶氣候。' },
  { id: 'goldcoast', zh: '黃金海岸', en: 'Gold Coast', intro: '海岸線、運河與度假生活，自住與短租都有市場。' },
  { id: 'perth', zh: '珀斯', en: 'Perth', intro: '西澳首府，與台灣零時差，入手門檻相對親民。' },
];

export const cityName = (id: CityId) => cities.find((c) => c.id === id)!.zh;

// 「熱銷房產物件」分頁與搜尋列顯示的城市（目前不含珀斯）
export const projectCities = cities.filter((c) => c.id !== 'perth');
