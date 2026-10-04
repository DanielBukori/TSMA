from rest_framework import serializers

from payments.gateways.registry import available_gateways, default_gateway

from .models import Member, MemberProfile, MembershipTier


class MembershipTierSerializer(serializers.ModelSerializer):
    """Public: orodha ya madaraja yanayopatikana kwa usajili."""

    class Meta:
        model = MembershipTier
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "annual_fee",
            "currency",
            "requires_payment",
            "benefits",
        )


class MemberSerializer(serializers.ModelSerializer):
    tier = MembershipTierSerializer(read_only=True)
    full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Member
        fields = (
            "id",
            "membership_number",
            "full_name",
            "email",
            "tier",
            "status",
            "joined_date",
            "expiry_date",
            "organization_name",
            "digital_card_image",
            "is_active_member",
        )
        read_only_fields = fields


class JoinMembershipSerializer(serializers.Serializer):
    """Input ya kujiunga na daraja fulani — huanzisha Member (pending) + malipo."""

    tier_id = serializers.IntegerField(required=True)
    organization_name = serializers.CharField(required=False, allow_blank=True)
    # Namba ya simu inahitajika TU kwa gateways za mobile money/kadi.
    # Manual/Bank Deposit (na PayPal) hazihitaji — ona validate() hapa chini.
    phone_number = serializers.CharField(required=False, allow_blank=True, default="")
    gateway = serializers.ChoiceField(choices=available_gateways(), default=default_gateway)
    payment_method = serializers.ChoiceField(
        choices=["mobile_money", "card", "bank_transfer"], default="mobile_money"
    )

    def validate_tier_id(self, value):
        try:
            tier = MembershipTier.objects.get(pk=value, is_active=True)
        except MembershipTier.DoesNotExist:
            raise serializers.ValidationError("Daraja hili halipatikani kwa sasa.")
        self.context["tier"] = tier
        return value

    # Gateways ambazo HAZIHITAJI namba ya simu (lazima ziendane na
    # `requires_phone` ya kila gateway kwenye payments.gateways.registry).
    GATEWAYS_WITHOUT_PHONE = {"manual", "paypal"}

    def validate(self, attrs):
        gateway = attrs.get("gateway")
        if gateway not in self.GATEWAYS_WITHOUT_PHONE and not (attrs.get("phone_number") or "").strip():
            raise serializers.ValidationError(
                {"phone_number": "Weka namba ya simu kwa ajili ya malipo."}
            )
        return attrs


class AdminMembershipTierSerializer(serializers.ModelSerializer):
    """Kwa Super Admin/Board Admin kuunda/kuhariri madaraja (bila kugusa code)."""

    class Meta:
        model = MembershipTier
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "annual_fee",
            "currency",
            "requires_payment",
            "benefits",
            "is_active",
            "display_order",
        )
        read_only_fields = ("id", "slug")


class MyProfileSerializer(serializers.ModelSerializer):
    """
    GET/PATCH /api/members/me/profile/ - mwanachama anahariri profaili
    yake ya kitaaluma mwenyewe (pamoja na CV na `is_public` toggle).
    """

    full_name = serializers.CharField(source="member.user.get_full_name", read_only=True)

    class Meta:
        model = MemberProfile
        fields = (
            "full_name",
            "professional_title",
            "current_organization",
            "years_of_experience",
            "specialization",
            "bio",
            "education",
            "experience",
            "certifications",
            "linkedin_url",
            "public_email",
            "photo",
            "cv_file",
            "is_public",
            "updated_at",
        )
        read_only_fields = ("updated_at",)


class ProfessionalDirectoryListSerializer(serializers.ModelSerializer):
    """
    GET /api/members/directory/ - orodha ya PUBLIC pekee (is_public=True).
    Fields chache tu (kwa kadi za orodha) - CV/bio kamili ipo kwenye
    detail view. Hairuhusu kuona wanachama wenye is_public=False kabisa
    (queryset ya view inachuja hilo, si serializer).
    """

    full_name = serializers.CharField(source="member.user.get_full_name", read_only=True)

    class Meta:
        model = MemberProfile
        fields = (
            "member",
            "full_name",
            "professional_title",
            "current_organization",
            "specialization",
            "photo",
        )


class ProfessionalDirectoryDetailSerializer(serializers.ModelSerializer):
    """GET /api/members/directory/<member_id>/ - wasifu kamili wa umma (PUBLIC pekee)."""

    full_name = serializers.CharField(source="member.user.get_full_name", read_only=True)
    membership_tier = serializers.CharField(source="member.tier.name", read_only=True)

    class Meta:
        model = MemberProfile
        fields = (
            "member",
            "full_name",
            "membership_tier",
            "professional_title",
            "current_organization",
            "years_of_experience",
            "specialization",
            "bio",
            "education",
            "experience",
            "certifications",
            "linkedin_url",
            "public_email",
            "photo",
            "cv_file",
        )
