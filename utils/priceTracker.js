import fs from 'fs';
import path from 'path';

/**
 * Extracts the item ID from a Facebook Marketplace URL
 * @param {string} url - Full marketplace URL
 * @returns {string} - Extracted item ID or original URL if extraction fails
 */
function extractItemId(url) {
    if (!url) return '';

    // Match pattern: /marketplace/item/[ID]/
    const match = url.match(/\/marketplace\/item\/(\d+)/);
    return match ? match[1] : url;
}

/**
 * Normalizes a marketplace URL to just the item ID for comparison
 * @param {string} url - Full marketplace URL
 * @returns {string} - Normalized item ID
 */
function normalizeUrl(url) {
    return extractItemId(url);
}

/**
 * Collects links and their current prices from the marketplace page
 * @param {Object} page - Puppeteer page object
 * @returns {Promise<Array>} - Array of {link, price} objects
 */
export async function collectLinksWithPrices(page) {
    return await page.evaluate(() => {
        // Define extractItemId function inside the browser context
        function extractItemId(url) {
            if (!url) return '';
            const match = url.match(/\/marketplace\/item\/(\d+)/);
            return match ? match[1] : url;
        }

        const results = [];
        const itemSelectors = [
            'a[href*="marketplace/item"]',
            'div[data-testid*="marketplace"]',
            'a[href*="/marketplace/"]'
        ];

        itemSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                try {
                    const link = element.href || element.querySelector('a')?.href;
                    if (link && link.includes('marketplace/item')) {
                        // Try to find price near this element
                        let price = 'No price found';

                        // Look for price in the same container
                        const container = element.closest('div');
                        if (container) {
                            const priceElements = container.querySelectorAll('*');
                            for (const priceEl of priceElements) {
                                const text = priceEl.textContent?.trim();
                                if (text && text.length < 20) {
                                    const priceMatch = text.match(/([A-Z]?\$\d+(?:,\d{3})*(?:\.\d{2})?|€\d+(?:,\d{3})*(?:\.\d{2})?|£\d+(?:,\d{3})*(?:\.\d{2})?)/);
                                    if (priceMatch) {
                                        price = priceMatch[1];
                                        break;
                                    }
                                }
                            }
                        }

                        const itemId = extractItemId(link);
                        results.push({ link, price, itemId });
                    }
                } catch (e) {
                    console.log('Error parsing element:', e);
                }
            });
        });

        // Remove duplicates based on link
        const uniqueResults = [];
        const seenLinks = new Set();

        for (const item of results) {
            if (!seenLinks.has(item.itemId)) {
                seenLinks.add(item.itemId);
                uniqueResults.push(item);
            }
        }

        return uniqueResults;
    });
}

/**
 * Finds the most recent JSON file in the results directory
 * @returns {string|null} - Path to the most recent file or null if none found
 */
export function findMostRecentResultsFile() {
    const resultsDir = 'results';

    if (!fs.existsSync(resultsDir)) {
        return null;
    }

    const files = fs.readdirSync(resultsDir)
        .filter(file => file.endsWith('.json') && file.includes('detailed-items'))
        .map(file => ({
            name: file,
            path: path.join(resultsDir, file),
            mtime: fs.statSync(path.join(resultsDir, file)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);

    return files.length > 0 ? files[0].path : null;
}

/**
 * Loads and parses the most recent results file
 * @returns {Array} - Array of previous items or empty array if no file found
 */
export function loadPreviousResults() {
    const filePath = findMostRecentResultsFile();

    if (!filePath) {
        console.log('📄 No previous results file found');
        return [];
    }

    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const previousItems = JSON.parse(fileContent);
        console.log(`📄 Loaded ${previousItems.length} items from: ${filePath}`);
        return previousItems;
    } catch (error) {
        console.log(`❌ Error loading previous results: ${error.message}`);
        return [];
    }
}

/**
 * Extracts price from a price string (removes currency symbols and formatting)
 * @param {string} priceStr - Price string like "$100" or "A$50"
 * @returns {number} - Numeric price value
 */
function extractPriceValue(priceStr) {
    if (!priceStr || priceStr === 'No price found' || priceStr === 'Unknown') {
        return 0;
    }

    const match = priceStr.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    return match ? parseFloat(match[1].replace(/,/g, '')) : 0;
}

/**
 * Compares current listings with previous results and tracks changes
 * @param {Array} currentListings - Array of {link, price} objects from current scrape
 * @param {Array} previousItems - Array of previous item objects
 * @returns {Object} - Object with change statistics and updated items
 */
export function compareAndTrackChanges(currentListings, previousItems) {
    const changes = {
        newListings: 0,
        soldListings: 0,
        priceDrops: 0,
        priceIncreases: 0,
        unchanged: 0
    };

    // Create maps for easier lookup using normalized item IDs
    const currentMap = new Map();
    currentListings.forEach(item => {
        const itemId = normalizeUrl(item.link);
        currentMap.set(itemId, {
            link: item.link,
            price: item.price,
            itemId: itemId
        });
    });

    const previousMap = new Map();
    previousItems.forEach(item => {
        const itemId = normalizeUrl(item.url);
        previousMap.set(itemId, {
            price: item.price,
            title: item.title,
            description: item.description,
            url: item.url,
            itemId: item.itemId || itemId, // Use existing ID or extract from URL
            originalTitle: item.title.replace(/^\[(new listing|price drop|price increase|sold)\]\s*/gi, '').trim()
        });
    });

    const updatedItems = [];

    // Process current listings
    for (const [itemId, currentItem] of currentMap) {
        if (previousMap.has(itemId)) {
            // Item exists in both - check for price changes
            const previousItem = previousMap.get(itemId);
            const currentPriceValue = extractPriceValue(currentItem.price);
            const previousPriceValue = extractPriceValue(previousItem.price);

            let updatedTitle = previousItem.originalTitle;

            if (currentPriceValue > 0 && previousPriceValue > 0 && currentPriceValue !== previousPriceValue) {
                if (currentPriceValue < previousPriceValue) {
                    updatedTitle = `[price drop] ${previousItem.originalTitle}`;
                    changes.priceDrops++;
                } else {
                    updatedTitle = `[price increase] ${previousItem.originalTitle}`;
                    changes.priceIncreases++;
                }
            } else {
                changes.unchanged++;
            }

            updatedItems.push({
                title: updatedTitle,
                description: previousItem.description,
                price: currentItem.price,
                url: currentItem.link,
                itemId: itemId
            });
        } else {
            // New listing - we'll need to scrape full details later
            updatedItems.push({
                link: currentItem.link,
                price: currentItem.price,
                itemId: itemId,
                isNew: true
            });
            changes.newListings++;
        }
    }

    // Mark sold listings (in previous but not in current)
    for (const [itemId, previousItem] of previousMap) {
        if (!currentMap.has(itemId)) {
            // Item was sold - keep it in results with [sold] tag
            const soldTitle = `[sold] ${previousItem.originalTitle}`;

            updatedItems.push({
                title: soldTitle,
                description: previousItem.description,
                price: previousItem.price,
                url: previousItem.url,
                itemId: itemId
            });

            changes.soldListings++;
        }
    }

    return {
        changes,
        updatedItems,
        needsFullScraping: updatedItems.filter(item => item.isNew)
    };
}

/**
 * Displays a summary of tracked changes
 * @param {Object} changes - Changes object from compareAndTrackChanges
 */
export function displayChangesSummary(changes) {
    console.log('\n📊 Price Tracking Summary:');
    console.log(`🆕 New listings: ${changes.newListings}`);
    console.log(`📉 Price drops: ${changes.priceDrops}`);
    console.log(`📈 Price increases: ${changes.priceIncreases}`);
    console.log(`💰 Sold listings: ${changes.soldListings}`);
    console.log(`➡️ Unchanged: ${changes.unchanged}`);
    console.log(`📋 Total listings: ${changes.newListings + changes.priceDrops + changes.priceIncreases + changes.soldListings + changes.unchanged}`);
}