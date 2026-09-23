from rest_framework import serializers

from .models import Job, JobApplication


class JobListSerializer(serializers.ModelSerializer):
    """Public - orodha ya nafasi (kadi)."""

    is_still_open = serializers.BooleanField(read_only=True)

    class Meta:
        model = Job
        fields = (
            "id", "title", "slug", "department", "employment_type",
            "location", "application_deadline", "is_still_open",
        )


class JobDetailSerializer(serializers.ModelSerializer):
    """Public - maelezo kamili ya nafasi moja."""

    is_still_open = serializers.BooleanField(read_only=True)

    class Meta:
        model = Job
        fields = (
            "id", "title", "slug", "department", "employment_type", "location",
            "description", "requirements", "application_deadline", "is_still_open",
        )


class JobApplicationCreateSerializer(serializers.ModelSerializer):
    """POST /api/careers/<slug>/apply/ - mwombaji (lazima awe amelogin)."""

    class Meta:
        model = JobApplication
        fields = ("cover_letter", "cv_file")


class MyApplicationSerializer(serializers.ModelSerializer):
    """GET /api/careers/my-applications/ - mwombaji anaona hali ya maombi yake mwenyewe."""

    job_title = serializers.CharField(source="job.title", read_only=True)
    job_slug = serializers.CharField(source="job.slug", read_only=True)

    class Meta:
        model = JobApplication
        fields = ("id", "job_title", "job_slug", "status", "applied_at")
