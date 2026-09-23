from django.urls import path

from .views import (
    AdminGalleryAlbumDetailView,
    AdminGalleryAlbumListCreateView,
    AdminGalleryImageDetailView,
    AdminGalleryImageUploadView,
    GalleryAlbumDetailView,
    GalleryAlbumListView,
)

app_name = "gallery"

urlpatterns = [
    # Public
    path("", GalleryAlbumListView.as_view(), name="album_list"),
    # Admin (Content Editor/Board/Super Admin)
    path(
        "admin/albums/",
        AdminGalleryAlbumListCreateView.as_view(),
        name="admin_album_list_create",
    ),
    path(
        "admin/albums/<int:pk>/",
        AdminGalleryAlbumDetailView.as_view(),
        name="admin_album_detail",
    ),
    path(
        "admin/images/",
        AdminGalleryImageUploadView.as_view(),
        name="admin_image_upload",
    ),
    path(
        "admin/images/<int:pk>/",
        AdminGalleryImageDetailView.as_view(),
        name="admin_image_detail",
    ),
    # Public detail iwe mwishoni ili isigongane na "admin/"
    path("<slug:slug>/", GalleryAlbumDetailView.as_view(), name="album_detail"),
]
