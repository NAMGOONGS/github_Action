const puppeteer = require('puppeteer');
const fs = require('fs');

async function checkSite() {
    const dbPath = './db.json';
    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        const page = await browser.newPage();
        
        // 1. 사이트 접속
        await page.goto('https://excacademy.kr/rental-duty', { 
            waitUntil: 'networkidle0', 
            timeout: 60000 
        });

        // 2. 로그인 처리
        console.log("로그인 시도 중...");
        // input 태그의 name이나 type을 기준으로 입력 (사이트 구조에 맞춤)
        await page.type('input[type="text"], input[name*="email"]', 'ngs@exc.co.kr'); 
        await page.type('input[type="password"]', 'tjrdl1584@');
        
        // 로그인 버튼 클릭 (Enter 키 입력 또는 버튼 클릭)
        await page.keyboard.press('Enter');
        
        // 로그인 후 페이지 이동 및 리액트 렌더링 대기
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        console.log("로그인 완료, 데이터 로딩 대기...");

        // 3. '주말 대관근무' 관련 데이터 추출
        const postData = await page.evaluate(() => {
            // 게시판 행들을 모두 가져옴
            const rows = Array.from(document.querySelectorAll('tr, div[class*="row"]'));
            for (let row of rows) {
                const text = row.innerText;
                // '주말 대관근무'라는 텍스트가 포함된 행을 찾음
                if (text.includes('주말 대관근무')) {
                    return text.replace(/\n/g, ' ').trim(); // 줄바꿈 제거 후 반환
                }
            }
            // 못 찾을 경우 첫 번째 요소라도 반환
            const firstEntry = document.querySelector('td.subject, .title');
            return firstEntry ? firstEntry.innerText.trim() : "";
        });

        if (!postData) {
            console.log("CRITICAL_ERROR: 데이터를 찾을 수 없습니다.");
            return;
        }

        // 4. DB 비교
        if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ lastTitle: "" }));
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        if (data.lastTitle !== postData) {
            console.log("NEW_DATA_DETECTED");
            console.log(`📌 정보: ${postData.substring(0, 100)}`);
            console.log(`⏰ 확인: ${new Date().toLocaleString('ko-KR')}`);

            data.lastTitle = postData;
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        } else {
            console.log(`변화 없음: 기존 데이터와 동일합니다.`);
        }
    } catch (error) {
        console.error("에러 발생:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

checkSite();
