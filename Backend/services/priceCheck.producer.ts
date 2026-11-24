import { prisma } from "../lib/prisma.js";

import scrapeAmazon from "../lib/priceScrapper/amazonprice.scrapper.js";
import PricescrapeFlipkart from "../lib/priceScrapper/flipkartprice.scrapper.js";
import scrapeRelianceDigital from "../lib/priceScrapper/relianceprice.scrapper.js";
import scrapeCroma from "../lib/priceScrapper/cromapricescrapper.js";

type PriceScraper = (url: string) => Promise<number | null>;

const marketplaceScrapers: Record<string, PriceScraper> = {
    Amazon: scrapeAmazon,
    Flipkart: PricescrapeFlipkart,
    "Reliance Digital": scrapeRelianceDigital,
    Croma: scrapeCroma
};

export default async function checkProductPrice(listingId: string) {

    // 1. Fetch the specific marketplace listing
    const listing = await prisma.productListing.findUnique({
        where: {
            id: listingId
        },
        include: {
            product: true,
            marketplace: true
        }
    });

    if (!listing) {
        throw new Error(`Listing ${listingId} not found`);
    }

    const productName = listing.product.name;
    const marketplaceName = listing.marketplace.name;

    // 2. Select the appropriate scraper
    const scraper = marketplaceScrapers[marketplaceName];

    if (!scraper) {
        console.log(`No scraper available for ${marketplaceName}`);
        return;
    }

    // 3. Scrape the latest price
    console.log(`Scraping ${marketplaceName}: ${listing.url}`);

    const newPrice = await scraper(listing.url);

    if (
        newPrice === null ||
        !Number.isFinite(newPrice) ||
        newPrice <= 0
    ) {
        throw new Error(
            `Unable to retrieve price for ${productName} on ${marketplaceName}`
        );
    }

    // 4. Update history and current price
    await prisma.$transaction(async (tx) => {

        await tx.history.upsert({
            where: {
                productId_marketplaceId: {
                    productId: listing.productId,
                    marketplaceId: listing.marketplaceId
                }
            },

            create: {
                productId: listing.productId,
                marketplaceId: listing.marketplaceId,
                entries: {
                    create: {
                        price: listing.price
                    }
                }
            },

            update: {
                entries: {
                    create: {
                        price: listing.price
                    }
                }
            }
        });

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
}