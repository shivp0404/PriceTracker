-- CreateTable
CREATE TABLE "History" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "marketplaceId" TEXT NOT NULL,

    CONSTRAINT "History_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistoryEntry" (
    "id" TEXT NOT NULL,
    "historyId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "History_productId_marketplaceId_key" ON "History"("productId", "marketplaceId");

-- CreateIndex
CREATE INDEX "PriceHistoryEntry_historyId_recordedAt_idx" ON "PriceHistoryEntry"("historyId", "recordedAt");

-- AddForeignKey
ALTER TABLE "PriceHistoryEntry" ADD CONSTRAINT "PriceHistoryEntry_historyId_fkey" FOREIGN KEY ("historyId") REFERENCES "History"("id") ON DELETE CASCADE ON UPDATE CASCADE;
