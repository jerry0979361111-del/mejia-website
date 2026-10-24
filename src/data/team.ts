// 美家團隊。顧問照片原檔放在 素材/顧問照片/，轉成 webp 後放 public/img/agent-*.webp（400px）與 agent-*-lg.webp（800px）。
// 有填 profile 的顧問才會產生個人頁 /team/<slug>/，首頁照片也才會連過去。
// 新增顧問資料：照 AL 的格式補上 profile 即可；draft: true 會在頁面上標示「範本內容」。
export type Profile = {
  draft?: boolean;
  title: string; // 職稱
  quote: string; // 一句話介紹
  bio: string[]; // 自我介紹（每段一個字串）
  specialties: string[]; // 專長
  languages: string[];
  credentials: string[]; // 證照、資歷
  contact: { phone?: string; phoneTw?: string; email?: string };
  // 社群連結（填完整網址；沒有就不填）
  // wechat 可填網址；只有微信 ID 時填 wechatId，網站會讓圖示點一下就複製 ID
  social: { instagram?: string; facebook?: string; line?: string; whatsapp?: string; wechat?: string; wechatId?: string; youtube?: string; threads?: string };
  projects: string[]; // 主推建案 slug（對應 Notion 同步的建案；未公開的會自動略過）
};

export type Member = { slug: string; name: string; role: string; img: string; imgLg: string; profile?: Profile };


// 公司共用的聯絡方式（顧問沒有個人帳號時使用）
const CO = {
  phone: '+61 433 024 808',
  phoneTw: '+886 2 2932 1111',
  line: 'https://line.me/ti/p/JAMgcPK-BK',
  facebook: 'https://www.facebook.com/admin.mejia',
  instagram: 'https://www.instagram.com/mejia.taiwan/',
  youtube: 'https://www.youtube.com/@mejia.taiwan',
  whatsapp: 'https://wa.me/61433024808',
};

const base: { slug: string; name: string; profile?: Profile }[] = [
  {
    slug: 'al',
    name: 'AL',
    profile: {
      title: '房產顧問',
      quote: '買房不只從『看房』開始，更要認識『城市』。',
      bio: [
        '擁有 10+ 年市場開發、廣告行銷與房地產相關經驗，並具備 Property Development & Management 與 Cross-cultural Management 雙碩士背景。',
        '2009 年第一次來到 Melbourne，也從那時開始與澳洲建立長期連結。',
        '對我來說，房地產不只是一間房子的價格、格局與租金，更重要的是它背後的城市：人口為什麼移入？交通與建設往哪裡發展？學校、工作與生活圈如何改變？什麼樣的區域，適合什麼樣的人？',
        '2023 年起專注澳洲房地產，透過市場研究、數據分析與第一線實地走訪，持續分享 Melbourne、Brisbane、Sydney、Gold Coast 的城市發展、生活方式與房地產市場。',
        '希望在推薦一間房子以前，先陪你理解這座城市，也理解自己的需求。先研究城市，再推薦適合的給您。',
      ],
      specialties: ['城市發展研究', '市場數據分析', '區域與生活圈評估', '實地走訪'],
      languages: ['中文', '英文'],
      credentials: ['Property Development & Management 碩士', 'Cross-cultural Management 碩士', '市場開發、廣告行銷與房地產經驗 10+ 年'],
      contact: { phone: CO.phone, phoneTw: CO.phoneTw },
      social: {
        line: 'https://line.me/ti/p/_XZ5r-q2ve',
        whatsapp: 'https://wa.me/886958839933',
        wechatId: 'Alchen07',
        instagram: 'https://www.instagram.com/al.estate/',
        facebook: 'https://www.facebook.com/people/Al%E8%81%8A%E6%BE%B3%E6%B4%B2%E8%B2%B7%E6%88%BF/61583563815817/',
        youtube: 'https://www.youtube.com/@Alestate',
      },
      projects: ['first-light', 'the-one', 'the-oscar', 'iconica'],
    },
  },
  {
    slug: 'ivan',
    name: 'Ivan',
    profile: {
      title: '房產顧問',
      quote: '從投資者的角度出發，協助每位客戶做出最明智的決策。',
      bio: [
        '大家好，我是 Ivan。來澳洲已二十年，這片土地已然成為我的第二個家。',
        '在澳洲，我完成了大學學業，主修房地產與金融管理雙學位。這些專業知識為我在房地產市場奠定了堅實的理論基礎與實踐能力。',
        '六年前，我開始專注於澳洲房地產銷售領域，尤其精通土地自建項目的規劃與投資諮詢。在澳洲房產市場中，我累積了豐富的第一手經驗與專業知識。',
        '我的專業背景不僅包括房地產知識，還涵蓋了金融管理的全面理解。這種跨領域的專業素養使我能夠從投資者角度出發，為客戶提供深度且全面的市場分析與投資建議。我的目標是協助每位客戶做出最明智的投資決策，有效管理風險，同時最大化資產增值潛力。',
        '無論您是首次置業、尋求投資機會，或計劃在澳洲建立長期資產配置，我誠摯地希望能以專業知識與在地經驗，為您量身打造最適合的房產投資策略，共同實現您在澳洲的置業願景。',
      ],
      specialties: ['土地自建規劃', '投資分析與風險管理', '首次置業'],
      languages: ['中文', '英文'],
      credentials: ['房地產與金融管理雙學位', '澳洲房地產銷售 6 年', '旅居澳洲 20 年'],
      contact: { phone: CO.phone, phoneTw: CO.phoneTw },
      social: { line: CO.line, whatsapp: CO.whatsapp, facebook: CO.facebook, instagram: CO.instagram, youtube: CO.youtube },
      projects: ['the-oscar', 'iconica'],
    },
  },
  {
    slug: 'jerry',
    name: 'Jerry',
    profile: {
      title: '房產顧問',
      quote: '房地產不僅是交易，更是實現人生目標的工具。',
      bio: [
        '我是Jerry，擁有十年澳洲房產經驗的專業經紀人。我的房產旅程源於陪伴孩子在澳洲求學，進而深耕這片充滿機會的土地。多年來，我已協助無數自住與投資客戶尋得理想物件，並成功引導許多台灣與華人家庭在澳洲安居立業、進行穩健投資。',
        '憑藉對澳洲市場的深入了解與持續關注，我致力於以淺顯易懂的方式，為客戶分析房市趨勢、解析貸款流程、評估地段價值，以及制定個人化的購屋策略。我相信，專業知識需要透過清晰的溝通才能發揮最大價值，讓每位客戶都能做出明智的決策。',
        '澳洲房產市場對許多海外買家而言充滿未知與挑戰。作為文化橋樑，我不僅提供專業建議，更注重理解每位客戶的獨特需求與文化背景。從熟悉當地法規到協助跨國文件處理，我的服務遠超單純的房產交易，而是提供全方位的置業支持。',
        '對我而言，房地產不僅是交易，更是實現人生目標的工具。無論您是首次購屋者、尋求海外資產配置，還是希望通過房地產建立穩定的被動收入，我都願意分享我的經驗與見解，陪伴您一步步實現財務自由。',
      ],
      specialties: ['房市趨勢分析', '貸款流程規劃', '地段價值評估', '個人化購屋策略', '跨國文件協助'],
      languages: ['中文', '英文'],
      credentials: ['澳洲房產經驗 10 年', '留學生家長置產經驗'],
      contact: { phone: CO.phone, phoneTw: CO.phoneTw },
      social: {
        line: CO.line,
        instagram: 'https://www.instagram.com/jerry.wu.mejia/',
        facebook: CO.facebook,
        youtube: 'https://www.youtube.com/@jerry3656',
        wechat: 'https://u.wechat.com/kAbE-nfqoYqIFabdqGLfHCs',
      },
      projects: ['first-light', 'the-one', 'the-oscar', 'iconica'],
    },
  },
  { slug: 'lucy', name: 'Lucy' },
  {
    slug: 'lynn',
    name: 'Lynn',
    profile: {
      title: '房產顧問',
      quote: '每一位客戶都有獨特的需求和目標，我堅持提供量身定制的解決方案。',
      bio: [
        '大家好，我是 Lyn，從小在澳洲長大，擁有新南威爾斯大學財經與會計雙主修學位，以及昆士蘭大學的經濟學碩士學歷，專精於信託管理、跨國資產配置與澳洲置產策略。多年來，我協助許多來自台灣與亞洲的家庭與投資人，成功在澳洲打造屬於自己的資產版圖，從首次購屋、投資房產，到買地自建、留學移民全方位諮詢，都是我的服務強項。',
        '我的專業生涯始於澳洲知名金融機構，在那裡我深入了解了澳洲的金融體系和房地產市場運作方式。隨後，我決定成立自己的諮詢公司，希望能夠將這些寶貴的知識和經驗分享給更多有意在澳洲發展的華人朋友。我深信，每一位客戶都有獨特的需求和目標，因此我始終堅持提供量身定制的解決方案，確保每一步投資都能符合客戶的長遠利益。',
        '在過去十年中，我見證了澳洲房地產市場的起伏與變化，也親身參與了無數成功的投資案例。從雪梨的高端公寓到布里斯本的郊區別墅，從墨爾本的商業地產到黃金海岸的度假屋，我的投資足跡遍布澳洲各大城市。這些經驗不僅讓我對澳洲各地區的特點有了深刻的理解，也讓我能夠準確把握市場脈搏，為客戶提供最具前瞻性的建議。',
        '除了房產投資外，我也特別關注澳洲的教育與移民政策。作為一位在澳洲成長的華人，我深知文化融合的重要性，也理解許多家庭選擇澳洲不僅僅是為了投資，更是為了子女的教育和家庭的未來。因此，我的服務範圍也包括留學規劃、移民申請以及新移民的生活適應等方面的指導。',
        '如果你對澳洲置產、買地建屋、移民留學或財富規劃有興趣，歡迎關注我，一起深入探索澳洲的無限可能！我相信，通過專業的規劃和執行，每一位投資者都能在這片充滿機遇的土地上實現自己的夢想。',
      ],
      specialties: ['信託管理', '跨國資產配置', '買地自建', '留學與移民規劃'],
      languages: ['中文', '英文'],
      credentials: ['新南威爾斯大學 財經與會計雙主修', '昆士蘭大學 經濟學碩士', '澳洲房產市場經驗 10 年'],
      contact: { phone: CO.phone, phoneTw: CO.phoneTw },
      social: {
        line: CO.line,
        instagram: 'https://www.instagram.com/lyn.mejia2024/',
        facebook: 'https://www.facebook.com/share/1ANJ1UTfjS/',
        threads: 'https://www.threads.net/@lyn.mejia2024',
        youtube: CO.youtube,
      },
      projects: ['first-light', 'the-one', 'iconica'],
    },
  },
  {
    slug: 'ruby',
    name: 'Ruby',
    profile: {
      title: '房產顧問',
      quote: '站在您的角度，陪您找到真正適合自己的選擇。',
      bio: [
        'Hello，我是 Ruby。',
        '我畢業於國立台南大學音樂教育學系，之後前往澳洲 Torrens University 攻讀特殊教育（Special Education）碩士，並在澳洲生活長達十年。',
        '這十年間，我在澳洲求學、投入職場、成家，也生了兩個可愛的寶寶，更親身經歷澳洲購屋與置產的完整過程。澳洲對我而言，不只是曾經留學的地方，更是真正生活過、深入了解的第二個家。',
        '多年來，我持續關注澳洲房地產市場的發展，並深入了解雪梨、墨爾本、布里斯本與黃金海岸等主要城市的房市趨勢、人口發展、重大建設、學區規劃及政府政策。',
        '由於自己同時擁有澳洲與台灣的購屋經驗，我更能理解兩地房地產制度與購屋文化的差異，也了解台灣客戶在規劃澳洲置產時，除了價格之外，往往更關心貸款、稅務、政策、生活機能、教育資源，以及未來的發展潛力。',
        '我也希望把自己在澳洲十年累積的生活與置產經驗分享給更多人，協助客戶少走一些冤枉路，以更安心、更有信心的方式完成每一個重要的置產決策。',
        '目前，我專注於協助台灣客戶規劃澳洲新建案、自住置產、海外資產配置及子女教育相關需求，並持續透過社群平台、房產講座與市場分析，分享第一手的澳洲房市資訊。',
        '我希望透過專業、真誠且值得信賴的服務，協助每一位客戶真正了解市場、掌握購屋流程，並根據自身條件與長期目標，做出適合自己的置產決策。',
        '無論您是第一次接觸澳洲房產，或正在為家庭、教育與未來資產做更長遠的規劃，我都希望能站在您的角度，陪伴您找到真正適合自己的選擇，一起開啟屬於您的澳洲置產旅程。',
      ],
      specialties: ['新建案規劃', '自住置產', '海外資產配置', '子女教育與學區'],
      languages: ['中文', '英文'],
      credentials: ['國立台南大學 音樂教育學系', 'Torrens University 特殊教育碩士', '旅居澳洲 10 年、親身購屋經驗'],
      contact: { phone: CO.phone, phoneTw: CO.phoneTw },
      social: {
        line: 'https://line.me/R/ti/p/@861qhoup',
        wechatId: 'rubyhouseau',
        instagram: 'https://www.instagram.com/rubyhouseau/',
        facebook: 'https://www.facebook.com/p/Ruby%E7%9C%8B%E6%BE%B3%E6%B4%B2%E6%88%BF%E7%94%A2-61583387296270/',
        youtube: 'https://www.youtube.com/@rubyhouseau',
      },
      projects: ['first-light', 'the-one', 'the-oscar', 'iconica'],
    },
  },
  {
    slug: 'sandra',
    name: 'Sandra',
    profile: {
      title: '房產顧問',
      quote: '不只告訴你買哪一間，更讓你清楚為什麼。',
      bio: [
        '我是 Sandra，從17歲起便以二房東身分踏入租賃市場，親自處理物件評估、招租、租客溝通與管理，至今累積超過20年的房地產實務經驗，經歷涵蓋房產買賣、出租管理、長期持有與資產配置。多年的實際參與，讓我不只懂得如何挑選物件，更了解一項房產從購入、出租、管理到未來轉售，每個階段真正需要考量的細節與風險。',
        '目前我專注於澳洲房產、海外置業與資產配置，持續深入研究墨爾本、雪梨等主要城市的住宅市場。結合超過15年的跨國企業業務、行銷與市場策略經驗，我擅長將複雜的房市資訊，整理成清楚、具體且能實際執行的購屋方案，協助台灣與華人家庭更有方向地進入澳洲市場。',
        '在評估房產時，我不只看價格、格局與外觀，更重視城市發展、人口與就業成長、交通建設、學區資源、生活機能、租賃需求及未來轉售性。同時也會深入了解開發商實績、區域供需、持有成本、租金表現與產品稀缺性，從自住需求與投資邏輯兩個面向，判斷一個物件是否真正適合長期持有。',
        '對海外買家而言，澳洲購屋涉及海外人士身分限制、FIRB申請、印花稅、貸款條件、合約審閱、驗屋、交割及後續出租管理，每一個環節都可能影響最終成本與投資成果。因此，我提供的不只是物件資訊，更會協助客戶釐清需求、比較不同方案，並串聯澳洲當地開發商、房產律師、貸款顧問、會計師及物業管理團隊，讓跨國置業流程更加清楚、透明且安心。',
        '我相信，真正專業的房產服務，不只是告訴客戶「買哪一間」，而是讓客戶清楚理解：為什麼選擇這座城市、這個區域與這項產品，以及背後可能面臨的成本與風險。無論是孩子留學、自住移居、退休規劃，或建立海外資產配置，我都會根據每個家庭的預算、需求與人生目標，提供更符合實際情況的購屋建議。',
        '在這個平台上，我將持續分享澳洲房市趨勢、區域與建案分析、實地走訪、購屋流程、貸款稅務，以及海外買家必須注意的風險。歡迎追蹤我的頻道，讓我陪你用更完整的資訊與更清楚的判斷，找到真正適合自己的澳洲房產。',
      ],
      specialties: ['出租管理與長期持有', '海外置業與資產配置', '開發商與區域供需分析', 'FIRB、貸款與交割流程'],
      languages: ['中文', '英文'],
      credentials: ['房地產實務經驗 20+ 年', '跨國企業業務、行銷與市場策略 15+ 年'],
      contact: { phone: CO.phone, phoneTw: CO.phoneTw },
      social: {
        line: 'https://line.me/R/ti/p/@334jpbmm',
        instagram: 'https://www.instagram.com/sandralivingau/',
        facebook: 'https://www.facebook.com/61578494275861/',
      },
      projects: ['first-light', 'the-one', 'the-oscar', 'iconica'],
    },
  },
  { slug: 'zoe', name: 'Zoe' },
];

export const team: Member[] = base.map((m) => ({
  ...m,
  role: 'Agent',
  img: `/img/agent-${m.slug}.webp`,
  imgLg: `/img/agent-${m.slug}-lg.webp`,
}));

export const teamUrl = (m: Member) => `/team/${m.slug}/`;
