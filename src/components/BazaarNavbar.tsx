import Link from "next/link";

export default function BazaarNavbar() {
  return (
    <header className="bazaar-topbar">
      <div className="bazaar-topbar-inner">
        <Link href="/" className="bazaar-brand">
          <span className="bazaar-seal" aria-hidden="true">
            仙
          </span>
          <div className="bazaar-brand-copy">
            <span className="bazaar-brand-title">Immortal Bazaar</span>
            <span className="bazaar-brand-sub">
              仙市奇珍阁 • Treasure Exchange
            </span>
          </div>
        </Link>

        <nav className="bazaar-nav" aria-label="Primary Navigation">
          <Link href="/" className="nav-link">
            Browse
          </Link>
          <Link href="/connect" className="nav-link nav-link--connect">
            Connect with Stripe
          </Link>
          <Link href="/create" className="btn-offer-treasure">
            + Offer Treasure
          </Link>
        </nav>
      </div>
    </header>
  );
}
