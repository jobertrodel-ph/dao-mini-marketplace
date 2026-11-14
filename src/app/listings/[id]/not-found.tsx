import Link from "next/link";

export default function ListingNotFound() {
  return (
    <main className="bazaar-container bazaar-container--narrow">
      <div className="empty-bazaar">
        <span className="empty-seal" aria-hidden="true">
          空
        </span>
        <h1 className="empty-title">Treasure Not Found</h1>
        <p className="empty-copy">
          This relic may have already been claimed or the scroll link is
          invalid.
        </p>
        <Link href="/" className="btn-offer-treasure">
          Return to Immortal Bazaar
        </Link>
      </div>
    </main>
  );
}
