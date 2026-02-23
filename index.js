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
        
        // [수정 포인트] 사이트마다 다른 테이블 구조를 무시하고 
        // 제목이 들어있을 법한 모든 'a' 태그나 리스트 요소를 검색합니다.
        let title = "";
        let worker = "확인필요";
        let date = new Date().toLocaleDateString();

        // 게시판 목록의 '제목' 부분을 찾는 가장 강력한 셀렉터 조합
        const titleElement = $('.subject a, .title a, td a').first();
        
        if (titleElement.length > 0) {
            title = titleElement.text().trim();
        }

        // 만약 여전히 제목을 못 찾는다면? (최후의 수단)
        if (!title) {
            console.log("DEBUG: 기본 셀렉터 실패. 전체 텍스트에서 추출 시도.");
            title = $('td').eq(1).text().trim() || $('tr').eq(1).find('td').first().text().trim();
        }

        if (!title) {
            console.log("CRITICAL_ERROR: 어떤 방법으로도 제목을 찾을 수 없습니다.");
            return;
        }

        if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ lastTitle: "" }));
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        if (data.lastTitle !== title) {
            console.log("NEW_DATA_DETECTED");
            console.log(`📅 확인일: ${date}`);
            console.log(`📌 최신글: ${title}`);
            console.log(`🔗 링크: https://excacademy.kr/rental-duty`);

            data.lastTitle = title;
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        } else {
            console.log(`변화 없음: [${title}] 제목이 기존과 같습니다.`);
        }
    } catch (error) {
        console.error("에러 발생:", error.message);
    }
}

checkSite();
