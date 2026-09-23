from django.urls import path

from .views import ApplyToJobView, JobDetailView, JobListView, MyApplicationsView

app_name = "careers"

urlpatterns = [
    path("", JobListView.as_view(), name="list"),
    path("my-applications/", MyApplicationsView.as_view(), name="my_applications"),
    path("<slug:slug>/", JobDetailView.as_view(), name="detail"),
    path("<slug:slug>/apply/", ApplyToJobView.as_view(), name="apply"),
]
