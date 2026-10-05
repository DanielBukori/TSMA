from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from accounts.permissions import IsContentEditor

from .models import News, NewsCategory, NewsImage
from .serializers import (
    AdminNewsImageSerializer,
    AdminNewsSerializer,
    NewsCategorySerializer,
    NewsDetailSerializer,
    NewsListSerializer,
)


class NewsCategoryListView(generics.ListAPIView):
    """GET /api/news/categories/ - Orodha ya kategoria (public)."""

    serializer_class = NewsCategorySerializer
    permission_classes = [AllowAny]
    queryset = NewsCategory.objects.all()


class NewsListView(generics.ListAPIView):
    """
    GET /api/news/
    Query params (zote hiari):
      - q=<neno>            : tafuta kwenye title/excerpt/content
      - category=<slug>     : chuja kwa kategoria
      - year=<YYYY>          : chuja kwa mwaka wa kuchapishwa
      - month=<1-12>         : chuja kwa mwezi wa kuchapishwa
    """

    serializer_class = NewsListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = News.objects.filter(is_published=True).select_related("category", "author")

        q = self.request.query_params.get("q")
        if q:
            from django.db.models import Q

            queryset = queryset.filter(
                Q(title__icontains=q) | Q(excerpt__icontains=q) | Q(content__icontains=q)
            )

        category_slug = self.request.query_params.get("category")
        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)

        year = self.request.query_params.get("year")
        if year and year.isdigit():
            queryset = queryset.filter(published_at__year=int(year))

        month = self.request.query_params.get("month")
        if month and month.isdigit():
            queryset = queryset.filter(published_at__month=int(month))

        return queryset


class NewsDetailView(generics.RetrieveAPIView):
    """GET /api/news/<slug>/ - Habari kamili (hakuna view count)."""

    serializer_class = NewsDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"
    queryset = News.objects.filter(is_published=True)


class AdminNewsListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/news/admin/ - Content Editor/Board/Super Admin: andika habari mpya."""

    serializer_class = AdminNewsSerializer
    permission_classes = [IsContentEditor]
    queryset = News.objects.all().order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class AdminNewsDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/news/admin/<id>/ - Hariri/futa/chapisha habari."""

    serializer_class = AdminNewsSerializer
    permission_classes = [IsContentEditor]
    queryset = News.objects.all()


class AdminNewsImageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /api/news/admin/images/<id>/
    Hariri mpangilio (display_order) au futa picha moja bila kugusa
    chapisho zima — muhimu kwa carousel yenye picha kadhaa.
    """

    serializer_class = AdminNewsImageSerializer
    permission_classes = [IsContentEditor]
    queryset = NewsImage.objects.all()
