const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');
const axios = require('axios');
const pino = require('pino');
const readline = require('readline');

// Suprimir logs do Baileys
const logger = pino({ level: 'fatal' });

let db = {};
if (fs.existsSync('./database/db.json')) {
  db = JSON.parse(fs.readFileSync('./database/db.json'));
}

function saveDB() {
  fs.writeFileSync('./database/db.json', JSON.stringify(db, null, 2));
}

// Ler entrada do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askPhoneNumber() {
  return new Promise((resolve) => {
    console.clear();
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║           🤖 ZARAKI ADM BOT LOGIN 🤖            ║');
    console.log('╚══════════════════════════════════════════════════╝\n');
    
    rl.question('📱 Digite seu número WhatsApp (Ex: 5511999999999):\n> ', (answer) => {
      const numero = answer.replace(/\D/g, '');
      if (numero.length < 10) {
        console.log('\n❌ Número inválido! Digite com código do país.\n');
        setTimeout(() => askPhoneNumber().then(resolve), 1000);
      } else {
        resolve(numero);
      }
    });
  });
}

async function startBot(phoneNumber) {
  try {
    console.clear();
    console.log(`\n🔌 Conectando com: +${phoneNumber}\n`);
    
    const { state, saveCreds } = await useMultiFileAuthState('./session');

    const sock = makeWASocket({
      auth: state,
      logger: logger,
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      generateHighQualityLinkPreview: false,
      printQRInTerminal: false,
    });

    sock.ev.on('creds.update', saveCreds);
    
    let qrDisplayed = false;

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      // 📱 Exibir QR code em TEXTO
      if (qr && !qrDisplayed) {
        qrDisplayed = true;
        console.clear();
        console.log('\n╔══════════════════════════════════════════════════╗');
        console.log('║                                                  ║');
        console.log('║        📱 SCANEIE COM SEU CELULAR 📱            ║');
        console.log('║                                                  ║');
        console.log('║  Número: +' + phoneNumber);
        console.log('║                                                  ║');
        console.log('║  Configurações > Dispositivos > Vincular         ║');
        console.log('║                                                  ║');
        console.log('╚══════════════════════════════════════════════════╝\n');
        
        console.log('📟 QR CODE EM TEXTO:\n');
        console.log(qr + '\n');
        console.log('⏳ Aguardando confirmação...\n');
      }
      
      // Conectado!
      if (connection === 'open') {
        console.clear();
        qrDisplayed = false;
        
        console.log('\n╔══════════════════════════════════════════════════╗');
        console.log('║         ✅ BOT CONECTADO COM SUCESSO! ✅        ║');
        console.log('╚══════════════════════════════════════════════════╝\n');
        console.log(`👤 Conectado: +${phoneNumber}\n`);

        // 📸 Atualizar foto
        (async () => {
          try {
            const imageUrl = 'https://images.wallpapersden.com/image/wxl-kenpachi-zaraki-4k-anime_68076.jpg';
            const response = await axios.get(imageUrl, { responseType: 'arrayBuffer', timeout: 10000 });
            await sock.updateProfilePicture(sock.user.id, response.data);
            console.log('✅ Foto de perfil atualizada!\n');
          } catch (error) {
            // silencioso
          }
        })();

        rl.close();
      }
      
      // Desconectado
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        console.log(`\n🔴 Desconectado (código: ${statusCode})\n`);
        
        if (statusCode !== DisconnectReason.loggedOut && statusCode !== 403) {
          console.log('⏳ Reconectando em 5s...\n');
          setTimeout(() => { startBot(phoneNumber); }, 5000);
        } else {
          console.log('❌ Sessão expirada. Reinicie o bot.\n');
          process.exit(1);
        }
      }
    });

    // 📨 PROCESSAR MENSAGENS
    sock.ev.on('messages.upsert', async ({ messages }) => {
      const msg = messages[0];
      if (!msg.message || msg.key.fromMe) return;

      const from = msg.key.remoteJid;
      const sender = msg.key.participant || from;
      const isGroup = from.endsWith("@g.us");

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";

      // 📌 PRIVADO
      if (!isGroup) {
        if (text.startsWith(".setdivulgacao")) {
          db.divulgacao = text.replace(".setdivulgacao ", "");
          saveDB();
          return sock.sendMessage(from, { text: "✅ Divulgação salva!" });
        }
        return;
      }

      try {
        const metadata = await sock.groupMetadata(from);
        const admins = metadata.participants.filter(p => p.admin !== null).map(p => p.id);
        const isAdmin = admins.includes(sender);

        if (!db[from]) {
          db[from] = { antilink: true, warns: {} };
        }

        // 🚫 ANTI-LINK
        const isLink = /(https?:\/\/|chat\.whatsapp\.com|t\.me|telegram\.me)/gi.test(text);
        if (db[from].antilink && isLink && !isAdmin) {
          try {
            await sock.sendMessage(from, { delete: msg.key });
            if (!db[from].warns[sender]) db[from].warns[sender] = 0;
            db[from].warns[sender]++;
            await sock.sendMessage(from, { text: `⚠️ Aviso ${db[from].warns[sender]}/2` });
            if (db[from].warns[sender] >= 2) {
              await sock.groupParticipantsUpdate(from, [sender], "remove");
            }
            saveDB();
          } catch (error) {}
          return;
        }

        if (!text.startsWith(".")) return;

        const args = text.slice(1).split(" ");
        const cmd = args.shift().toLowerCase();

        if (!isAdmin) {
          return sock.sendMessage(from, { text: "❌ Apenas admins usam comandos" });
        }

        switch (cmd) {
          case "menu":
            await sock.sendMessage(from, {
              text: `🤖 *ZARAKI ADM*\n\n👮 *ADMIN:*\n.ban @user\n.add numero\n.promote @user\n.demote @user\n\n🚫 *MOD:*\n.antilink on/off\n.warn @user\n.resetwarn\n\n📢 *GERAL:*\n.hidetag\n\n⚙️ *SISTEMA:*\n.ping`
            });
            break;
          case "ping":
            await sock.sendMessage(from, { text: "🏓 Pong!" });
            break;
          case "hidetag":
            let members = metadata.participants.map(p => p.id);
            await sock.sendMessage(from, { text: "📢 Aviso geral", mentions: members });
            break;
          case "ban":
            let user = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (user) await sock.groupParticipantsUpdate(from, [user], "remove");
            break;
          case "add":
            if (args[0]) await sock.groupParticipantsUpdate(from, [args[0] + "@s.whatsapp.net"], "add");
            break;
          case "promote":
            let p = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (p) await sock.groupParticipantsUpdate(from, [p], "promote");
            break;
          case "demote":
            let d = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (d) await sock.groupParticipantsUpdate(from, [d], "demote");
            break;
          case "antilink":
            if (args[0] === "on") db[from].antilink = true;
            if (args[0] === "off") db[from].antilink = false;
            await sock.sendMessage(from, { text: "🔗 Antilink: " + (db[from].antilink ? "✅" : "❌") });
            saveDB();
            break;
          case "warn":
            let w = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (w) {
              if (!db[from].warns[w]) db[from].warns[w] = 0;
              db[from].warns[w]++;
              await sock.sendMessage(from, { text: `⚠️ Aviso: ${db[from].warns[w]}/2` });
              if (db[from].warns[w] >= 2) await sock.groupParticipantsUpdate(from, [w], "remove");
              saveDB();
            }
            break;
          case "resetwarn":
            db[from].warns = {};
            saveDB();
            await sock.sendMessage(from, { text: "✅ Avisos resetados!" });
            break;
        }
      } catch (error) {}
    });

    // 🔥 DIVULGAÇÃO
    setInterval(async () => {
      if (!db.divulgacao) return;
      for (let group in db) {
        if (group.endsWith("@g.us")) {
          try {
            await sock.sendMessage(group, { text: db.divulgacao });
          } catch (error) {}
        }
      }
    }, 40 * 60 * 1000);

  } catch (error) {
    console.log(`❌ Erro: ${error.message}\n`);
    setTimeout(() => startBot(phoneNumber), 3000);
  }
}

// Iniciar
askPhoneNumber().then(numero => startBot(numero));
