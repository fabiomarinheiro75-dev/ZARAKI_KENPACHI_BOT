const { default: makeWASocket, useMultiFileAuthState, Browsers, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');

// Suprimir logs
const logger = pino({ level: 'silent' });

async function testConnection(phoneNumber) {
  try {
    console.log(`\n📱 Testando conexão com: +${phoneNumber}\n`);
    console.log('Criando socket...');
    
    const { state, saveCreds } = await useMultiFileAuthState('./session-test');

    const sock = makeWASocket({
      auth: state,
      logger: logger,
      browser: Browsers.ubuntu("Chrome"),
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      generateHighQualityLinkPreview: false,
    });

    // Event para debug
    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        console.log('\n✅ QR CODE GERADO COM SUCESSO!\n');
        console.log('📟 CÓDIGO:\n');
        console.log(qr);
        console.log('\n⏳ Aguardando scan...\n');
      }
      
      if (connection === 'open') {
        console.log('\n✅ CONECTADO COM SUCESSO!\n');
        console.log(`Número: +${phoneNumber}`);
        console.log(`Status: Autenticado\n`);
        process.exit(0);
      }
      
      if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode;
        const errorMessage = lastDisconnect?.error?.message || 'Desconexão desconhecida';
        
        console.log('\n❌ ERRO DE CONEXÃO\n');
        console.log(`Código: ${reason}`);
        console.log(`Mensagem: ${errorMessage}\n`);
        
        if (reason === 405) {
          console.log('⚠️  ERRO 405 - Este é um erro do servidor WhatsApp');
          console.log('Possíveis causas:');
          console.log('  • Número não elegível para WhatsApp Web');
          console.log('  • Número bloqueado temporariamente');
          console.log('  • Problema na versão do Baileys\n');
          
          const response = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
          });
          
          response.question('Deseja tentar novamente? (s/n): ', (answer) => {
            response.close();
            if (answer.toLowerCase() === 's') {
              console.log('Aguarde...\n');
              setTimeout(() => {
                require('child_process').exec('rm -rf session-test && node test-connection.js');
              }, 2000);
            } else {
              process.exit(1);
            }
          });
        } else {
          console.log('⏳ Tentando reconectar...\n');
          setTimeout(() => testConnection(phoneNumber), 5000);
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);

  } catch (error) {
    console.error('\n❌ ERRO:', error.message, '\n');
    process.exit(1);
  }
}

// Obter número do argumento ou prompt
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('📱 Digite seu número WhatsApp (5511999999999): ', (answer) => {
  rl.close();
  let number = answer.replace(/\D/g, '');
  if (!number.startsWith('55')) {
    number = '55' + number;
  }
  testConnection(number);
});
