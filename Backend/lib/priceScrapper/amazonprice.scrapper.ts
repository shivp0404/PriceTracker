
import { chromium } from "playwright";

export default async function PriceScrapeAmazon(
    url: string
): Promise<number | null> {

    const browser = await chromium.launch({
        headless: true
    });

    try {
        const page = await browser.newPage();

        await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 60000
        });

        await page.waitForTimeout(3000);

        const price = await page.evaluate(() => {
            const priceElement = document.querySelector(
                ".a-price-whole"
            );

            const priceText = priceElement?.textContent?.trim();

            if (!priceText) return null;

            const parsedPrice = Number(
                priceText.replace(/[^\d]/g, "")
            );

            return Number.isFinite(parsedPrice) && parsedPrice > 0
                ? parsedPrice
                : null;
        });

        if (price === null) {
            console.log("Amazon price not found:", url);
            return null;
        }

        console.log("Amazon price:", price);

        return price;

    } catch (error) {
        console.error("Amazon scraping error:", error);
        throw error;

    } finally {
        await browser.close();
    }
}
