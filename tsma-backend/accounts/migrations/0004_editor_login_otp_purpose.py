from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("accounts", "0003_rename_accounts_em_user_id_5b0c1e_idx_accounts_em_user_id_c8d77b_idx")]

    operations = [
        migrations.AlterField(
            model_name="emailotp",
            name="purpose",
            field=models.CharField(
                choices=[
                    ("verify_email", "Verify email"),
                    ("reset_password", "Reset password"),
                    ("editor_login", "Editor two-factor login"),
                ],
                max_length=20,
            ),
        ),
    ]
