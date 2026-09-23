import { useEffect, useRef, useState } from 'react'

/**
 * Namba inayoongezeka kiotomatiki (count-up) mara tu inapoonekana kwenye
 * skrini (IntersectionObserver) — kama roadmap ilivyoainisha: "takwimu za
 * haraka zenye animation ya namba kuongezeka."
 */
export default function StatCounter({ value, label, prefix = '', suffix = '', noCount = false, duration = 1600 }) {
  const [display, setDisplay] = useState(noCount ? value : 0)
  const ref = useRef(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (noCount) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          animateCount()
        }
      },
      { threshold: 0.4 },
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function animateCount() {
    const start = performance.now()

    function tick(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // easeOutCubic — inaanza haraka, inapungua taratibu (hisia ya asili)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  return (
    <div ref={ref} className="text-center">
      <div className="font-serif font-black text-3xl md:text-4xl text-gold">
        {prefix}
        {display.toLocaleString()}
        {suffix}
      </div>
      <div className="text-[11px] md:text-xs text-white/65 tracking-wide mt-1 uppercase">
        {label}
      </div>
    </div>
  )
}
