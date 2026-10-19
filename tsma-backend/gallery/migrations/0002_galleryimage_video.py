# Generated for conference memory video support.
from django.db import migrations, models
import django.core.validators
import common.validators

class Migration(migrations.Migration):
    dependencies = [("gallery", "0001_initial")]
    operations = [
        migrations.AlterField(
            model_name="galleryimage", name="image",
            field=models.ImageField(blank=True, null=True, upload_to="gallery/images/", validators=[common.validators.validate_image_max_8mb], verbose_name="Picha"),
        ),
        migrations.AddField(
            model_name="galleryimage", name="video",
            field=models.FileField(blank=True, null=True, upload_to="gallery/videos/", validators=[django.core.validators.FileExtensionValidator(allowed_extensions=["mp4", "webm", "mov", "m4v"])], verbose_name="Video"),
        ),
    ]
