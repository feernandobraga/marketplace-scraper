const puppeteer = require('puppeteer');
const fs = require('fs');
const { getBrowserPath } = require('./Utils/browser-config');

async function loginAndSaveSession() {
    console.log('Opening browser for manual login...');

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1200, height: 800 },
        executablePath: getBrowserPath(),
        args: ['--window-size=1200,800', '--window-position=100,100']
    });

    const page = await browser.newPage();

    // Navigate to Facebook Marketplace saved items
    await page.goto('https://www.facebook.com/', {
        waitUntil: 'networkidle2'
    });

    console.log('Please log in to Facebook in the opened browser window.');
    console.log('Once you can see your saved items, press Enter in this terminal...');

    // Wait for user input
    await new Promise(resolve => {
        process.stdin.once('data', resolve);
    });

    // Save cookies using the new Browser API
    const context = browser.defaultBrowserContext();
    const cookies = await context.cookies();
    fs.writeFileSync('session-cookies.json', JSON.stringify(cookies, null, 2));

    // Save localStorage
    const localStorage = await page.evaluate(() => {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            data[key] = localStorage.getItem(key);
        }
        return data;
    });
    fs.writeFileSync('session-localStorage.json', JSON.stringify(localStorage, null, 2));

    console.log('Session data saved successfully!');
    console.log('You can now run "npm run scrape" to scrape in headless mode.');

    await browser.close();
}

loginAndSaveSession().catch(console.error);