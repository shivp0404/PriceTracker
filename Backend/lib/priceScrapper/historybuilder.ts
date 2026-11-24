import { prisma } from "../prisma.js";

import scrapeAmazon from "./amazonprice.scrapper.js";
import PricescrapeFlipkart from "./flipkartprice.scrapper.js";
import scrapeRelianceDigital from "./relianceprice.scrapper.js";
import scrapeCroma from "./cromapricescrapper.js";

type PriceScraper = (url: string) => Promise<number | null>;

// Select scraper according to marketplace
const marketplaceScrapers: Record<string, PriceScraper> = {
    "Amazon": scrapeAmazon,
    "Flipkart": PricescrapeFlipkart,
    "Reliance Digital": scrapeRelianceDigital,
    "Croma": scrapeCroma
};

export default async function HistoryBuilder() {

    // 1. Retrieve products and their marketplace listings
    const products = await prisma.product.findMany(
        {
        // skip:4,
        take:20,
        include: {
            listings: {
                include: {
                    marketplace: true
                }
            }
        }
    });

    console.log(`Found ${products.length} products`);

    // 2. Process each product
    for (const product of products) {

        console.log(`Processing product: ${product.name}`);

        // 3. Process only the marketplaces available for this product
        for (const listing of product.listings) {

            const marketplaceName = listing.marketplace.name;

            // Allocate the correct scraper
            const scraper = marketplaceScrapers[marketplaceName];

            if (!scraper) {
                console.log(`No scraper available for ${marketplaceName}`);
                continue;
            }

            try {

                // 4. Scrape the latest price using the listing URL
                console.log(`Scraping ${marketplaceName}: ${listing.url}`);

                const newPrice = await scraper(listing.url);

                if (newPrice === null || !Number.isFinite(newPrice) || newPrice <= 0) {
                    console.log(`Price not found for ${product.name} on ${marketplaceName}`);
                    continue;
                }

                // 5. Save previous price in history and update current price
                await prisma.$transaction(async (tx) => {

                    const previousPrice = listing.price;

                    // Find existing history or create a new one
                    await tx.history.upsert({
                        where: {
                            productId_marketplaceId: {
                                productId: product.id,
                                marketplaceId: listing.marketplaceId
                            }
                        },

                        // First history record
                        create: {
                            productId: product.id,
                            marketplaceId: listing.marketplaceId,
                            entries: {
                                create: {
                                    price: previousPrice
                                }
                            }
                        },

                        // Add previous price to existing history
                        update: {
                            entries: {
                                create: {
                                    price: previousPrice
                                }
                            }
                        }
                    });

                    // Update current marketplace listing price
                    await tx.productListing.update({
                        where: {
                            id: listing.id
                        },
                        data: {
                            price: newPrice
                        }
                    });

                });

                console.log(
                    `${marketplaceName}: Previous price ${listing.price} | New price ${newPrice}`
                );

            } catch (error) {
                console.error(
                    `Error processing ${product.name} on ${marketplaceName}:`,
                    error
                );
            }
        }
    }

    console.log("History building completed");
}