
import { chromium } from "playwright";
import { prisma } from "../../lib/prisma.js";

const CROMA_URL = "https://www.croma.com";
const CATEGORY = "mobile phones";

interface ProductInput {
    id: string;
    name: string;
    brand: string;
    ram: string;
    storage: string;
    color: string;
}

interface CromaProduct {
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

// Check whether a Croma result matches our product
function matchesProduct(
    title: string,
    product: ProductInput
): boolean {
    const normalizedTitle = normalizeText(title);
    const normalizedName = normalizeText(product.name);
    const normalizedBrand = normalizeText(product.brand);

    const brandMatches = normalizedTitle.includes(normalizedBrand);
    const nameMatches = normalizedTitle.includes(normalizedName);

    return brandMatches && nameMatches;
}

// Remove query parameters and hash from product URL
function cleanProductUrl(url: string): string {
    const parsedUrl = new URL(url);

    return `${parsedUrl.origin}${parsedUrl.pathname}`;
}

export default async function scrapeCroma(
    product: ProductInput
): Promise<CromaProduct[]> {

    // Get Croma marketplace ID
    const croma = await prisma.marketPlace.findUnique({
        where: {
            name: "Croma"
        }
    });

    if (!croma) {
        throw new Error("Croma marketplace not found in database");
    }

    // Check whether this product already has a Croma listing
    const existingProductListing =
        await prisma.productListing.findFirst({
            where: {
                productId: product.id,
                marketplaceId: croma.id
            }
        });

    if (existingProductListing) {
        console.log(
            `Croma listing already exists. Skipping: ${product.name}`
        );

        return [];
    }

    const browser = await chromium.launch({
        headless: false
    });

    try {
        const page = await browser.newPage();

        // Build search query
        const searchQuery =
            `${product.name} ${product.storage} ${CATEGORY}`;

        // Build Croma search URL
        const searchUrl = new URL("/searchB", CROMA_URL);

        searchUrl.searchParams.set(
            "q",
            `${searchQuery}:relevance`
        );

        searchUrl.searchParams.set("text", searchQuery);

        console.log("Search URL:", searchUrl.toString());

        await page.goto(searchUrl.toString(), {
            waitUntil: "domcontentloaded",
            timeout: 60000
        });

        const selector = 'a[href*="/p/"]';

        // Wait for search results
        await page.locator(selector).first().waitFor({
            state: "attached",
            timeout: 15000
        }).catch(() => {});

        // Extract search-result cards
        const searchResults = await page.locator(selector).evaluateAll(
            anchors => {
                const seenUrls = new Set<string>();

                return anchors
                    .map(anchor => {
                        const url = (
                            anchor as HTMLAnchorElement
                        ).href;

                        if (!url) return null;

                        // Remove query parameters
                        const parsedUrl = new URL(url);

                        const cleanUrl =
                            `${parsedUrl.origin}${parsedUrl.pathname}`;

                        if (seenUrls.has(cleanUrl)) {
                            return null;
                        }

                        seenUrls.add(cleanUrl);

                        let card: HTMLElement | null =
                            anchor as HTMLElement;

                        // Find parent containing product title and price
                        for (let i = 0; i < 8 && card; i++) {
                            if (card.innerText.includes("₹")) {
                                break;
                            }

                            card = card.parentElement;
                        }

                        if (!card) return null;

                        const title =
                            card.innerText
                                ?.replace(/\s+/g, " ")
                                .trim() || "";

                        const priceText =
                            title.match(
                                /₹\s*([\d,]+(?:\.\d{1,2})?)/
                            )?.[1] || "";

                        const price = Number(
                            priceText.replace(/,/g, "")
                        );

                        return {
                            title,
                            price,
                            url: cleanUrl
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
                            result.url.includes("/p/")
                    )
                    .slice(0, 12);
            }
        );

        if (searchResults.length === 0) {
            console.log("No Croma products found");
            return [];
        }

        console.log("Croma search results:", searchResults);

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
                `No matching Croma product found: ${product.name}`
            );

            return [];
        }

        // Check whether this URL already exists in ProductListing
        const existingUrl =
            await prisma.productListing.findUnique({
                where: {
                    url: matchedProduct.url
                }
            });

        if (existingUrl) {
            console.log(
                `Croma URL already exists. Skipping: ${product.name}`
            );

            return [];
        }

        console.log(
            "Matching Croma product found:",
            matchedProduct.title
        );

        console.log("Price:", matchedProduct.price);
        console.log("URL:", matchedProduct.url);

        return [matchedProduct];

    } catch (error) {
        console.error("Croma scraping error:", error);
        throw error;

    } finally {
        await browser.close();
    }
}
