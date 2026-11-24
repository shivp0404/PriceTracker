/*
  Warnings:

  - You are about to drop the `MarketplaceReviewSummary` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "MarketplaceReviewSummary" DROP CONSTRAINT "MarketplaceReviewSummary_productListingId_fkey";

-- AlterTable
ALTER TABLE "ProductListing" ADD COLUMN     "rating" DOUBLE PRECISION;

-- DropTable
DROP TABLE "MarketplaceReviewSummary";
