/**
 * Extracts the description from a Facebook Marketplace item page
 * @param {Object} page - Puppeteer page object
 * @param {string} title - The item title (used as reference)
 * @param {boolean} seeMoreClicked - Whether "See more" button was clicked
 * @returns {Promise<string>} - The extracted description
 */
export async function extractDescription(page, title, seeMoreClicked) {
    return await page.evaluate((title) => {
        // Strategy 1: Try to find expanded description after clicking "See more"
        let buttons = Array.from(document.querySelectorAll('div[role="button"]'));
        let expandedButton = buttons.find(button => {
            const span = button.querySelector('span');
            return span && span.textContent && span.textContent.toLowerCase().includes('see less');
        });

        // If no "See less" found, look for remaining "See more" buttons
        if (!expandedButton) {
            expandedButton = buttons.find(button => {
                const span = button.querySelector('span');
                return span && span.textContent && span.textContent.toLowerCase().includes('see more');
            });
        }

        if (expandedButton && expandedButton.parentElement?.tagName === 'SPAN') {
            const parentSpan = expandedButton.parentElement;
            const spanText = parentSpan.textContent?.trim();

            if (spanText && spanText.length > 30) {
                // Remove both "See more" and "See less" text from the description
                const cleanedText = spanText
                    .replace(/see more/gi, '')
                    .replace(/see less/gi, '')
                    .trim();
                if (cleanedText.length > 20) {
                    return cleanedText;
                }
            }
        }

        // Strategy 2: If no "See More" button found, use H1 title as reference
        // This handles cases where description is short and doesn't need expansion
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
            // Move up to the parent div
            const parentDiv = titleH1.parentElement;
            if (parentDiv && parentDiv.tagName === 'DIV') {
                // Find the last sibling div
                const siblings = Array.from(parentDiv.parentElement?.children || []);
                const lastSiblingDiv = siblings.reverse().find(sibling =>
                    sibling.tagName === 'DIV' && sibling !== parentDiv
                );

                if (lastSiblingDiv) {
                    const siblingText = lastSiblingDiv.textContent?.trim();
                    if (siblingText && siblingText.length > 20 && siblingText.length < 2000) {
                        // Filter out obvious non-description content
                        if (!siblingText.includes('Message seller') &&
                            !siblingText.includes('Save') &&
                            !siblingText.includes('Share') &&
                            !siblingText.includes('Today\'s picks') &&
                            !siblingText.includes('MarketplaceBrowse') &&
                            !siblingText.includes('NotificationsInbox') &&
                            siblingText !== title) {

                            // Clean up Facebook metadata from the description
                            const cleanedText = siblingText
                                .replace(/^DetailsConditionUsed\s*-\s*/i, '')
                                .replace(/^DetailsCondition\w*\s*-\s*/i, '')
                                .replace(/^Details\w*\s*-\s*/i, '')
                                .replace(/^Condition\w*\s*-\s*/i, '')
                                .trim();

                            if (cleanedText.length > 10) {
                                return cleanedText;
                            }
                        }
                    }
                }
            }
        }

        // Fallback: use the previous approach if other methods don't work
        const mainContainer = document.body;
        const elementsInContainer = mainContainer.querySelectorAll('*');
        const candidates = [];

        for (const element of elementsInContainer) {
            const text = element.textContent?.trim();

            if (text && text.length > 30 && text.length < 1500) {
                // Skip obvious non-description content
                if (text === title ||
                    text.includes('Today\'s picks') ||
                    text.includes('Sponsored') ||
                    text.includes('Message seller') ||
                    text.includes('Save') ||
                    text.includes('Share') ||
                    text.includes('Details') ||
                    text.includes('Seller information') ||
                    /^\$\d+/.test(text) ||
                    /^[A-Za-z\s]+,\s*[A-Z]{2,3}$/.test(text)) {
                    continue;
                }

                // Look for elements that contain mostly direct text (not nested content)
                const childElements = element.children;
                const hasMinimalChildren = childElements.length < 3;

                if (hasMinimalChildren) {
                    candidates.push({
                        text: text,
                        length: text.length
                    });
                }
            }
        }

        // Sort by length and return the longest
        candidates.sort((a, b) => b.length - a.length);

        if (candidates.length > 0) {
            return candidates[0].text;
        }

        return 'No description found';
    }, title);
}