const { default: makeWASocket, useMultiFileAuthState, Browsers, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

// Logger com output detalhado
const logger = pino({
  level: 'debug',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

async function diagnoseConnection(phoneNumber) {
  console.log('\n🔬 DIAGNÓSTICO DETALHADO DO ERRO 405\n');
  console.log(`📱 Número: +${phoneNumber}`);
  console.log(`🕐 Horário: ${new Date().toLocaleString()}`);
  console.log(`🖥️  Ambiente: Node ${process.version}\n`);

  try {
    // Limpar sessão anterior
    if (fs.existsSync('./session-diagnostic')) {
      fs.rmSync('./session-diagnostic', { recursive: true, force: true });
    }

    console.log('1️⃣  Configurando autenticação...');
    const { state, saveCreds } = await useMultiFileAuthState('./session-diagnostic');

    console.log('2️⃣  Criando socket...');
    const sock = makeWASocket({
      auth: state,
      logger: logger,
      browser: Browsers.ubuntu("Chrome"),
      printQRInTerminal: false,
      // Configurações adicionais para debug
      shouldSyncHistoryMessage: () => false,
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
      connectTimeoutMs: 30000,
      defaultQueryTimeoutMs: 60000,
      emitOwnEvents: true,
      markOnlineAfterLoadingChats: true,
      patchMessageBeforeSending: (message) => {
        console.log('   Patch mensagem:', typeof message);
        return message;
      }
    });

    let connectionAttempt = 0;

    sock.ev.on('connection.update', (update) => {
      connectionAttempt++;
      console.log(`\n🔄 Atualização #${connectionAttempt}:`);
      console.log('   connection:', update.connection || 'N/A');
      console.log('   receivedPendingNotifications:', update.receivedPendingNotifications);
      console.log('   isOnline:', update.isOnline);
      console.log('   isNewLogin:', update.isNewLogin);
      
      if (update.qr) {
        console.log('\n✅ QR CODE GERADO!');
        console.log(update.qr);
      }
      
      if (update.connection === 'connecting') {
        console.log('   ⏳ Conectando ao servidor WhatsApp...');
      }
      
      if (update.connection === 'open') {
        console.log('   ✅ CONECTADO COM SUCESSO!');
        sock.end();
        process.exit(0);
      }
      
      if (update.connection === 'close') {
        const reason = update.lastDisconnect;
        console.log('\n❌ DESCONECTADO');
        console.log('   Razão:', reason?.error?.message || 'Desconexão desconhecida');
        console.log('   Código:', reason?.error?.output?.statusCode || 'N/A');
        
        const statusCode = reason?.error?.output?.statusCode;
        
        if (statusCode === 405) {
          console.log('\n🔴 ERRO 405 DETECTADO');
          console.log('\n📊 Diagnosticando...');
          console.log('   • Este é um erro do SERVIDOR WhatsApp');
          console.log('   • Servidor rejeitou a conexão no handshake NOISE');
          console.log('\n💡 Possíveis causas:');
          console.log('   1. IP do servidor está bloqueado pelo WhatsApp');
          console.log('   2. Taxa de requisições excedida (rate limit)');
          console.log('   3. Número não elegível para WhatsApp Web');
          console.log('   4. Versão do Baileys incompatível');
          console.log('\n🛠️  Possíveis soluções:');
          console.log('   1. Aguarde 1-2 horas e tente novamente');
          console.log('   2. Use um VPN ou proxy diferente');
          console.log('   3. Acesse https://web.whatsapp.com direto no navegador');
          console.log('   4. Tente com um número diferente');
          console.log('   5. Atualize o Baileys: npm install @whiskeysockets/baileys@latest');
          
          process.exit(1);
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);
    
    // Timeout geral
    setTimeout(() => {
      console.log('\n⏱️  Timeout - nenhuma resposta do servidor em 60 segundos');
      console.log('💡 Provavelmente o IP está bloqueado pelo WhatsApp');
      sock.end();
      process.exit(1);
    }, 60000);

  } catch (error) {
    console.error('\n❌ Erro ao criar socket:', error.message);
    console.error('   Stack:', error.stack.slice(0, 200));
    process.exit(1);
  }
}

// Main
const numero = process.argv[2] || '5511999999999';
diagnoseConnection(numero);
