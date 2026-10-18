from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies = [("conferences", "0001_initial")]
    operations = [migrations.CreateModel(name="ConferenceMemory", fields=[
        ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
        ("event_title", models.CharField(help_text="Mfano: Ufunguzi, Tuzo, Networking", max_length=200)),
        ("description", models.TextField(blank=True)),
        ("media_type", models.CharField(choices=[("image", "Photo"), ("youtube", "YouTube"), ("tiktok", "TikTok"), ("instagram", "Instagram")], max_length=20)),
        ("image", models.ImageField(blank=True, null=True, upload_to="conferences/memories/")),
        ("video_url", models.URLField(blank=True, help_text="Link ya YouTube, TikTok au Instagram")),
        ("display_order", models.PositiveIntegerField(default=0)),
        ("is_published", models.BooleanField(default=True)),
        ("created_at", models.DateTimeField(auto_now_add=True)),
        ("conference", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="memories", to="conferences.conference")),
    ], options={"verbose_name": "Conference memory", "verbose_name_plural": "Conference memories", "ordering": ["display_order", "-created_at"]})]
