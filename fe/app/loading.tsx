export default function Loading() {
  return (
    <main className="skeleton-page" aria-busy="true" aria-label="Loading page">
      <div className="skeleton-nav"><span className="skeleton skeleton-logo" /><span className="skeleton skeleton-nav-links" /><span className="skeleton skeleton-nav-button" /></div>
      <section className="skeleton-hero"><div className="skeleton skeleton-hero-copy" /><div className="skeleton skeleton-hero-image" /></section>
      <section className="skeleton-section"><span className="skeleton skeleton-eyebrow" /><span className="skeleton skeleton-heading" /><div className="skeleton-grid"><span className="skeleton skeleton-card" /><span className="skeleton skeleton-card" /><span className="skeleton skeleton-card" /></div></section>
    </main>
  )
}

// The route-level loading UI keeps navigation responsive while the page server component resolves.
