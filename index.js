const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function checkSite() {
    const dbPath = './db.json';
    try {
        const response = await axios.get('https://excacademy.kr/rental-duty', {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
            },
            timeout: 10000
        });
        const $ = cheerio.load(response.data);
        
        // 사이트의 테이블 구조를 직접 타격 (일반적인 게시판 형태)
        // 게시판 목록의 첫 번째 행(tr)을 가져옵니다.
        const latestPost = $('table tbody tr').first(); 
        
        // 만약 첫 번째 행이 비어있다면 다른 방식으로 접근
        if (latestPost.length === 0) {
            console.log("사이트 구조 파악 실패: tr 태그를 찾을 수 없습니다.");
            return;
        }

        // 각 td의 순서에 따라 데이터 추출 (사이트에 맞춰 eq 숫자를 조정하세요)
        const title  = latestPost.find('td').eq(1).text().trim(); // 제목 열
        const worker = latestPost.find('td').eq(2).text().trim(); // 작성자/배정자 열
        const date   = latestPost.find('td').eq(4).text().trim(); // 날짜 열

        // 2. DB 읽기 및 초기화
        if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ lastTitle: "" }));
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        // 3. 비교 (title이 비어있지 않은지 확인 필수)
        if (title && data.lastTitle !== title) {
            console.log("NEW_DATA_DETECTED"); 
            console.log(`📅 날짜: ${date || '미상'}`);
            console.log(`📌 제목: ${title}`);
            console.log(`👤 배정자: ${worker || '미상'}`);
            console.log(`⏰ 업데이트 감지: ${new Date().toLocaleString('ko-KR')}`);

            data.lastTitle = title;
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        } else {
            // 디버깅용: 왜 안 넘어가지는지 로그를 남깁니다.
            console.log(`변화 없음. 현재 제목: [${title}], 이전 제목: [${data.lastTitle}]`);
            console.log("NO_CHANGES");
        }
    } catch (error) {
        console.error("에러 상세:", error.message);
    }
}

checkSite();
