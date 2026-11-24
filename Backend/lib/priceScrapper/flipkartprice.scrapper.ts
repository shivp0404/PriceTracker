
import { chromium } from "playwright";

export default async function PriceScrapeFlipkart(
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

        await page.waitForTimeout(5000);

     const price = await page.evaluate(() => {
    const priceElement = document.querySelector(
        "div.v1zwn21n.v1zwn20._1psv1zeb9._1psv1ze0"
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
       

        return price;

    } catch (error) {
        console.error("Flipkart scraping error:", error);
        throw error;

    } finally {
        await browser.close();
    }
}
