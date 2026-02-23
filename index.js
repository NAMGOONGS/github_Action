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
        
        // 실제 사이트 테이블 구조 타격
        const latestPost = $('table tbody tr').not('.notice').first(); 
        
        // 실제 사이트 칸 순서에 맞춤 (0번: 번호, 1번: 제목, 2번: 작성자, 4번: 날짜)
        const title  = latestPost.find('td').eq(1).text().trim(); 
        const worker = latestPost.find('td').eq(2).text().trim(); 
        const date   = latestPost.find('td').eq(4).text().trim(); 

        // 데이터가 없으면 강제로 로그 남기기 (디버깅용)
        if (!title) {
            console.log("데이터를 추출하지 못했습니다. 셀렉터 수정이 필요합니다.");
            return;
        }

        if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ lastTitle: "" }));
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        if (data.lastTitle !== title) {
            console.log("NEW_DATA_DETECTED"); // 이 글자가 찍혀야 카톡이 감
            console.log(`📅 날짜: ${date}`);
            console.log(`📌 제목: ${title}`);
            console.log(`👤 배정자: ${worker}`);

            data.lastTitle = title;
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        } else {
            // 변화가 없을 때도 로그를 남겨서 확인 가능하게 함
            console.log("변화 없음. 현재 제목: " + title);
        }
    } catch (error) {
        console.error("에러 발생:", error.message);
    }
}

checkSite();
