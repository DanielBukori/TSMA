from rest_framework.permissions import BasePermission

from .models import User


def has_editor_mfa(request):
    """Only a JWT issued after the second-factor step may use staff APIs."""
    token = getattr(request, "auth", None)
    try:
        return bool(token and token.get("editor_mfa", False))
    except AttributeError:
        return False


def staff_role_allowed(request, roles, editor_may_create=False):
    """
    Shared check for the staff APIs: authenticated, second factor present, and
    one of `roles` (Super Admin always passes).
    """
    user = request.user
    if not (user and user.is_authenticated and has_editor_mfa(request)):
        return False
    if user.is_super_admin or user.role in roles:
        return True
    if editor_may_create and user.is_content_editor:
        return request.method in ("GET", "HEAD", "OPTIONS", "POST")
    return False


def staff_can_view_any_transaction(user):
    """Roles allowed to look up a payment that is not their own."""
    return bool(
        user and user.is_authenticated and (user.is_accountant or user.is_super_admin)
    )


class IsSuperAdmin(BasePermission):
    """Super Administrator only."""

    message = "This site can be accessed by Super Administrator only."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_super_admin
        )


class IsBoardAdmin(BasePermission):
    """Board/Leadership Admin, or Super Admin."""

    message = "This site can be accessed by Board/Leadership Admin only."

    def has_permission(self, request, view):
        return staff_role_allowed(request, {User.Role.BOARD_ADMIN})


class IsFinanceAdmin(BasePermission):
    """
    Money-facing endpoints: transactions, manual confirmation and revenue.

    The constitution gives bookkeeping to the Treasurer (Arts. 23.5 and 51),
    which is the Treasurer/Accountant role here.
    """

    message = "This site can be accessed by the Treasurer/Accountant only."

    def has_permission(self, request, view):
        return staff_role_allowed(request, {User.Role.ACCOUNTANT})


class IsFinanceOrBoard(BasePermission):
    """
    Day-to-day operations that touch money or the roster: conferences,
    registrations, membership tiers and the member list.
    """

    message = "This site can be accessed by the Treasurer/Accountant or Board Admin."

    def has_permission(self, request, view):
        return staff_role_allowed(
            request, {User.Role.ACCOUNTANT, User.Role.BOARD_ADMIN}
        )


class IsTicketManager(BasePermission):
    """
    Ticket types: a Content Editor may list and add them; price changes and
    deletion stay with the Treasurer/Board.
    """

    message = "This site can be accessed by the Treasurer/Accountant, Board Admin or Content Editor."

    def has_permission(self, request, view):
        return staff_role_allowed(
            request,
            {User.Role.ACCOUNTANT, User.Role.BOARD_ADMIN},
            editor_may_create=True,
        )


class IsContentEditor(BasePermission):
    """News, events, gallery and publications editing (Content Editor, Board or Super Admin)."""

    message = "This site can be accessed by Content Editor only."

    def has_permission(self, request, view):
        return staff_role_allowed(
            request, {User.Role.CONTENT_EDITOR, User.Role.BOARD_ADMIN}
        )


class IsContentOrFinanceStaff(BasePermission):
    """
    Conference programme (days and sessions): the editor writes the schedule
    and speaker details, the Treasurer runs the conference itself.
    """

    message = (
        "This site can be accessed by Content Editor, Treasurer/Accountant "
        "or Board Admin."
    )

    def has_permission(self, request, view):
        return staff_role_allowed(
            request,
            {User.Role.CONTENT_EDITOR, User.Role.ACCOUNTANT, User.Role.BOARD_ADMIN},
        )
