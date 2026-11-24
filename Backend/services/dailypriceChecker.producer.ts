import {prisma} from "../lib/prisma.js"
import priceCheckQueue from "../Queue/priceCheck.queue.js";
export default async function dailyPriceCheckProducer() {
    const listings = await prisma.productListing.findMany({
        take:1,
        select: { id: true }
    });

    const jobs = listings.map(listing => ({
        name: "check-product-price",
        data: { listingId: listing.id }
    }));

    await priceCheckQueue.addBulk(jobs);
}