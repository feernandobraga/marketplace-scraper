/**
 * Extracts the current URL from a page
 * @param {Object} page - Puppeteer page object
 * @returns {Promise<string>} - The current page URL
 */
export async function extractUrl(page) {
    return await page.evaluate(() => {
        return window.location.href;
    });
}