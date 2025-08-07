import os from 'os';
import fs from 'fs';

function getBrowserPath() {
    // Check if custom path is set in environment variable
    if (process.env.BROWSER_PATH) {
        return process.env.BROWSER_PATH;
    }

    // Default Brave paths by OS
    const defaultPaths = {
        win32: [
            'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
            'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
            `${os.homedir()}\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`
        ],
        darwin: [
            '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'
        ],
        linux: [
            '/usr/bin/brave-browser',
            '/usr/bin/brave',
            '/snap/bin/brave'
        ]
    };

    const paths = defaultPaths[os.platform()] || defaultPaths.linux;

    // Try to find existing browser
    for (const path of paths) {
        if (fs.existsSync(path)) {
            console.log(`Found Brave browser at: ${path}`);
            return path;
        }
    }

    console.log('Brave browser not found in default locations.');
    console.log('You can set a custom path with: set BROWSER_PATH="C:\\path\\to\\your\\brave.exe"');

    return paths[0]; // Return first default path as fallback
}

export { getBrowserPath };