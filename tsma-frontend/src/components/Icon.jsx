/**
 * Icons za mstari (stroke) badala ya emoji. Emoji haielekezi kitu kwenye
 * tovuti ya kitaalamu na hubebwa vibaya kati ya fonti na mifumo mbalimbali,
 * kwa hiyo alama zote za UI ni SVG rahisi zinazopata rangi kutoka kwa
 * `currentColor` (parent text color) — `className` inaweza kubadilisha
 * ukubwa/rangi tu.
 */

const PATHS = {
  check: <path d="M4.5 12.5l4.5 4.5 10-10" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  alert: (
    <>
      <path d="M12 4.5L21 19.5H3L12 4.5z" />
      <path d="M12 10v4.5M12 17.2v.3" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="1.8" />
      <path d="M8.2 10.5V8a3.8 3.8 0 017.6 0v2.5" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="5.8" />
      <path d="M15.2 15.2l4.3 4.3" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  download: (
    <>
      <path d="M12 4v10M8 10.5l4 4 4-4" />
      <path d="M5 19h14" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="6" width="17" height="12" rx="1.8" />
      <path d="M4 7.5l8 5.5 8-5.5" />
    </>
  ),
  chat: (
    <>
      <path d="M20 12.8c0 3.6-3.6 6.5-8 6.5-1 0-2-.2-2.9-.5L5 20.5l1.4-3.2C5 16 4 14.5 4 12.8 4 9.2 7.6 6.3 12 6.3s8 2.9 8 6.5z" />
      <path d="M9 12.6h.01M12 12.6h.01M15 12.6h.01" />
    </>
  ),
  phone: <path d="M6.5 4.2l2.6.4 1.3 3.4-1.8 1.6a10.5 10.5 0 004.5 4.5l1.6-1.8 3.4 1.3.4 2.6c0 1.1-.9 2-2 2A15.5 15.5 0 014.5 6.2c0-1.1.9-2 2-2z" />,
  pin: (
    <>
      <path d="M12 20.5s6-5.6 6-10a6 6 0 10-12 0c0 4.4 6 10 6 10z" />
      <circle cx="12" cy="10.2" r="2.2" />
    </>
  ),
  calendar: (
    <>
      <rect x="4" y="6.5" width="16" height="13" rx="1.8" />
      <path d="M4 10.5h16M8.5 4.2v3.5M15.5 4.2v3.5" />
    </>
  ),
  shield: <path d="M12 4l6.5 2.5v5.2c0 4-2.6 7.3-6.5 8.8-3.9-1.5-6.5-4.8-6.5-8.8V6.5L12 4z" />,
  card: (
    <>
      <rect x="3.5" y="6.5" width="17" height="11" rx="1.8" />
      <path d="M3.5 10.2h17" />
    </>
  ),
  users: (
    <>
      <circle cx="9.5" cy="9" r="3.2" />
      <path d="M4 19.2c.7-2.6 2.9-4.1 5.5-4.1s4.8 1.5 5.5 4.1" />
      <path d="M16.2 6.6a3.1 3.1 0 010 5.5M18 18.6c-.4-1.6-1.3-2.8-2.6-3.5" />
    </>
  ),
  chart: <path d="M5 19.5V11M10 19.5V6.5M15 19.5v-5.8M20 19.5V9" />,
  image: (
    <>
      <rect x="3.8" y="5.8" width="16.4" height="12.4" rx="1.8" />
      <path d="M6 18.2l4.4-4.6 3 3 2.6-2.7 2 2.1" />
      <circle cx="9" cy="9.8" r="1.3" />
    </>
  ),
  edit: <path d="M5 19h3.2l9.3-9.3-3.2-3.2L5 15.8V19zM15.4 5.4l3.2 3.2" />,
  link: (
    <>
      <path d="M10 14.2l2.8-2.8" />
      <path d="M8.6 11.4L6.4 13.6a3.1 3.1 0 004.4 4.4l2.2-2.2" />
      <path d="M15.4 12.6l2.2-2.2a3.1 3.1 0 00-4.4-4.4l-2.2 2.2" />
    </>
  ),
  dot: <circle cx="12" cy="12" r="4.2" />,
  play: <path d="M8.5 5.8l9.2 6.2-9.2 6.2V5.8z" />,
  ticket: (
    <>
      <path d="M4 8.5V6.8h16v1.7a3.5 3.5 0 010 7v1.7H4v-1.7a3.5 3.5 0 010-7z" />
      <path d="M12 8.8v6.4" />
    </>
  ),
}

export default function Icon({ name, className = 'w-4 h-4', strokeWidth = 1.7, ...rest }) {
  const content = PATHS[name]
  if (!content) return null

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block align-middle shrink-0 ${className}`}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {content}
    </svg>
  )
}
