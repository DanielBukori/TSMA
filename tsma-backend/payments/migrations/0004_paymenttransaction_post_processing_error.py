from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0003_alter_paymenttransaction_gateway"),
    ]

    operations = [
        migrations.AddField(
            model_name="paymenttransaction",
            name="post_processing_error",
            field=models.TextField(blank=True, default=""),
        ),
    ]
