
import type { ProductCardData } from "../types/product";

interface ProductCardProps {
  product: ProductCardData;
  onClick: () => void;
}

const ProductCard = ({ product, onClick }: ProductCardProps) => {
  return (
    <div
      className="catalogue-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className="catalogue-image">
        {product.image ? (
          <img src={product.image} alt={product.name} loading="lazy" />
        ) : (
          <div className="no-image">Image not available</div>
        )}
      </div>

      <div className="catalogue-card-content">
        <h3>{product.name}</h3>

        <button
          className="view-details-button"
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
        >
          View Details →
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
