import puppeteer from 'puppeteer';
import fs from 'fs';
import { getBrowserPath } from './Utils/browser-config.js';
import { scrapeItemDetails } from './Utils/itemScraper.js';
import { exportToJson, displaySummary, exportToMarkdown } from './Utils/dataExporter.js';
import {
    collectLinksWithPrices,
    loadPreviousResults,
    compareAndTrackChanges,
    displayChangesSummary
} from './Utils/priceTracker.js';
import { generateAIRanking } from './Services/AIService.js';

async function detailedScrape() {
    console.log('Starting detailed scraper v2...');
    console.log('This will visit each item link and extract full details.');

    const browser = await puppeteer.launch({
        headless: false,
        executablePath: getBrowserPath(),
        defaultViewport: null,
        args: ['--window-position=0,0']
    });

    const page = await browser.newPage();

    // Load session if available
    if (fs.existsSync('session-cookies.json')) {
        const cookies = JSON.parse(fs.readFileSync('session-cookies.json'));
        const context = browser.defaultBrowserContext();
        await context.setCookie(...cookies);
        console.log('Session loaded');
    }

    // Navigate to Facebook Marketplace
    await page.goto('https://www.facebook.com/marketplace/you/saved', {
        waitUntil: 'networkidle2'
    });

    console.log('Navigating to your saved items...');

    // Waiting for the page to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Scrolling to load all saved items...');

    // Auto-scroll to load all lazy-loaded items
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });

    // Wait a bit more for final items to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Scroll back to top
    await page.evaluate(() => {
        window.scrollTo(0, 0);
    });

    console.log('Collecting item links with prices...');

    // Collect all the links with their current prices
    const currentListings = await collectLinksWithPrices(page);
    const itemLinks = currentListings.map(item => item.link);

    console.log(`Found ${itemLinks.length} items to scrape in detail.`);

    // Load previous results and compare for changes
    console.log('🔍 Checking for price changes...');
    const previousItems = loadPreviousResults();
    const trackingResults = compareAndTrackChanges(currentListings, previousItems);

    // Display changes summary
    displayChangesSummary(trackingResults.changes);

    if (itemLinks.length === 0) {
        console.log('No items found. Make sure you\'re on the saved items page.');
        await browser.close();
        return;
    }

    // Ask user about scraping preferences
    const newItemsCount = trackingResults.needsFullScraping.length;
    const existingItemsCount = trackingResults.updatedItems.length - newItemsCount;

    console.log(`\n📋 Summary:`);
    console.log(`   • ${existingItemsCount} existing items (will use cached data with price updates)`);
    console.log(`   • ${newItemsCount} new items (need full scraping)`);

    if (newItemsCount > 0) {
        console.log(`\nHow many NEW items do you want to scrape? (Enter number, 'all' for all ${newItemsCount}, or 'n' to cancel):`);
    } else {
        console.log(`\nNo new items to scrape. Proceed with updating existing items? (y/n):`);
    }

    let userInput = await new Promise(resolve => {
        process.stdin.once('data', data => resolve(data.toString().trim()));
    });

    if (userInput.toLowerCase() === 'n') {
        console.log('Scraping cancelled.');
        await browser.close();
        process.exit(0);
    }

    // Determine how many new items to scrape
    let newItemsToScrapeCount = newItemsCount;
    if (newItemsCount > 0) {
        if (userInput.toLowerCase() === 'all' || userInput.toLowerCase() === 'y') {
            newItemsToScrapeCount = newItemsCount;
        } else if (!isNaN(userInput) && parseInt(userInput) > 0) {
            newItemsToScrapeCount = Math.min(parseInt(userInput), newItemsCount);
            console.log(`Limiting to first ${newItemsToScrapeCount} new items.`);
        }
    }

    // Prepare items for scraping - mix of existing items and new items that need full scraping
    const detailedItems = [];

    // Add existing items with updated titles (price changes, etc.)
    const existingItems = trackingResults.updatedItems.filter(item => !item.isNew);
    detailedItems.push(...existingItems);

    // Get new items that need full scraping (limited by user input)
    const allNewItems = trackingResults.needsFullScraping.map(item => item.link);
    const newItemsToScrape = allNewItems.slice(0, newItemsToScrapeCount);

    if (newItemsToScrape.length > 0) {
        console.log(`\n🆕 Scraping ${newItemsToScrape.length} new listings for full details...`);

        for (let i = 0; i < newItemsToScrape.length; i++) {
            const itemDetails = await scrapeItemDetails(page, newItemsToScrape[i], i, newItemsToScrape.length);

            // Add [new listing] tag to the beginning of the title
            if (itemDetails.title && itemDetails.title !== 'Error loading') {
                itemDetails.title = `[new listing] ${itemDetails.title}`;
            }

            detailedItems.push(itemDetails);

            // Add delay between requests to be respectful
            if (i < newItemsToScrape.length - 1) {
                console.log('   Waiting 3 seconds before next item...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        // If user didn't scrape all new items, inform them
        if (newItemsToScrapeCount < allNewItems.length) {
            const skippedCount = allNewItems.length - newItemsToScrapeCount;
            console.log(`\n⏭️ Skipped ${skippedCount} new items (will be included in next run)`);
        }
    } else {
        console.log('\n✅ No new listings to scrape - all items already have details!');
    }

    // Save detailed results using modular export function
    const savedPath = exportToJson(detailedItems, 'detailed-items');

    console.log(`\n✅ Scraping complete!`);
    console.log(`📁 Detailed data saved to: ${savedPath}`);
    console.log(`📊 Successfully scraped ${detailedItems.length} items`);

    // Display summary using modular function
    displaySummary(detailedItems);

    console.log('✅ Scraping completed successfully!');
    await browser.close();

    let isValidUserInput = false

    while (!isValidUserInput) {
        console.log('\n🔍 Do you want AI to generate a cost benefit ranking based on the scraped items? (y/n)');

        userInput = await new Promise(resolve => {
            process.stdin.once('data', data => resolve(data.toString().trim()));
        });

        if (userInput.toLowerCase() !== 'y' && userInput.toLowerCase() !== 'n') {
            console.log('❌ Invalid input. Please enter "y" or "n".');
            continue;
        }

        isValidUserInput = true;
    }

    if (userInput.toLowerCase() === 'n') {
        console.log('Bye!');
        return;
    }

    console.log('\n🔍 AI is creating a cost benefit ranking for the items...');
    console.log('   The response will be streamed to the console and also saved to the ai-reports folder');

    const aiResponse = await generateAIRanking(detailedItems);
    console.log(aiResponse);

    if (!aiResponse) {
        throw new Error('❌ AI failed to generate a ranking.')
    }

    const aiReportPath = exportToMarkdown(aiResponse, 'ai-ranking');
    console.log(`\n📁 AI report saved to: ${aiReportPath}`);

    console.log('\n✅ AI ranking generated and saved successfully!');
    console.log('\nBye for now...');

    // Ensure the Node.js process exits cleanly
    process.exit(0);
}

detailedScrape().catch(console.error);