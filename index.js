const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function checkSite() {
    const dbPath = './db.json';
    try {
        const response = await axios.get('https://excacademy.kr/rental-duty', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });
        const $ = cheerio.load(response.data);
        
        // 게시판의 첫 번째 행 선택
        const latestPost = $('table tbody tr').not('.notice').first(); 
        
        // 데이터 추출
        const title  = latestPost.find('td').eq(1).text().trim(); 
        const worker = latestPost.find('td').eq(2).text().trim(); 
        const date   = latestPost.find('td').eq(4).text().trim(); 

        if (!title) {
            console.log("CRITICAL_ERROR: 데이터를 찾지 못했습니다.");
            return;
        }

        if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ lastTitle: "" }));
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        // 핵심: 다를 때만 출력
        if (data.lastTitle !== title) {
            console.log("NEW_DATA_DETECTED"); // 이 줄이 있어야 스킵이 안 됨
            console.log(`📅 날짜: ${date}`);
            console.log(`📌 제목: ${title}`);
            console.log(`👤 배정자: ${worker}`);

            data.lastTitle = title;
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        } else {
            // 스킵되는 이유를 로그에 찍어줍니다.
            console.log(`중복 발견: [${title}]은 이미 db.json에 있습니다.`);
        }
    } catch (error) {
        console.error("에러 발생:", error.message);
    }
}

checkSite();
