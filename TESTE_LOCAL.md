# 🚀 Guia de Instalação e Teste Local - Zaraki ADM Bot

## 📋 Pré-requisitos

Você precisa ter instalado no seu computador:

- **Node.js** (v16 ou superior)
  - Download: https://nodejs.org/
  - Verifique: `node --version` e `npm --version`
  
- **Git** (opcional, para clonar o repositório)
  - Download: https://git-scm.com/
  - Verifique: `git --version`

---

## 📥 Passo 1: Obter o Código

### Opção A: Clonar do GitHub (Recomendado)
```bash
git clone https://github.com/fabiomarinheiro75-dev/ZARAKI_KENPACHI_BOT.git
cd ZARAKI_KENPACHI_BOT
```

### Opção B: Download Manual
1. Vá para: https://github.com/fabiomarinheiro75-dev/ZARAKI_KENPACHI_BOT
2. Clique em **Code** → **Download ZIP**
3. Extraia a pasta
4. Abra o terminal e navegue até a pasta

---

## 🔧 Passo 2: Instalar Dependências

No terminal, dentro da pasta do projeto:

```bash
npm install
```

Isso vai instalar todas as bibliotecas necessárias (~200MB).

**Aguarde de 1-3 minutos**

---

## ✅ Passo 3: Iniciar o Bot

```bash
npm start
```

Você verá:

```
╔══════════════════════════════════════════════════╗
║           🤖 ZARAKI ADM BOT LOGIN 🤖            ║
╚══════════════════════════════════════════════════╝

📱 Digite seu número WhatsApp (Ex: 5511999999999):
> 
```

---

## 📱 Passo 4: Inserir Seu Número

Digite seu número de WhatsApp no formato:

```
5511999999999
```

(Código do país + DDD + Número)

---

## 🎯 Passo 5: QR Code

O bot exibirá um **código QR em texto ASCII** assim:

```
📟 QR CODE EM TEXTO:

████████  ██  ██████  ██  █████
██  ████████  ██  ██████████
██████  ████████  ██  ██████
... (mais caracteres)

⏳ Aguardando confirmação...
```

### Como Fazer Scan:

1. Abra o **WhatsApp no seu celular**
2. Vá para: **Configurações** → **Dispositivos conectados** → **Conectar um dispositivo**
3. **Aponte a câmera para a tela do computador** e scan o código
4. Confirme no celular

---

## ✨ Resultado Esperado

Se tudo funcionar:

```
✅ BOT CONECTADO COM SUCESSO! ✅

👤 Conectado: +5511999999999

📢 Pronto para receber comandos nos grupos...
```

---

## 📢 Testando os Comandos

### 1. Convites o Bot para um Grupo

Crie um grupo de teste e adicione o bot.

### 2. Digite um Comando

No grupo, digite:

```
.menu
```

Você receberá:

```
🤖 *ZARAKI ADM*

👮 *ADMIN:*
.ban @user
.add numero
.promote @user
.demote @user

🚫 *MOD:*
.antilink on/off
.warn @user
.resetwarn

📢 *GERAL:*
.hidetag

⚙️ *SISTEMA:*
.ping
```

### 3. Teste Simples

```
.ping
```

Resposta esperada:
```
🏓 Pong!
```

---

## 🛑 Se der Erro

### Erro: "ENOENT: no such file or directory"
```bash
mkdir -p database session
npm start
```

### Erro: "Cannot find module"
```bash
npm install
```

### Erro 405 (Número Bloqueado)
- Use um número diferente
- Aguarde 24h e tente novamente
- Acesse https://web.whatsapp.com no navegador para confirmar se funciona

---

## ⚙️ Configurações Importantes

### Dividulas (Broadcast)

Digite em **privado** com o bot:

```
.setdivulgacao Olá! Este é um teste de divulgação
```

Isso enviará a mensagem para todos os grupos a cada **40 minutos**.

---

## 🔐 Mantendo o Bot Online

### Para Parar o Bot
```
Pressione CTRL + C no terminal
```

### Para Manter Rodando (Alternativas)

**Opção 1: Screen (Linux/Mac)**
```bash
screen -S zaraki
npm start
# Pressione CTRL+A+D para sair mantendo rodando
```

**Opção 2: PM2 (Qualquer SO)**
```bash
npm install -g pm2
pm2 start index.js --name zaraki
pm2 logs zaraki
```

**Opção 3: Tmux (Linux/Mac)**
```bash
tmux new-session -d -s zaraki "npm start"
tmux attach-session -t zaraki
```

---

## 📊 Estrutura do Projeto

```
ZARAKI_KENPACHI_BOT/
├── index.js                 # Código principal do bot
├── package.json             # Dependências
├── database/
│   └── db.json              # Dados salvos (grupos, warns, configs)
├── session/                 # Credenciais WhatsApp (gerado automaticamente)
└── Dockerfile               # Para deploy na nuvem
```

---

## 🚀 Deploy em Produção

Depois de testar localmente e confirmar que funciona:

### Railway (Recomendado)
1. Faça push no GitHub
2. Acesse https://railway.app
3. Conecte seu repositório GitHub
4. Deploy automático ✨

### Heroku
```bash
heroku login
heroku create seu-app-name
git push heroku main
```

### VPS/Servidor Próprio
```bash
git clone seu-repo
cd seu-repo
npm install
npm start
```

---

## 💡 Dicas Importantes

✅ **Bot ligado**: 24/7 respondendo mensagens  
✅ **Dados salvos**: DB armazenado localmente  
✅ **Administrativo**: Apenas admins usam comandos  
✅ **Anti-link**: Remove links com 2 avisos = remoção  

---

## 🆘 Suporte

Se encontrar problemas:

1. Verifique se Node.js está instalado: `node --version`
2. Verifique logs no terminal
3. Confirme que o número tem WhatsApp ativo
4. Tente outro número se receber erro 405

---

## 📝 Checklist Final

- [ ] Node.js instalado
- [ ] Repositório clonado/baixado
- [ ] `npm install` executado
- [ ] `npm start` funcionando
- [ ] Número digitado corretamente
- [ ] QR Code scaneado
- [ ] Bot conectado com sucesso
- [ ] Adicionado a um grupo de teste
- [ ] Comando `.menu` testado
- [ ] Comando `.ping` respondeu "Pong!"

---

## 🎉 Próximas Etapas

Quando confirmar que funciona localmente:

1. ✅ Deploy na nuvem (Railway/Heroku)
2. ✅ Adicionar a mais grupos
3. ✅ Configurar divulgação automática
4. ✅ Treinar admins sobre comandos

---

**Boa sorte! 🚀 Qualquer dúvida, me avise!**
