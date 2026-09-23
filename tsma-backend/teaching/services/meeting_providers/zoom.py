"""
Zoom Meeting Provider — Server-to-Server OAuth (bure kwa Zoom account ya
kawaida, haihitaji user kuidhinisha kila wakati kama OAuth ya kawaida).

MUHIMU: Hii ni HIARI na IMEZIMWA kwa default (TEACHING_MEETING_PROVIDER
kwenye settings.py imewekwa "manual"). Kuwasha:

1. Nenda https://marketplace.zoom.us/ → Build App → "Server-to-Server OAuth".
2. Pata Account ID, Client ID, Client Secret.
3. Weka ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET kwenye settings.
4. Badilisha TEACHING_MEETING_PROVIDER = "zoom".

Endpoints hapa chini vinafuata muundo wa jumla wa Zoom API v2 (OAuth token
+ POST /users/me/meetings). Kama Zoom watabadilisha maelezo madogo,
thibitisha dhidi ya https://developers.zoom.us/docs/api/ ya sasa kabla ya
kutumia live — sina uwezo wa kutembelea mtandao kuthibitisha real-time.
"""

import base64
import time

import requests
from django.conf import settings

from .base import MeetingProviderBase, MeetingProviderError

_ZOOM_OAUTH_URL = "https://zoom.us/oauth/token"
_ZOOM_API_BASE = "https://api.zoom.us/v2"

_token_cache = {"access_token": None, "expires_at": 0}


class ZoomMeetingProvider(MeetingProviderBase):
    provider_code = "zoom"

    def __init__(self):
        self.account_id = getattr(settings, "ZOOM_ACCOUNT_ID", "")
        self.client_id = getattr(settings, "ZOOM_CLIENT_ID", "")
        self.client_secret = getattr(settings, "ZOOM_CLIENT_SECRET", "")

    def _get_access_token(self):
        if _token_cache["access_token"] and _token_cache["expires_at"] > time.time() + 30:
            return _token_cache["access_token"]

        credentials = base64.b64encode(
            f"{self.client_id}:{self.client_secret}".encode("utf-8")
        ).decode("utf-8")

        try:
            response = requests.post(
                _ZOOM_OAUTH_URL,
                params={
                    "grant_type": "account_credentials",
                    "account_id": self.account_id,
                },
                headers={"Authorization": f"Basic {credentials}"},
                timeout=20,
            )
            data = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise MeetingProviderError(f"Zoom OAuth token imeshindwa: {exc}")

        if "access_token" not in data:
            raise MeetingProviderError(f"Zoom OAuth imekataa: {data}")

        _token_cache["access_token"] = data["access_token"]
        _token_cache["expires_at"] = time.time() + data.get("expires_in", 3600)
        return data["access_token"]

    def create_meeting(self, session, **kwargs):
        token = self._get_access_token()

        start_time = None
        if session.scheduled_start:
            start_time = session.scheduled_start.strftime("%Y-%m-%dT%H:%M:%S")

        duration_minutes = 60
        if session.scheduled_start and session.scheduled_end:
            delta = session.scheduled_end - session.scheduled_start
            duration_minutes = max(int(delta.total_seconds() // 60), 15)

        payload = {
            "topic": session.title,
            "type": 2,  # Scheduled meeting
            "start_time": start_time,
            "duration": duration_minutes,
            "timezone": "Africa/Dar_es_Salaam",
            "settings": {
                "join_before_host": False,
                "waiting_room": True,
                "auto_recording": "cloud",
            },
        }

        try:
            response = requests.post(
                f"{_ZOOM_API_BASE}/users/me/meetings",
                json=payload,
                headers={"Authorization": f"Bearer {token}"},
                timeout=20,
            )
            data = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise MeetingProviderError(f"Zoom create-meeting imeshindwa: {exc}")

        if "id" not in data:
            raise MeetingProviderError(f"Zoom imekataa ombi la meeting: {data}")

        return {
            "meeting_link": data.get("join_url"),
            "meeting_id": str(data.get("id")),
            "meeting_password": data.get("password", ""),
            "raw_response": data,
        }
