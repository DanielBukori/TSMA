from django.contrib import admin

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
        "created_at",
        "updated_at",
    )
    actions = [activate_selected_members]


@admin.register(MemberProfile)
class MemberProfileAdmin(admin.ModelAdmin):
    """
    Admin anaweza kuangalia/kumoderate profaili za kitaaluma - mfano
    kuzima `is_public` ya profaili isiyofaa bila kumuuliza mwanachama.
    """

    list_display = ("member", "professional_title", "current_organization", "is_public")
    list_editable = ("is_public",)
    list_filter = ("is_public",)
    search_fields = (
        "member__membership_number",
        "member__user__email",
        "member__user__first_name",
        "member__user__last_name",
        "professional_title",
        "specialization",
    )
