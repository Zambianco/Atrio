from django.db import migrations


def criar_grupos_padrao(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    for nome in ["porteiro", "usuario"]:
        Group.objects.get_or_create(name=nome)


class Migration(migrations.Migration):
    dependencies = [
        ("auth", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(criar_grupos_padrao, migrations.RunPython.noop),
    ]
