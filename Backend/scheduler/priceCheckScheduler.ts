import cron from "node-cron";
import dailyPriceCheckProducer from "../services/dailypriceChecker.producer.js";

async function startPriceCheckScheduler() {

    cron.schedule(
        "0 8 * * *",
        async () => {
            try {
                console.log("Starting daily price checks");

                await dailyPriceCheckProducer();

                console.log("Daily price-check jobs added");
            } catch (error) {
                console.error("Daily price-check producer failed:", error);
            }
        },
        {
            timezone: "Asia/Kolkata"
        }
    );

    console.log("Daily price-check scheduler registered");
}

export default startPriceCheckScheduler;