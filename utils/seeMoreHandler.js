/**
 * Handles clicking "See more" buttons to expand descriptions
 * @param {Object} page - Puppeteer page object
 * @returns {Promise<boolean>} - Whether "See more" button was found and clicked
 */
export async function clickSeeMore(page) {
    try {
        const seeMoreClicked = await page.evaluate(() => {
            try {
                const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
                const seeMoreButton = buttons.find(button => {
                    const span = button.querySelector('span');
                    return span && span.textContent && span.textContent.toLowerCase().includes('see more');
                });

                if (seeMoreButton) {
                    console.log('Found "See more" button, clicking to expand description...');
                    seeMoreButton.click();
                    return true;
                }
                return false;
            } catch (e) {
                console.log('Error in see more evaluation:', e);
                return false;
            }
        });

        if (seeMoreClicked) {
            console.log('   "See more" button clicked, waiting for content to expand...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        return seeMoreClicked;
    } catch (error) {
        console.log('Error evaluating see more button:', error.message);
        return false;
    }
}