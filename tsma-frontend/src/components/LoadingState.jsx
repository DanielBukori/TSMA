/**
 * mfumo unapakua data — si "hakuna data".
 *
 * Ukurasa unaorodia rekodi kutoka API unaonyesha mabaka ya kusubiri (pulse)
 * badala ya ujumbe wa "bado hazijawekwa", ili msomi asiphisishwe na maana
 * kuwa TSMA haijaweka maudhui wakati maombi bado yanaendelea.
 */
export default function LoadingState({
  count = 8,
  className = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5',
  itemClassName = 'h-64 rounded-xl bg-black/[.06]',
}) {
  return (
    <div className={className} role="status" aria-live="polite">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`animate-pulse ${itemClassName}`} />
      ))}
      <span className="sr-only">Inapakua / Loading</span>
    </div>
  )
}
