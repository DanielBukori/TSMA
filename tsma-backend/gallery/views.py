from django.db.models import Count
from rest_framework import generics
from rest_framework.permissions import AllowAny

from accounts.permissions import IsContentEditor

from .models import GalleryAlbum, GalleryImage
from .serializers import (
    AdminGalleryAlbumSerializer,
    AdminGalleryImageUploadSerializer,
    GalleryAlbumDetailSerializer,
    GalleryAlbumListSerializer,
)


class GalleryAlbumListView(generics.ListAPIView):
    """
    GET /api/gallery/
    Query params (hiari): year=<YYYY> - chuja albamu kwa mwaka wa tukio.
    """

    serializer_class = GalleryAlbumListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        # "_annotated_image_count" (SI "image_count") kwa MAKUSUDI - model
        # tayari ina @property image_count (bila setter), na Django
        # annotate() inajaribu ku-"set" jina hilo kwenye kila matokeo -
        # hii inagongana na property isiyo na setter na kusababisha
        # AttributeError/500. Jina tofauti hapa linaepuka mgongano huo;
        # serializer inaisoma kupitia source= ili JSON ya API ibaki
        # "image_count" kama kawaida (frontend haihitaji kubadilika).
        queryset = GalleryAlbum.objects.filter(is_published=True).annotate(
            _annotated_image_count=Count("images")
        )
        year = self.request.query_params.get("year")
        if year and year.isdigit():
            queryset = queryset.filter(event_year=int(year))
        return queryset


class GalleryAlbumDetailView(generics.RetrieveAPIView):
    """GET /api/gallery/<slug>/ - Albamu na picha zake zote (kwa lightbox)."""

    serializer_class = GalleryAlbumDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"
    queryset = GalleryAlbum.objects.filter(is_published=True).prefetch_related("images")


class AdminGalleryAlbumListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/gallery/admin/albums/ - Content Editor/Board/Super Admin: tengeneza albamu."""

    serializer_class = AdminGalleryAlbumSerializer
    permission_classes = [IsContentEditor]
    queryset = GalleryAlbum.objects.all().order_by("-event_year")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AdminGalleryAlbumDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/gallery/admin/albums/<id>/ - Hariri/futa albamu."""

    serializer_class = AdminGalleryAlbumSerializer
    permission_classes = [IsContentEditor]
    queryset = GalleryAlbum.objects.all()


class AdminGalleryImageUploadView(generics.CreateAPIView):
    """POST /api/gallery/admin/images/ - Pakia picha moja ndani ya albamu (rudia kwa kila picha)."""

    serializer_class = AdminGalleryImageUploadSerializer
    permission_classes = [IsContentEditor]


class AdminGalleryImageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/gallery/admin/images/<id>/ - Hariri caption/mpangilio au futa picha."""

    serializer_class = AdminGalleryImageUploadSerializer
    permission_classes = [IsContentEditor]
    queryset = GalleryImage.objects.all()
