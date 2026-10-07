from django.db import transaction as db_transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsBoardAdmin, IsContentEditor

from .access import (
    session_has_content,
    session_join_state,
    user_can_access_session,
    user_can_take_quiz,
    user_enrolled,
)

from .models import (
    Certificate,
    Course,
    CourseEnrollment,
    Quiz,
    QuizAnswer,
    QuizAttempt,
    QuizChoice,
    QuizQuestion,
    Session,
    SessionAttendance,
    SessionType,
)
from .serializers import (
    AdminCourseSerializer,
    AdminQuizChoiceSerializer,
    AdminQuizQuestionSerializer,
    AdminQuizSerializer,
    AdminSessionSerializer,
    CertificateSerializer,
    CertificateVerifySerializer,
    CourseDetailSerializer,
    CourseListSerializer,
    MyEnrollmentSerializer,
    MyProgressSerializer,
    QuizAttemptResultSerializer,
    QuizSubmitSerializer,
    QuizTakeSerializer,
    SessionDetailSerializer,
    SessionListSerializer,
)


# ----------------------------------------------------------------------
# Public/Member — Courses & Sessions
# ----------------------------------------------------------------------

class CourseListView(generics.ListAPIView):
    """GET /api/teaching/courses/ - Orodha ya kozi (public info tu)."""

    serializer_class = CourseListSerializer
    permission_classes = [AllowAny]
    queryset = Course.objects.filter(is_published=True)


class CourseDetailView(generics.RetrieveAPIView):
    """GET /api/teaching/courses/<slug>/ - Kozi + vikao vyake + progress (kama umelogin)."""

    serializer_class = CourseDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"
    queryset = Course.objects.filter(is_published=True).prefetch_related("sessions")


class EnrollCourseView(APIView):
    """POST /api/teaching/courses/<slug>/enroll/ - Jiunge na kozi (akaunti yoyote iliyoingia)."""

    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        course = get_object_or_404(Course, slug=slug, is_published=True)
        enrollment, created = CourseEnrollment.objects.get_or_create(
            user=request.user, course=course
        )
        return Response(
            MyEnrollmentSerializer(enrollment).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class SessionListView(generics.ListAPIView):
    """
    GET /api/teaching/sessions/
    Vikao vyote vilivyochapishwa (support: ?course=<slug> kuchuja).
    """

    serializer_class = SessionListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Session.objects.filter(is_published=True)
        course_slug = self.request.query_params.get("course")
        if course_slug:
            queryset = queryset.filter(course__slug=course_slug)
        return queryset


class SessionDetailView(generics.RetrieveAPIView):
    """
    GET /api/teaching/sessions/<slug>/
    Taarifa za jumla (title, description, ratiba) zinaonekana kwa mtumiaji
    yeyote aliye-login. LAKINI `meeting_link`/`meeting_password`/
    `recording_url`/`recording_file` zinaonekana TU kama:
      - kikao ni HURU (hakina course) — wazi kwa mtumiaji yeyote aliye-login, AU
      - kikao kipo ndani ya course NA mtumiaji ame-enroll kwenye course hiyo.
    Hii inazuia mtu asiye-enroll kupata meeting credentials za course
    ambazo hakujiunga nazo.
    """

    serializer_class = SessionDetailSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "slug"
    queryset = Session.objects.filter(is_published=True)

    def get_serializer_context(self):
        return {"request": self.request}


def _user_can_access_session_media(user, session):
    """Imehifadhiwa kwa serializers: kikao huru = wazi kwa mwanachama; kozi = lazima ame-enroll."""
    return user_can_access_session(user, session)


class SessionJoinView(APIView):
    """
    POST /api/teaching/sessions/<slug>/join/

    Mshiriki anabofya "Jiunge" (live) au "Tazama" (rekodi/YouTube). Hapa ndipo
    mfumo UNAPOREKODI ushiriki (SessionAttendance completed) - ndiyo inayofungua
    quiz ya kikao. Link yenyewe inarudishwa HAPA TU (si kwenye detail), na kwa
    live inaruhusiwa dakika 15 kabla ya kuanza.

    KIKOMO: mfumo unaweza kuthibitisha kwamba mtu amebofya/ameanza kutazama, si
    kwamba amesikiliza hadi mwisho (Zoom/YouTube hazitumi taarifa hizo hapa).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        session = get_object_or_404(Session, slug=slug, is_published=True)

        if not user_can_access_session(request.user, session):
            return Response(
                {
                    "detail": "Jiunge na kozi ya kikao hiki kwanza.",
                    "code": "enrollment_required",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if not session_has_content(session):
            return Response(
                {"detail": "Link/rekodi ya kikao hiki bado haijawekwa.", "code": "no_content"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        available, opens_at = session_join_state(session)
        if not available:
            return Response(
                {
                    "detail": "Kikao bado hakijaanza. Unaweza kujiunga dakika 15 kabla ya muda wa kuanza.",
                    "code": "too_early",
                    "opens_at": opens_at,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        attendance, _created = SessionAttendance.objects.get_or_create(
            user=request.user, session=session, defaults={"joined_at": timezone.now()}
        )
        if not attendance.completed:
            attendance.mark_completed()

        if session.session_type == SessionType.LIVE:
            payload = {
                "url": session.meeting_link,
                "meeting_id": session.meeting_id,
                "meeting_password": session.meeting_password,
            }
        else:
            payload = {"url": session.recording_url or None}
        payload.update({"is_attended": True})
        return Response(payload)


# ----------------------------------------------------------------------
# Quiz — kuchukua na kuwasilisha
# ----------------------------------------------------------------------

def _user_can_take_quiz(user, quiz):
    """Angalia teaching/access.py::user_can_take_quiz (inatumiwa pia na serializers)."""
    return user_can_take_quiz(user, quiz)


class QuizTakeView(generics.RetrieveAPIView):
    """
    GET /api/teaching/quizzes/<id>/ - Pata maswali ya quiz (bila majibu sahihi).
    Inahitaji mtumiaji awe 'mshiriki' halisi (enrolled/attended) — angalia
    `_user_can_take_quiz`.
    """

    serializer_class = QuizTakeSerializer
    permission_classes = [IsAuthenticated]
    queryset = Quiz.objects.filter(is_published=True).prefetch_related("questions__choices")

    def get_object(self):
        quiz = super().get_object()
        if not _user_can_take_quiz(self.request.user, quiz):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied(
                "Quiz hii inafunguka baada ya kujiunga na kikao (live) au kubofya kutazama rekodi, "
                "na (kwa kozi) kuwa umejiunga na kozi."
            )
        return quiz


class QuizSubmitView(APIView):
    """
    POST /api/teaching/quizzes/<id>/submit/
    Wasilisha majibu yote mara moja — mfumo unahesabu alama kiotomatiki
    na (kama umefaulu) unatoa cheti papo hapo.

    USALAMA: (1) mtumiaji lazima awe mshiriki halisi wa quiz (enrollment/
    attendance check); (2) majibu yaliyowasilishwa YAPASWA kufunika
    maswali YOTE ya quiz kwa usahihi (hakuna kukosa, hakuna kurudia,
    hakuna swali la quiz nyingine) — vinginevyo ombi linakataliwa kabla
    hata ya kuhesabu alama.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        quiz = get_object_or_404(Quiz, pk=pk, is_published=True)

        if not _user_can_take_quiz(request.user, quiz):
            return Response(
                {"detail": "Quiz hii inafunguka baada ya kujiunga na kikao au kutazama rekodi."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if quiz.max_attempts:
            attempts_used = QuizAttempt.objects.filter(quiz=quiz, user=request.user).count()
            if attempts_used >= quiz.max_attempts:
                return Response(
                    {"detail": "Umefikia ukomo wa majaribio kwa quiz hii."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer = QuizSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        submitted_answers = serializer.validated_data["answers"]

        # --- Uthibitisho madhubuti wa majibu KABLA ya kuunda attempt ---
        expected_question_ids = set(quiz.questions.values_list("id", flat=True))
        submitted_ids = [item["question_id"] for item in submitted_answers]

        if len(submitted_ids) != len(set(submitted_ids)):
            return Response(
                {"detail": "Majibu yana swali lililorudiwa (duplicate)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        submitted_set = set(submitted_ids)
        if submitted_set != expected_question_ids:
            missing = expected_question_ids - submitted_set
            foreign = submitted_set - expected_question_ids
            return Response(
                {
                    "detail": "Lazima ujibu maswali YOTE ya quiz hii, bila kuongeza swali la nje.",
                    "missing_question_ids": list(missing),
                    "invalid_question_ids": list(foreign),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        with db_transaction.atomic():
            attempt = QuizAttempt.objects.create(quiz=quiz, user=request.user)

            for item in submitted_answers:
                question = get_object_or_404(
                    QuizQuestion, pk=item["question_id"], quiz=quiz
                )
                choice = None
                if item.get("choice_id"):
                    choice = QuizChoice.objects.filter(
                        pk=item["choice_id"], question=question
                    ).first()

                answer = QuizAnswer.objects.create(
                    attempt=attempt,
                    question=question,
                    selected_choice=choice,
                    text_answer=item.get("text_answer", ""),
                )
                answer.evaluate()

            attempt.grade()

        return Response(
            QuizAttemptResultSerializer(attempt, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


# ----------------------------------------------------------------------
# Progress Dashboard & Certificates
# ----------------------------------------------------------------------

class MyProgressView(APIView):
    """GET /api/teaching/my-progress/ - Dashboard kamili ya maendeleo ya mshiriki."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        enrollments = CourseEnrollment.objects.filter(user=request.user).select_related("course")
        certificates = Certificate.objects.filter(user=request.user)
        quiz_attempts = QuizAttempt.objects.filter(user=request.user).select_related("quiz")

        data = {
            "enrollments": enrollments,
            "certificates": certificates,
            "quiz_attempts": quiz_attempts,
        }
        # context ya request: URL ya picha ya cheti iwe KAMILI (https://...), siyo '/media/..'
        # (URL fupi ingeelekea domain ya frontend na kutoa 404).
        return Response(MyProgressSerializer(data, context={"request": request}).data)


class CertificateVerifyView(generics.RetrieveAPIView):
    """
    GET /api/teaching/certificates/verify/<verification_code>/
    Public — inatumika pale QR ya cheti inaposcanwa.
    """

    serializer_class = CertificateVerifySerializer
    permission_classes = [AllowAny]
    lookup_field = "verification_code"
    queryset = Certificate.objects.all()


# ----------------------------------------------------------------------
# Admin
# ----------------------------------------------------------------------

class AdminCourseListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminCourseSerializer
    permission_classes = [IsContentEditor]
    queryset = Course.objects.all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AdminCourseDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminCourseSerializer
    permission_classes = [IsContentEditor]
    queryset = Course.objects.all()


class AdminSessionListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminSessionSerializer
    permission_classes = [IsContentEditor]
    queryset = Session.objects.all()

    def perform_create(self, serializer):
        session = serializer.save(created_by=self.request.user)
        if session.session_type == SessionType.LIVE and not session.meeting_link:
            try:
                session.provision_meeting()
            except Exception:
                pass  # Manual provider haitupi error; Zoom provider inaweza kushindwa kimya


class AdminSessionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminSessionSerializer
    permission_classes = [IsContentEditor]
    queryset = Session.objects.all()


class AdminQuizListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminQuizSerializer
    permission_classes = [IsContentEditor]
    queryset = Quiz.objects.all()


class AdminQuizDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminQuizSerializer
    permission_classes = [IsContentEditor]
    queryset = Quiz.objects.all()


class AdminQuizQuestionListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminQuizQuestionSerializer
    permission_classes = [IsContentEditor]
    queryset = QuizQuestion.objects.all()


class AdminQuizQuestionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminQuizQuestionSerializer
    permission_classes = [IsContentEditor]
    queryset = QuizQuestion.objects.all()


class AdminQuizChoiceListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminQuizChoiceSerializer
    permission_classes = [IsContentEditor]
    queryset = QuizChoice.objects.all()


class AdminQuizChoiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminQuizChoiceSerializer
    permission_classes = [IsContentEditor]
    queryset = QuizChoice.objects.all()
