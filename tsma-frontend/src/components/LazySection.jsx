import { useEffect, useRef, useState } from 'react'

/** Reveals page sections as they enter the viewport without changing their layout. */
export default function LazySection({ id, children }) {
  const sectionRef = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = sectionRef.current
    if (!node) return
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true)
        observer.unobserve(entry.target)
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      id={id}
      ref={sectionRef}
      className={`tsma-reveal${visible ? ' tsma-reveal--visible' : ''}`}
    >
      {children}
    </section>
  )
}
