from django.conf import settings
from django.core.files.storage import FileSystemStorage, Storage
from django.utils.deconstruct import deconstructible


@deconstructible
class PublicationFileStorage(Storage):
    def __init__(self):
        if getattr(settings, "CLOUDINARY_URL", ""):
            from cloudinary_storage.storage import RawMediaCloudinaryStorage

            self._storage = RawMediaCloudinaryStorage()
        else:
            self._storage = FileSystemStorage(
                location=settings.MEDIA_ROOT,
                base_url=settings.MEDIA_URL,
            )

    def __getattr__(self, name):
        return getattr(self._storage, name)
