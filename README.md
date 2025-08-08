# Marketplace Scraper

## TL;DR

This Node.js application automatically scrapes your Marketplace saved items, tracks price changes over time, and uses AI to rank items by performance and value. It saves login sessions, handles retries, and generates detailed analysis reports - customize the AI prompt and you will also be able to find the best deals on anything.

---

## Problem Statement
I've created this application because I was looking for a second-hand mini PC on marketplace, but after a few days of searching I became overwhelmed with the amount of options with slightly different configurations.

So now all I have to do is go to the Marketplace, save any items that I like and run the app. It will pick up the newly added item and create a summary at the end to tell me if it's a bargain or not.

When an item is sold, I can simply remove it from the saved items and the app will understand it was sold. The price of saved items is used by AI to create a sort of price gauge and make recommendations in case there's a good deal in front of us.

## Features

- **Automated Scraping**: Extracts titles, descriptions, prices, and URLs from your saved marketplace items
- **Price Tracking**: Monitors price changes and marks items with tags like `[price drop]`, `[price increase]`, `[new listing]`, or `[sold]`
- **Session Management**: Saves login sessions to avoid repeated authentication
- **Smart Retry Logic**: Automatically retries failed requests with exponential backoff
- **AI Analysis**: Generate hardware recommendations using OpenAI-compatible APIs (Gemini)
- **Multi-browser Support**: Works with Brave, Chrome, or Firefox

## Technologies Used

- **Node.js** - Runtime environment
- **Puppeteer** - Browser automation and web scraping
- **OpenAI SDK** - AI analysis integration (configured for Gemini API)

## Prerequisites

- Node.js (version 14 or higher)
- One of the following browsers: Brave, Chrome, or Firefox
- Marketplace account with saved items

## Installation

1. Clone the repository:
```bash
git clone https://github.com/feernandobraga/marketplace-scraper.git
cd marketplace-scraper
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` file with your configuration:
```env
GEMINI_API_KEY="Get your API Key from https://aistudio.google.com/apikey"
AI_MODEL="gemini-2.5-pro"
```

## Usage

### Initial Setup

1. **Login and save session**:
```bash
npm run login
```
This opens a browser window where you manually log into the marketplace. Your session will be saved for future use.

### Basic Scraping

2. **Scrape saved items**:
```bash
npm run scrape
```
This will:
- Load your saved session
- Navigate to your saved marketplace items
- Auto-scroll to load all items
- Compare with previous results for price tracking
- Scrape new items and update existing ones
- Save results to `results/detailed-items-[timestamp].json`

### Available Scripts

- `npm run login` - Manual login and session saving
- `npm run scrape` - Main scraper with price tracking

## How It Works

### Price Tracking System

The application maintains a history of your saved items and tracks changes:

- **New listings**: Items that appear for the first time get tagged with `[new listing]`
- **Price changes**: Items with price changes get tagged with `[price drop]` or `[price increase]`
- **Sold items**: Items that disappear from your saved list get tagged with `[sold]`
- **Unchanged**: Items with no changes remain untagged

### Smart Scraping

- **Session persistence**: Saves cookies and localStorage to avoid repeated logins
- **Lazy loading**: Auto-scrolls to load all saved items before scraping
- **Retry mechanism**: Automatically retries failed requests up to 3 times
- **Rate limiting**: Includes delays between requests to respect the platform's servers

### AI Analysis

After scraping is complete, the application automatically generates AI-powered hardware analysis using the Gemini API. The AI service (`Services/AIService.js`) creates two rankings:

1. **CPU Performance Ranking**: Top 3 items based on raw CPU performance only
2. **CPU + RAM Performance Ranking**: Top 3 items based on combined CPU and RAM performance

The analysis is specifically tailored for Proxmox server use cases and includes direct links to each listing, but you can tailor the prompts in the AIService to make comparisons relevant to the items that suit your search. 

Configure your Gemini API key and preferred model in the `.env` file to enable this feature.

### Data Structure

Each scraped item contains:
```json
{
  "title": "[price drop] Intel NUC Core i5",
  "description": "Detailed item description...",
  "price": "A$320",
  "url": "https://www.facebook.com/marketplace/item/123456789/",
  "itemId": "123456789"
}
```

## File Structure

```
├── Services/
│   └── AIService.js          # AI analysis functionality
├── Utils/
│   ├── browser-config.js     # Browser detection and configuration
│   ├── dataExporter.js       # JSON export and summary display
│   ├── descriptionExtractor.js # Description extraction logic
│   ├── itemScraper.js        # Main item scraping with retry logic
│   ├── priceExtractor.js     # Price extraction logic
│   ├── priceTracker.js       # Price tracking and comparison
│   ├── seeMoreHandler.js     # "See more" button interaction
│   ├── titleExtractor.js     # Title extraction logic
│   └── urlExtractor.js       # URL extraction logic
├── results/                  # Scraped data output directory
├── marketplace-scrapper.js   # Main application entry point
└── login.js                  # Session management utility
```

## Configuration

### Browser Configuration

The application automatically detects installed browsers in this order:
1. Brave Browser
2. Google Chrome
3. Mozilla Firefox

The browser detection is handled automatically by `Utils/browser-config.js` - no manual configuration needed.

## Troubleshooting

### Common Issues

- **No items found**: Ensure you're on the Marketplace saved items page
- **Login required**: Run `npm run login` to refresh your session
- **Browser not found**: The application will automatically detect Brave, Chrome, or Firefox
- **Rate limiting**: The application includes built-in delays, but you may need to wait if you hit the platform's limits

### Debug Mode

Use `npm run debug` to analyze page structure and troubleshoot extraction issues.

## Contributing

The codebase uses a modular architecture with separate utilities for each functionality. When adding features:

1. Create new utilities in the `Utils/` directory
2. Follow the existing pattern of single-responsibility modules
3. Update the main scraper to use new utilities
4. Add appropriate error handling and logging

## License

This project is for educational purposes. Please respect the platform's Terms of Service and use responsibly.