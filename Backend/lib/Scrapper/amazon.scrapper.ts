
import { chromium } from "playwright";
import { prisma } from "../prisma.js";

const AMAZON_URL = "https://www.amazon.in";
const CATEGORY = "smartphones";

interface ProductInput {
    id: string;
    name: string;
    brand: string;
    ram: string;
    storage: string;
    color: string;
}

interface AmazonProduct {
    asin: string;
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

// Extract GB values from text
function extractGbValues(value: string): number[] {
    const matches = [...value.matchAll(/(\d+(?:\.\d+)?)\s*gb/gi)];

    return matches.map(match => Number(match[1]));
}

// Check whether an Amazon result matches our product
function matchesProduct(
    title: string,
    product: ProductInput
): boolean {
    const normalizedTitle = normalizeText(title);

    const brandTokens = normalizeText(product.brand)
        .split(" ")
        .filter(Boolean);

    const modelTokens = normalizeText(product.name)
        .split(" ")
        .filter(token => token && !brandTokens.includes(token));

    const brandMatches = brandTokens.some(token =>
        normalizedTitle.includes(token)
    );

    const modelMatches = modelTokens.some(token =>
        normalizedTitle.includes(token)
    );

    const storageValue = extractGbValues(product.storage)[0];
    const titleGbValues = extractGbValues(title);

    const storageMatches =
        storageValue !== undefined &&
        titleGbValues.includes(storageValue);

    return brandMatches || modelMatches || storageMatches;
}

export default async function scrapeAmazon(
    product: ProductInput
): Promise<AmazonProduct | null> {

    // Get Amazon marketplace ID
    const amazon = await prisma.marketPlace.findUnique({
        where: {
            name: "Amazon"
        }
    });

    if (!amazon) {
        throw new Error("Amazon marketplace not found in database");
    }

    // Check whether this product already has an Amazon listing
    const existingProductListing = await prisma.productListing.findFirst({
        where: {
            productId: product.id,
            marketplaceId: amazon.id
        }
    });

    if (existingProductListing) {
        console.log(
            `Amazon listing already exists. Skipping: ${product.name}`
        );
        return null;
    }

    const browser = await chromium.launch({
        headless: false
    });

    try {
        const page = await browser.newPage();

        // Build search query
        const searchQuery =
            `${product.brand} ${product.name} ${product.storage} ${CATEGORY}`;

        const searchUrl =
            `${AMAZON_URL}/s?k=${encodeURIComponent(searchQuery)}`;

        console.log("Searching Amazon:", searchQuery);

        await page.goto(searchUrl, {
            waitUntil: "domcontentloaded",
            timeout: 60000
        });

        const selector = '[data-component-type="s-search-result"]';

        // Wait for search results
        await page.locator(selector).first().waitFor({
            state: "attached",
            timeout: 15000
        }).catch(() => {});

        // Extract up to 10 search-result cards
        const searchResults = await page.locator(selector).evaluateAll(cards => {
            return cards.slice(0, 10).map(card => {
                const asin = card.getAttribute("data-asin") || "";

                const title =
                    card.querySelector("h2")?.textContent?.trim() || "";

                const priceText =
                    card.querySelector(".a-price .a-offscreen")
                        ?.textContent?.trim() || "";

                const price = Number(
                    priceText.replace(/[^\d.]/g, "")
                );

                return {
                    asin,
                    title,
                    price,
                    url: asin
                        ? `https://www.amazon.in/dp/${asin}`
                        : ""
                };
            });
        });

        if (searchResults.length === 0) {
            console.log("No Amazon products found");
            return null;
        }

        console.log(`Found ${searchResults.length} Amazon results`);

        // Find the first result matching our product
        const matchedProduct = searchResults.find(result => {
            if (
                !result.asin ||
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
                `No matching Amazon product found: ${product.name}`
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
                `Amazon URL already exists. Skipping: ${product.name}`
            );
            return null;
        }

        console.log("Matching Amazon product found:", matchedProduct.title);

        return matchedProduct;

    } catch (error) {
        console.error("Amazon scraping error:", error);
        throw error;

    } finally {
        await browser.close();
    }
}
