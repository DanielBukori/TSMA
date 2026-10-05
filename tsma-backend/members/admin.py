from django.contrib import admin
from django.http import FileResponse, Http404
from django.urls import path, reverse
from django.utils.html import format_html

from .models import Member, MemberProfile, MembershipTier
from .services.card_generator import generate_membership_card


@admin.register(MembershipTier)
class MembershipTierAdmin(admin.ModelAdmin):
    """
    Hapa ndipo Bosi/Super Admin anaweza kuongeza, kuhariri au kufuta
    madaraja ya uanachama na ada zake — bila kugusa code popote.
    """

    list_display = (
        "name",
        "annual_fee",
        "currency",
        "requires_payment",
        "is_active",
        "display_order",
    )
    list_editable = ("annual_fee", "is_active", "display_order")
    prepopulated_fields = {"slug": ("name",)}
    ordering = ("display_order",)


@admin.action(description="Wezesha (activate) uanachama wa waliochaguliwa")
def activate_selected_members(modeladmin, request, queryset):
    for member in queryset:
        member.activate()
        generate_membership_card(member)


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = (
        "membership_number",
        "user",
        "tier",
        "status",
        "joined_date",
        "expiry_date",
    )
    list_filter = ("status", "tier")
    search_fields = ("membership_number", "user__email", "user__first_name", "user__last_name")
    readonly_fields = (
        "id",
        "membership_number",
        "card_verification_code",
        "student_id_preview",
        "created_at",
        "updated_at",
    )
    actions = [activate_selected_members]

    # ID ya chuo ni NYETI: haitolewi kupitia /media/ ya umma (Nginx inaizuia).
    # Admin aliyeingia tu ndiye anaiona, kupitia URL hii ya ndani ya admin.
    def get_urls(self):
        custom = [
            path(
                "<path:object_id>/student-id/",
                self.admin_site.admin_view(self.student_id_view),
                name="members_member_student_id",
            ),
        ]
        return custom + super().get_urls()

    def student_id_view(self, request, object_id):
        member = self.get_object(request, object_id)
        if member is None or not self.has_view_permission(request, member):
            raise Http404
        if not member.student_id_image:
            raise Http404
        return FileResponse(member.student_id_image.open("rb"))

    @admin.display(description="ID ya chuo (hakiki kabla ya kuthibitisha)")
    def student_id_preview(self, obj):
        if not obj.student_id_image:
            return "—"
        url = reverse("admin:members_member_student_id", args=[obj.pk])
        return format_html(
            '<a href="{0}" target="_blank" rel="noopener noreferrer">'
            '<img src="{0}" style="max-height:220px;border:1px solid #ccc;border-radius:6px"></a>',
            url,
        )


@admin.register(MemberProfile)
class MemberProfileAdmin(admin.ModelAdmin):
    """
    Admin anaweza kuangalia/kumoderate profaili za kitaaluma - mfano
    kuzima `is_public` ya profaili isiyofaa bila kumuuliza mwanachama.
    """

    list_display = (
        "member",
        "professional_title",
        "current_organization",
        "is_public",
        "cv_public",
        "email_public",
        "visibility_decided",
    )
    list_filter = ("is_public", "cv_public", "email_public", "visibility_decided")
    readonly_fields = ("visibility_decided",)
    search_fields = (
        "member__membership_number",
        "member__user__email",
        "member__user__first_name",
        "member__user__last_name",
        "professional_title",
        "specialization",
    )
