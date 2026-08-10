# Atrio

Sistema de controle de acesso e portaria em Django.

## Requisitos

- Python 3.12+

## Desenvolvimento (sem Docker)

1) Crie o arquivo de ambiente:
```powershell
copy Atrio\.env.example Atrio\.env
```

Edite `Atrio/.env` e ajuste `DB_NAME` para `atrio.sqlite3` (no Docker ele e sobrescrito).

2) Instale as dependencias:
```powershell
pip install -r requirements.txt
```

3) Rode as migracoes:
```powershell
python manage.py migrate
```

4) Crie o primeiro admin:
```powershell
python manage.py createsuperuser
```

5) Colete os estaticos (necessario quando DEBUG=False):
```powershell
python manage.py collectstatic
```

6) Suba o servidor (desenvolvimento):
```powershell
python manage.py runserver
```

Abra no navegador: `http://127.0.0.1:8000/`

## Observacoes de producao

- Este projeto usa WhiteNoise para servir arquivos estaticos quando `DEBUG=False`.
- O comando `runserver` continua sendo servidor de desenvolvimento.
- Para producao com Docker, veja a secao abaixo.

## Producao (Docker)

### Linux

```bash
cp .env.example .env
cp Atrio/.env.example Atrio/.env
sudo mkdir -p /mnt/atrio-backups
sudo chown -R $USER:$USER /mnt/atrio-backups
docker compose up -d --build
docker compose exec web python manage.py createsuperuser
```

Edite o `.env` da raiz para definir a porta e a pasta do host. Esse arquivo e lido pelo Docker Compose e deve conter, por exemplo:

```env
WEB_PORT=8001
BACKUP_HOST_DIR=/mnt/server-acesso/Sistema/atrio-backup
```

### Windows

```powershell
copy .env.example .env
copy Atrio\.env.example Atrio\.env
mkdir D:\AtrioBackups
docker compose -f docker-compose.yml -f docker-compose.windows.yml up -d --build
docker compose exec web python manage.py createsuperuser
```

No Windows, ajuste `BACKUP_HOST_DIR=D:/AtrioBackups` no `.env` da raiz antes de subir os containers.

Notas:
- Edite `Atrio/.env` e ajuste `ALLOWED_HOSTS` para o dominio ou IP de producao.
- Backups do banco (SQLite):
  - O banco fica no volume nomeado `atrio_db` (montado em `/data`).
  - Os backups sao salvos em `/mnt/atrio-backups` dentro do container.
  - O intervalo padrao e 3600s (1h). Para ajustar, edite `BACKUP_INTERVAL_SECONDS` no `docker-compose.yml`.
  - Para mudar a pasta do host, edite `BACKUP_HOST_DIR` no `.env` da raiz. Mantenha `BACKUP_DIR=/mnt/atrio-backups` em `Atrio/.env`.
  - O container detecta o GID da pasta montada e concede acesso ao usuario `app` automaticamente. Se o filesystem nao informar o GID correto, defina `BACKUP_GID` em `Atrio/.env`.
- Acesse: `http://127.0.0.1:8001/` (ou a porta definida em `WEB_PORT`).

### Diagnostico de permissao dos backups

Para confirmar o caminho montado e testar o acesso com o mesmo usuario do Gunicorn:

```bash
docker inspect atrio-web-1 --format '{{range .Mounts}}{{if eq .Destination "/mnt/atrio-backups"}}{{.Source}}{{end}}{{end}}'
docker compose exec -u app web python -c 'import os; p=os.getenv("BACKUP_DIR", "/mnt/atrio-backups"); print(p, os.path.isdir(p), len(os.listdir(p)))'
```

Depois de alterar permissoes, GID ou caminho, reconstrua o servico para aplicar o fix do entrypoint:

```bash
docker compose up -d --build --force-recreate web
```
