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

        // 2. 게시판 제목을 찾는 '지능형' 로직
        const title = await page.evaluate(() => {
            // 우선순위 1: 전형적인 게시판 제목 태그들
            const target = document.querySelector('.subject, .title, td.left, a[href*="view"]');
            if (target && target.innerText.trim().length > 2 && !target.innerText.includes('로그인')) {
                return target.innerText.trim();
            }

            // 우선순위 2: 태그를 순회하며 텍스트가 있는 링크 찾기
            const links = Array.from(document.querySelectorAll('a, td'));
            for (let el of links) {
                const text = el.innerText.trim();
                if (text.length > 5 && !['로그인', '회원가입', '공지사항', '비밀번호'].some(word => text.includes(word))) {
                    return text; 
                }
            }
            
            // 우선순위 3: 최후의 수단 (본문 첫 줄)
            return document.body.innerText.split('\n').find(line => line.trim().length > 5) || "";
        });

        // 3. 예외 처리
        if (!title || title.includes('로그인')) {
            console.log("CRITICAL_ERROR: 데이터를 여전히 찾지 못함 (로그인 페이지 가능성)");
            return;
        }

        // 4. DB 비교 및 결과 출력
        if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ lastTitle: "" }));
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        if (data.lastTitle !== title) {
            console.log("NEW_DATA_DETECTED");
            console.log(`📌 최신글: ${title}`);
            console.log(`⏰ 업데이트: ${new Date().toLocaleString('ko-KR')}`);

            data.lastTitle = title;
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
        } else {
            console.log(`변화 없음: [${title}] 기존과 동일합니다.`);
        }
    } catch (error) {
        console.error("에러 발생:", error.message);
    } finally {
        if (browser) await browser.close();
    }
}

checkSite();
