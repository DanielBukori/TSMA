from django.db import migrations, models


def make_all_profiles_private(apps, schema_editor):
    """
    Profaili zilizokuwepo zilikuwa public kwa default (bila mwanachama
    kuulizwa). Sasa zote zinakuwa siri hadi mwenyewe ajibu swali la
    "Je, unataka profaili yako ionekane na jamii?".
    """
    MemberProfile = apps.get_model("members", "MemberProfile")
    MemberProfile.objects.filter(is_public=True).update(is_public=False)


class Migration(migrations.Migration):

    dependencies = [
        ("members", "0002_memberprofile"),
    ]

    operations = [
        migrations.AlterField(
            model_name="memberprofile",
            name="is_public",
            field=models.BooleanField(default=False, verbose_name="Imetolewa kwa jamii (Directory)"),
        ),
        migrations.AddField(
            model_name="memberprofile",
            name="visibility_decided",
            field=models.BooleanField(
                default=False, verbose_name="Ameshajibu swali la kuitoa kwa jamii"
            ),
        ),
        migrations.RunPython(make_all_profiles_private, migrations.RunPython.noop),
    ]
