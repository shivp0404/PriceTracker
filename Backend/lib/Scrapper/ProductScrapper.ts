import { chromium } from "playwright";

export async function testBrowser() {
    const browser = await chromium.launch({
        headless: false
    });

    const page = await browser.newPage();

    await page.goto("https://www.croma.com/vivo-t5e-4gb-ram-64gb-shadow-grey-/p/325057");

    console.log(await page.title());

    await browser.close();
}

