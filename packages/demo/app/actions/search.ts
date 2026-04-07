"use server";

import type { Product } from "../components/product-card";

const AGORA_API_URL =
  process.env.AGORA_API_URL ?? "https://agora-ecru-chi.vercel.app";
const AGORA_API_KEY = process.env.AGORA_API_KEY ?? "ak_test_123";

interface SearchParams {
  query: string;
  maxPrice?: string;
  minPrice?: string;
  availability?: string;
}

interface SearchResponse {
  data: Product[];
  meta: { total: number; page: number; perPage: number };
}

export async function searchProducts(
  params: SearchParams
): Promise<SearchResponse> {
  const url = new URL(`${AGORA_API_URL}/v1/products/search`);
  url.searchParams.set("q", params.query);
  if (params.maxPrice) url.searchParams.set("maxPrice", params.maxPrice);
  if (params.minPrice) url.searchParams.set("minPrice", params.minPrice);
  if (params.availability)
    url.searchParams.set("availability", params.availability);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${AGORA_API_KEY}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Agora API error: ${res.status}`);
  }

  return res.json();
}
