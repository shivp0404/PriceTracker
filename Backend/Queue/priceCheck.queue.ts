import { Queue } from "bullmq";
import redisConnection from "../redis.js";

const priceCheckQueue = new Queue("price-check", {
    connection: redisConnection
});

export default priceCheckQueue;