from .base import MeetingProviderBase


class ManualMeetingProvider(MeetingProviderBase):
    """
    Provider ya DEFAULT — Admin anabandika link ya Zoom/Google Meet
    mwenyewe kwenye fields za `Session` (meeting_link, meeting_password)
    moja kwa moja kwenye Django Admin. Hakuna kazi ya ziada inayohitajika
    hapa — provider hii ipo tu ili muundo (interface) ubaki sawa na Zoom
    API endapo TSMA itaamua kuwasha Zoom API baadaye.
    """

    provider_code = "manual"

    def create_meeting(self, session, **kwargs):
        return {
            "meeting_link": session.meeting_link,
            "meeting_id": session.meeting_id or None,
            "meeting_password": session.meeting_password or "",
            "raw_response": None,
        }
