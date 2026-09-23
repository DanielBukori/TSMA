import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _

from common.validators import validate_image_max_8mb, validate_video_max_500mb


# ----------------------------------------------------------------------
# Course (hiari) na Session (huru au ndani ya kozi)
# ----------------------------------------------------------------------

class Course(models.Model):
    """
    Kozi (curriculum) — HIARI. Admin anaweza kuweka vikao ndani ya kozi
    (mfano: 'Sports Marketing 101' ikiwa na masomo 6), au kuacha vikao
    viwe huru kabisa bila kozi.
    """

    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    description = models.TextField(blank=True)
    cover_image = models.ImageField(
        upload_to="teaching/courses/", blank=True, null=True,
        validators=validate_image_max_8mb,
    )

    is_published = models.BooleanField(default=False)
    display_order = models.PositiveIntegerField(default=0)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="courses_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Kozi")
        verbose_name_plural = _("Kozi")
        ordering = ["display_order", "-created_at"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._unique_slug()
        super().save(*args, **kwargs)

    def _unique_slug(self):
        base_slug = slugify(self.title)
        slug = base_slug
        counter = 1
        while Course.objects.filter(slug=slug).exclude(pk=self.pk).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        return slug

    @property
    def session_count(self):
        return self.sessions.filter(is_published=True).count()


class SessionType(models.TextChoices):
    LIVE = "live", _("Live (Zoom/Meet)")
    RECORDED = "recorded", _("Iliyorekodiwa")


class Session(models.Model):
    """
    Kikao — kinaweza kuwa ndani ya `course` (nullable) au huru kabisa.
    Kinaweza kuwa LIVE (na meeting link) au RECORDED (video iliyopakiwa
    tayari/iliyorekodiwa baada ya live session kuisha).
    """

    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="sessions", null=True, blank=True
    )

    title = models.CharField(max_length=300)
    slug = models.SlugField(max_length=330, unique=True, blank=True)
    description = models.TextField(blank=True)

    session_type = models.CharField(
        max_length=10, choices=SessionType.choices, default=SessionType.LIVE
    )

    instructor_name = models.CharField(max_length=200, blank=True)

    scheduled_start = models.DateTimeField(null=True, blank=True)
    scheduled_end = models.DateTimeField(null=True, blank=True)

    # -- LIVE session fields (Zoom/Meet) --
    meeting_provider_used = models.CharField(max_length=20, blank=True)
    meeting_link = models.URLField(blank=True)
    meeting_id = models.CharField(max_length=100, blank=True)
    meeting_password = models.CharField(max_length=50, blank=True)

    # -- RECORDED session fields --
    recording_url = models.URLField(
        blank=True, help_text=_("Kiungo cha video iliyorekodiwa (YouTube/Vimeo/faili).")
    )
    recording_file = models.FileField(
        upload_to="teaching/recordings/", blank=True, null=True,
        validators=validate_video_max_500mb,
    )

    is_published = models.BooleanField(default=False)
    display_order = models.PositiveIntegerField(default=0)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="sessions_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Kikao cha Mafunzo")
        verbose_name_plural = _("Vikao vya Mafunzo")
        ordering = ["display_order", "scheduled_start", "-created_at"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            counter = 1
            while Session.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def provision_meeting(self):
        """
        Inaita meeting provider iliyowashwa (manual au zoom) kutengeneza/
        kudhibitisha meeting link. Kwa 'manual', ni pass-through tu ya
        thamani zilizowekwa na admin.
        """
        if self.session_type != SessionType.LIVE:
            return
        from .services.meeting_providers.registry import get_meeting_provider

        provider = get_meeting_provider()
        result = provider.create_meeting(self)
        self.meeting_provider_used = provider.provider_code
        self.meeting_link = result.get("meeting_link") or self.meeting_link
        self.meeting_id = result.get("meeting_id") or self.meeting_id
        self.meeting_password = result.get("meeting_password") or self.meeting_password
        self.save(
            update_fields=[
                "meeting_provider_used",
                "meeting_link",
                "meeting_id",
                "meeting_password",
            ]
        )


# ----------------------------------------------------------------------
# Enrollment / Progress Tracking
# ----------------------------------------------------------------------

class CourseEnrollment(models.Model):
    """Mtumiaji anajiunga na kozi — kwa ajili ya progress tracking."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="course_enrollments"
    )
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="enrollments")

    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("user", "course")
        verbose_name = _("Usajili wa Kozi")
        verbose_name_plural = _("Usajili wa Kozi")

    def __str__(self):
        return f"{self.user.email} - {self.course.title}"

    @property
    def progress_percent(self):
        total = self.course.sessions.filter(is_published=True).count()
        if total == 0:
            return 0
        watched = SessionAttendance.objects.filter(
            user=self.user, session__course=self.course, completed=True
        ).count()
        return round((watched / total) * 100)


class SessionAttendance(models.Model):
    """
    Ushiriki wa mtumiaji kwenye kikao — kwa LIVE inaonyesha alihudhuria,
    kwa RECORDED inaonyesha ameshaitazama/ameimaliza.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="session_attendances"
    )
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name="attendances")

    joined_at = models.DateTimeField(null=True, blank=True)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("user", "session")
        verbose_name = _("Ushiriki wa Kikao")
        verbose_name_plural = _("Ushiriki wa Vikao")

    def __str__(self):
        return f"{self.user.email} - {self.session.title}"

    def mark_completed(self):
        self.completed = True
        self.completed_at = timezone.now()
        self.save(update_fields=["completed", "completed_at"])

        # Sasisha CourseEnrollment.completed_at kama vikao vyote vimemalizika
        if self.session.course_id:
            enrollment = CourseEnrollment.objects.filter(
                user=self.user, course=self.session.course
            ).first()
            if enrollment and enrollment.progress_percent >= 100 and not enrollment.completed_at:
                enrollment.completed_at = timezone.now()
                enrollment.save(update_fields=["completed_at"])


# ----------------------------------------------------------------------
# Quiz (Multiple Choice, True/False, Short Answer)
# ----------------------------------------------------------------------

class Quiz(models.Model):
    """
    Quiz inaweza kuunganishwa na `session` MOJA au kuwa quiz ya mwisho ya
    `course` nzima (angalau moja ya hizo mbili lazima iwepo).
    """

    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="quizzes", null=True, blank=True
    )
    session = models.ForeignKey(
        Session, on_delete=models.CASCADE, related_name="quizzes", null=True, blank=True
    )

    title = models.CharField(max_length=255)
    instructions = models.TextField(blank=True)

    passing_score_percent = models.PositiveIntegerField(default=70)
    time_limit_minutes = models.PositiveIntegerField(null=True, blank=True)
    max_attempts = models.PositiveIntegerField(
        default=0, help_text=_("0 = hakuna ukomo wa majaribio.")
    )

    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Quiz")
        verbose_name_plural = _("Quizzes")

    def __str__(self):
        return self.title

    @property
    def total_questions(self):
        return self.questions.count()


class QuestionType(models.TextChoices):
    MULTIPLE_CHOICE = "multiple_choice", _("Multiple Choice")
    TRUE_FALSE = "true_false", _("Kweli/Sio Kweli (True/False)")
    SHORT_ANSWER = "short_answer", _("Neno Moja (Short Answer)")


class QuizQuestion(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="questions")
    question_text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QuestionType.choices)

    # Inatumika TU kwa question_type=SHORT_ANSWER — jibu sahihi (case-insensitive)
    correct_short_answer = models.CharField(max_length=255, blank=True)

    points = models.PositiveIntegerField(default=1)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["display_order", "id"]
        verbose_name = _("Swali la Quiz")
        verbose_name_plural = _("Maswali ya Quiz")

    def __str__(self):
        return self.question_text[:60]

    def check_short_answer(self, submitted_text):
        if not submitted_text:
            return False
        return submitted_text.strip().lower() == self.correct_short_answer.strip().lower()


class QuizChoice(models.Model):
    """Chaguo la jibu — kwa MULTIPLE_CHOICE na TRUE_FALSE."""

    question = models.ForeignKey(
        QuizQuestion, on_delete=models.CASCADE, related_name="choices"
    )
    choice_text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["display_order", "id"]
        verbose_name = _("Chaguo la Swali")
        verbose_name_plural = _("Chaguo za Maswali")

    def __str__(self):
        return f"{self.choice_text} ({'Sahihi' if self.is_correct else 'Sio Sahihi'})"


class QuizAttempt(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="attempts")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="quiz_attempts"
    )

    score_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    passed = models.BooleanField(default=False)

    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-started_at"]
        verbose_name = _("Jaribio la Quiz")
        verbose_name_plural = _("Majaribio ya Quiz")

    def __str__(self):
        return f"{self.user.email} - {self.quiz.title} ({self.score_percent}%)"

    def grade(self):
        """
        Hesabu alama kiotomatiki. USALAMA: `total_points` LAZIMA itoke
        kwenye maswali YOTE ya quiz (siyo yale yaliyojibiwa tu) — vinginevyo
        mtu anayejibu swali 1 kati ya 20 kwa usahihi angepata 100%.
        """
        all_questions = list(self.quiz.questions.all())
        total_points = sum(q.points for q in all_questions) or 1

        answers = {a.question_id: a for a in self.answers.select_related("question").all()}
        earned_points = sum(
            q.points for q in all_questions
            if q.id in answers and answers[q.id].is_correct
        )

        self.score_percent = round((earned_points / total_points) * 100, 2)
        self.passed = self.score_percent >= self.quiz.passing_score_percent
        self.submitted_at = timezone.now()
        self.save(update_fields=["score_percent", "passed", "submitted_at"])

        if self.passed:
            from .services.certificate_generator import issue_certificate_if_needed

            issue_certificate_if_needed(self)

        return self.passed


class QuizAnswer(models.Model):
    attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey(QuizQuestion, on_delete=models.CASCADE)

    selected_choice = models.ForeignKey(
        QuizChoice, on_delete=models.SET_NULL, null=True, blank=True
    )
    text_answer = models.CharField(max_length=255, blank=True)

    is_correct = models.BooleanField(default=False)

    class Meta:
        verbose_name = _("Jibu la Swali")
        verbose_name_plural = _("Majibu ya Maswali")

    def evaluate(self):
        if self.question.question_type == QuestionType.SHORT_ANSWER:
            self.is_correct = self.question.check_short_answer(self.text_answer)
        else:
            self.is_correct = bool(self.selected_choice and self.selected_choice.is_correct)
        self.save(update_fields=["is_correct"])
        return self.is_correct


# ----------------------------------------------------------------------
# Certificate — kiotomatiki kwa waliofaulu, na QR ya uthibitisho
# ----------------------------------------------------------------------

class Certificate(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="certificates"
    )
    course = models.ForeignKey(
        Course, on_delete=models.SET_NULL, null=True, blank=True, related_name="certificates"
    )
    session = models.ForeignKey(
        Session, on_delete=models.SET_NULL, null=True, blank=True, related_name="certificates"
    )
    quiz_attempt = models.OneToOneField(
        QuizAttempt, on_delete=models.SET_NULL, null=True, blank=True
    )

    certificate_number = models.CharField(max_length=30, unique=True, editable=False)
    verification_code = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    certificate_image = models.ImageField(
        upload_to="teaching/certificates/", blank=True, null=True
    )

    issued_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Cheti")
        verbose_name_plural = _("Vyeti")
        ordering = ["-issued_at"]

    def __str__(self):
        return f"{self.certificate_number} - {self.user.get_full_name()}"

    def save(self, *args, **kwargs):
        if not self.certificate_number:
            self.certificate_number = self._generate_certificate_number()
        super().save(*args, **kwargs)

    def _generate_certificate_number(self):
        year = timezone.now().year
        prefix = f"TSMA-CERT-{year}-"
        last = (
            Certificate.objects.filter(certificate_number__startswith=prefix)
            .order_by("-certificate_number")
            .first()
        )
        next_seq = 1
        if last:
            try:
                next_seq = int(last.certificate_number.split("-")[-1]) + 1
            except (ValueError, IndexError):
                next_seq = Certificate.objects.count() + 1
        return f"{prefix}{next_seq:05d}"

    @property
    def title_earned(self):
        return (self.course.title if self.course else None) or (
            self.session.title if self.session else "TSMA Teaching Excellence"
        )
