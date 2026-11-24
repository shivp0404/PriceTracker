
import { chromium } from "playwright";

export default async function scrapeCroma(
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
                "#pdp-product-price"
            );

            const priceText = priceElement?.textContent?.trim();

            if (!priceText) return null;

            const parsedPrice = Number(
                priceText.replace(/[₹,\s]/g, "")
            );

            return Number.isFinite(parsedPrice) && parsedPrice > 0
                ? parsedPrice
                : null;
        });

        if (price === null) {
            console.log("Croma price not found:", url);
            return null;
        }

        console.log("Croma price:", price);

        return price;

    } catch (error) {
        console.error("Croma scraping error:", error);
        throw error;

    } finally {
        await browser.close();
    }
}
