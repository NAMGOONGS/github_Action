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
        await page.setViewport({ width: 1280, height: 1000 });

        console.log("로그인 페이지 접속 중...");
        // 처음부터 해당 게시판 주소로 접속하면 로그인이 안 된 경우 로그인 페이지로 튕깁니다.
        await page.goto('https://excacademy.kr/rental-duty', { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });

        // 1. 로그인 수행
        console.log("로그인 정보 입력 중...");
        await page.waitForSelector('input', { timeout: 15000 });
        const inputs = await page.$$('input'); 
        
        if (inputs.length >= 2) {
            await inputs[0].type(process.env.USER_ID || '', { delay: 50 }); 
            await inputs[1].type(process.env.USER_PW || '', { delay: 50 });
            await page.keyboard.press('Enter');
        }

        // 2. 로그인 완료 대기 및 서브 페이지 강제 재접속
        console.log("로그인 완료 대기 및 게시판 페이지 재진입...");
        await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
        
        // ⭐ 핵심: 로그인 후 메인으로 튕겼을 경우를 대비해 다시 서브 페이지로 이동합니다.
        await page.goto('https://excacademy.kr/rental-duty', { waitUntil: 'networkidle2' });
        
        // 게시판 내용(리액트)이 그려질 때까지 5초 충분히 대기
        await new Promise(r => setTimeout(r, 5000)); 

        // 3. '주말 대관근무' 데이터 정밀 추출
        const postData = await page.evaluate(() => {
            // 게시판 테이블 또는 특정 클래스를 가진 요소를 먼저 찾습니다.
            // 사이트 구조에 따라 .board-list 또는 table 등을 탐색
            const boardContainer = document.querySelector('table, .board-list, main');
            const allText = boardContainer ? boardContainer.innerText : document.body.innerText;

            if (allText.includes('주말 대관근무')) {
                const index = allText.indexOf('주말 대관근무');
                // 해당 단어부터 뒤로 150자까지만 가져오기
                return allText.substring(index, index + 150).replace(/\s+/g, ' ').trim();
            }
            return "";
        });

        if (!postData) {
            console.log("CRITICAL_ERROR: '주말 대관근무' 데이터를 찾지 못했습니다. 현재 페이지에 해당 텍스트가 없습니다.");
            return;
        }

        // 4. DB 비교 및 저장
        if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ lastTitle: "" }));
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        if (data.lastTitle !== postData) {
            console.log("NEW_DATA_DETECTED");
            console.log(`📌 정보: ${postData}`);
            console.log(`⏰ 확인: ${new Date().toLocaleString('ko-KR')}`);

            data.lastTitle = postData;
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        } else {
            console.log(`변화 없음: [${postData.substring(0, 20)}...]`);
        }
    } catch (error) {
        console.error("에러 발생:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

checkSite();
