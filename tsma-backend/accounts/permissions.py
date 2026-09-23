from rest_framework.permissions import BasePermission

from .models import User


class IsSuperAdmin(BasePermission):
    """Ruhusa: Super Administrator pekee."""

    message = "This site can be accessed by Super Administrator only."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_super_admin
        )


class IsBoardAdmin(BasePermission):
    """Ruhusa: Board/Leadership Admin (au Super Admin)."""

    message = "This site can be accessed by Board/Leadership Admin only."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_board_admin or request.user.is_super_admin)
        )


class IsContentEditor(BasePermission):
    """Ruhusa: Content Editor (au Board/Super Admin) - kwa News/Gallery/Publications."""

    message = "This site can be accessed by Content Editor only."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.is_content_editor
                or request.user.is_board_admin
                or request.user.is_super_admin
            )
        )


class IsMember(BasePermission):
    """Ruhusa: Mwanachama aliyethibitishwa (role=MEMBER)."""

    message = "This site can be accessed by Members only. Please register first."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_member or request.user.is_super_admin)
        )


class IsOwnerOrAdmin(BasePermission):
    """
    Ruhusa: mwenye account yake mwenyewe (mfano: profile yake), au admin.
    Inatumika kwenye object-level permissions.
    """

    def has_object_permission(self, request, view, obj):
        if request.user.is_super_admin or request.user.is_board_admin:
            return True
        owner = getattr(obj, "user", obj)
        return owner == request.user


class ReadOnlyOrIsContentEditor(BasePermission):
    """
    GET/HEAD/OPTIONS - kila mtu (hata Guest, kama view yenyewe inaruhusu).
    POST/PUT/PATCH/DELETE - Content Editor, Board Admin, au Super Admin pekee.
    Inafaa kwa News, Gallery, Publications.
    """

    SAFE_METHODS = ("GET", "HEAD", "OPTIONS")

    def has_permission(self, request, view):
        if request.method in self.SAFE_METHODS:
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.is_content_editor
                or request.user.is_board_admin
                or request.user.is_super_admin
            )
        )
