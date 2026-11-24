
export interface Product {
  id: string;
  name: string;
  brand: string;
  description: string;
  color: string;
  image: string | null;
}

export interface ProductCardData {
  id: string;
  name: string;
  image: string | null;
}

export interface Marketplace {
  id: string;
  name: string;
}

export interface ProductListing {
  id: string;
  price: string | number;
  url: string;
  marketplace: Marketplace;
}

export interface ProductsResponse {
  success: boolean;
  products: ProductCardData[];
}

export interface ProductResponse {
  success: boolean;
  product: Product;
}

export interface ProductListingsResponse {
  success: boolean;
  listings: ProductListing[];
}
