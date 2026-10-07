"""
Mantiki ya ufikiaji wa Teaching Excellence (inatumiwa na views na serializers).

Mtiririko: mshiriki ANAJIUNGA na kikao cha live AU ANABOFYA kutazama rekodi
(YouTube/faili) -> mfumo unarekodi `SessionAttendance` (completed) -> quiz ya
kikao inafunguka -> akifaulu anapata cheti. Hakuna kitufe cha "najimarkia
nimekamilisha".
"""

from datetime import timedelta

from django.utils import timezone

from .models import CourseEnrollment, SessionAttendance, SessionType

# Kikao cha live kinaruhusu kujiunga dakika hizi kabla ya muda wa kuanza
JOIN_EARLY_MINUTES = 15


def user_enrolled(user, course_id):
    return CourseEnrollment.objects.filter(user=user, course_id=course_id).exists()


def user_can_access_session(user, session):
    """Kikao huru = wazi kwa mwanachama; kikao cha kozi = lazima ame-enroll."""
    if not session.course_id:
        return True
    return user_enrolled(user, session.course_id)


def session_has_content(session):
    if session.session_type == SessionType.LIVE:
        return bool(session.meeting_link)
    return bool(session.recording_url or session.recording_file)


def session_join_state(session):
    """Inarudisha (join_available, join_opens_at). Muda unahusu LIVE tu."""
    if not session_has_content(session):
        return False, None
    if session.session_type == SessionType.LIVE and session.scheduled_start:
        opens_at = session.scheduled_start - timedelta(minutes=JOIN_EARLY_MINUTES)
        if timezone.now() < opens_at:
            return False, opens_at
    return True, None


def user_completed_session(user, session):
    return SessionAttendance.objects.filter(user=user, session=session, completed=True).exists()


def user_can_take_quiz(user, quiz):
    """
    - Quiz ya kikao: (ikiwa kikao kipo kwenye kozi, lazima ame-enroll) NA lazima
      awe amejiunga/ametazama kikao hicho (attendance completed).
    - Quiz ya kozi nzima: lazima ame-enroll NA amemaliza vikao VYOTE vya kozi.
    """
    if quiz.session_id:
        session = quiz.session
        if session.course_id and not user_enrolled(user, session.course_id):
            return False
        return user_completed_session(user, session)

    if quiz.course_id:
        enrollment = CourseEnrollment.objects.filter(user=user, course_id=quiz.course_id).first()
        if not enrollment:
            return False
        has_sessions = quiz.course.sessions.filter(is_published=True).exists()
        return enrollment.progress_percent >= 100 if has_sessions else True

    return False  # quiz isiyo na course wala session - fail-closed
