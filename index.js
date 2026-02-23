const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function checkSite() {
    const dbPath = './db.json';
    try {
        const response = await axios.get('https://excacademy.kr/rental-duty', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
            timeout: 10000
        });
        const $ = cheerio.load(response.data);
        
        // 게시판의 첫 번째 행 (공지사항 제외)
        const latestPost = $('table tbody tr').not('.notice').first(); 
        
        // 데이터 추출
        const title  = latestPost.find('td').eq(1).text().trim(); 
        const worker = latestPost.find('td').eq(2).text().trim(); 
        const date   = latestPost.find('td').eq(4).text().trim(); 

        if (!title) {
            console.log("데이터 추출 실패: 테이블 구조를 확인하세요.");
            return;
        }

        if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ lastTitle: "" }));
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        // 핵심: 제목이 다르면 무조건 키워드 출력
        if (data.lastTitle !== title) {
            console.log("NEW_DATA_DETECTED"); // YML의 트리거
            console.log(`📅 날짜: ${date}`);
            console.log(`📌 제목: ${title}`);
            console.log(`👤 배정자: ${worker}`);

            data.lastTitle = title;
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        } else {
            // 중복일 때도 로그를 남겨야 "살아있다"는 걸 압니다.
            console.log("중복된 데이터입니다. 현재 제목: " + title);
        }
    } catch (error) {
        console.error("에러 발생:", error.message);
    }
}

checkSite();
