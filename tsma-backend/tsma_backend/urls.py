from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),

    path("api/auth/", include("accounts.urls")),
    path("api/members/", include("members.urls")),
    path("api/payments/", include("payments.urls")),
    path("api/board/", include("board.urls")),
    path("api/management/", include("management_team.urls")),
    path("api/news/", include("news.urls")),
    path("api/gallery/", include("gallery.urls")),
    path("api/contact/", include("contact.urls")),
    path("api/publications/", include("publications.urls")),
    path("api/partners/", include("partners.urls")),
    path("api/careers/", include("careers.urls")),
    path("api/conferences/", include("conferences.urls")),
    path("api/teaching/", include("teaching.urls")),
    path("api/content/", include("sitecontent.urls")),
    path("api/security/", include("security.urls")),
]

# Development pekee — production inahudumia /media/ kupitia nginx/S3
# (private storage kwa paid files, angalia settings.py comments).
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
