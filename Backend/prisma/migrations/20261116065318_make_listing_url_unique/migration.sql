/*
  Warnings:

  - A unique constraint covering the columns `[url]` on the table `ProductListing` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ProductListing_url_key" ON "ProductListing"("url");
