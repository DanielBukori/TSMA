import importlib.util
from pathlib import Path

from ..payment_services import (
    build_payment_response,
    disburse_payout,
    initiate_payment,
    process_webhook,
    verify_and_sync,
)

# NOTE: `payments/services.py` is a legacy module that defines a few payment
# orchestration helpers used across the project. A sibling directory with the
# same name (`payments/services/`) was introduced later, which caused Python to
# resolve `payments.services` as the package instead of the module. Re-exporting
# the legacy helpers here keeps the import surface stable for existing code.
_legacy_spec = importlib.util.spec_from_file_location(
    "payments._legacy_services",
    Path(__file__).resolve().parent.parent / "services.py",
)
if _legacy_spec and _legacy_spec.loader:
    _legacy_module = importlib.util.module_from_spec(_legacy_spec)
    _legacy_spec.loader.exec_module(_legacy_module)
    dispatch_payment_succeeded = _legacy_module.dispatch_payment_succeeded
