const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

// index.js의 scraper 부분 수정 예시
async function checkSite() {
    try {
        const response = await axios.get('https://excacademy.kr/rental-duty');
        const $ = cheerio.load(response.data);
        
        // 실제 사이트의 게시글 행(tr 또는 div)을 찾아야 합니다.
        // 예: 보통 테이블의 첫 번째 줄은 tr:nth-child(1) 등입니다.
        const latestPost = $('table tbody tr').first(); 
        
        // 셀렉터 예시 (사이트 개발자 도구(F12)로 확인한 실제 클래스명을 넣어야 합니다)
        const date = latestPost.find('td.date').text().trim();
        const title = latestPost.find('td.subject a').text().trim();
        const worker = latestPost.find('td.writer').text().trim();
        // 근무시간이 따로 없다면 제목 등에서 추출해야 할 수도 있습니다.
        const time = "본문 확인 필요"; 

        if (!title) {
            console.log("데이터를 찾을 수 없습니다. 셀렉터를 확인하세요.");
            return;
        }

        // 이후 동일...

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
