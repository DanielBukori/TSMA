/**
 * Compact page heading wrapper.
 * Intentionally removes the large image/banner area from inner pages while
 * keeping the existing page title and CMS-driven text.
 */
export default function PageBanner({ children, className = '' }) {
  return (
    <section className={`relative bg-white text-navy-deep text-center py-8 md:py-10 border-b border-black/5 ${className}`}>
      <div className="relative z-10 max-w-5xl mx-auto px-5">
        {children}
      </div>
    </section>
  )
}
