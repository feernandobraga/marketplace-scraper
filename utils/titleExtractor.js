/**
 * Extracts the title from a Facebook Marketplace item page
 * @param {Object} page - Puppeteer page object
 * @returns {Promise<string>} - The extracted title
 */
export async function extractTitle(page) {
    return await page.evaluate(() => {
        const h1Elements = document.querySelectorAll('h1');
        for (const h1 of h1Elements) {
            const text = h1.textContent?.trim();
            // Skip navigation titles
            if (text && !['Home', 'Chats', 'Buying', 'Selling', 'Facebook Menu'].includes(text)) {
                return text;
            }
        }
        // Fallback to document title
        return document.title.replace('Marketplace - ', '').replace(' | Facebook', '');
    });
}