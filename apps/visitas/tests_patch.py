from django.test import TestCase
from django.contrib.auth.models import User, Group
from rest_framework.test import APIClient
from django.utils import timezone

from apps.pessoas.models import Pessoa
from apps.veiculos.models import Veiculo
from apps.visitas.services.domain import registrar_visita
from apps.visitas.models import VisitaPessoa, GrupoVisita


class PatchVisitasAPITest(TestCase):
    def setUp(self):
        # criar grupo de porteiro e usuário
        porteiro = Group.objects.create(name="porteiro")
        self.user = User.objects.create_user(username="porteiro_user", password="pw")
        self.user.groups.add(porteiro)

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        # criar dados básicos
        self.pessoa = Pessoa.objects.create(nome="Teste Pessoa")
        self.veiculo = Veiculo.objects.create(placa="XYZ1234")

        # registrar visita via domínio
        self.grupo = registrar_visita(
            motivo="Teste Patch",
            autorizado_por="Admin",
            observacao="",
            pessoas_ids=[self.pessoa.id],
            veiculos_ids=[self.veiculo.id],
        )

        self.visita_pessoa = VisitaPessoa.objects.get(grupo=self.grupo)

    def test_patch_visita_pessoa_data_saida(self):
        url = f"/api/visitas/pessoas/{self.visita_pessoa.id}/"
        now = timezone.now().isoformat()
        resp = self.client.patch(url, {"data_saida": now}, format='json')
        self.assertEqual(resp.status_code, 200)

        self.visita_pessoa.refresh_from_db()
        self.assertIsNotNone(self.visita_pessoa.data_saida)

    def test_patch_grupo_data_saida(self):
        url = f"/api/visitas/grupos/{self.grupo.id}/"
        now = timezone.now().isoformat()
        resp = self.client.patch(url, {"data_saida": now}, format='json')
        self.assertIn(resp.status_code, (200, 204))

        self.grupo.refresh_from_db()
        self.assertIsNotNone(self.grupo.data_saida)
