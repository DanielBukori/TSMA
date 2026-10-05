from django.db import migrations


class Migration(migrations.Migration):
    """Ondoa view count kwenye habari (News) - kwa ombi la uongozi."""

    dependencies = [
        ("news", "0001_initial"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="news",
            name="views_count",
        ),
    ]
