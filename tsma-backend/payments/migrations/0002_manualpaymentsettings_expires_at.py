from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='paymenttransaction',
            name='expires_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name='ManualPaymentSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('bank_name', models.CharField(max_length=150, verbose_name='Jina la Benki')),
                ('account_name', models.CharField(max_length=150, verbose_name='Jina la Akaunti')),
                ('account_number', models.CharField(max_length=50, verbose_name='Namba ya Akaunti')),
                ('swift_code', models.CharField(blank=True, max_length=20, verbose_name='SWIFT/BIC Code (hiari)')),
                ('confirm_phone', models.CharField(help_text='Namba ambayo mwanachama atatuma ujumbe (screenshot/reference) baada ya kulipa, kwa ajili ya uthibitisho.', max_length=20, verbose_name='Namba ya Kutuma Uthibitisho (WhatsApp/SMS)')),
                ('confirm_deadline_hours', models.PositiveIntegerField(default=24, help_text='Mwanachama anapaswa kutuma ujumbe wa uthibitisho ndani ya masaa haya.', verbose_name='Muda wa Kuthibitisha (masaa)')),
                ('extra_instructions_sw', models.TextField(blank=True, verbose_name='Maelezo ya Ziada (Kiswahili) — hiari')),
                ('extra_instructions_en', models.TextField(blank=True, verbose_name='Maelezo ya Ziada (Kiingereza) — hiari')),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Taarifa za Malipo ya Mkono (Manual)',
                'verbose_name_plural': 'Taarifa za Malipo ya Mkono (Manual)',
            },
        ),
    ]
