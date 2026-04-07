"use client";

interface Product {
  id: string;
  sourceUrl: string;
  source: string;
  name: string;
  description: string;
  price: { amount: string; currency: string } | null;
  images: string[];
  categories: string[];
  attributes: Record<string, string>;
  availability: "in_stock" | "out_of_stock" | "unknown";
  seller: { name: string | null; url: string | null; rating: string | null };
  lastCrawled: string;
}

function ProductCard({ product }: { product: Product }) {
  const imageUrl = product.images[0];

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col">
      <div className="aspect-square bg-[#27272a] relative overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-secondary text-sm">
            No image
          </div>
        )}
        <span
          className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium ${
            product.availability === "in_stock"
              ? "bg-green-900/50 text-green-400"
              : "bg-red-900/50 text-red-400"
          }`}
        >
          {product.availability === "in_stock" ? "In Stock" : "Out of Stock"}
        </span>
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <h3 className="text-sm font-medium text-[#e5e5e5] line-clamp-2 leading-snug">
          {product.name}
        </h3>
        {product.seller.name && (
          <p className="text-xs text-secondary">{product.seller.name}</p>
        )}
        <div className="mt-auto pt-2 flex items-center justify-between">
          {product.price ? (
            <span className="text-price font-semibold">
              ${product.price.amount}
            </span>
          ) : (
            <span className="text-secondary text-sm">Price N/A</span>
          )}
          <a
            href={product.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent hover:text-[#c4b5fd] transition-colors"
          >
            View on store →
          </a>
        </div>
      </div>
    </div>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-square bg-[#27272a]" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-4 bg-[#27272a] rounded w-3/4" />
        <div className="h-3 bg-[#27272a] rounded w-1/2" />
        <div className="h-4 bg-[#27272a] rounded w-1/4 mt-2" />
      </div>
    </div>
  );
}

function ProductCardRow({ products }: { products: Product[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
      {products.map((product) => (
        <div key={product.id} className="w-48 flex-shrink-0">
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}

export { ProductCard, ProductCardSkeleton, ProductCardRow };
export type { Product };
