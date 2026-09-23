from django.http import JsonResponse

from .services import get_client_ip, is_ip_blocked


class BlockedIPMiddleware:
    """
    Weka hii MAPEMA kabisa kwenye MIDDLEWARE (baada ya SecurityMiddleware)
    ili maombi kutoka IP zilizozuiwa (auto-block au Admin kwa mkono)
    yakatiliwe KABLA ya kufika kwenye views/database queries nzito —
    hii ndiyo sehemu ya 'self-healing/kuzuia kiotomatiki' ikitumika
    kwa ombi lolote linalofuata.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        ip = get_client_ip(request)
        if is_ip_blocked(ip):
            return JsonResponse(
                {"detail": "Ufikiaji umezuiwa kwa sababu za kiusalama. Wasiliana na TSMA kama hii ni makosa."},
                status=403,
            )
        return self.get_response(request)
