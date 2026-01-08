from django.db import migrations


def criar_tipos_documento_padrao(apps, schema_editor):
    TipoDocumento = apps.get_model("pessoas", "TipoDocumento")
    for nome in ["CPF", "RG", "CNH", "Carteira de Trabalho"]:
        TipoDocumento.objects.get_or_create(nome=nome)


class Migration(migrations.Migration):
    dependencies = [
        ("pessoas", "0002_documento_unique_tipo_numero_documento"),
    ]

    operations = [
        migrations.RunPython(criar_tipos_documento_padrao, migrations.RunPython.noop),
    ]
