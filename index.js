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
        
        // 브라우저 화면 크기 설정 (요소 가독성 향상)
        await page.setViewport({ width: 1280, height: 1000 });

        console.log("사이트 접속 중...");
        await page.goto('https://excacademy.kr/rental-duty', { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });

        // 1. 로그인 입력창이 나타날 때까지 대기
        console.log("로그인 입력창 대기 중...");
        try {
            await page.waitForSelector('input[type="password"]', { timeout: 15000 });
        } catch (e) {
            console.log("대기 시간 초과: 입력창을 찾을 수 없습니다. 현재 페이지 텍스트 확인 시도.");
        }

        // 2. 로그인 정보 입력 (환경변수 사용)
        console.log("로그인 정보 입력 중...");
        const inputs = await page.$$('input'); 
        
        if (inputs.length >= 2) {
            // process.env를 통해 GitHub Secrets 값을 가져옵니다.
            await inputs[0].type(process.env.USER_ID || '', { delay: 50 }); 
            await inputs[1].type(process.env.USER_PW || '', { delay: 50 });
            await page.keyboard.press('Enter');
        } else {
            console.log("입력창 요소를 충분히 찾지 못했습니다. 선택자 확인이 필요합니다.");
            return;
        }
        
        // 3. 로그인 후 게시판 이동 대기
        console.log("로그인 완료, 게시판 데이터 로딩 대기...");
        await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
        await new Promise(r => setTimeout(r, 4000)); // 리액트 렌더링을 위한 추가 여유 시간

        // 4. '주말 대관근무' 데이터 추출
        const postData = await page.evaluate(() => {
            const allText = document.body.innerText;
            if (allText.includes('주말 대관근무')) {
                const index = allText.indexOf('주말 대관근무');
                // 해당 단어 포함 100자 추출 (불필요한 공백/줄바꿈 제거)
                return allText.substring(index, index + 150).replace(/\s+/g, ' ').trim();
            }
            // 특정 요소(테이블 등)가 있다면 해당 텍스트 우선 추출
            const board = document.querySelector('table, .board-list, section');
            return board ? board.innerText.substring(0, 100).replace(/\s+/g, ' ').trim() : "";
        });

        if (!postData || postData.length < 5) {
            console.log("CRITICAL_ERROR: 로그인 후 '주말 대관근무' 데이터를 찾지 못했습니다.");
            return;
        }

        // 5. DB 비교 및 결과 출력
        if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ lastTitle: "" }));
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        if (data.lastTitle !== postData) {
            console.log("NEW_DATA_DETECTED");
            console.log(`📌 정보: ${postData}`);
            console.log(`⏰ 확인: ${new Date().toLocaleString('ko-KR')}`);

            data.lastTitle = postData;
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        } else {
            console.log(`변화 없음: [${postData.substring(0, 15)}...]`);
        }
    } catch (error) {
        console.error("에러 발생:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

checkSite();
