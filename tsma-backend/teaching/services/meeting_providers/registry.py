"""
Registry ya Meeting Providers. Kuongeza provider mpya (mfano Microsoft
Teams) baadaye: andika class kwenye faili jipya hapa, kisha isajili hapa.
"""

from django.conf import settings

from .base import MeetingProviderBase  # noqa: F401
from .manual import ManualMeetingProvider
from .zoom import ZoomMeetingProvider

_REGISTRY = {
    "manual": ManualMeetingProvider,
    "zoom": ZoomMeetingProvider,
}


def get_meeting_provider():
    """
    Inasoma settings.TEACHING_MEETING_PROVIDER (default: 'manual') na
    kurudisha instance sahihi. Kubadili kutoka manual kwenda zoom ni
    mstari MMOJA wa settings — hakuna code inayohitaji kubadilika.
    """
    code = getattr(settings, "TEACHING_MEETING_PROVIDER", "manual")
    provider_class = _REGISTRY.get(code, ManualMeetingProvider)
    return provider_class()
