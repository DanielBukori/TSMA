"""
MeetingProviderBase — "Adapter Pattern" kwa jinsi meeting/link ya live
session inavyotengenezwa, sawa na muundo tuliotumia kwa Payment Gateways.

- ManualMeetingProvider (DEFAULT): Admin anabandika Zoom/Meet link mwenyewe
  kwenye Django Admin — hakuna API, hakuna credentials zinazohitajika,
  inafanya kazi papo hapo.

- ZoomMeetingProvider (HIARI): Ikiwasha kwenye settings.py
  (TEACHING_MEETING_PROVIDER="zoom") na kuweka ZOOM_ACCOUNT_ID/CLIENT_ID/
  CLIENT_SECRET, mfumo utatengeneza Zoom meeting kiotomatiki (Server-to-
  Server OAuth — ni bure kwa Zoom account ya kawaida). Kuthibitisha
  endpoints/response fields dhidi ya Zoom API docs za sasa kabla ya live.
"""

from abc import ABC, abstractmethod


class MeetingProviderError(Exception):
    pass


class MeetingProviderBase(ABC):
    provider_code = None

    @abstractmethod
    def create_meeting(self, session, **kwargs):
        """
        Tengeneza/andaa meeting kwa `session` (Session instance).
        Lazima irudishe dict:
        {
            "meeting_link": "...",
            "meeting_id": "..." (au None),
            "meeting_password": "..." (au ""),
            "raw_response": {...} (au None),
        }
        """
        raise NotImplementedError
