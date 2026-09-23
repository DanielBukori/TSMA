from rest_framework.permissions import BasePermission


class IsSecurityOperator(BasePermission):
    """Mtumiaji lazima awe amethibitishwa kupitia SecurityAdminAuthentication."""

    def has_permission(self, request, view):
        from .models import SecurityAdminUser

        return isinstance(request.user, SecurityAdminUser) and request.user.is_active


class IsSecuritySuperOperator(IsSecurityOperator):
    """Kwa hatua nzito (kuidhinisha PendingApprovalAction) — operator maalum pekee."""

    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.is_superuser_operator
