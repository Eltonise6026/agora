"use client";

import { useState, useTransition } from "react";
import { searchProducts } from "../actions/search";
import { ProductCard, ProductCardSkeleton } from "./product-card";
import type { Product } from "./product-card";

const PRICE_FILTERS = [
  { label: "Under $25", max: "25" },
  { label: "$25–50", min: "25", max: "50" },
  { label: "$50–100", min: "50", max: "100" },
  { label: "$100+", min: "100" },
];

function Explore() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeFilter, setActiveFilter] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function doSearch(
    searchQuery: string,
    filterIndex: number | null = activeFilter
  ) {
    if (!searchQuery.trim()) return;
    setError(null);
    setHasSearched(true);

    const filter = filterIndex !== null ? PRICE_FILTERS[filterIndex] : null;

    startTransition(async () => {
      try {
        const result = await searchProducts({
          query: searchQuery,
          minPrice: filter?.min,
          maxPrice: filter?.max,
        });
        setProducts(result.data);
        setTotal(result.meta.total);
      } catch {
        setError("Something went wrong. Please try again.");
        setProducts([]);
        setTotal(0);
      }
    });
  }

  function handleFilterClick(index: number) {
    const newFilter = activeFilter === index ? null : index;
    setActiveFilter(newFilter);
    if (query.trim()) {
      doSearch(query, newFilter);
    }
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-y-auto">
      {/* Search bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          doSearch(query);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          className="flex-1 bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-[#e5e5e5] placeholder:text-secondary outline-none focus:border-accent transition-colors"
        />
        <button
          type="submit"
          disabled={isPending || !query.trim()}
          className="bg-accent hover:bg-[#8b5cf6] disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Search
        </button>
      </form>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {PRICE_FILTERS.map((filter, i) => (
          <button
            key={filter.label}
            onClick={() => handleFilterClick(i)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              activeFilter === i
                ? "bg-accent/20 border-accent text-accent"
                : "bg-surface border-border text-secondary hover:text-[#e5e5e5] hover:border-[#3f3f46]"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {isPending && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!isPending && error && (
        <div className="flex items-center justify-center flex-1 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!isPending && !error && hasSearched && products.length === 0 && (
        <div className="flex items-center justify-center flex-1 text-secondary text-sm">
          No products found. Try a different search.
        </div>
      )}

      {!isPending && !error && products.length > 0 && (
        <>
          <p className="text-xs text-secondary">
            {total} product{total !== 1 ? "s" : ""} found
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}

      {!hasSearched && (
        <div className="flex items-center justify-center flex-1 text-secondary text-sm">
          Search for products to get started
        </div>
      )}
    </div>
  );
}

export { Explore };
