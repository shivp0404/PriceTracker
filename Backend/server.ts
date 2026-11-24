
import express from "express";

import { prisma } from "./lib/prisma.js";
import cors from "cors";

import validateProductUrl from "./lib/ValidateProductUrl.js";
import dailyPriceCheckProducer from "./services/dailypriceChecker.producer.js";

import redisConnection from "./redis.js"
import start from "./worker.js"
import { chromium } from "playwright";



const app = express();

app.use(express.json());

app.use(cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
}));

export interface ScrapedReviewSummary {
  averageRating: number | null;
  totalReviews: number | null;
  totalRatings: number | null;
  pros: string | null;
  cons: string | null;
}



export interface ScrapedReviewSummary {
  averageRating: number | null;
}


export async function scrapeFlipkartReviews(
  reviewUrl: string
): Promise<ScrapedReviewSummary> {

  const browser = await chromium.launch({
    headless: true
  });

  try {
    const page = await browser.newPage();

    await page.goto(reviewUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    const ratingLocator = page.locator(
      "div.css-146c3p1"
    ).filter({
      hasText: /^\s*[1-5]\.\d\s*$/
    });

    await ratingLocator.first().waitFor({
      state: "visible",
      timeout: 15000
    });

    const ratingText = await ratingLocator.first().textContent();

    const averageRating = ratingText
      ? Number(ratingText.trim())
      : null;

    return {
      averageRating: Number.isFinite(averageRating)
        ? averageRating
        : null
    };

  } catch (error) {

    console.error("Flipkart rating scraping failed:", error);
    throw error;

  } finally {

    await browser.close();

  }
}

export async function scrapeAmazonReviews(
  reviewUrl: string
): Promise<ScrapedReviewSummary> {

  const browser = await chromium.launch({
    headless: true
  });

  try {
    const page = await browser.newPage();

    await page.goto(reviewUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await page.waitForTimeout(3000);

    const result = await page.evaluate(() => {

      // Average product rating
      const ratingText = document
        .querySelector('span[data-hook="rating-out-of-text"]')
        ?.textContent?.trim() ?? "";

      const ratingMatch = ratingText.match(/[1-5](?:\.\d)?/);

      const averageRating = ratingMatch
        ? Number(ratingMatch[0])
        : null;

      // First customer review
      const reviewElement = document.querySelector(
        'div[data-hook="review"] span[data-hook="review-body"]'
      );

     

      return {
        averageRating
      };
    });

    return result;

  } catch (error) {

    console.error("Amazon review scraping failed:", error);
    throw error;

  } finally {

    await browser.close();

  }
}


export async function updateAllProductRatings() {
  const listings = await prisma.productListing.findMany({
    skip:139,
    take:20,
    include: {
      marketplace: true,
    },
  });

  const results = [];

  for (const listing of listings) {
    const marketplace = listing.marketplace.name.toLowerCase();

    try {
      let rating: number | null = null;

      switch (marketplace) {
        case "flipkart": {
          const data = await scrapeFlipkartReviews(listing.url);
    
          rating = data?.averageRating ?? null;
          break;
        }

        case "amazon": {
          const data = await scrapeAmazonReviews(listing.url);
          rating = data?.averageRating ?? null;
          break;
        }

        default:
          continue;
      }

      await prisma.productListing.update({
        where: {
          id: listing.id,
        },
        data: {
          rating,
        },
      });

      results.push({
        listingId: listing.id,
        marketplace,
        rating,
        status: "updated",
      });
     console.log("completed")

    } catch (error) {
      console.error(
        `Failed to update ${marketplace} rating for ${listing.url}`,
        error
      );

      results.push({
        listingId: listing.id,
        marketplace,
        status: "failed",
      });
    }
  }

  return results;
}

app.post("/", async (req, res) => {
    const { url } = req.body;

    try {
        if (!url || !validateProductUrl(url)) {
            return res.status(400).json({
                message: "Invalid or unsupported product URL"
            });
        }

        // Check existing listing
        const existingProduct = await prisma.productListing.findUnique({
            where: { url },
            include: {
                product: true,
                marketplace: true
            }
        });

        if (existingProduct) {
            return res.status(200).json({
                message: "Product already exists",
                product: existingProduct
            });
        }

        // Scrape product details
        const productData = await scrapeProduct(url);

        // Get marketplace from hostname
        const marketplaceName = getMarketplaceName(url);

        // Save product and listing
        const savedProduct = await prisma.product.create({
            data: {
                name: productData.name,
                brand: productData.brand,
                description: productData.description,
                color: productData.color,
                image: productData.images?.[0] ?? null,

                listings: {
                    create: {
                        price: productData.price,
                        url: productData.url,

                        marketplace: {
                            connectOrCreate: {
                                where: {
                                    name: marketplaceName
                                },
                                create: {
                                    name: marketplaceName
                                }
                            }
                        }
                    }
                }
            },
            include: {
                listings: {
                    include: {
                        marketplace: true
                    }
                }
            }
        });

        return res.status(201).json({
            message: "Product added successfully",
            product: savedProduct
        });

    } catch (error: any) {
        console.error("Product registration error:", error);

        // Handle duplicate URL requests
        if (error.code === "P2002" && url) {
            const existingProduct = await prisma.productListing.findUnique({
                where: { url },
                include: {
                    product: true,
                    marketplace: true
                }
            });

            if (existingProduct) {
                return res.status(200).json({
                    message: "Product already exists",
                    product: existingProduct
                });
            }
        }

        return res.status(500).json({
            message: "Product registration failed"
        });
    }
});

app.get("/product", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        image: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("Fetch products error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
});

app.get("/product/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        brand: true,
        description: true,
        color: true,
        image: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Fetch product details error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product details",
    });
  }
});

app.get("/productlisting", async (req, res) => {
  try {
    const productId = req.query.productId as string;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const listings = await prisma.productListing.findMany({
      where: {
        productId,
      },
      select: {
        id: true,
        price: true,
        url: true,
        rating: true, // Added rating

        marketplace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      listings: listings.map((listing) => ({
        ...listing,
        price: Number(listing.price),
      })),
    });
  } catch (error) {
    console.error("Fetch product listings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product listings",
    });
  }
});  

app.get("/product/:id/history", async (req, res) => {
  try {
    const { id } = req.params;

    // Check whether the product exists
    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    // Fetch all history records and their price entries
    const histories = await prisma.history.findMany({
      where: { productId: id },
      include: {
        entries: {
          orderBy: {
            recordedAt: "desc"
          }
        }
      }
    });

    // Get marketplace IDs from the history records
    const marketplaceIds = [
      ...new Set(histories.map((history) => history.marketplaceId))
    ];

    // Fetch marketplace names
    const marketplaces = await prisma.marketPlace.findMany({
      where: {
        id: {
          in: marketplaceIds
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    // Map marketplace IDs to their names
    const marketplaceMap = new Map(
      marketplaces.map((marketplace) => [
        marketplace.id,
        marketplace.name
      ])
    );

    // Prepare the response
    const history = histories.map((item) => ({
      historyId: item.id,
      marketplaceId: item.marketplaceId,
      marketplaceName:
        marketplaceMap.get(item.marketplaceId) || "Unknown Marketplace",
      entries: item.entries.map((entry) => ({
        id: entry.id,
        price: entry.price.toString(),
        recordedAt: entry.recordedAt
      }))
    }));

    return res.status(200).json({ history });

  } catch (error) {
    console.error("Failed to fetch price history:", error);

    return res.status(500).json({
      message: "Unable to fetch price history"
    });
  }
});


const startServer = async ()=>{
  try{
  console.log("RedisConnected",await redisConnection.ping())
  app.listen(3000, () => {
      console.log("Application is running at http://localhost:3000");
  });
 
    
 
}
catch(e){
  console.log(e)
}
}

startServer()
