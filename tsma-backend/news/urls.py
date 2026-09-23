from django.urls import path

from .views import (
    AdminNewsDetailView,
    AdminNewsImageDetailView,
    AdminNewsListCreateView,
    NewsCategoryListView,
    NewsDetailView,
    NewsListView,
)

app_name = "news"

urlpatterns = [
    # Public
    path("", NewsListView.as_view(), name="list"),
    path("categories/", NewsCategoryListView.as_view(), name="categories"),
    path("admin/", AdminNewsListCreateView.as_view(), name="admin_list_create"),
    path("admin/<int:pk>/", AdminNewsDetailView.as_view(), name="admin_detail"),
    path(
        "admin/images/<int:pk>/",
        AdminNewsImageDetailView.as_view(),
        name="admin_image_detail",
    ),
    path("<slug:slug>/", NewsDetailView.as_view(), name="detail"),
]
