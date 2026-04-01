# 🛠️ Troubleshooting - Erro 405

## Problema: Erro 405 - Connection Failure

Quando você vê:
```
🔴 Conexão fechada. Motivo: 405
⏳ Tentativa 1/5. Reconectando em 5s...
```

Isso significa que o WhatsApp Web rejeitou a conexão.

## ✅ Soluções

### 1️⃣ **Seu número pode estar banido do WhatsApp Web**

**O que fazer:**
- Aguarde 24-48 horas antes de tentar novamente
- Use um número diferente com WhatsApp ativo
- Verifique se consegue acessar [WhatsApp Web](https://web.whatsapp.com) normalmente

### 2️⃣ **Número novo ou sem uso recente**

**O que fazer:**
- Use o número normalmente no WhatsApp por 24 horas
- Envie algumas mensagens normais
- Depois tente conectar o bot

### 3️⃣ **Número desativado no WhatsApp**

**O que fazer:**
- Abra o WhatsApp no seu celular
- Verifique se está ligado e recebendo mensagens
- Se não conseguir usar, restaure o número

### 4️⃣ **Usar Bot em Produção (Railway)**

O codigo agora é otimizado para:
- Menor uso de memória
- Menor uso de CPU
- Melhor reconexão
- Logs simplificados

## 📊 Configurações Otimizadas

```javascript
const sock = makeWASocket({
  auth: state,
  browser: ["ZARAKI_ADM", "Chrome", "1.0"],
  syncFullHistory: false,      // ← Não sincronizar histórico completo
  shouldSyncHistoryMessage: () => false,  // ← Desabilitar sync
  generateHighQualityLinkPreview: false,  // ← Imgs simples
  retryRequestDelayMs: 100,     // ← Retry mais rápido
  maxMsgsInMemory: 0,           // ← Usar mínima memória
  fireInitQueries: false,       // ← Não fazer queries iniciais
  printQRInTerminal: false      // ← QR manual com qrcode-terminal
});
```

## 🔍 Verificar Compatibilidade

```bash
# Ver versão
npm list @whiskeysockets/baileys

# Forçar nova autenticação
rm -rf session/

# Reiniciar
npm start
```

## 📞 Se Ainda Não Funcionar

1. **Tente com outro número** - Confirme se é problema do número ou da configuração
2. **Verifique internet** - Conexão estável é essencial
3. **Atualize Node.js** - Use Node.js v20+: `node --version`
4. **Limpe cache** - `rm -rf node_modules && npm install`

## ✅ Quando Funciona

Você deve ver:
```
🔌 Conectando ao WhatsApp...

╔══════════════════════════════════════════════════╗
║          📱 ESCANEIE COM SEU CELULAR 📱          ║
║  1️⃣  Abra WhatsApp no seu celular               ║
║  2️⃣  Vá em: Configurações > Dispositivos...    ║
║  3️⃣  Toque em "Vincular um dispositivo"         ║
║  4️⃣  Aponte a câmera para o código abaixo       ║
╚══════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════╗
║         ✅ BOT CONECTADO COM SUCESSO! ✅        ║
╚══════════════════════════════════════════════════╝

👤 Conectado como: seu-numero
✅ Foto de perfil atualizada!
```

Aí está tudo funcionando! 🎉
