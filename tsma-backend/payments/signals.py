import django.dispatch

# Inatumwa (sent) mara PaymentTransaction inapofanikiwa (status=SUCCESS).
# Kila app (members, conferences) inayotaka kufanya kitu baada ya malipo
# kufanikiwa (mfano: kuwezesha uanachama, kutengeneza risiti ya QR) inaunganisha
# (connect) signal hii kwenye apps.py yake — bila payments app kujua chochote
# kuhusu members au conferences (hivyo hakuna circular import).
payment_succeeded = django.dispatch.Signal()  # kwargs: transaction

payment_failed = django.dispatch.Signal()  # kwargs: transaction
