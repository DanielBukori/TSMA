// Muundo wa kurasa za TSMA. VITE_SINGLE_PAGE=true huweka sehemu kuu kwenye Home;
// false huruhusu kila sehemu kufunguka kama ukurasa wake.
export const SINGLE_PAGE = (import.meta.env.VITE_SINGLE_PAGE ?? 'true').toLowerCase() !== 'false'

export const SECTION_ROUTES = {
  about: '/about',
  board: '/board',
  publications: '/publications',
  teaching: '/teaching',
  conferences: '/conferences',
  members: '/members',
  news: '/news',
  gallery: '/gallery',
  contact: '/contact',
}
