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
        await page.setViewport({ width: 1280, height: 1200 });

        console.log("로그인 페이지 접속 중...");
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

        // 2. 로그인 완료 및 페이지 안정화 대기
        console.log("로그인 처리 대기...");
        await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
        
        // 확실하게 서브 페이지로 다시 이동
        console.log("게시판 페이지 강제 진입...");
        await page.goto('https://excacademy.kr/rental-duty', { waitUntil: 'networkidle2' });
        
        // ⭐ 핵심: 특정 글자가 포함된 요소가 나타날 때까지 최대 20초 대기
        console.log("게시판 데이터 로딩 감시 중...");
        try {
            // '주말'이라는 단어가 포함된 td나 div가 생길 때까지 기다림
            await page.waitForFunction(
                () => document.body.innerText.includes('주말'),
                { timeout: 20000 }
            );
        } catch (e) {
            console.log("대기 시간 초과: '주말' 단어를 찾지 못했습니다. 현재 화면 분석을 강행합니다.");
        }

        // 3. 정밀 데이터 추출
        const postData = await page.evaluate(() => {
            // 게시판은 보통 table이나 list 구조입니다.
            const rows = Array.from(document.querySelectorAll('tr, li, .list-item'));
            const targetRow = rows.find(row => row.innerText.includes('주말 대관근무'));
            
            if (targetRow) {
                return targetRow.innerText.replace(/\s+/g, ' ').trim();
            }

            // 못 찾았다면, 페이지 전체에서 해당 문구 주변 텍스트 긁기
            const bodyText = document.body.innerText;
            const keyword = '주말 대관근무';
            const pos = bodyText.indexOf(keyword);
            if (pos !== -1) {
                return bodyText.substring(pos, pos + 200).replace(/\s+/g, ' ').trim();
            }
            return null;
        });

        if (!postData) {
            // 디버깅: 찾지 못했을 때 페이지에 어떤 글자들이 있는지 상위 200자 출력
            const debugText = await page.evaluate(() => document.body.innerText.substring(0, 300));
            console.log("CRITICAL_ERROR: 데이터를 찾지 못함. 현재 페이지 요약:", debugText);
            return;
        }

        // 4. DB 비교
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
