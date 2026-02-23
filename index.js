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
        
        // 1. 사이트 접속 (네트워크 대기 시간을 넉넉히 줍니다)
        await page.goto('https://excacademy.kr/rental-duty', { 
            waitUntil: 'networkidle0', 
            timeout: 60000 
        });

        // 2. 게시판 제목을 찾는 '지능형' 로직
        const title = await page.evaluate(() => {
            // 사이트 내의 모든 링크(a) 태그를 가져옵니다.
            const links = Array.from(document.querySelectorAll('a, div, td'));
            
            // 일반적인 게시판 제목의 특징: 텍스트가 5자 이상이며, 특정 키워드를 포함하지 않음
            for (let el of links) {
                const text = el.innerText.trim();
                // 너무 짧은 메뉴 이름이나 버튼은 제외하고, 실제 글 제목 같은 것만 필터링
                if (text.length > 5 && !['로그인', '회원가입', '공지사항'].includes(text)) {
                    // 부모 요소가 테이블이나 리스트 구조인지 확인 (선택 사항)
                    return text; 
                }
            }
            return "";
        });

        if (!title) {
            // 만약 못 찾았다면 전체 화면 스캔 (최종)
            console.log("CRITICAL_ERROR: 데이터를 여전히 찾지 못함. 사이트 점검 필요.");
            return;
        }

        if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ lastTitle: "" }));
        const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

        if (data.lastTitle !== title) {
            console.log("NEW_DATA_DETECTED");
            console.log(`📌 발견된 제목: ${title}`);
            console.log(`⏰ 업데이트 시각: ${new Date().toLocaleString('ko-KR')}`);

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
