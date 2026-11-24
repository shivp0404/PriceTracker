
import "./index.css";
import axios from "axios";
import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import ProductCard from "./components/ProductCard";
import ProductDetails from "./components/ProductDetails";
import PriceComparison from "./components/PriceComparison";
import PriceHistory from "./components/PriceHistory";

import type {
  Product,
  ProductCardData,
  ProductListing,
  ProductsResponse,
  ProductResponse,
  ProductListingsResponse,
} from "./types/product";

const API_URL = "http://localhost:3000";

// Shared function: fetch one product and its marketplace listings.
const getProductDetails = async (
  productId: string
): Promise<{ product: Product; listings: ProductListing[] }> => {
  const [productResponse, listingResponse] = await Promise.all([
    axios.get<ProductResponse>(`${API_URL}/product/${productId}`),
    axios.get<ProductListingsResponse>(`${API_URL}/productlisting`, {
      params: { productId },
    }),
  ]);

  return {
    product: productResponse.data.product,
    listings: listingResponse.data.listings || [],
  };
};

const Navbar = () => (
  <nav className="navbar">
    <Link to="/" className="brand-link">
      <h1>
        Price<span>Tracker</span>
      </h1>
    </Link>

    <div className="nav-links">
      <Link to="/">Home</Link>
      <Link to="/products">Explore Products</Link>
    </div>

    <p>Shop smarter. Save more.</p>
  </nav>
);

// HOME PAGE
const HomePage = () => {
  const [url, setUrl] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [listings, setListings] = useState<ProductListing[]>([]);

  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleTrackProduct = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    if (!url.trim()) {
      setError("Please enter a product URL.");
      return;
    }

    try {
      setLoading(true);
      setDetailsLoading(true);
      setError("");
      setSuccess("");
      setSelectedProduct(null);
      setListings([]);

      const response = await axios.post<ProductResponse>(
        `${API_URL}/`,
        { url: url.trim() }
      );

      const product = response.data.product;

      const details = await getProductDetails(product.id);

      setSelectedProduct(details.product);
      setListings(details.listings);

      setSuccess(
        response.data.message === "Product already exists"
          ? "This product is already in your collection."
          : "Product added successfully!"
      );

      setUrl("");
    } catch (err) {
      console.error("Product tracking failed:", err);

      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ||
            "Unable to track this product. Please try again."
        );
      } else {
        setError("Something went wrong.");
      }
    } finally {
      setLoading(false);
      setDetailsLoading(false);
    }
  };

  return (
    <>
      <section className="search-hero">
        <div className="hero-content">
          <span className="tagline">SMART PRICE COMPARISON</span>

          <h2>
            Find the best price.
            <br />
            <span>Every single time.</span>
          </h2>

          <p>
            Paste a product link from your favourite marketplace
            and compare prices in one place.
          </p>

          <form className="search-form" onSubmit={handleTrackProduct}>
            <div className="input-wrapper">
              <span className="link-icon">↗</span>

              <input
                type="url"
                placeholder="Paste Flipkart, Amazon, Croma or Reliance Digital URL..."
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                disabled={loading}
                required
              />

              {url && (
                <button
                  type="button"
                  className="clear-input"
                  onClick={() => setUrl("")}
                >
                  ×
                </button>
              )}
            </div>

            <button
              type="submit"
              className="track-button"
              disabled={loading}
            >
              {loading ? "Tracking..." : "Track Product →"}
            </button>
          </form>

          <div className="supported-marketplaces">
            Supported marketplaces: Flipkart · Amazon · Blinkit · Croma ·
            Reliance Digital
          </div>

          {error && (
            <div className="form-message error-message">{error}</div>
          )}

          {success && (
            <div className="form-message success-message">{success}</div>
          )}
        </div>
      </section>

      {detailsLoading && (
        <div className="loading-state">Loading product information...</div>
      )}

      {!detailsLoading && selectedProduct && (
        <section className="result-section">
          <div className="result-heading">
            <div>
              <span className="product-tag">SEARCH RESULT</span>
              <h2>Product Overview</h2>
            </div>

            <button
              className="close-result"
              onClick={() => {
                setSelectedProduct(null);
                setListings([]);
                setSuccess("");
              }}
            >
              ✕ Close
            </button>
          </div>

          <ProductDetails product={selectedProduct} />
          <PriceComparison listings={listings} />
        </section>
      )}

      <section className="explore-banner">
        <div>
          <span className="product-tag">YOUR COLLECTION</span>
          <h2>Explore all tracked products</h2>
          <p>Browse your collection and compare prices across marketplaces.</p>
        </div>

        <Link to="/products" className="explore-button">
          Explore Products →
        </Link>
      </section>
    </>
  );
};

// EXPLORE PRODUCTS PAGE
const ProductsPage = () => {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get<ProductsResponse>(
          `${API_URL}/product`
        );

        setProducts(response.data.products || []);
      } catch (err) {
        console.error("Failed to fetch products:", err);
        setError("Unable to load products.");
      } finally {
        setLoading(false);
      }
    };

    void fetchProducts();
  }, []);

  return (
    <section className="catalogue-section page-section">
      <div className="catalogue-heading">
        <div>
          <span className="product-tag">YOUR COLLECTION</span>
          <h2>Explore Products</h2>
          <p>Select a product to view its details and compare prices.</p>
        </div>

        <span className="product-count">{products.length} Products</span>
      </div>

      {loading ? (
        <div className="loading-state">Loading products...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <h3>No products tracked yet</h3>
          <p>Go to Home and paste a product URL to start your collection.</p>
          <Link to="/" className="explore-button">
            Go to Home
          </Link>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={() => navigate(`/products/${product.id}`)}
            />
          ))}
        </div>
      )}
    </section>
  );
};

// PRODUCT DETAILS PAGE
const ProductPage = () => {
  const { id } = useParams<{ id: string }>();

  const [product, setProduct] = useState<Product | null>(null);
  const [listings, setListings] = useState<ProductListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError("");

        const details = await getProductDetails(id);

        setProduct(details.product);
        setListings(details.listings);
      } catch (err) {
        console.error("Failed to fetch product details:", err);
        setError("Unable to load product details.");
      } finally {
        setLoading(false);
      }
    };

    void fetchDetails();
  }, [id]);

  if (loading) {
    return <div className="loading-state">Loading product details...</div>;
  }

  if (error || !product) {
    return (
      <div className="empty-state page-section">
        <h3>{error || "Product not found."}</h3>
        <Link to="/products" className="explore-button">
          Back to Products
        </Link>
      </div>
    );
  }

return (
  <section className="details-page">
    <Link to="/products" className="back-button">
      ← Back to Products
    </Link>

    <ProductDetails product={product} />

    <PriceComparison listings={listings} />

    <PriceHistory productId={product.id} />
  </section>
);
};

// APPLICATION ROUTES
const App = () => {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />

        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductPage />} />
          </Routes>
        </main>

        <footer>
          © 2026 PriceTracker. Shop smarter, not harder.
        </footer>
      </div>
    </BrowserRouter>
  );
};

export default App;
