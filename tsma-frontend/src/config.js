// Gateway ya malipo inayotumika na fomu zote (Members, Conferences, Publications).
//
// Weka VITE_PAYMENT_GATEWAY=manual kwenye .env wakati wa TESTING (kabla ya
// kusajili Selcom/AzamPay) — malipo hayatawasiliana na huduma yoyote ya
// nje, badala yake Admin anathibitisha kwa mkono (Django Admin -> Payments
// -> "Thibitisha malipo yamepokelewa"), na uanachama/QR n.k. vinawezeshwa
// kawaida.
//
// Ukishapata akaunti halisi ya Selcom, badilisha tu .env kuwa
// VITE_PAYMENT_GATEWAY=selcom (au uifute kabisa - 'selcom' ndiyo default) —
// HAKUNA code inayohitaji kubadilishwa.
export const PAYMENT_GATEWAY = import.meta.env.VITE_PAYMENT_GATEWAY || 'selcom'
