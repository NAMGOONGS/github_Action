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
        
        // 화면 크기를 넉넉하게 잡아야 요소가 잘 보입니다.
        await page.setViewport({ width: 1280, height: 800 });

        console.log("사이트 접속 중...");
        await page.goto('https://excacademy.kr/rental-duty', { 
            waitUntil: 'networkidle2', 
            timeout: 60000 
        });

        // ⭐ 핵심: 로그인 입력창이 나타날 때까지 기다립니다.
        console.log("로그인 입력창 대기 중...");
        await page.waitForSelector('input', { timeout: 30000 });

        console.log("로그인 정보 입력 중...");
        // 좀 더 범용적인 선택자로 수정했습니다.
        const inputs = await page.$$('input'); 
        if (inputs.length >= 2) {
            await inputs[0].type('ngs@exc.co.kr', { delay: 100 }); // 사람처럼 약간의 딜레이
            await inputs[1].type('tjrdl1584@', { delay: 100 });
        } else {
            throw new Error("입력창을 충분히 찾지 못했습니다.");
        }
        
        await page.keyboard.press('Enter');
        
        // 로그인 후 게시판 내용이 뜰 때까지 대기
        console.log("로그인 완료, 게시판 로딩 대기...");
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        // 게시판 데이터가 비동기로 뜰 수 있으므로 3초만 더 쉽니다.
        await new Promise(r => setTimeout(r, 3000)); 

        const postData = await page.evaluate(() => {
            // 주말 대관근무 텍스트가 포함된 요소를 찾습니다.
            const allText = document.body.innerText;
            if (allText.includes('주말 대관근무')) {
                // 해당 단어 주변 텍스트를 가져옵니다.
                const index = allText.indexOf('주말 대관근무');
                return allText.substring(index, index + 100).replace(/\n/g, ' ').trim();
            }
            return document.querySelector('table, ul, section')?.innerText.substring(0, 100) || "";
        });

        if (!postData || postData.length < 5) {
            console.log("CRITICAL_ERROR: 로그인 후 데이터를 가져오지 못했습니다.");
            return;
        }

        if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ lastTitle: "" }));
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        if (data.lastTitle !== postData) {
            console.log("NEW_DATA_DETECTED");
            console.log(`📌 정보: ${postData}`);
            console.log(`⏰ 확인: ${new Date().toLocaleString('ko-KR')}`);
