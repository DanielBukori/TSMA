from rest_framework import serializers

from .models import (
    Certificate,
    Course,
    CourseEnrollment,
    QuestionType,
    Quiz,
    QuizAnswer,
    QuizAttempt,
    QuizChoice,
    QuizQuestion,
    Session,
    SessionAttendance,
    SessionType,
)


# ----------------------------------------------------------------------
# Public/Member — Courses & Sessions
# ----------------------------------------------------------------------

class SessionListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = (
            "id",
            "title",
            "slug",
            "session_type",
            "instructor_name",
            "scheduled_start",
            "scheduled_end",
            "course",
        )


class SessionDetailSerializer(serializers.ModelSerializer):
    """
    Taarifa kamili za kikao. `meeting_link`/`meeting_id`/`meeting_password`/
    `recording_url`/`recording_file` zinaonekana TU kama mtumiaji ana ruhusa
    (angalia `get_is_enrolled_or_open` na `_user_can_access_session_media`
    ndani ya views.py) — siyo kwa mtumiaji yeyote aliye-login tu.
    """

    is_attended = serializers.SerializerMethodField()
    can_access_media = serializers.SerializerMethodField()
    quizzes = serializers.SerializerMethodField()
    has_content = serializers.SerializerMethodField()
    join_available = serializers.SerializerMethodField()
    join_opens_at = serializers.SerializerMethodField()
    meeting_link = serializers.SerializerMethodField()
    meeting_id = serializers.SerializerMethodField()
    meeting_password = serializers.SerializerMethodField()
    recording_url = serializers.SerializerMethodField()
    recording_file = serializers.SerializerMethodField()

    class Meta:
        model = Session
        fields = (
            "id",
            "course",
            "title",
            "slug",
            "description",
            "session_type",
            "instructor_name",
            "scheduled_start",
            "scheduled_end",
            "meeting_link",
            "meeting_id",
            "meeting_password",
            "recording_url",
            "recording_file",
            "is_attended",
            "can_access_media",
            "quizzes",
            "has_content",
            "join_available",
            "join_opens_at",
        )

    def get_can_access_media(self, obj):
        return self._can_access_media(obj)

    def get_quizzes(self, obj):
        return QuizBriefSerializer(
            obj.quizzes.filter(is_published=True), many=True, context=self.context
        ).data

    def _can_access_media(self, obj):
        user = self.context["request"].user
        if not user.is_authenticated:
            return False
        from .views import _user_can_access_session_media

        return _user_can_access_session_media(user, obj)

    # Link za live/YouTube HAZITOLEWI kwenye detail: zinarudishwa na POST
    # /sessions/<slug>/join/ ambayo ndiyo inayorekodi ushiriki (na kuzuia kujiunga
    # mapema mno). Hizi tunazibakisha kwa umbo la API tu (zinarudi null).
    def get_meeting_link(self, obj):
        return None

    def get_meeting_id(self, obj):
        return None

    def get_meeting_password(self, obj):
        return None

    def get_recording_url(self, obj):
        return None

    def get_has_content(self, obj):
        from .access import session_has_content

        return session_has_content(obj)

    def get_join_available(self, obj):
        from .access import session_join_state

        return bool(self._can_access_media(obj) and session_join_state(obj)[0])

    def get_join_opens_at(self, obj):
        from .access import session_join_state

        return session_join_state(obj)[1]

    def get_recording_file(self, obj):
        if not self._can_access_media(obj) or not obj.recording_file:
            return None
        request = self.context.get("request")
        url = obj.recording_file.url
        return request.build_absolute_uri(url) if request else url

    def get_is_attended(self, obj):
        user = self.context["request"].user
        if not user.is_authenticated:
            return False
        return SessionAttendance.objects.filter(
            user=user, session=obj, completed=True
        ).exists()


class CourseListSerializer(serializers.ModelSerializer):
    session_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Course
        fields = ("id", "title", "slug", "description", "cover_image", "session_count")


class QuizBriefSerializer(serializers.ModelSerializer):
    """Muhtasari wa quiz (bila maswali) - kuonyesha kiungo cha 'Fanya Quiz'."""

    total_questions = serializers.IntegerField(read_only=True)
    is_unlocked = serializers.SerializerMethodField()
    passed = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = (
            "id",
            "title",
            "passing_score_percent",
            "time_limit_minutes",
            "total_questions",
            "is_unlocked",
            "passed",
        )

    def _user(self):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        return user if user and user.is_authenticated else None

    def get_is_unlocked(self, obj):
        user = self._user()
        if not user:
            return False
        from .access import user_can_take_quiz

        return user_can_take_quiz(user, obj)

    def get_passed(self, obj):
        user = self._user()
        return bool(user and obj.attempts.filter(user=user, passed=True).exists())


class CourseDetailSerializer(serializers.ModelSerializer):
    sessions = SessionListSerializer(many=True, read_only=True)
    quizzes = serializers.SerializerMethodField()
    is_enrolled = serializers.SerializerMethodField()
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = (
            "id",
            "title",
            "slug",
            "description",
            "cover_image",
            "sessions",
            "quizzes",
            "is_enrolled",
            "progress_percent",
        )

    def get_quizzes(self, obj):
        quizzes = obj.quizzes.filter(is_published=True)
        return QuizBriefSerializer(quizzes, many=True, context=self.context).data

    def get_is_enrolled(self, obj):
        user = self.context["request"].user
        if not user.is_authenticated:
            return False
        return CourseEnrollment.objects.filter(user=user, course=obj).exists()

    def get_progress_percent(self, obj):
        user = self.context["request"].user
        if not user.is_authenticated:
            return None
        enrollment = CourseEnrollment.objects.filter(user=user, course=obj).first()
        return enrollment.progress_percent if enrollment else None


# ----------------------------------------------------------------------
# Quiz — kuchukua (take) na kuwasilisha (submit)
# ----------------------------------------------------------------------

class QuizChoiceTakeSerializer(serializers.ModelSerializer):
    """Kwa mtumiaji anayefanya quiz — HAIONYESHI is_correct (kuepuka kudanganya)."""

    class Meta:
        model = QuizChoice
        fields = ("id", "choice_text")


class QuizQuestionTakeSerializer(serializers.ModelSerializer):
    choices = QuizChoiceTakeSerializer(many=True, read_only=True)

    class Meta:
        model = QuizQuestion
        fields = ("id", "question_text", "question_type", "points", "choices")


class QuizTakeSerializer(serializers.ModelSerializer):
    """GET - mtumiaji anaomba maswali ya quiz kuanza kujibu."""

    questions = QuizQuestionTakeSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = (
            "id",
            "title",
            "instructions",
            "passing_score_percent",
            "time_limit_minutes",
            "max_attempts",
            "questions",
        )


class QuizAnswerSubmitSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    choice_id = serializers.IntegerField(required=False, allow_null=True)
    text_answer = serializers.CharField(required=False, allow_blank=True, default="")


class QuizSubmitSerializer(serializers.Serializer):
    """POST - mtumiaji anawasilisha majibu yote ya quiz mara moja."""

    answers = QuizAnswerSubmitSerializer(many=True)


class QuizAnswerResultSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source="question.question_text", read_only=True)

    class Meta:
        model = QuizAnswer
        fields = ("question_text", "text_answer", "selected_choice", "is_correct")


class QuizAttemptResultSerializer(serializers.ModelSerializer):
    answers = QuizAnswerResultSerializer(many=True, read_only=True)
    quiz_title = serializers.CharField(source="quiz.title", read_only=True)
    certificate = serializers.SerializerMethodField()

    class Meta:
        model = QuizAttempt
        fields = (
            "id",
            "quiz_title",
            "score_percent",
            "passed",
            "started_at",
            "submitted_at",
            "answers",
            "certificate",
        )
        read_only_fields = fields

    def get_certificate(self, obj):
        certificate = getattr(obj, "certificate", None)
        if certificate is None:
            return None
        request = self.context.get("request")
        image_url = None
        if certificate.certificate_image:
            image_url = certificate.certificate_image.url
            if request:
                image_url = request.build_absolute_uri(image_url)
        return {
            "certificate_number": certificate.certificate_number,
            "verification_code": str(certificate.verification_code),
            "certificate_image": image_url,
        }


# ----------------------------------------------------------------------
# Progress Dashboard & Certificates
# ----------------------------------------------------------------------

class MyEnrollmentSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)
    progress_percent = serializers.IntegerField(read_only=True)

    class Meta:
        model = CourseEnrollment
        fields = ("id", "course", "course_title", "enrolled_at", "completed_at", "progress_percent")


class CertificateSerializer(serializers.ModelSerializer):
    title_earned = serializers.CharField(read_only=True)

    class Meta:
        model = Certificate
        fields = (
            "id",
            "certificate_number",
            "verification_code",
            "certificate_image",
            "title_earned",
            "issued_at",
        )
        read_only_fields = fields


class MyProgressSerializer(serializers.Serializer):
    """GET /api/teaching/my-progress/ - Dashboard kamili ya mshiriki."""

    enrollments = MyEnrollmentSerializer(many=True)
    certificates = CertificateSerializer(many=True)
    quiz_attempts = QuizAttemptResultSerializer(many=True)


class CertificateVerifySerializer(serializers.ModelSerializer):
    """Public: kuhakiki cheti kwa verification_code."""

    full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    title_earned = serializers.CharField(read_only=True)

    class Meta:
        model = Certificate
        fields = ("certificate_number", "full_name", "title_earned", "issued_at")


# ----------------------------------------------------------------------
# Admin — Course/Session/Quiz management
# ----------------------------------------------------------------------

class AdminCourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = (
            "id",
            "title",
            "slug",
            "description",
            "cover_image",
            "is_published",
            "display_order",
        )
        read_only_fields = ("id", "slug")


class AdminSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = (
            "id",
            "course",
            "title",
            "slug",
            "description",
            "session_type",
            "instructor_name",
            "scheduled_start",
            "scheduled_end",
            "meeting_provider_used",
            "meeting_link",
            "meeting_id",
            "meeting_password",
            "recording_url",
            "recording_file",
            "is_published",
            "display_order",
        )
        read_only_fields = ("id", "slug", "meeting_provider_used")


class AdminQuizChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizChoice
        fields = ("id", "question", "choice_text", "is_correct", "display_order")
        read_only_fields = ("id",)


class AdminQuizQuestionSerializer(serializers.ModelSerializer):
    choices = AdminQuizChoiceSerializer(many=True, read_only=True)

    class Meta:
        model = QuizQuestion
        fields = (
            "id",
            "quiz",
            "question_text",
            "question_type",
            "correct_short_answer",
            "points",
            "display_order",
            "choices",
        )
        read_only_fields = ("id",)


class AdminQuizSerializer(serializers.ModelSerializer):
    questions = AdminQuizQuestionSerializer(many=True, read_only=True)
    total_questions = serializers.IntegerField(read_only=True)

    class Meta:
        model = Quiz
        fields = (
            "id",
            "course",
            "session",
            "title",
            "instructions",
            "passing_score_percent",
            "time_limit_minutes",
            "max_attempts",
            "is_published",
            "total_questions",
            "questions",
        )
        read_only_fields = ("id", "total_questions")

    def validate(self, attrs):
        course = attrs.get("course", getattr(self.instance, "course", None))
        session = attrs.get("session", getattr(self.instance, "session", None))
        if not course and not session:
            raise serializers.ValidationError(
                "Quiz lazima iunganishwe na course au session (angalau moja)."
            )
        return attrs
