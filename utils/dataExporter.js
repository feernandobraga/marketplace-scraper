import fs from 'fs';

/**
 * Exports scraped data to JSON file in the results directory
 * @param {Array} data - Array of scraped items
 * @param {string} filename - Base filename (without extension)
 * @returns {string} - Full path of the saved file
 */
export function exportToJson(data, filename = 'scraped-data') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsDir = 'results';
    const fullFilename = `${filename}-${timestamp}.json`;
    const fullPath = `${resultsDir}/${fullFilename}`;

    // Create results directory if it doesn't exist
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
        console.log(`📁 Created results directory: ${resultsDir}`);
    }

    // Write data to file
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));

    return fullPath;
}

export function exportToMarkdown(data, filename = 'markdown-data') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const markdownDir = 'ai-reports';
    const fullFilename = `${filename}-${timestamp}.md`;
    const fullPath = `${markdownDir}/${fullFilename}`;

    // Create results directory if it doesn't exist
    if (!fs.existsSync(markdownDir)) {
        fs.mkdirSync(markdownDir, { recursive: true });
        console.log(`📁 Created ai-reports directory: ${markdownDir}`);
    }

    // Write data to file
    fs.writeFileSync(fullPath, data);

    return fullPath;
}

/**
 * Displays a summary of scraped items
 * @param {Array} items - Array of scraped items
 */
export function displaySummary(items) {
    console.log('\n📋 Summary:');
    items.forEach((item, index) => {
        console.log(`${index + 1}. ${item.title}`);
        console.log(`   💰 ${item.price}`);
        console.log(`   📍 ${item.location || 'No location'}`);
        console.log(`   📝 ${item.description.substring(0, 100)}...`);
        console.log('');
    });
}