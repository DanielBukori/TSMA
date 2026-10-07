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
    # Student Member (Katiba Art 10.3) LAZIMA aweke picha ya ID ya chuo.
    student_id_image = serializers.ImageField(required=False, allow_null=True)
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
        # HAKUNA uanachama wa bure: kila daraja la kujiunga mwenyewe lazima liwe la
        # kulipia (ada > 0). Honorary/Fellow/Founding hupewa na Admin, si self-join.
        if not tier.requires_payment or not tier.annual_fee or tier.annual_fee <= 0:
            raise serializers.ValidationError("Daraja hili halipatikani kwa sasa.")
        self.context["tier"] = tier
        return value

    MAX_STUDENT_ID_BYTES = 5 * 1024 * 1024  # 5 MB

    def validate_student_id_image(self, value):
        if value and value.size > self.MAX_STUDENT_ID_BYTES:
            raise serializers.ValidationError("Picha ni kubwa mno. Kikomo ni MB 5.")
        return value

    # Gateways ambazo HAZIHITAJI namba ya simu (lazima ziendane na
    # `requires_phone` ya kila gateway kwenye payments.gateways.registry).
    GATEWAYS_WITHOUT_PHONE = {"manual", "paypal"}

    def validate(self, attrs):
        tier = self.context.get("tier")
        if tier and tier.slug == "student-member" and not attrs.get("student_id_image"):
            raise serializers.ValidationError(
                {"student_id_image": "Mwanafunzi lazima aweke picha ya ID ya chuo."}
            )
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
            "visibility_decided",
            "cv_public",
            "email_public",
            "updated_at",
        )
        read_only_fields = ("visibility_decided", "updated_at")

    def update(self, instance, validated_data):
        # Mwanachama akishajibu swali la "itoe kwa jamii?" (Ndiyo au Hapana),
        # tunakumbuka ili tusimuulize tena.
        if "is_public" in validated_data:
            validated_data["visibility_decided"] = True
        return super().update(instance, validated_data)


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
            "is_public",
            "cv_public",
            "email_public",
        )

    def to_representation(self, instance):
        """
        CV na barua pepe vinaonekana kwa UMMA tu kama mwenyewe ameviruhusu
        (cv_public / email_public). Mmiliki na Board/Super Admin wanaona vyote.
        """
        data = super().to_representation(instance)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        sees_all = bool(
            user
            and user.is_authenticated
            and (user.is_super_admin or user.is_board_admin or instance.member.user_id == user.id)
        )
        if not sees_all:
            if not instance.cv_public:
                data["cv_file"] = None
            if not instance.email_public:
                data["public_email"] = None
        return data
