const fs = require('fs');

async function checkSite() {
    const dbPath = './db.json';
    
    // 1. db.json 파일이 없으면 초기값 생성
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({ count: 0 }));
    }

    // 2. 파일 읽기 (반드시 utf8 인코딩 추가)
    const fileContent = fs.readFileSync(dbPath, 'utf8');
    
    // 3. JSON 파싱
    let data;
    try {
        data = JSON.parse(fileContent);
    } catch (e) {
        console.error("JSON 파싱 에러! 파일 내용을 확인하세요:", fileContent);
        data = { count: 0 };
    }

    // --- 여기에 본인의 스크래핑 로직 (axios, cheerio) ---
    console.log("현재 데이터:", data.count);
    
    // 예시: 카운트 증가
    data.count += 1;

    // 4. 결과 저장
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

checkSite();
