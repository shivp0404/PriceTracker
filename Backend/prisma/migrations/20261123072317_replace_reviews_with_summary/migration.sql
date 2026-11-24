/*
  Warnings:

  - You are about to drop the `Review` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_productId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_productListingId_fkey";

-- DropTable
DROP TABLE "Review";

-- CreateTable
CREATE TABLE "MarketplaceReviewSummary" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productListingId" TEXT NOT NULL,
    "averageRating" DOUBLE PRECISION,
    "totalReviews" INTEGER,
    "totalRatings" INTEGER,
    "pros" TEXT,
    "cons" TEXT,

    CONSTRAINT "MarketplaceReviewSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceReviewSummary_productListingId_key" ON "MarketplaceReviewSummary"("productListingId");

-- CreateIndex
CREATE INDEX "MarketplaceReviewSummary_productId_idx" ON "MarketplaceReviewSummary"("productId");

-- AddForeignKey
ALTER TABLE "MarketplaceReviewSummary" ADD CONSTRAINT "MarketplaceReviewSummary_productListingId_fkey" FOREIGN KEY ("productListingId") REFERENCES "ProductListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
