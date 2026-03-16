from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("pessoas", "0003_seed_tipos_documento"),
    ]

    operations = [
        migrations.AlterField(
            model_name="pessoa",
            name="tipo",
            field=models.CharField(
                blank=True,
                choices=[
                    ("visitante", "Visitante"),
                    ("funcionario", "Funcionário"),
                    ("motorista", "Motorista"),
                    ("fornecedor", "Fornecedor"),
                    ("prestador", "Prestador de Serviço"),
                ],
                max_length=20,
                null=True,
            ),
        ),
    ]
