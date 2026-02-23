const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function checkSite() {
    const dbPath = './db.json';
    try {
        const response = await axios.get('https://excacademy.kr/rental-duty', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(response.data);
        
        // 사이트 게시판의 첫 번째 줄을 찾습니다.
        // table tbody tr 구조 중 공지사항(.notice)을 제외한 첫 번째 줄 선택
        const latestPost = $('table tbody tr').not('.notice').first(); 
        
        // 데이터 추출 (순서가 다를 수 있으므로 확인 필요)
        const title  = latestPost.find('td').eq(1).text().trim(); 
        const worker = latestPost.find('td').eq(2).text().trim(); 
        const date   = latestPost.find('td').eq(4).text().trim(); 

        // 데이터가 아예 안 긁힐 경우 로그 출력
        if (!title) {
            console.log("CRITICAL_ERROR: 데이터를 찾을 수 없습니다. 셀렉터 수정이 필요합니다.");
            return;
        }

        if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ lastTitle: "" }));
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        // 비교 로직
        if (data.lastTitle !== title) {
            console.log("NEW_DATA_DETECTED"); // 이 문구가 있어야 YML이 동작함
            console.log(`📅 날짜: ${date}`);
            console.log(`📌 제목: ${title}`);
            console.log(`👤 배정자: ${worker}`);
            console.log(`⏰ 업데이트 시간: ${new Date().toLocaleString('ko-KR')}`);

            data.lastTitle = title;
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        } else {
            console.log(`NO_CHANGES: 현재 제목 [${title}]이 기존과 같습니다.`);
        }
    } catch (error) {
        console.error("에러 발생:", error.message);
    }
}

checkSite();
