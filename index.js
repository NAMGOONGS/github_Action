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
        
        // 사이트 구조 분석 결과: 게시판 리스트는 'tbody tr' 안에 있습니다.
        // 공지사항을 제외하고 실제 데이터가 들어있는 행을 찾습니다.
        const rows = $('table tbody tr');
        let latestPost = null;

        rows.each((i, el) => {
            // '공지'라고 적힌 행은 건너뜁니다.
            if (!$(el).hasClass('notice') && !$(el).find('.notice_icon').length && latestPost === null) {
                latestPost = $(el);
            }
        });

        if (!latestPost) {
            // 만약 위 조건으로 안 잡히면 강제로 첫 번째 행이라도 잡습니다.
            latestPost = rows.first();
        }

        // 각 칸(td)에서 데이터 추출
        const title  = latestPost.find('td').eq(1).text().trim(); // 제목
        const worker = latestPost.find('td').eq(2).text().trim(); // 작성자
        const date   = latestPost.find('td').eq(4).text().trim(); // 날짜

        // 핵심 디버깅: 무엇을 가져왔는지 로그에 남깁니다.
        if (!title) {
            console.log("CRITICAL_ERROR: 제목(title) 추출에 실패했습니다. HTML 구조를 확인하세요.");
            return;
        }

        if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ lastTitle: "" }));
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        if (data.lastTitle !== title) {
            console.log("NEW_DATA_DETECTED");
            console.log(`📅 날짜: ${date}`);
            console.log(`📌 제목: ${title}`);
            console.log(`👤 배정자: ${worker}`);

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
