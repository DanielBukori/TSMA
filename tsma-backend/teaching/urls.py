from django.urls import path

from .views import (
    AdminCourseDetailView,
    AdminCourseListCreateView,
    AdminQuizChoiceDetailView,
    AdminQuizChoiceListCreateView,
    AdminQuizDetailView,
    AdminQuizListCreateView,
    AdminQuizQuestionDetailView,
    AdminQuizQuestionListCreateView,
    AdminSessionDetailView,
    AdminSessionListCreateView,
    CertificateVerifyView,
    CourseDetailView,
    CourseListView,
    EnrollCourseView,
    MyProgressView,
    QuizSubmitView,
    QuizTakeView,
    SessionDetailView,
    SessionJoinView,
    SessionListView,
)

app_name = "teaching"

urlpatterns = [
    # Public/Member — Courses
    path("courses/", CourseListView.as_view(), name="course_list"),
    path("courses/<slug:slug>/", CourseDetailView.as_view(), name="course_detail"),
    path("courses/<slug:slug>/enroll/", EnrollCourseView.as_view(), name="course_enroll"),
    # Public/Member — Sessions
    path("sessions/", SessionListView.as_view(), name="session_list"),
    path("sessions/<slug:slug>/", SessionDetailView.as_view(), name="session_detail"),
    path(
        "sessions/<slug:slug>/join/",
        SessionJoinView.as_view(),
        name="session_join",
    ),
    # Quiz
    path("quizzes/<int:pk>/", QuizTakeView.as_view(), name="quiz_take"),
    path("quizzes/<int:pk>/submit/", QuizSubmitView.as_view(), name="quiz_submit"),
    # Progress & Certificates
    path("my-progress/", MyProgressView.as_view(), name="my_progress"),
    path(
        "certificates/verify/<uuid:verification_code>/",
        CertificateVerifyView.as_view(),
        name="certificate_verify",
    ),
    # Admin
    path("admin/courses/", AdminCourseListCreateView.as_view(), name="admin_courses"),
    path(
        "admin/courses/<int:pk>/",
        AdminCourseDetailView.as_view(),
        name="admin_courses_detail",
    ),
    path("admin/sessions/", AdminSessionListCreateView.as_view(), name="admin_sessions"),
    path(
        "admin/sessions/<int:pk>/",
        AdminSessionDetailView.as_view(),
        name="admin_sessions_detail",
    ),
    path("admin/quizzes/", AdminQuizListCreateView.as_view(), name="admin_quizzes"),
    path(
        "admin/quizzes/<int:pk>/",
        AdminQuizDetailView.as_view(),
        name="admin_quizzes_detail",
    ),
    path(
        "admin/questions/",
        AdminQuizQuestionListCreateView.as_view(),
        name="admin_questions",
    ),
    path(
        "admin/questions/<int:pk>/",
        AdminQuizQuestionDetailView.as_view(),
        name="admin_questions_detail",
    ),
    path("admin/choices/", AdminQuizChoiceListCreateView.as_view(), name="admin_choices"),
    path(
        "admin/choices/<int:pk>/",
        AdminQuizChoiceDetailView.as_view(),
        name="admin_choices_detail",
    ),
]
