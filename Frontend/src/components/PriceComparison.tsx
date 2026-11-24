import type { ProductListing } from "../types/product";

interface PriceComparisonProps {
  listings: ProductListing[];
}

const PriceComparison = ({ listings }: PriceComparisonProps) => {
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(price);
  };

  const validListings = listings
    .map((listing) => ({
      ...listing,
      numericPrice: Number(listing.price),
    }))
    .filter(
      (listing) =>
        Number.isFinite(listing.numericPrice) &&
        listing.numericPrice > 0
    )
    .sort((a, b) => a.numericPrice - b.numericPrice);

  const prices = validListings.map(
    (listing) => listing.numericPrice
  );

  const lowestPrice = prices.length ? Math.min(...prices) : null;
  const highestPrice = prices.length ? Math.max(...prices) : null;

  const averagePrice = prices.length
    ? prices.reduce((sum, price) => sum + price, 0) / prices.length
    : null;

  const savings =
    prices.length > 1 && lowestPrice !== null && highestPrice !== null
      ? highestPrice - lowestPrice
      : 0;

  const cheapestListing = validListings[0];

  return (
    <section className="price-comparison-section">
      <div className="section-heading">
        <span>PRICE COMPARISON</span>
        <h2>Compare Marketplace Prices</h2>
        <p>Find the lowest available price for this product.</p>
      </div>

      {validListings.length === 0 ? (
        <div className="empty-history">
          No valid marketplace prices are available yet.
        </div>
      ) : (
        <>
          <div className="price-stats">
            <div className="stat-card">
              <span>Lowest Price</span>
              <h3>{formatPrice(lowestPrice!)}</h3>
            </div>

            <div className="stat-card">
              <span>Highest Price</span>
              <h3>{formatPrice(highestPrice!)}</h3>
            </div>

            <div className="stat-card">
              <span>Average Price</span>
              <h3>{formatPrice(averagePrice!)}</h3>
            </div>

            <div className="stat-card">
              <span>Potential Savings</span>
              <h3>{formatPrice(savings)}</h3>
            </div>
          </div>

          <div className="recommendation best">
            <div>
              <span>BEST AVAILABLE DEAL</span>
              <h2>{cheapestListing.marketplace.name}</h2>
              <p>
                This marketplace currently has the lowest listed
                price at {formatPrice(lowestPrice!)}.
              </p>
            </div>
          </div>

          <div className="marketplace-section">
            <h3>Available Marketplace Listings</h3>

            <div className="marketplace-grid">
              {validListings.map((listing, index) => (
                <div className="marketplace-card" key={listing.id}>
                  <div className="marketplace-header">
                    <h3>{listing.marketplace.name}</h3>

                    {index === 0 && (
                      <span className="best-price-tag">
                        Lowest Price
                      </span>
                    )}
                  </div>

                  <h2>{formatPrice(listing.numericPrice)}</h2>

                  <div className="listing-rating">
                    <span className="rating-star">★</span>

                    {listing.rating !== null &&
                    listing.rating !== undefined ? (
                      <>
                        <strong>{listing.rating.toFixed(1)}</strong>
                        <span className="rating-out-of">/ 5</span>
                      </>
                    ) : (
                      <span className="rating-unavailable">
                        No rating available
                      </span>
                    )}
                  </div>

                  <p>
                    Product listing from {listing.marketplace.name}
                  </p>

                  <a
                    href={listing.url}
                    target="_blank"
                    rel="noreferrer"
                    className="product-link"
                  >
                    View Product →
                  </a>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default PriceComparison;