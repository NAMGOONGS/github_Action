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
        await page.setViewport({ width: 1440, height: 1200 });

        console.log("로그인 및 페이지 접속 중...");
        await page.goto('https://excacademy.kr/rental-duty', { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });

        // 1. 로그인 수행
        await page.waitForSelector('input', { timeout: 15000 });
        const inputs = await page.$$('input'); 
        if (inputs.length >= 2) {
            await inputs[0].type(process.env.USER_ID || '', { delay: 30 }); 
            await inputs[1].type(process.env.USER_PW || '', { delay: 30 });
            await page.keyboard.press('Enter');
        }

        // 2. 로그인 후 리다이렉션 및 테이블 로딩 대기
        await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
        // 혹시 메인으로 튕겼을 경우 다시 게시판으로 이동
        if (page.url() !== 'https://excacademy.kr/rental-duty') {
            await page.goto('https://excacademy.kr/rental-duty', { waitUntil: 'networkidle2' });
        }

        // ⭐ 핵심: '대기' 상태 텍스트가 나타날 때까지 대기
        console.log("대기 상태 일정 확인 중...");
        await new Promise(r => setTimeout(r, 5000)); // 리액트 렌더링 여유 시간

        // 3. '대기' 상태인 행만 정밀 추출
        const waitStatusData = await page.evaluate(() => {
            // 모든 행(tr 또는 div)을 가져옵니다. 
            // 이미지상 테이블 구조이므로 tr이나 관련 요소를 탐색합니다.
            const rows = Array.from(document.querySelectorAll('tr, .flex-row, div[role="row"]'));
            
            // '대기' 글자가 포함된 행들을 필터링합니다.
            const waitingRows = rows.filter(row => {
                const cells = Array.from(row.querySelectorAll('td, span, div'));
                return cells.some(cell => cell.innerText.trim() === '대기');
            });

            if (waitingRows.length > 0) {
                // 여러 개일 수 있으므로 모두 합치거나 가장 최신(첫 번째) 것을 가져옵니다.
                return waitingRows.map(row => {
                    // 행 내부의 불필요한 단어(보기, 수정, 삭제 아이콘 등)를 제외하고 텍스트만 정리
                    return row.innerText.replace(/보기|거부이력/g, '').replace(/\s+/g, ' ').trim();
                }).join(' / ');
            }
            return null;
        });

        if (!waitStatusData) {
            console.log("현재 '대기' 상태인 대관 일정이 없습니다.");
            return;
        }

        // 4. DB 비교 및 저장
        if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ lastTitle: "" }));
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        if (data.lastTitle !== waitStatusData) {
            console.log("NEW_DATA_DETECTED");
            console.log(`📌 대기 일정 발견: ${waitStatusData}`);
            console.log(`⏰ 확인 시간: ${new Date().toLocaleString('ko-KR')}`);

            data.lastTitle = waitStatusData;
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        } else {
            console.log("새로운 대기 일정 없음 (이전과 동일)");
        }
    } catch (error) {
        console.error("에러 발생:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

checkSite();
