import { chromium } from "playwright";

const FLIPKART_URL = "https://www.flipkart.com/search?q=smart+phones&otracker=search&otracker1=search&marketplace=FLIPKART&as-show=on&as=off&page=4"

export default async function scrapeFlipkart() {
    const browser = await chromium.launch({
        headless: false
    });

    try {
        const page = await browser.newPage();

        await page.goto(FLIPKART_URL, {
            waitUntil: "domcontentloaded",
            timeout: 60000
        });

        await page.waitForTimeout(5000);

        const products = await page.locator("a").evaluateAll(anchors => {
            const results = [];

            for (const anchor of anchors) {
                const card = anchor.querySelector(".ZFwe0M");

                if (!card) continue;

                const name =
                    card.querySelector(".RG5Slk")?.textContent?.trim();

                const priceText =
                    card.querySelector(".hZ3P6w")?.textContent?.trim();

                const specifications = Array.from(
                    card.querySelectorAll(".DTBslk")
                ).map(element => element.textContent?.trim() ?? "");

                if (!name || !priceText) continue;

                const match = name.match(/^(.+?)\s*\((.*)\)$/);

                const brand = name.split(" ")[0];

                const color = match?.[2]
                    .split(",")[0]
                    .trim() ?? null;

                const ramStorage = specifications.find(item =>
                    /RAM.*ROM/i.test(item)
                );

                const ramStorageMatch = ramStorage?.match(
                    /(\d+\s*GB)\s*RAM\s*\|\s*(\d+\s*GB)\s*ROM/i
                );

                const price = Number(
                    priceText.replace(/[₹,\s]/g, "")
                );

                results.push({
                    name: name.split("(")[0].trim(),
                    brand,
                    color,
                    ram: ramStorageMatch?.[1] ?? null,
                    storage: ramStorageMatch?.[2] ?? null,
                    price,
                    url: anchor.href
                });
            }

            return Array.from(
                new Map(results.map(product => [product.url, product])).values()
            );
        });

        console.log("Total products:", products.length);

        console.log(
            JSON.stringify(products.slice(0, 10), null, 2)
        );

        // Return the extracted products to feedDb()
        return products;

    } catch (error) {
        console.error("Flipkart scraping error:", error);
        throw error;
    } finally {
        await browser.close();
    }
}