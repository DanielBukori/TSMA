from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sitecontent', '0002_sitebackgroundimage'),
    ]

    operations = [
        migrations.CreateModel(
            name='PageBannerContent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('page_key', models.CharField(choices=[('about', 'About'), ('board', 'Board'), ('management', 'Management'), ('members', 'Members'), ('conferences', 'Conferences'), ('publications', 'Publications'), ('teaching', 'Teaching / Courses and Training'), ('news', 'News'), ('gallery', 'Gallery'), ('contact', 'Contact'), ('founders', 'Founders'), ('careers', 'Careers'), ('directory', 'Professionals Directory')], max_length=30, unique=True, verbose_name='Ukurasa')),
                ('badge_sw', models.CharField(blank=True, max_length=80, verbose_name='Badge (Kiswahili)')),
                ('badge_en', models.CharField(blank=True, max_length=80, verbose_name='Badge (Kiingereza)')),
                ('title_sw', models.CharField(max_length=200, verbose_name='Kichwa (Kiswahili)')),
                ('title_en', models.CharField(max_length=200, verbose_name='Kichwa (Kiingereza)')),
                ('subtitle_sw', models.TextField(blank=True, verbose_name='Maelezo Mafupi (Kiswahili)')),
                ('subtitle_en', models.TextField(blank=True, verbose_name='Maelezo Mafupi (Kiingereza)')),
                ('cta_text_sw', models.CharField(blank=True, help_text="Hiari — mfano 'Wasilisha Utafiti →'. Acha wazi kama ukurasa hauna kitufe.", max_length=80, verbose_name='Kitufe cha Wito (CTA) — Kiswahili')),
                ('cta_text_en', models.CharField(blank=True, max_length=80, verbose_name='Kitufe cha Wito (CTA) — Kiingereza')),
                ('cta_url', models.CharField(blank=True, help_text='Mfano: /publications/submit-abstract', max_length=200, verbose_name='Kiungo cha CTA (URL ndani ya tovuti)')),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Maudhui ya Banner (Ukurasa)',
                'verbose_name_plural': 'Maudhui ya Banner (Kurasa Zote)',
                'ordering': ['page_key'],
            },
        ),
        migrations.CreateModel(
            name='HomeStat',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('kind', models.CharField(choices=[('big', 'Namba Kuu (katikati)'), ('tile', 'Tile (gridi ya chini)')], default='tile', max_length=10, verbose_name='Aina')),
                ('value', models.CharField(help_text="Maandishi huru — mfano '1,200+', 'TZS 5M', '18', 'Dar es Salaam'.", max_length=50, verbose_name='Thamani')),
                ('label_sw', models.CharField(max_length=100, verbose_name='Maelezo (Kiswahili)')),
                ('label_en', models.CharField(max_length=100, verbose_name='Maelezo (Kiingereza)')),
                ('display_order', models.PositiveIntegerField(default=0)),
            ],
            options={
                'verbose_name': 'Takwimu ya Home (Stat)',
                'verbose_name_plural': 'Takwimu za Home (Stats)',
                'ordering': ['display_order', 'id'],
            },
        ),
    ]
