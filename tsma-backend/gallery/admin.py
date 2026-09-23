from django.contrib import admin

from .models import GalleryAlbum, GalleryImage


class GalleryImageInline(admin.TabularInline):
    model = GalleryImage
    extra = 3
    fields = ("image", "caption", "display_order")


@admin.register(GalleryAlbum)
class GalleryAlbumAdmin(admin.ModelAdmin):
    list_display = ("title", "event_year", "event_date", "is_published", "display_order")
    list_filter = ("is_published", "event_year")
    search_fields = ("title", "description")
    prepopulated_fields = {"slug": ("title",)}
    ordering = ("-event_year", "display_order")
    inlines = [GalleryImageInline]

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(GalleryImage)
class GalleryImageAdmin(admin.ModelAdmin):
    list_display = ("album", "caption", "display_order", "uploaded_at")
    list_filter = ("album",)
