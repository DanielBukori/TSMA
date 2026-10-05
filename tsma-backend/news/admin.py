from django.contrib import admin

from .models import News, NewsCategory, NewsImage


@admin.register(NewsCategory)
class NewsCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


class NewsImageInline(admin.TabularInline):
    """Ongeza picha kadhaa (au acha wazi kabisa) kwenye chapisho moja."""

    model = NewsImage
    extra = 2
    fields = ("image", "display_order")


@admin.register(News)
class NewsAdmin(admin.ModelAdmin):
    list_display = (
        "title_or_excerpt",
        "category",
        "author",
        "image_count",
        "is_published",
        "published_at",
    )
    list_filter = ("is_published", "category")
    search_fields = ("title", "excerpt", "content")
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)
    inlines = [NewsImageInline]

    fieldsets = (
        (None, {"fields": ("title", "category", "excerpt", "content")}),
        (
            "Uchapishaji",
            {"fields": ("is_published", "published_at", "slug")},
        ),
        ("Metadata", {"fields": ("created_at", "updated_at")}),
    )

    @admin.display(description="Chapisho")
    def title_or_excerpt(self, obj):
        return obj.title or (obj.content[:60] + "…" if len(obj.content) > 60 else obj.content)

    @admin.display(description="Picha")
    def image_count(self, obj):
        return obj.image_count

    def save_model(self, request, obj, form, change):
        if not change:
            obj.author = request.user
        super().save_model(request, obj, form, change)
