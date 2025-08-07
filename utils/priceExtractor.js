/**
 * Extracts the price from a Facebook Marketplace item page
 * @param {Object} page - Puppeteer page object
 * @param {string} title - The item title (used as reference)
 * @returns {Promise<string>} - The extracted price
 */
export async function extractPrice(page, title) {
    return await page.evaluate((title) => {
        // Strategy: Find the h1 with the title, then look at the next sibling div
        const h1Elements = document.querySelectorAll('h1');
        let titleH1 = null;

        // Find the h1 that contains our title
        for (const h1 of h1Elements) {
            const text = h1.textContent?.trim();
            if (text && text === title) {
                titleH1 = h1;
                break;
            }
        }

        if (titleH1) {
            // Look at the next sibling div
            let nextSibling = titleH1.nextElementSibling;

            // Sometimes we need to go through a few siblings to find the div with price
            for (let i = 0; i < 3 && nextSibling; i++) {
                if (nextSibling.tagName === 'DIV') {
                    const siblingText = nextSibling.textContent?.trim();
                    if (siblingText) {
                        // Look for price pattern in the sibling div
                        const priceMatch = siblingText.match(/([A-Z]?\$\d+(?:,\d{3})*(?:\.\d{2})?|€\d+(?:,\d{3})*(?:\.\d{2})?|£\d+(?:,\d{3})*(?:\.\d{2})?)/);
                        if (priceMatch) {
                            return priceMatch[1];
                        }
                    }
                }
                nextSibling = nextSibling.nextElementSibling;
            }
        }

        // Fallback: if sibling approach doesn't work, look in the main container
        const mainContainer = document.body;
        const elementsInContainer = mainContainer.querySelectorAll('*');
        for (const element of elementsInContainer) {
            const text = element.textContent?.trim();
            if (text && text.length < 20) {
                const priceMatch = text.match(/^([A-Z]?\$\d+(?:,\d{3})*(?:\.\d{2})?|€\d+(?:,\d{3})*(?:\.\d{2})?|£\d+(?:,\d{3})*(?:\.\d{2})?)$/);
                if (priceMatch) {
                    return priceMatch[1];
                }
            }
        }

        return 'No price found';
    }, title);
}