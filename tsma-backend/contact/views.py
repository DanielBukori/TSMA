from django.conf import settings
from django.core.mail import send_mail
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.permissions import IsBoardAdmin, IsContentEditor

from .models import ContactInfo, ContactMessage
from .serializers import (
    AdminContactInfoSerializer,
    AdminContactMessageSerializer,
    ContactInfoSerializer,
    ContactMessageCreateSerializer,
)


class ContactInfoView(APIView):
    """
    GET /api/contact/info/
    Taarifa za mawasiliano za TSMA (simu, WhatsApp, email, anwani,
    mitandao ya kijamii) — zote na viungo vilivyo tayari kubofywa.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        info = ContactInfo.objects.filter(is_active=True).first()
        if not info:
            return Response(
                {"detail": "Taarifa za mawasiliano bado hazijawekwa."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(ContactInfoSerializer(info).data)


class ContactMessageCreateView(generics.CreateAPIView):
    """
    POST /api/contact/message/ - Tuma ujumbe kupitia fomu ya mawasiliano.

    USALAMA: endpoint hii ni AllowAny (bila login) na inatuma email —
    lengo rahisi la spam. `throttle_scope = "contact_form"` inaiwekea
    rate limit YAKE MAALUM (tofauti na 'anon' ya jumla), iliyowekwa
    kwenye settings.py -> REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'].
    """

    serializer_class = ContactMessageCreateSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "contact_form"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = serializer.save()

        # Arifu admin kwa email (hiari — fail_silently ili kutokwamisha submission)
        info = ContactInfo.objects.filter(is_active=True).first()
        if info:
            try:
                send_mail(
                    subject=f"TSMA - Ujumbe Mpya: {message.subject or 'Bila Kichwa'}",
                    message=(
                        f"Jina: {message.full_name}\n"
                        f"Email: {message.email}\n"
                        f"Simu: {message.phone_number or '-'}\n\n"
                        f"{message.message}"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[info.email],
                    fail_silently=True,
                )
            except Exception:
                pass

        return Response(
            {"detail": "Ujumbe wako umetumwa. Tutawasiliana nawe hivi karibuni."},
            status=status.HTTP_201_CREATED,
        )


class AdminContactInfoView(generics.RetrieveUpdateAPIView):
    """
    GET/PATCH /api/contact/admin/info/
    Taarifa za mawasiliano zinazoonekana kwa umma — Content Editor/Board.
    """

    serializer_class = AdminContactInfoSerializer
    permission_classes = [IsContentEditor]

    def get_object(self):
        # Hakuna defaults za kupanga hapa — rekodi mpya inarudi bila taarifa
        # ili Admin aweke zile halisi za TSMA.
        return ContactInfo.objects.filter(is_active=True).order_by("-updated_at").first() or ContactInfo()


class AdminContactMessageListView(generics.ListAPIView):
    """GET /api/contact/admin/messages/ - Orodha ya ujumbe zote zilizotumwa."""

    serializer_class = AdminContactMessageSerializer
    permission_classes = [IsBoardAdmin]
    queryset = ContactMessage.objects.all()


class AdminContactMessageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /api/contact/admin/messages/<id>/
    Angalia ujumbe (unaweka is_read=True), weka is_replied, au futa.
    """

    serializer_class = AdminContactMessageSerializer
    permission_classes = [IsBoardAdmin]
    queryset = ContactMessage.objects.all()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if not instance.is_read:
            instance.is_read = True
            instance.save(update_fields=["is_read"])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
