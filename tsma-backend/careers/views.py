from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Job, JobApplication
from .serializers import (
    JobApplicationCreateSerializer,
    JobDetailSerializer,
    JobListSerializer,
    MyApplicationSerializer,
)


class JobListView(generics.ListAPIView):
    """
    GET /api/careers/ - nafasi ZILIZO WAZI pekee (is_open=True na
    deadline haijapita). Nafasi zilizofungwa/zilizopita HAZIONEKANI kwa
    umma - Admin bado anaziona zote kwenye Django Admin.
    """

    serializer_class = JobListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Job.objects.filter(
            is_open=True, application_deadline__gte=timezone.now().date()
        )


class JobDetailView(generics.RetrieveAPIView):
    """GET /api/careers/<slug>/ - maelezo kamili (public, hata kama imefungwa - kwa rejea)."""

    serializer_class = JobDetailSerializer
    permission_classes = [AllowAny]
    queryset = Job.objects.all()
    lookup_field = "slug"


class ApplyToJobView(generics.CreateAPIView):
    """
    POST /api/careers/<slug>/apply/ - LAZIMA awe amelogin (accounts.User
    ya kawaida, si lazima awe Member mwenye malipo - Sunga alithibitisha
    hili). Mtu haombi nafasi moja mara mbili (UniqueConstraint kwenye
    model inazuia hili kwa uhakika, hata kama maombi mawili yakitumwa
    kwa wakati mmoja).
    """

    serializer_class = JobApplicationCreateSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        job = get_object_or_404(Job, slug=self.kwargs["slug"])
        if not job.is_still_open:
            raise ValidationError("Nafasi hii haipokei maombi tena (imefungwa au deadline imepita).")
        if JobApplication.objects.filter(job=job, applicant=request.user).exists():
            raise ValidationError("Tayari umeshaomba nafasi hii.")

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(job=job, applicant=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MyApplicationsView(generics.ListAPIView):
    """GET /api/careers/my-applications/ - mwombaji anaona hali ya maombi yake."""

    serializer_class = MyApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return JobApplication.objects.filter(applicant=self.request.user).select_related("job")
