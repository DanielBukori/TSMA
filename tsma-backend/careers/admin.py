from django.contrib import admin

from .models import Job, JobApplication


class JobApplicationInline(admin.TabularInline):
    """
    Waombaji wanaonekana MOJA KWA MOJA chini ya nafasi husika ya kazi -
    mwajiri mwenye ruhusa za Careers pekee (angalia JINSI_YA_KUWEKA.md
    kwa jinsi ya kutengeneza akaunti yake yenye ruhusa zilizofungwa)
    haitaji kutafuta popote pengine.
    """

    model = JobApplication
    extra = 0
    fields = ("applicant", "status", "cv_file", "applied_at")
    readonly_fields = ("applicant", "applied_at")
    can_delete = False


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ("title", "department", "employment_type", "application_deadline", "is_open", "applicant_count")
    list_editable = ("is_open",)
    list_filter = ("employment_type", "is_open", "department")
    search_fields = ("title", "department", "description")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [JobApplicationInline]

    fieldsets = (
        (None, {"fields": ("title", "slug", "department", "employment_type", "location")}),
        ("Maelezo", {"fields": ("description", "requirements")}),
        ("Hali", {"fields": ("application_deadline", "is_open", "display_order")}),
    )

    def applicant_count(self, obj):
        return obj.applications.count()
    applicant_count.short_description = "Idadi ya Waombaji"

    def save_model(self, request, obj, form, change):
        if not change:
            obj.posted_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(JobApplication)
class JobApplicationAdmin(admin.ModelAdmin):
    """
    Orodha ya maombi YOTE (apps zote) kwa pamoja - kwa mwajiri anayetaka
    kuona maombi mapya bila kuingia kila Job moja moja.
    """

    list_display = ("applicant", "job", "status", "applied_at")
    list_editable = ("status",)
    list_filter = ("status", "job")
    search_fields = ("applicant__email", "applicant__first_name", "applicant__last_name", "job__title")
    readonly_fields = ("job", "applicant", "cover_letter", "cv_file", "applied_at")

    fieldsets = (
        (None, {"fields": ("job", "applicant", "applied_at")}),
        ("Maombi", {"fields": ("cover_letter", "cv_file")}),
        ("Uamuzi", {"fields": ("status", "internal_notes")}),
    )
