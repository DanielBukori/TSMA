from rest_framework import serializers

from .gateways.registry import gateway_is_available


def validate_gateway_availability(value):
    if not gateway_is_available(value):
        raise serializers.ValidationError(
            "Njia hii ya malipo haipatikani kwa sasa. Tumia Malipo ya Mkono."
        )


class SelectableGatewayField(serializers.CharField):
    """
    `gateway` input for every checkout serializer.

    ChoiceField would freeze the option list at import time, so a gateway whose
    keys appear later would stay invisible until the next redeploy. Checking on
    every request keeps "keys in the backend" as the only switch and blocks a
    direct API call that names a gateway with no credentials.
    """

    def __init__(self, **kwargs):
        kwargs.setdefault("validators", [validate_gateway_availability])
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        return super().to_internal_value(data).strip().lower()
