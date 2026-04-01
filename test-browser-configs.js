const { default: makeWASocket, useMultiFileAuthState, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const readline = require('readline');
const fs = require('fs');

const logger = pino({ level: 'silent' });

const browserConfigs = [
  { name: "macOS Safari", config: Browsers.macOS() },
  { name: "Windows Edge", config: Browsers.windows() },
  { name: "Ubuntu Chrome", config: Browsers.ubuntu("Chrome") },
];

let currentConfigIndex = 0;

async function testWithConfig(phoneNumber, configIndex = 0) {
  if (configIndex >= browserConfigs.length) {
    console.log('\n❌ Nenhuma configuração funcionou.\n');
    console.log('💡 Este é um problema do servidor WhatsApp, não do código.');
    console.log('Tente novamente amanhã ou use outro número.\n');
    process.exit(1);
  }

  const { name, config } = browserConfigs[configIndex];
  
  console.clear();
  console.log(`\n🔄 Tentativa ${configIndex + 1}/${browserConfigs.length}`);
  console.log(`📱 Config: ${name}\n`);
  console.log(`Testando com: +${phoneNumber}\n`);

  try {
    // Criar pasta de sessão exclusiva para esta config
    const sessionDir = `./session-test-${configIndex}`;
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    const sock = makeWASocket({
      auth: state,
      logger: logger,
      browser: config,
      printQRInTerminal: false,
      connectTimeoutMs: 20000,
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        sock.end();
        console.log(`⏳ Timeout - passando para próxima config...\n`);
        testWithConfig(phoneNumber, configIndex + 1).then(resolve).catch(reject);
      }, 15000);

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          clearTimeout(timeout);
          console.log('✅ QR CODE GERADO - CONECTADO!\n');
          console.log('📟 CÓDIGO:\n');
          console.log(qr);
          console.log('\n⏳ Aguardando scan...\n');
        }

        if (connection === 'open') {
          clearTimeout(timeout);
          sock.end();
          console.log('\n🎉 SUCESSO!');
          console.log(`✅ Conectado com: ${name}\n`);
          resolve();
        }

        if (connection === 'close') {
          clearTimeout(timeout);
          const reason = lastDisconnect?.error?.output?.statusCode;
          const msg = lastDisconnect?.error?.message;
          
          console.log(`❌ Erro: ${reason} - ${msg}`);
          console.log(`⏭️  Próxima configuração...\n`);
          
          sock.end();
          setTimeout(() => {
            testWithConfig(phoneNumber, configIndex + 1)
              .then(resolve)
              .catch(reject);
          }, 1000);
        }
      });

      sock.ev.on('creds.update', saveCreds);
    });

  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
    console.log(`⏭️  Próxima configuração...\n`);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    return testWithConfig(phoneNumber, configIndex + 1);
  }
}

// Main
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('📱 Digite seu número WhatsApp (5511999999999): ', async (answer) => {
  rl.close();
  let number = answer.replace(/\D/g, '');
  if (!number.startsWith('55')) {
    number = '55' + number;
  }
  
  try {
    await testWithConfig(number);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
});
