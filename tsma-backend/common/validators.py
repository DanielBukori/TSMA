"""
Uthibitishaji wa faili zilizopakiwa (uploads) — unaotumika kwenye apps
mbalimbali (publications, teaching, board, gallery, n.k.) kuzuia:
- storage abuse (faili kubwa mno)
- faili za aina isiyotarajiwa zikijifanya kuwa PDF/image kwa jina la
  extension pekee (tunaangalia "magic bytes" halisi za faili, siyo tu
  jina lake).

Kutumia: ongeza kwenye `validators=[...]` ya FileField/ImageField.
"""

from django.core.exceptions import ValidationError
from django.utils.deconstruct import deconstructible


@deconstructible
class MaxFileSizeValidator:
    """Kataa faili kubwa kuliko `max_mb` megabytes."""

    def __init__(self, max_mb):
        self.max_mb = max_mb

    def __call__(self, file):
        limit_bytes = self.max_mb * 1024 * 1024
        if file.size > limit_bytes:
            raise ValidationError(
                f"File exceeded the limit ({file.size / (1024*1024):.1f}MB). "
                f"The maximum size {self.max_mb}MB."
            )

    def __eq__(self, other):
        return isinstance(other, MaxFileSizeValidator) and self.max_mb == other.max_mb


# Saini za "magic bytes" za aina za faili zinazotambulika (angalia bytes za
# mwanzo za faili — hii haiwezi "kudanganywa" kwa kubadili jina la
# extension pekee kama ilivyo kwa uthibitishaji wa jina la faili tu).
_MAGIC_SIGNATURES = {
    "pdf": [b"%PDF-"],
    "jpg": [b"\xff\xd8\xff"],
    "png": [b"\x89PNG\r\n\x1a\n"],
    "doc": [b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"],  # legacy .doc/.xls (OLE)
    "docx": [b"PK\x03\x04"],  # .docx/.xlsx/.pptx ni ZIP archives
    "mp4": [b"\x00\x00\x00\x18ftyp", b"\x00\x00\x00\x1cftyp", b"\x00\x00\x00\x20ftyp"],
}


@deconstructible
class FileTypeValidator:
    """
    Thibitisha aina HALISI ya faili kwa kuangalia magic bytes za mwanzo,
    siyo jina la extension pekee (mtu anaweza kubadili jina la .exe kuwa
    .pdf — hii inagundua hilo).
    """

    def __init__(self, allowed_types):
        self.allowed_types = allowed_types

    def __call__(self, file):
        file.seek(0)
        header = file.read(16)
        file.seek(0)

        for type_name in self.allowed_types:
            signatures = _MAGIC_SIGNATURES.get(type_name, [])
            if any(header.startswith(sig) for sig in signatures):
                return

        raise ValidationError(
            f"This file type is unknown/ not allowed. Allowed: "
            f"{', '.join(self.allowed_types)}."
        )

    def __eq__(self, other):
        return isinstance(other, FileTypeValidator) and self.allowed_types == other.allowed_types


# Vikombozi vilivyotayarishwa kwa matumizi ya haraka
validate_pdf_max_20mb = [MaxFileSizeValidator(20), FileTypeValidator(["pdf"])]
validate_document_max_15mb = [MaxFileSizeValidator(15), FileTypeValidator(["pdf", "doc", "docx"])]
validate_image_max_8mb = [MaxFileSizeValidator(8), FileTypeValidator(["jpg", "png"])]
validate_video_max_500mb = [MaxFileSizeValidator(500), FileTypeValidator(["mp4"])]
