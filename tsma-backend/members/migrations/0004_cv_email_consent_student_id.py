from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("members", "0003_profile_privacy"),
    ]

    operations = [
        migrations.AddField(
            model_name="member",
            name="student_id_image",
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to="student_ids/",
                verbose_name="Picha ya ID ya chuo (Student)",
            ),
        ),
        migrations.AddField(
            model_name="memberprofile",
            name="cv_public",
            field=models.BooleanField(default=False, verbose_name="Ruhusu CV ionekane na jamii"),
        ),
        migrations.AddField(
            model_name="memberprofile",
            name="email_public",
            field=models.BooleanField(
                default=False, verbose_name="Ruhusu barua pepe ionekane na jamii"
            ),
        ),
    ]
