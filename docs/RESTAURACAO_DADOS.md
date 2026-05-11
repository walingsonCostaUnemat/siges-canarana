# Manual de Restauracao de Dados — SIGES-BM Canarana

Procedimentos para fazer backup e restaurar os dados do sistema em caso de perda, exclusao acidental ou migracao de servidor.

---

## 1. Onde ficam os dados

- **Em producao (Hostinger):** `/opt/canarana/` (codigo) + volume Docker `canarana_dados` (dados)
- **Caminho real do JSON dentro do container:** `/data/dados.json`
- **Backups automaticos:** `/opt/backups/canarana-YYYYMMDD-HHMMSS.json.gz`
- **Frequencia de backup:** diario as 23:00 (cron)
- **Retencao:** 30 dias (backups antigos sao apagados automaticamente)

---

## 2. Listar backups disponiveis

```bash
ssh hostinger-sigav 'ls -lh /opt/backups/canarana-*.json.gz'
```

Saida tipica:
```
-rw-r--r-- 1 root root 1.1K May 11 23:00 /opt/backups/canarana-20260511-230000.json.gz
-rw-r--r-- 1 root root 1.1K May 12 23:00 /opt/backups/canarana-20260512-230000.json.gz
```

---

## 3. Inspecionar um backup (sem restaurar)

Ver resumo do conteudo:

```bash
ssh hostinger-sigav 'zcat /opt/backups/canarana-20260511-230000.json.gz | \
  python3 -c "import json,sys; d=json.load(sys.stdin); print(\"militares:\",len(d[\"militares\"]),\"valores:\",len(d[\"valores\"]),\"jornadas:\",len(d[\"jornadas\"]),\"recursos:\",len(d[\"recursos\"]))"'
```

Ver conteudo completo (formatado):

```bash
ssh hostinger-sigav 'zcat /opt/backups/canarana-20260511-230000.json.gz | python3 -m json.tool' | less
```

Baixar para a maquina local para inspecao:

```bash
scp hostinger-sigav:/opt/backups/canarana-20260511-230000.json.gz /tmp/
zcat /tmp/canarana-20260511-230000.json.gz | python3 -m json.tool
```

---

## 4. Restaurar dados (procedimento padrao)

> **CRITICO:** a restauracao **sobrescreve completamente** o `dados.json` em producao. Sempre faca um backup do estado atual antes, mesmo que pareca corrompido.

### Passo 1 — Backup do estado atual (antes de restaurar)

```bash
ssh hostinger-sigav '/usr/local/bin/canarana-backup.sh && ls -lt /opt/backups/canarana-*.json.gz | head -1'
```

### Passo 2 — Escolha o backup para restaurar

Liste os backups e identifique o arquivo (use a data mais proxima do momento em que os dados estavam corretos).

```bash
ssh hostinger-sigav 'ls -lh /opt/backups/canarana-*.json.gz'
```

### Passo 3 — Restaurar

Substitua `ARQUIVO` pelo nome do backup escolhido:

```bash
ARQUIVO=canarana-20260511-230000.json.gz

ssh hostinger-sigav "zcat /opt/backups/$ARQUIVO | \
  python3 -c 'import json,sys; print(json.dumps({\"dados\": json.load(sys.stdin)}))' | \
  curl -sS -X POST -H 'Content-Type: application/json' -d @- http://127.0.0.1:3003/api/dados"
```

### Passo 4 — Verificar restauracao

```bash
ssh hostinger-sigav 'curl -s http://127.0.0.1:3003/api/dados | \
  python3 -c "import json,sys; d=json.load(sys.stdin); print(\"militares:\",len(d[\"militares\"]),\"jornadas:\",len(d[\"jornadas\"]),\"recursos:\",len(d[\"recursos\"]))"'
```

### Passo 5 — Avisar usuarios

Peca para os usuarios darem **Ctrl+F5** (hard refresh) no navegador. O localStorage deles pode estar com dados mais novos que o servidor — o `init()` faz merge automatico, entao o que tiverem localmente que o servidor nao tem sera empurrado de volta.

---

## 5. Restauracao parcial (apenas uma secao)

As vezes voce so quer recuperar **militares** ou **jornadas** de um backup, sem mexer no resto. Procedimento:

```bash
# 1. Baixar o backup
scp hostinger-sigav:/opt/backups/canarana-20260511-230000.json.gz /tmp/

# 2. Pegar o estado atual do servidor
ssh hostinger-sigav 'curl -s http://127.0.0.1:3003/api/dados' > /tmp/atual.json

# 3. Editar manualmente: pegue militares do backup, deixe o resto do atual
zcat /tmp/canarana-20260511-230000.json.gz | python3 -c "
import json, sys
bkp = json.load(sys.stdin)
atual = json.load(open('/tmp/atual.json'))
# Substitui apenas militares
atual['militares'] = bkp['militares']
print(json.dumps({'dados': atual}))
" > /tmp/restore.json

# 4. Enviar de volta
scp /tmp/restore.json hostinger-sigav:/tmp/
ssh hostinger-sigav 'curl -sS -X POST -H "Content-Type: application/json" -d @/tmp/restore.json http://127.0.0.1:3003/api/dados && rm /tmp/restore.json'
```

---

## 6. Backup manual sob demanda

Para gerar um backup imediato (fora do horario do cron):

```bash
ssh hostinger-sigav '/usr/local/bin/canarana-backup.sh'
```

O arquivo gerado vai aparecer em `/opt/backups/` com timestamp atual.

---

## 7. Restaurar a partir de um dump exportado pelo proprio app

O sistema permite exportar a planilha Excel via interface (botao "Exportar Excel"). **Esse Excel nao e um backup completo** — ele perde os IDs internos e pode introduzir duplicatas ao reimportar. Use para conferencia, nao como mecanismo de backup.

Para backup confiavel, use sempre o JSON do volume Docker (cron diario).

---

## 8. Restaurar em outra maquina (migracao)

Cenario: quer mover o app para outro servidor.

```bash
# 1. No servidor antigo: gera backup atual
ssh hostinger-sigav '/usr/local/bin/canarana-backup.sh && ls -t /opt/backups/canarana-*.json.gz | head -1'

# 2. Copiar o backup para o servidor novo
scp hostinger-sigav:/opt/backups/canarana-XXXX.json.gz novo-servidor:/tmp/

# 3. No servidor novo: clonar repo + subir containers
ssh novo-servidor 'git clone https://github.com/walingsonCostaUnemat/siges-canarana.git /opt/canarana && \
  cd /opt/canarana && docker compose up -d --build'

# 4. Esperar containers subirem
sleep 10

# 5. Importar o backup no servidor novo
ssh novo-servidor "zcat /tmp/canarana-XXXX.json.gz | \
  python3 -c 'import json,sys; print(json.dumps({\"dados\": json.load(sys.stdin)}))' | \
  curl -sS -X POST -H 'Content-Type: application/json' -d @- http://127.0.0.1:3003/api/dados"
```

---

## 9. Recuperar dados do localStorage de um usuario

Se um usuario tem dados no navegador dele que o servidor perdeu (cenario do bug antigo de Saturday do Ten Sena):

1. Peca para o usuario abrir o app em uma **rede com acesso ao servidor**
2. Abrir DevTools (F12) > Console
3. Rodar:
   ```javascript
   const local = {
     militares: JSON.parse(localStorage.getItem('siges_militares')||'[]'),
     valores:   JSON.parse(localStorage.getItem('siges_valores')||'[]'),
     jornadas:  JSON.parse(localStorage.getItem('siges_jornadas')||'[]'),
     recursos:  JSON.parse(localStorage.getItem('siges_recursos')||'[]'),
   };
   copy(JSON.stringify({ dados: local }));
   console.log('Copiado para clipboard. Cole em um arquivo e envie ao administrador.');
   ```
4. O usuario cola num arquivo `.json` e envia
5. Administrador faz merge com o estado do servidor (ver "Restauracao parcial")

> Importante: o `init()` do app ja faz merge automatico — se o usuario tiver internet e abrir o app, ele empurra os dados locais que o servidor nao tem. Esse procedimento manual so e necessario se o `init()` falhar por algum motivo.

---

## 10. Verificar saude do backup automatico

```bash
# Ultimas execucoes do cron
ssh hostinger-sigav 'tail -20 /var/log/canarana-backup.log'

# Backups gerados nos ultimos 7 dias
ssh hostinger-sigav 'find /opt/backups -name "canarana-*.json.gz" -mtime -7 -ls'

# Cron registrado
ssh hostinger-sigav 'crontab -l | grep canarana'
```

Se o cron parar de gerar backups, verificar:
1. O servico do docker container `canarana-web-1` esta rodando? (`docker ps | grep canarana`)
2. A porta 3003 responde? (`curl http://127.0.0.1:3003/api/health`)
3. O script tem permissao de execucao? (`ls -la /usr/local/bin/canarana-backup.sh`)

---

## 11. Contatos

- **Desenvolvedor:** SD BM Walingson
- **Repositorio:** https://github.com/walingsonCostaUnemat/siges-canarana
- **Painel Hostinger:** https://hpanel.hostinger.com/ (conta: cursosticbm@gmail.com)

---

*Documento atualizado em 11/05/2026. Mantenha atualizado quando houver mudancas na infraestrutura.*
