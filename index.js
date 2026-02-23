const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function checkSite() {
    const dbPath = './db.json';
    try {
        // 1. 사이트 데이터 가져오기 (차단 방지를 위해 User-Agent 추가)
        const response = await axios.get('https://excacademy.kr/rental-duty', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });
        const $ = cheerio.load(response.data);
        
        // 2. 게시판 첫 번째 행 추출 (공지사항 태그가 있다면 .not('.notice') 등으로 제외 가능)
        // 사이트 테이블 구조에 따라 tr을 선택합니다.
        const latestPost = $('table tbody tr').first(); 
        
        // 각 열(td)에서 데이터 추출 (사이트 실제 순서에 맞춰 eq 번호 조정)
        const title  = latestPost.find('td').eq(1).text().trim(); // 보통 2번째 칸이 제목
        const worker = latestPost.find('td').eq(2).text().trim(); // 보통 3번째 칸이 작성자/배정자
        const date   = latestPost.find('td').eq(4).text().trim(); // 보통 5번째 칸이 날짜

        if (!title) {
            console.log("데이터를 추출하지 못했습니다. 셀렉터를 점검하세요.");
            return;
        }

        // 3. DB 파일 로드 및 비교
        if (!fs.existsSync(dbPath)) {
            fs.writeFileSync(dbPath, JSON.stringify({ lastTitle: "" }));
        }
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        // 4. 새로운 데이터인지 확인
        if (data.lastTitle !== title) {
            // YML이 감지할 수 있도록 첫 줄에 핵심 키워드 출력
            console.log("NEW_DATA_DETECTED"); 
            console.log(`📅 날짜: ${date}`);
            console.log(`📌 제목: ${title}`);
            console.log(`👤 배정자: ${worker}`);
            console.log(`⏰ 확인시간: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);

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
