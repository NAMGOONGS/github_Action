const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function checkSite() {
    const dbPath = './db.json';
    try {
        // 1. 사이트 데이터 가져오기
        const response = await axios.get('https://excacademy.kr/rental-duty');
        const $ = cheerio.load(response.data);
        
        // [중요] 사이트 실제 HTML 구조에 맞춰 클래스명을 수정해야 합니다.
        // 아래는 예시이며, 실제 사이트의 태그(예: tr, div.item 등)를 확인 후 변경하세요.
        const latestPost = $('.list_item').first(); 
        
        const date = latestPost.find('.date_class').text().trim();
        const title = latestPost.find('.title_class').text().trim();
        const worker = latestPost.find('.worker_class').text().trim();
        const time = latestPost.find('.time_class').text().trim();

        // 2. DB 읽기
        if (!fs.existsSync(dbPath)) {
            fs.writeFileSync(dbPath, JSON.stringify({ lastTitle: "" }));
        }
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        // 3. 변경 사항 체크 및 메시지 생성
        if (title && data.lastTitle !== title) {
            const content = `📅 날짜: ${date}\n📌 제목: ${title}\n👤 배정자: ${worker}\n⏰ 근무시간: ${time}`;
            
            // GitHub Actions용 출력 (YML에서 이 값을 읽어 카톡으로 보냅니다)
            // 여러 줄 메시지를 위해 특수 처리가 필요하므로 간단한 로그를 남깁니다.
            console.log("NEW_DATA_DETECTED");
            console.log(content);

            // DB 업데이트
            data.lastTitle = title;
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        } else {
            console.log("NO_CHANGES");
        }
    } catch (error) {
        console.error("스크래핑 에러:", error.message);
    }
}

checkSite();
