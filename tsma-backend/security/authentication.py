from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .auth_tokens import verify_full_session


class SecurityAdminAuthentication(BaseAuthentication):
    """
    Authentication class TOFAUTI kabisa na JWTAuthentication ya accounts —
    inasoma 'Authorization: Operator <token>' (jina la scheme limebadilishwa
    kimakusudi kutoka 'Bearer' ili kuepuka mkanganyiko/matumizi mabaya ya
    token kati ya mifumo miwili).
    """

    keyword = "Operator"

    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth_header.startswith(f"{self.keyword} "):
            return None

        raw_token = auth_header[len(self.keyword) + 1:].strip()
        operator = verify_full_session(raw_token)
        if not operator:
            raise AuthenticationFailed("Session ya security dashboard si sahihi au imeisha muda.")

        return (operator, raw_token)
