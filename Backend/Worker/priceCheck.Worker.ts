import { Worker } from "bullmq";
import redisConnection from "../redis.js";

import checkProductPrice from "../services/priceCheck.producer.js";


const priceCheckWorker =  new Worker(
    "price-check",
    async (job) => {
        const { listingId } = job.data;

        await checkProductPrice(listingId);
    },
    {
        connection: redisConnection,
        concurrency: 3
    }
);

priceCheckWorker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
});

priceCheckWorker.on("failed", (job, error) => {
    console.error(`Job ${job?.id} failed: ${error.message}`);
});

export default priceCheckWorker;