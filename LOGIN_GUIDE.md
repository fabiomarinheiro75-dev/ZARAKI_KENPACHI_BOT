# 📱 Guia de Login - ZARAKI ADM Bot

## Como fazer login no seu celular

### Opção 1: Via QR Code (Recomendado) ✅

Quando iniciar o bot (`npm start`), será exibido um código QR no terminal.

**Passos:**

1. **Execute o bot:**
   ```bash
   npm start
   ```

2. **Procure pelo QR Code no terminal**
   - Será exibido um quadrado com linhas pretas e brancas

3. **No seu celular:**
   - Abra **WhatsApp**
   - Vá em **Configurações** > **Dispositivos vinculados**
   - Toque em **Vincular um dispositivo**
   - Aponte a câmera **para o QR Code** que aparece no terminal

4. **Pronto! ✅**
   - Quando a conexão for estabelecida, aparecerá:
   ```
   ╔══════════════════════════════════════════════════╗
   ║         ✅ BOT CONECTADO COM SUCESSO! ✅        ║
   ╚══════════════════════════════════════════════════╝
   ```

---

## Informações Importantes

### ⚠️ Pode Banir sua Conta?
- **Não!** Usar dispositivos vinculados do WhatsApp é seguro e oficialmente suportado
- O WhatsApp permite, por padrão, múltiplos dispositivos conectados
- Você pode desconectar a qualquer momento

### 🔐 Segurança
- Suas credenciais ficam armazenadas localmente na pasta `session/`
- O código de autenticação é válido por apenas alguns minutos
- Ninguém pode se conectar sem ter acesso ao seu celular

### 📌 Dicas
- Mantenha o terminal aberto enquanto o bot estiver rodfando
- Se desconectar, o bot reconectará automaticamente
- Você pode ter o bot rodando em vários dispositivos ao mesmo tempo

### 🚀 Rodar em Produção
Para rodar o bot em um servidor (like Railway):
```bash
npm start
```

A autenticação continuará funcionando da mesma forma, com o QR Code sendo exibido uma única vez quando o bot primeiro se conectar.

---

## Resolvendo Problemas

### ❌ "Conexão fechada"
- Seu número foi desconectado no WhatsApp Web
- Solução: Execute `npm start` novamente e escaneie o QR Code

### ❌ "Erro ao atualizar foto"
- A URL da imagem está inacessível
- Solução: Verifique sua conexão com a internet

### ❌ "Comando não funciona"
- Certifique-se de que está em um **grupo**
- Certifique-se de que **você é admin**
- Digite `.menu` para ver todos os comandos

---

## Suporte

Se tiver problemas, verifique:
1. ✅ Node.js v20+ instalado: `node --version`
2. ✅ Dependências instaladas: `npm install`
3. ✅ Pasta `session/` criada
4. ✅ WhatsApp no celular está atualizado
