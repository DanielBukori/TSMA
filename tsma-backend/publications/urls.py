from django.urls import path

from .views import (
    AbstractSubmissionCreateView,
    AdminAbstractSubmissionDetailView,
    AdminAbstractSubmissionListView,
    AdminCommissionSettingsView,
    AdminPublicationDetailView,
    AdminPublicationListCreateView,
    AdminPublicationPurchaseListView,
    MyAbstractSubmissionsView,
    MyPurchasesView,
    PublicationCategoryListView,
    PublicationDetailView,
    PublicationDownloadView,
    PublicationListView,
    PublicationPurchaseInitiateView,
)

app_name = "publications"

urlpatterns = [
    # Public
    path("", PublicationListView.as_view(), name="list"),
    path("categories/", PublicationCategoryListView.as_view(), name="categories"),
    # Buyer/Member (authenticated)
    path("my-purchases/", MyPurchasesView.as_view(), name="my_purchases"),
    path("abstracts/submit/", AbstractSubmissionCreateView.as_view(), name="abstract_submit"),
    path("abstracts/mine/", MyAbstractSubmissionsView.as_view(), name="abstract_mine"),
    # Admin
    path("admin/", AdminPublicationListCreateView.as_view(), name="admin_list_create"),
    path("admin/<int:pk>/", AdminPublicationDetailView.as_view(), name="admin_detail"),
    path(
        "admin/commission-settings/",
        AdminCommissionSettingsView.as_view(),
        name="admin_commission_settings",
    ),
    path(
        "admin/purchases/",
        AdminPublicationPurchaseListView.as_view(),
        name="admin_purchases",
    ),
    path(
        "admin/abstracts/",
        AdminAbstractSubmissionListView.as_view(),
        name="admin_abstracts_list",
    ),
    path(
        "admin/abstracts/<int:pk>/",
        AdminAbstractSubmissionDetailView.as_view(),
        name="admin_abstracts_detail",
    ),
    # Public detail/download/purchase - mwishoni ili isigongane na admin/categories/n.k.
    path("<slug:slug>/", PublicationDetailView.as_view(), name="detail"),
    path("<slug:slug>/download/", PublicationDownloadView.as_view(), name="download"),
    path(
        "<slug:slug>/purchase/",
        PublicationPurchaseInitiateView.as_view(),
        name="purchase",
    ),
]
