from django.contrib import admin

from .models import (
    Certificate,
    Course,
    CourseEnrollment,
    Quiz,
    QuizAttempt,
    QuizChoice,
    QuizQuestion,
    Session,
    SessionAttendance,
)


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("title", "session_count", "is_published", "display_order")
    list_filter = ("is_published",)
    search_fields = ("title", "description")
    prepopulated_fields = {"slug": ("title",)}

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    """
    Kwa LIVE session: jaza meeting_link/meeting_password mwenyewe (default
    'manual' provider) — au acha wazi na mfumo utajaribu Zoom API kama
    imewashwa kwenye settings (TEACHING_MEETING_PROVIDER='zoom').
    """

    list_display = (
        "title",
        "course",
        "session_type",
        "scheduled_start",
        "is_published",
    )
    list_filter = ("session_type", "is_published", "course")
    search_fields = ("title", "instructor_name")
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ("meeting_provider_used",)

    fieldsets = (
        (None, {"fields": ("course", "title", "slug", "description", "instructor_name")}),
        (
            "Aina na Ratiba",
            {"fields": ("session_type", "scheduled_start", "scheduled_end")},
        ),
        (
            "Live Session (Zoom/Meet)",
            {
                "fields": (
                    "meeting_provider_used",
                    "meeting_link",
                    "meeting_id",
                    "meeting_password",
                ),
                "description": (
                    "Kwa 'manual' provider (default), jaza meeting_link wewe mwenyewe. "
                    "Acha wazi kama TEACHING_MEETING_PROVIDER='zoom' imewashwa."
                ),
            },
        ),
        ("Recorded Session", {"fields": ("recording_url", "recording_file")}),
        ("Uchapishaji", {"fields": ("is_published", "display_order")}),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


class QuizChoiceInline(admin.TabularInline):
    model = QuizChoice
    extra = 4
    fields = ("choice_text", "is_correct", "display_order")


@admin.register(QuizQuestion)
class QuizQuestionAdmin(admin.ModelAdmin):
    list_display = ("question_text", "quiz", "question_type", "points")
    list_filter = ("question_type", "quiz")
    inlines = [QuizChoiceInline]


class QuizQuestionInline(admin.TabularInline):
    model = QuizQuestion
    extra = 1
    fields = ("question_text", "question_type", "correct_short_answer", "points", "display_order")
    show_change_link = True


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "course",
        "session",
        "passing_score_percent",
        "total_questions",
        "is_published",
    )
    list_filter = ("is_published",)
    inlines = [QuizQuestionInline]


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ("user", "quiz", "score_percent", "passed", "submitted_at")
    list_filter = ("passed", "quiz")
    search_fields = ("user__email",)
    readonly_fields = ("score_percent", "passed", "started_at", "submitted_at")


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ("certificate_number", "user", "title_earned", "issued_at")
    search_fields = ("certificate_number", "user__email")
    readonly_fields = ("certificate_number", "verification_code", "certificate_image", "issued_at")


@admin.register(CourseEnrollment)
class CourseEnrollmentAdmin(admin.ModelAdmin):
    list_display = ("user", "course", "progress_percent", "enrolled_at", "completed_at")
    list_filter = ("course",)


@admin.register(SessionAttendance)
class SessionAttendanceAdmin(admin.ModelAdmin):
    list_display = ("user", "session", "completed", "completed_at")
    list_filter = ("completed", "session")
