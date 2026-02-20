const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function checkSite() {
    const url = "https://excacademy.kr/rental-duty";
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    
    // 대상 테이블의 행(tr) 개수 파악
    const currentCount = $("tbody tr").length;
    
    // 이전 데이터 로드 (db.json 파일 등)
    const db = JSON.parse(fs.readFileSync('./db.json', 'utf8'));
    
    if (currentCount > db.lastCount) {
        console.log("새로운 데이터 발견! 카톡 발송 시작");
        await sendKakaoMessage(`새로운 렌탈 의무 교육 데이터가 등록되었습니다! (현재: ${currentCount}건)`);
        
        // 데이터 업데이트
        db.lastCount = currentCount;
        fs.writeFileSync('./db.json', JSON.stringify(db));
    } else {
        console.log("변동 사항 없음.");
    }
}

// 카카오 API 발송 함수 (Access Token 필요)
async function sendKakaoMessage(text) {
    // 여기에 카카오 API 호출 로직 작성
}

checkSite();
