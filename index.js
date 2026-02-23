const puppeteer = require('puppeteer');
const fs = require('fs');

async function checkSite() {
    const dbPath = './db.json';
    let browser;
    try {
        // 가상 브라우저 실행
        browser = await puppeteer.launch({ 
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        const page = await browser.newPage();
        
        // 사이트 접속 및 리액트 로딩 대기
        await page.goto('https://excacademy.kr/rental-duty', { waitUntil: 'networkidle2' });
        
        // Tailwind나 React 게시판에서 제목을 가진 요소를 더 넓게 탐색
        const title = await page.evaluate(() => {
            // 리액트/테일윈드 사이트에서 제목이 들어갈 만한 요소들을 순회
            const selectors = [
                'table tbody tr td a', 
                'div[class*="subject"]', 
                'div[class*="title"]',
                '.board_list a'
            ];
            for (let s of selectors) {
                const el = document.querySelector(s);
                if (el && el.innerText.trim()) return el.innerText.trim();
            }
            return "";
        });

        if (!title) {
            console.log("CRITICAL_ERROR: 리액트 렌더링 후에도 제목을 찾지 못했습니다.");
            return;
        }

        if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ lastTitle: "" }));
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        if (data.lastTitle !== title) {
            console.log("NEW_DATA_DETECTED");
            console.log(`📌 최신글: ${title}`);
            console.log(`⏰ 확인시간: ${new Date().toLocaleString('ko-KR')}`);

            data.lastTitle = title;
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        } else {
            console.log(`변화 없음: [${title}] 제목이 기존과 같습니다.`);
        }
    } catch (error) {
        console.error("에러 발생:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

checkSite();
