
import { chromium } from "playwright";
import { prisma } from "../prisma.js";

const RELIANCE_URL = "https://www.reliancedigital.in";
const CATEGORY = "mobile phone";

interface ProductInput {
    id: string;
    name: string;
    brand: string;
    ram: string;
    storage: string;
    color: string;
}

interface RelianceDigitalProduct {
    title: string;
    price: number;
    url: string;
}

// Normalize text for comparison
function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

// Check whether a Reliance Digital result matches our product
function matchesProduct(
    title: string,
    product: ProductInput
): boolean {
    const normalizedTitle = normalizeText(title);

    // 1. Must be a smartphone
    const isSmartphone =
        /\b(mobile phone|smartphone)\b/i.test(normalizedTitle);

    if (!isSmartphone) return false;

    // 2. Brand must match
    const brandTokens = normalizeText(product.brand)
        .split(" ")
        .filter(Boolean);

    const brandMatches = brandTokens.every(token =>
        normalizedTitle.includes(token)
    );

    if (!brandMatches) return false;

    // 3. Model must match
    const modelTokens = normalizeText(product.name)
        .split(" ")
        .filter(token =>
            token &&
            !brandTokens.includes(token) &&
            token !== "snapdragon"
        );

    const modelMatches =
        modelTokens.length > 0 &&
        modelTokens.every(token => normalizedTitle.includes(token));

    if (!modelMatches) return false;

    // 4. Storage must match
    const storage = normalizeText(product.storage);
    const storageMatches = normalizedTitle.includes(storage);

    if (!storageMatches) return false;

    // 5. RAM must match when available
    if (product.ram) {
        const ram = normalizeText(product.ram);

        if (!normalizedTitle.includes(ram)) {
            return false;
        }
    }

    return true;
}

export default async function scrapeRelianceDigital(
    product: ProductInput
): Promise<RelianceDigitalProduct | null> {

    // Get Reliance Digital marketplace ID
    const reliance = await prisma.marketPlace.findUnique({
        where: {
            name: "Reliance Digital"
        }
    });

    if (!reliance) {
        throw new Error("Reliance Digital marketplace not found in database");
    }

    // Check whether this product already has a Reliance Digital listing
    const existingProductListing = await prisma.productListing.findFirst({
        where: {
            productId: product.id,
            marketplaceId: reliance.id
        }
    });

    if (existingProductListing) {
        console.log(
            `Reliance Digital listing already exists. Skipping: ${product.name}`
        );
        return null;
    }

    const browser = await chromium.launch({
        headless: false
    });

    try {
        const page = await browser.newPage();

        // Build search query
        const searchQuery = `${product.name} ${product.storage} ${CATEGORY}`;

        const searchUrl = new URL("/products", RELIANCE_URL);

        searchUrl.searchParams.set("q", searchQuery);
        searchUrl.searchParams.set("search_term", searchQuery);
        searchUrl.searchParams.set("internal_source", "search_prompt");
        searchUrl.searchParams.set("page_no", "1");
        searchUrl.searchParams.set("page_size", "12");
        searchUrl.searchParams.set("page_type", "number");

        console.log("Searching Reliance Digital:", searchQuery);

        await page.goto(searchUrl.toString(), {
            waitUntil: "domcontentloaded",
            timeout: 60000
        });

        const selector = 'a[href*="/product/"]';

        // Wait for search results
        await page.locator(selector).first().waitFor({
            state: "attached",
            timeout: 15000
        }).catch(() => {});

        // Extract up to 12 search-result cards
        const searchResults = await page.locator(selector).evaluateAll(anchors => {
            const seenUrls = new Set<string>();

            return anchors
                .map(anchor => {
                    const url = (anchor as HTMLAnchorElement).href;

                    if (!url || seenUrls.has(url)) return null;

                    seenUrls.add(url);

                    let card: HTMLElement | null = anchor as HTMLElement;

                    // Find the parent containing product title and price
                    for (let i = 0; i < 8 && card; i++) {
                        if (card.innerText.includes("₹")) break;
                        card = card.parentElement;
                    }

                    if (!card) return null;

                    const title =
                        card.innerText?.replace(/\s+/g, " ").trim() || "";

                    const priceText =
                        title.match(/₹\s*([\d,]+(?:\.\d{1,2})?)/)?.[1] || "";

                    const price = Number(priceText.replace(/,/g, ""));

                    return {
                        title,
                        price,
                        url
                    };
                })
                .filter(
                    (result): result is {
                        title: string;
                        price: number;
                        url: string;
                    } =>
                        result !== null &&
                        result.title.length > 0 &&
                        result.price > 0 &&
                        result.url.includes("/product/")
                )
                .slice(0, 12);
        });

        if (searchResults.length === 0) {
            console.log("No Reliance Digital products found");
            return null;
        }

        console.log(
            `Found ${searchResults.length} Reliance Digital results`
        );

        console.log("Reliance Digital results:", searchResults);

        // Find the first result matching our product
        const matchedProduct = searchResults.find(result => {
            if (
                !result.title ||
                result.price <= 0 ||
                !result.url
            ) {
                return false;
            }

            return matchesProduct(result.title, product);
        });

        if (!matchedProduct) {
            console.log(
                `No matching Reliance Digital product found: ${product.name}`
            );
            return null;
        }

        // Check whether this URL already exists in ProductListing
        const existingUrl = await prisma.productListing.findUnique({
            where: {
                url: matchedProduct.url
            }
        });

        if (existingUrl) {
            console.log(
                `Reliance Digital URL already exists. Skipping: ${product.name}`
            );
            return null;
        }

        console.log(
            "Matching Reliance Digital product found:",
            matchedProduct.title
        );

        console.log("Price:", matchedProduct.price);
        console.log("URL:", matchedProduct.url);

        return matchedProduct;

    } catch (error) {
        console.error("Reliance Digital scraping error:", error);
        throw error;

    } finally {
        await browser.close();
    }
}
