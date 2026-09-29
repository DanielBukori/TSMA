from django.core.cache import cache
from django.http import JsonResponse

from .services import get_client_ip, is_ip_blocked

# Matokeo ya is_ip_blocked yanahifadhiwa kwa sekunde hizi ili kuepuka
# query ya database kwenye kila ombi.
BLOCK_CACHE_SECONDS = 60
BLOCK_CACHE_KEY = "blocked_ip:{ip}"


class BlockedIPMiddleware:
    """
    Kataa maombi kutoka IP zilizozuiwa (auto-block au Admin kwa mkono)
    KABLA ya kufika kwenye views.

    Matokeo yanahifadhiwa kwenye cache kwa BLOCK_CACHE_SECONDS. Ili
    kuzuia/kufungulia IP mara moja, futa key yake mahali unapoibadilisha
    (kwenye security/services.py):

        from django.core.cache import cache
        cache.delete(f"blocked_ip:{ip}")
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        ip = get_client_ip(request)
        key = BLOCK_CACHE_KEY.format(ip=ip)

        blocked = cache.get(key)
        if blocked is None:
            blocked = bool(is_ip_blocked(ip))
            cache.set(key, blocked, BLOCK_CACHE_SECONDS)

        if blocked:
            return JsonResponse(
                {"detail": "Ufikiaji umezuiwa kwa sababu za kiusalama. Wasiliana na TSMA kama hii ni makosa."},
                status=403,
            )
        return self.get_response(request)
