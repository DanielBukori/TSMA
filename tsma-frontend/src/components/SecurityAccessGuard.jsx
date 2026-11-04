import { Navigate, useLocation } from 'react-router-dom'

/**
 * Kinga ya njia ya Security Dashboard.
 *
 * Awali ulinzi ulikuwa ndani ya `useEffect` ya ukurasa wenyewe — yaani
 * dashibodi ILIWEZESHA kuchajiwa na kupiga ombi la API kabla ya kurudisha
 * mtumiaji kwenye login. Guard hii hukagua kabla ya ukurasa kuamsha.
 *
 * KUMBUKA: hii ni faraja ya UI pekee. Chanzo cha ukweli ni backend
 * (`security/auth_tokens.py` + tokens za 20 dakika), kwa hiyo kutotumia
 * localStorage hapa hakufungui kitu.
 */
export default function SecurityAccessGuard({ children }) {
  const location = useLocation()

  if (!localStorage.getItem('tsma_security_token')) {
    return <Navigate to="/security/login" state={{ from: location.pathname }} replace />
  }

  return children
}
