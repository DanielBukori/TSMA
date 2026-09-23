from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _

from common.validators import validate_document_max_15mb


class EmploymentType(models.TextChoices):
    FULL_TIME = "full_time", _("Muda Kamili")
    PART_TIME = "part_time", _("Muda Fulani")
    CONSULTANCY = "consultancy", _("Ushauri (Consultancy)")
    VOLUNTEER = "volunteer", _("Kujitolea")
    INTERNSHIP = "internship", _("Mafunzo kwa Vitendo (Internship)")


class Job(models.Model):
    """
    Tangazo la nafasi ya kazi — Admin/mwajiri (mwenye ruhusa za Careers
    pekee kwenye Django Admin, si lazima awe Super Admin) anatengeneza
    hapa, mfumo unatoa ukurasa wa umma (/careers/<slug>) wenye link MOJA
    inayoweza kupostiwa LinkedIn/Facebook/popote - mtu yeyote anayeifungua
    (kutoka chanzo chochote) anaomba humu humu kwenye tovuti.
    """

    title = models.CharField(_("Jina la Nafasi"), max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    department = models.CharField(_("Idara"), max_length=150, blank=True)
    employment_type = models.CharField(
        _("Aina ya Ajira"), max_length=20, choices=EmploymentType.choices,
        default=EmploymentType.FULL_TIME,
    )
    location = models.CharField(_("Mahali"), max_length=150, blank=True)

    description = models.TextField(_("Maelezo ya Kazi"))
    requirements = models.TextField(_("Sifa Zinazohitajika"), blank=True)

    application_deadline = models.DateField(_("Tarehe ya Mwisho ya Kuomba"))
    is_open = models.BooleanField(
        _("Wazi kwa Maombi"), default=True,
        help_text=_("Admin anaweza kuifunga mwenyewe kabla ya deadline (mfano nafasi imejaa)."),
    )

    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="jobs_posted",
    )
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Nafasi ya Kazi")
        verbose_name_plural = _("Nafasi za Kazi")
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    @property
    def is_still_open(self):
        """Wazi KWELI - is_open=True NA deadline haijapita bado."""
        return self.is_open and self.application_deadline >= timezone.now().date()


class ApplicationStatus(models.TextChoices):
    RECEIVED = "received", _("Imepokelewa")
    SHORTLISTED = "shortlisted", _("Amechaguliwa Awali (Shortlisted)")
    REJECTED = "rejected", _("Amekataliwa")
    HIRED = "hired", _("Ameajiriwa")


class JobApplication(models.Model):
    """
    Ombi la kazi — mwombaji LAZIMA awe na akaunti (imethibitishwa na
    Sunga: "lazima awe na akaunti, hata asiwe mwanachama") lakini SI
    lazima awe Member aliyelipa - accounts.User ya kawaida inatosha.
    """

    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name="applications")
    applicant = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="job_applications"
    )

    cover_letter = models.TextField(_("Barua ya Maombi"), blank=True)
    cv_file = models.FileField(
        _("CV"), upload_to="careers/cvs/", validators=validate_document_max_15mb
    )

    status = models.CharField(
        _("Hali"), max_length=20, choices=ApplicationStatus.choices,
        default=ApplicationStatus.RECEIVED,
    )
    internal_notes = models.TextField(
        _("Maelezo ya Ndani (Admin pekee)"), blank=True,
        help_text=_("Haionekani kwa mwombaji - kwa matumizi ya mwajiri/Admin pekee."),
    )

    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Ombi la Kazi")
        verbose_name_plural = _("Maombi ya Kazi")
        ordering = ["-applied_at"]
        # Mtu mmoja haombi nafasi moja mara mbili
        constraints = [
            models.UniqueConstraint(fields=["job", "applicant"], name="unique_job_application")
        ]

    def __str__(self):
        return f"{self.applicant.get_full_name()} -> {self.job.title}"
