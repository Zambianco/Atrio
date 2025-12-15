from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from apps.visitas.services.domain import (
    registrar_visita,
    sair_pessoa,
    sair_veiculo,
)

from apps.pessoas.models import Pessoa, TipoDocumento, Documento
from apps.veiculos.models import Veiculo
from apps.visitas.models import VisitaPessoa, VisitaVeiculo


class DominioVisitasTest(TestCase):

    def setUp(self):
        self.pessoa = Pessoa.objects.create(nome="João")
        self.veiculo = Veiculo.objects.create(placa="ABC1234")

    # TESTE 1 — Pessoa não entra em duas visitas ao mesmo tempo
    def test_pessoa_nao_pode_entrar_duas_vezes(self):
        registrar_visita(
            motivo="Teste",
            autorizado_por="Admin",
            observacao="",
            pessoas_ids=[self.pessoa.id],
            veiculos_ids=[]
        )

        with self.assertRaises(ValidationError):
            registrar_visita(
                motivo="Teste 2",
                autorizado_por="Admin",
                observacao="",
                pessoas_ids=[self.pessoa.id],
                veiculos_ids=[]
            )

    # TESTE 2 — Veículo não entra em duas visitas ao mesmo tempo
    def test_veiculo_nao_pode_entrar_duas_vezes(self):
        registrar_visita(
            motivo="Teste",
            autorizado_por="Admin",
            observacao="",
            pessoas_ids=[self.pessoa.id],
            veiculos_ids=[self.veiculo.id]
        )

        with self.assertRaises(ValidationError):
            registrar_visita(
                motivo="Teste 2",
                autorizado_por="Admin",
                observacao="",
                pessoas_ids=[self.pessoa.id],
                veiculos_ids=[self.veiculo.id]
            )

    # TESTE 3 — Veículo não pode ficar sem pessoa
    def test_saida_ultima_pessoa_remove_veiculo_e_encerra_visita(self):
        grupo = registrar_visita(
            motivo="Teste",
            autorizado_por="Admin",
            observacao="",
            pessoas_ids=[self.pessoa.id],
            veiculos_ids=[self.veiculo.id]
        )

        visita_pessoa = VisitaPessoa.objects.get(grupo=grupo)
        visita_veiculo = VisitaVeiculo.objects.get(grupo=grupo)

        sair_pessoa(visita_pessoa.id)

        visita_veiculo.refresh_from_db()
        grupo.refresh_from_db()

        self.assertIsNotNone(visita_veiculo.data_saida)
        self.assertIsNotNone(grupo.data_saida)

    # TESTE 4 — Saída de veículo não remove pessoa
    def test_saida_veiculo_nao_remove_pessoa(self):
        grupo = registrar_visita(
            motivo="Teste",
            autorizado_por="Admin",
            observacao="",
            pessoas_ids=[self.pessoa.id],
            veiculos_ids=[self.veiculo.id]
        )

        visita_veiculo = VisitaVeiculo.objects.get(grupo=grupo)
        sair_veiculo(visita_veiculo.id)

        visita_veiculo.refresh_from_db()
        self.assertIsNotNone(visita_veiculo.data_saida)

        self.assertTrue(
            VisitaPessoa.objects.filter(
                grupo=grupo,
                data_saida__isnull=True
            ).exists()
        )

    # TESTE 5 — Documento único por (tipo + número)
    def test_documento_unico_por_tipo_numero(self):
        tipo = TipoDocumento.objects.create(nome="CPF")

        Documento.objects.create(
            pessoa=self.pessoa,
            tipo_documento=tipo,
            numero="123"
        )

        with self.assertRaises(IntegrityError):
            Documento.objects.create(
                pessoa=self.pessoa,
                tipo_documento=tipo,
                numero="123"
            )
