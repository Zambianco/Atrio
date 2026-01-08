# Atrio

Sistema de controle de acesso e portaria em Django.

## Requisitos

- Python 3.12+

## Desenvolvimento (sem Docker)

1) Crie o arquivo de ambiente:
```powershell
copy Atrio\.env.example Atrio\.env
```

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
cp Atrio/.env.example Atrio/.env
touch db.sqlite3
sudo mkdir -p /mnt/atrio-backups
sudo chown -R $USER:$USER /mnt/atrio-backups
export BACKUP_HOST_DIR=/mnt/atrio-backups
docker compose up -d --build
docker compose exec web python manage.py createsuperuser
```

### Windows

```powershell
copy Atrio\.env.example Atrio\.env
ni db.sqlite3 -ItemType File
mkdir D:\AtrioBackups
$env:BACKUP_HOST_DIR="D:/AtrioBackups"
docker compose -f docker-compose.yml -f docker-compose.windows.yml up -d --build
docker compose exec web python manage.py createsuperuser
```

1) Crie o arquivo de ambiente:
```powershell
copy Atrio\.env.example Atrio\.env
```

Edite `Atrio/.env` e ajuste `ALLOWED_HOSTS` para o dominio ou IP de producao.

2) Suba o container:
```powershell
docker compose up -d --build
```

3) Crie o primeiro admin:
```powershell
docker compose exec web python manage.py createsuperuser
```

4) Backups do banco (SQLite):
- O banco fica em `./db.sqlite3` para facilitar download manual.
- Os backups sao salvos em `/mnt/atrio-backups` dentro do container.
- O intervalo padrao e 3600s (1h). Para ajustar, edite `BACKUP_INTERVAL_SECONDS` no `docker-compose.yml`.
- Para mudar a pasta de backups, edite `BACKUP_DIR` em `Atrio/.env` e ajuste o volume no `docker-compose.yml`.

5) Acesse:
`http://127.0.0.1:8000/`

### Debian (Linux)

Crie a pasta de backup no host:
```bash
touch db.sqlite3
sudo mkdir -p /mnt/atrio-backups
sudo chown -R $USER:$USER /mnt/atrio-backups
```

Suba o container normalmente (opcional: defina `BACKUP_HOST_DIR`):
```bash
export BACKUP_HOST_DIR=/mnt/atrio-backups
docker compose up -d --build
```

### Windows

Defina o caminho no host:
```powershell
$env:BACKUP_HOST_DIR="D:/AtrioBackups"
```

Suba o container com override:
```powershell
docker compose -f docker-compose.yml -f docker-compose.windows.yml up -d --build
```
