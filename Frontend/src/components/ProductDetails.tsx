
import type { Product } from "../types/product";

interface ProductDetailsProps {
  product: Product;
}

const ProductDetails = ({ product }: ProductDetailsProps) => {
  return (
    <div className="product-card">
      <div className="product-image">
        {product.image ? (
          <img src={product.image} alt={product.name} />
        ) : (
          <div className="no-image">Image not available</div>
        )}
      </div>

      <div className="product-details">
        <span className="product-tag">PRODUCT DETAILS</span>

        <h2>{product.name}</h2>

        <p className="product-description">
          {product.description || "No description available."}
        </p>

        <div className="product-meta">
          <div>
            <span>Brand</span>
            <strong>{product.brand || "Not available"}</strong>
          </div>

          <div>
            <span>Color</span>
            <strong>{product.color || "Not available"}</strong>
          </div>

          <div>
            <span>Product ID</span>
            <strong>{product.id}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
