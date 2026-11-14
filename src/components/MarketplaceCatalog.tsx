"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  formatSpiritStones,
  TREASURE_CATEGORIES,
  type Listing,
  type TreasureCategory,
} from "@/lib/supabase";

interface MarketplaceCatalogProps {
  initialListings: Listing[];
  initialError: string | null;
}

type FilterTab = "All Treasures" | TreasureCategory;

const FILTER_TABS: readonly FilterTab[] = [
  "All Treasures",
  ...TREASURE_CATEGORIES,
];

export default function MarketplaceCatalog({
  initialListings,
  initialError,
}: MarketplaceCatalogProps) {
  const [activeCategory, setActiveCategory] =
    useState<FilterTab>("All Treasures");
  const [searchQuery, setSearchQuery] = useState("");

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredListings = initialListings.filter((item) => {
    const matchesCategory =
      activeCategory === "All Treasures" || item.category === activeCategory;
    const matchesSearch =
      normalizedQuery.length === 0 ||
      item.title.toLowerCase().includes(normalizedQuery) ||
      item.description.toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesSearch;
  });

  return (
    <main className="bazaar-container">
      <section className="bazaar-hero">
        <div className="hero-text-group">
          <span className="hero-eyebrow">NINE REALMS TRADING PAVILION</span>
          <h1 className="hero-title">Cultivation Relics &amp; Spirit Goods</h1>
          <p className="hero-subtitle">
            Browse forged spirit blades, ancient jade slips, and refined elixirs
            offered by fellow cultivators across the realm.
          </p>
        </div>

        <div className="hero-search-wrap">
          <label htmlFor="treasure-search" className="sr-only">
            Search treasures
          </label>
          <input
            id="treasure-search"
            type="search"
            className="search-input"
            placeholder="Search relics by keyword..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
      </section>

      <div
        className="category-tabs"
        role="tablist"
        aria-label="Treasure Categories"
      >
        {FILTER_TABS.map((tab) => {
          const count =
            tab === "All Treasures"
              ? initialListings.length
              : initialListings.filter((item) => item.category === tab).length;
          const isActive = activeCategory === tab;

          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`category-tab ${
                isActive ? "category-tab--active" : ""
              }`}
              onClick={() => setActiveCategory(tab)}
            >
              <span>{tab}</span>
              <span className="tab-count">{count}</span>
            </button>
          );
        })}
      </div>

      {initialError && (
        <p className="bazaar-error" role="alert">
          {initialError}
        </p>
      )}

      {filteredListings.length === 0 ? (
        <div className="empty-bazaar">
          <span className="empty-seal" aria-hidden="true">
            宝
          </span>
          <h2 className="empty-title">No Treasures Found</h2>
          <p className="empty-copy">
            No listings match your selected category or search keyword yet.
          </p>
          <Link href="/create" className="btn-offer-treasure">
            List the First Treasure
          </Link>
        </div>
      ) : (
        <div className="listings-grid">
          {filteredListings.map((listing) => (
            <Link
              key={listing.id}
              href={`/listings/${listing.id}`}
              className="treasure-card"
            >
              <div className="treasure-image-frame">
                <Image
                  src={listing.image_url}
                  alt={listing.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw"
                  className="treasure-image"
                />
                <span className="treasure-category-pill">
                  {listing.category}
                </span>
              </div>

              <div className="treasure-card-body">
                <h2 className="treasure-title">{listing.title}</h2>
                <p className="treasure-price">
                  {formatSpiritStones(listing.price)}
                </p>
                <p className="treasure-excerpt">{listing.description}</p>
                <span className="treasure-cta">Inspect Relic →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
