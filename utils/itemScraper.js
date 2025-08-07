import { extractTitle } from './titleExtractor.js';
import { extractDescription } from './descriptionExtractor.js';
import { extractPrice } from './priceExtractor.js';
import { extractUrl } from './urlExtractor.js';
import { clickSeeMore } from './seeMoreHandler.js';

/**
 * Scrapes detailed information from a Facebook Marketplace item page
 * @param {Object} page - Puppeteer page object
 * @param {string} itemUrl - URL of the item to scrape
 * @param {number} index - Current item index (for logging)
 * @param {number} total - Total number of items (for logging)
 * @returns {Promise<Object>} - Scraped item details
 */
export async function scrapeItemDetails(page, itemUrl, index, total) {
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[${index + 1}/${total}] Visiting: ${itemUrl} (Attempt ${attempt}/${maxRetries})`);

            await page.goto(itemUrl, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // Wait a bit for dynamic content to load
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Try to expand description by clicking "See more" if it exists
            const seeMoreClicked = await clickSeeMore(page);

            // Extract data using modular functions
            const title = await extractTitle(page);
            const description = await extractDescription(page, title, seeMoreClicked);
            const price = await extractPrice(page, title);
            const url = await extractUrl(page);

            // Extract item ID from URL
            const itemIdMatch = itemUrl.match(/\/marketplace\/item\/(\d+)/);
            const itemId = itemIdMatch ? itemIdMatch[1] : '';

            const itemDetails = {
                title,
                description,
                price,
                url,
                itemId
            };

            console.log(`   ✓ Extracted: ${itemDetails.title.substring(0, 50)}...`);

            // Check if description contains Facebook navigation elements
            const invalidDescriptions = [
                'MarketplaceBrowse allNotificationsInboxMarketplace',
                'Browse allNotificationsInboxMarketplace',
                'MarketplaceBrowse all',
                'NotificationsInboxMarketplace'
            ];

            const hasInvalidDescription = invalidDescriptions.some(invalid =>
                itemDetails.description.includes(invalid)
            );

            if (hasInvalidDescription && attempt < maxRetries) {
                console.log(`   ⚠️ Invalid description detected (navigation elements), retrying...`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait before retry
                continue; // Try again
            }

            return itemDetails;

        } catch (error) {
            console.log(`   ✗ Error scraping ${itemUrl} (Attempt ${attempt}): ${error.message}`);

            if (attempt === maxRetries) {
                return {
                    title: 'Error loading',
                    description: 'Could not load item details',
                    price: 'Unknown',
                    location: 'Unknown',
                    url: itemUrl,
                    error: error.message
                };
            }
            // Continue to next attempt if not the last one
        }
    }

    // If all attempts failed
    return {
        title: 'Error loading',
        description: 'Could not load item details after retries',
        price: 'Unknown',
        location: 'Unknown',
        url: itemUrl,
        error: 'Max retries exceeded'
    };
}