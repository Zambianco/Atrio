# Restauração de Backup

Os backups são arquivos `.enc` criptografados com AES-256-CBC via OpenSSL.

## Localização dos backups

Os arquivos ficam em `S:\Publico\Sistema\atrio-backup\` (Windows Server) ou `/mnt/server-acesso/Sistema/atrio-backup/` (Linux).

## 1. Descriptografar o backup

### Linux / macOS
```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
  -in db-YYYYMMDD-HHMMSS.enc \
  -out atrio.sqlite3 \
  -pass pass:"SUA_SENHA"
```

### Windows (Git Bash ou WSL)
```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -in db-YYYYMMDD-HHMMSS.enc -out atrio.sqlite3 -pass pass:"SUA_SENHA"
```

## 2. Verificar integridade

```bash
sqlite3 atrio.sqlite3 "SELECT count(*) FROM sqlite_master;"
```

Deve retornar um número sem erros.

## 3. Restaurar no servidor

```bash
# Parar o sistema
cd ~/docker/Atrio
docker compose down

# Copiar o arquivo restaurado para o volume
docker run --rm \
  -v atrio_atrio_db:/data \
  -v $(pwd):/backup \
  alpine cp /backup/atrio.sqlite3 /data/atrio.sqlite3

# Subir o sistema
docker compose up -d
```
