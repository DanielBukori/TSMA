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

    def _open(self, name, mode="rb"):
        return self._storage.open(name, mode)

    def _save(self, name, content):
        return self._storage.save(name, content)

    def delete(self, name):
        return self._storage.delete(name)

    def exists(self, name):
        return self._storage.exists(name)

    def listdir(self, path):
        return self._storage.listdir(path)

    def size(self, name):
        return self._storage.size(name)

    def url(self, name):
        return self._storage.url(name)

    def __getattr__(self, name):
        return getattr(self._storage, name)
