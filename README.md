# SIGES-BM — Sistema de Gestao de Jornadas Extraordinarias

Sistema para controle de jornadas extraordinarias do Corpo de Bombeiros Militar.

---

## Requisitos

- **Docker** e **Docker Compose** instalados no servidor.
  - Ubuntu/Debian: `sudo apt update && sudo apt install docker.io docker-compose-v2 -y`
  - Apos instalar, adicione seu usuario ao grupo docker: `sudo usermod -aG docker $USER` (reinicie a sessao)

---

## Instalacao

### 1. Copie a pasta para o servidor

Extraia o arquivo no servidor:

```bash
tar -xzf siges-canarana.tar.gz
cd siges-canarana
```

### 2. Configure a porta (opcional)

Edite o arquivo `.env` para alterar a porta. O padrao e 3000:

```
PORTA=3000
```

### 3. Suba o sistema

```bash
docker compose up -d --build
```

### 4. Acesse no navegador

```
http://IP-DO-SERVIDOR:3000
```

Pronto. O sistema esta rodando. Os dados sao persistidos automaticamente em um volume Docker.

---

## Personalizacao do quartel

Edite o arquivo `frontend/config.js` para alterar o nome do quartel:

```javascript
window.SIGES_CONFIG = {
  quartel: 'Confresa',
  subtitulo: 'Corpo de Bombeiros Militar - Nucleo de Confresa',
  rodape: 'Estado de Mato Grosso - Corpo de Bombeiros Militar - Nucleo de Confresa',
};
```

Apos editar, basta recarregar a pagina no navegador (Ctrl+F5). Nao precisa reiniciar o Docker.

---

## Comandos uteis

| Acao | Comando |
|------|---------|
| Iniciar | `docker compose up -d` |
| Parar | `docker compose down` |
| Ver logs | `docker compose logs -f` |
| Reiniciar | `docker compose restart` |
| Rebuild apos atualizacao | `docker compose up -d --build` |
| Ver status | `docker compose ps` |

---

## Backup dos dados

Os dados ficam em um volume Docker. Para fazer backup:

```bash
# Exportar dados (salva em backup_dados.json)
curl -s http://localhost:3000/api/dados > backup_dados.json

# Restaurar dados de um backup
curl -X POST -H "Content-Type: application/json" \
  -d "{\"dados\": $(cat backup_dados.json)}" \
  http://localhost:3000/api/dados
```

Recomendacao: configure um cron job para backup automatico:

```bash
# Editar crontab
crontab -e

# Adicionar linha (backup diario as 23h):
0 23 * * * curl -s http://localhost:3000/api/dados > /home/$USER/backups/siges_$(date +\%Y\%m\%d).json
```

---

## Acesso pela rede externa

O sistema sobe em HTTP na rede local. Para acesso externo com HTTPS, voce tem algumas opcoes:

### Opcao 1: Tailscale Funnel (mais simples)

O Tailscale cria uma VPN e expoe o app na internet com HTTPS automatico, sem precisar abrir portas no roteador.

```bash
# 1. Instalar o Tailscale
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# 2. Acessar o link exibido no terminal para autenticar com sua conta Tailscale

# 3. Expor o app na internet com HTTPS
sudo tailscale funnel --bg 3000
```

O Tailscale vai gerar uma URL tipo `https://nome-do-servidor.tail12345.ts.net` que funciona de qualquer lugar.

### Opcao 2: Apache como proxy reverso (se ja tem Apache instalado)

Se o servidor ja roda Apache com HTTPS configurado:

```apache
# /etc/apache2/sites-available/siges.conf
<VirtualHost *:443>
    ServerName siges.seudominio.com.br

    SSLEngine on
    SSLCertificateFile /caminho/para/certificado.crt
    SSLCertificateKeyFile /caminho/para/chave.key

    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/

    <Proxy *>
        Require all granted
    </Proxy>
</VirtualHost>
```

```bash
sudo a2enmod proxy proxy_http ssl
sudo a2ensite siges
sudo systemctl reload apache2
```

### Opcao 3: Nginx como proxy reverso

```nginx
server {
    listen 443 ssl;
    server_name siges.seudominio.com.br;

    ssl_certificate     /caminho/para/certificado.crt;
    ssl_certificate_key /caminho/para/chave.key;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Opcao 4: Caddy (HTTPS automatico com Let's Encrypt)

```bash
# Instalar Caddy
sudo apt install -y caddy

# Configurar (/etc/caddy/Caddyfile)
siges.seudominio.com.br {
    reverse_proxy 127.0.0.1:3000
}

sudo systemctl restart caddy
```

O Caddy obtem e renova o certificado SSL automaticamente. Necessario: dominio apontando para o IP do servidor e porta 443 aberta.

---

## Estrutura de arquivos

```
siges-canarana/
├── docker-compose.yml   # Orquestracao dos containers
├── .env                 # Porta do servidor (editavel)
├── nginx.conf           # Configuracao do proxy interno
├── frontend/            # Interface web (HTML/CSS/JS)
│   ├── index.html
│   ├── config.js        # ← Nome do quartel (editavel)
│   ├── css/style.css
│   ├── js/              # Logica da aplicacao
│   └── img/             # Logo CBM-MT
├── api/                 # Backend Python (FastAPI)
│   ├── Dockerfile
│   ├── main.py
│   └── requirements.txt
└── README.md            # Este arquivo
```

---

## Suporte

Desenvolvido por **SD BM Walingson**.
