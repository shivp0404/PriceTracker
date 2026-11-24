import priceCheckWorker from "./Worker/priceCheck.Worker.js";
import startPriceCheckScheduler from "./scheduler/priceCheckScheduler.js";

export default async function start() {

    await priceCheckWorker.waitUntilReady();

    await startPriceCheckScheduler();

    console.log("Background worker is running");
}

