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

        // 2. 페이지 안정화 대기
        await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
        if (page.url() !== 'https://excacademy.kr/rental-duty') {
            await page.goto('https://excacademy.kr/rental-duty', { waitUntil: 'networkidle2' });
        }
        await new Promise(r => setTimeout(r, 5000)); // 데이터 로딩 대기

        // 3. '대기' 상태인 행에서 특정 컬럼만 추출
        const waitStatusData = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('tr'));
            
            // '대기' 텍스트가 있는 행 찾기
            const waitingRow = rows.find(row => {
                const text = row.innerText;
                return text.includes('대기') && !text.includes('마감됨');
            });

            if (waitingRow) {
                const cells = Array.from(waitingRow.querySelectorAll('td'));
                if (cells.length >= 6) {
                    // 이미지 기준 열 순서:
                    // 0: 날짜, 1: 제목, 2: 설명(보기), 3: 배정자, 4: 근무시간, 5: 근무수당, 6: 상태
                    const date = cells[0].innerText.trim();
                    const title = cells[1].innerText.trim();
                    const person = cells[3].innerText.trim();
                    const time = cells[4].innerText.trim();
                    
                    return `[대기알림] 일시: ${date} / 제목: ${title} / 배정: ${person} / 시간: ${time}`;
                }
            }
            return null;
        });

        if (!waitStatusData) {
            console.log("현재 '대기' 상태인 새 일정이 없습니다.");
            return;
        }

        // 4. DB 비교 및 저장 (중복 발송 방지)
        if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ lastTitle: "" }));
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        if (data.lastTitle !== waitStatusData) {
            console.log("NEW_DATA_DETECTED");
            console.log(`📌 대기 일정 발견: ${waitStatusData}`);
            
            data.lastTitle = waitStatusData;
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        } else {
            console.log("변화 없음: 기존에 이미 발송된 대기 일정입니다.");
        }
    } catch (error) {
        console.error("에러 발생:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

checkSite();
