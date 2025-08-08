import os from 'os';
import fs from 'fs';

function getBrowserPath() {
    // Check if custom path is set in environment variable
    if (process.env.BROWSER_PATH) {
        return process.env.BROWSER_PATH;
    }

    // Tries to find a browser to run puppeteer
    const defaultPaths = {
        win32: [
            'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
            'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
            `${os.homedir()}\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            `${os.homedir()}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
            'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
            'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe'
        ],
        darwin: [
            '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Firefox.app/Contents/MacOS/firefox'
        ],
        linux: [
            '/usr/bin/brave-browser',
            '/usr/bin/brave',
            '/snap/bin/brave',
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium-browser',
            '/snap/bin/chromium',
            '/usr/bin/firefox',
            '/snap/bin/firefox',
        ]
    };

    const paths = defaultPaths[os.platform()] || defaultPaths.linux;

    // Try to find existing browser
    for (const path of paths) {
        if (fs.existsSync(path)) {
            console.log(`Found browser at: ${path}`);
            return path;
        }
    }

    console.log('Browser not found in default locations.');
    console.log('You can set a custom path with: set BROWSER_PATH="C:\\path\\to\\your\\browser.exe"');

    return paths[0]; // Return first default path as fallback
}

export { getBrowserPath };