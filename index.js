const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');
const axios = require('axios');
const qrcode = require('qrcode-terminal');

let db = {};
if (fs.existsSync('./database/db.json')) {
  db = JSON.parse(fs.readFileSync('./database/db.json'));
}

function saveDB() {
  fs.writeFileSync('./database/db.json', JSON.stringify(db, null, 2));
}

let reconnectAttempts = 0;

async function startBot() {
  try {
    console.log('\n🔌 Conectando ao WhatsApp...\n');
    
    const { state, saveCreds } = await useMultiFileAuthState('./session');

    const sock = makeWASocket({
      auth: state,
      browser: ["ZARAKI_ADM", "Chrome", "1.0"],
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      generateHighQualityLinkPreview: false,
      retryRequestDelayMs: 100,
      maxMsgsInMemory: 0,
      fireInitQueries: false,
      printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);
    
    let qrDisplayed = false;

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr, isNewLogin } = update;
      
      // 📱 Exibir QR code
      if (qr && !qrDisplayed) {
        qrDisplayed = true;
        reconnectAttempts = 0;
        console.log('\n╔══════════════════════════════════════════════════╗');
        console.log('║                                                  ║');
        console.log('║          📱 ESCANEIE COM SEU CELULAR 📱          ║');
        console.log('║                                                  ║');
        console.log('║  1️⃣  Abra WhatsApp no seu celular               ║');
        console.log('║  2️⃣  Vá em: Configurações > Dispositivos...    ║');
        console.log('║  3️⃣  Toque em "Vincular um dispositivo"         ║');
        console.log('║  4️⃣  Aponte a câmera para o código abaixo       ║');
        console.log('║                                                  ║');
        console.log('╚══════════════════════════════════════════════════╝\n');
        
        qrcode.generate(qr, { small: true });
        console.log('\n⏳ Aguardando confirmação...\n');
      }
      
      // Conectado!
      if (connection === 'open') {
        qrDisplayed = false;
        reconnectAttempts = 0;
        
        console.log('\n╔══════════════════════════════════════════════════╗');
        console.log('║         ✅ BOT CONECTADO COM SUCESSO! ✅        ║');
        console.log('╚══════════════════════════════════════════════════╝\n');
        console.log(`👤 Conectado como: ${sock.user.name || sock.user.id}\n`);

        // 📸 Atualizar foto de perfil
        (async () => {
          try {
            const imageUrl = 'https://images.wallpapersden.com/image/wxl-kenpachi-zaraki-4k-anime_68076.jpg';
            const response = await axios.get(imageUrl, { responseType: 'arrayBuffer', timeout: 10000 });
            await sock.updateProfilePicture(sock.user.id, response.data);
            console.log('✅ Foto de perfil atualizada!\n');
          } catch (error) {
            console.log('⚠️  Erro ao atualizar foto (ignorado)\n');
          }
        })();
      }
      
      // Desconectado
      if (connection === 'close') {
        qrDisplayed = false;
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        console.log(`\n🔴 Desconectado (código: ${statusCode})\n`);
        
        if (shouldReconnect && reconnectAttempts < 5) {
          reconnectAttempts++;
          const delay = 3000 * reconnectAttempts;
          console.log(`⏳ Tentativa ${reconnectAttempts}/5 em ${delay/1000}s...\n`);
          setTimeout(() => { startBot(); }, delay);
        } else if (reconnectAttempts >= 5) {
          console.log('❌ Número máximo de tentativas atingido.\n');
          console.log('⚠️  Possíveis causas:\n');
          console.log('  • Seu número pode estar banido do WhatsApp Web');
          console.log('  • Número precisa de verificação primária');
          console.log('  • Número não está ativo no WhatsApp\n');
          process.exit(1);
        } else {
          console.log('❌ Desconectado permanentemente.\n');
          process.exit(0);
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

      // 📌 PRIVADO - DIVULGAÇÃO
      if (!isGroup) {
        if (text.startsWith(".setdivulgacao")) {
          db.divulgacao = text.replace(".setdivulgacao ", "");
          saveDB();
          return sock.sendMessage(from, { text: "✅ Divulgação salva!" });
        }
        return;
      }

      // Obter info do grupo
      try {
        const metadata = await sock.groupMetadata(from);
        const admins = metadata.participants
          .filter(p => p.admin !== null)
          .map(p => p.id);

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

            await sock.sendMessage(from, {
              text: `⚠️ Aviso ${db[from].warns[sender]}/2`
            });

            if (db[from].warns[sender] >= 2) {
              await sock.groupParticipantsUpdate(from, [sender], "remove");
            }

            saveDB();
          } catch (error) {
            console.log('Erro ao processar anti-link');
          }
          return;
        }

        // Verificar comando
        if (!text.startsWith(".")) return;

        const args = text.slice(1).split(" ");
        const cmd = args.shift().toLowerCase();

        if (!isAdmin) {
          return sock.sendMessage(from, {
            text: "❌ Apenas administradores podem usar comandos."
          });
        }

        // 📋 COMANDOS
        try {
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
              await sock.sendMessage(from, {
                text: "📢 Aviso geral",
                mentions: members
              });
              break;

            case "ban":
              let user = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
              if (user) {
                await sock.groupParticipantsUpdate(from, [user], "remove");
              }
              break;

            case "add":
              if (args[0]) {
                await sock.groupParticipantsUpdate(from, [args[0] + "@s.whatsapp.net"], "add");
              }
              break;

            case "promote":
              let p = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
              if (p) {
                await sock.groupParticipantsUpdate(from, [p], "promote");
              }
              break;

            case "demote":
              let d = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
              if (d) {
                await sock.groupParticipantsUpdate(from, [d], "demote");
              }
              break;

            case "antilink":
              if (args[0] === "on") db[from].antilink = true;
              if (args[0] === "off") db[from].antilink = false;
              await sock.sendMessage(from, {
                text: "🔗 Antilink: " + (db[from].antilink ? "✅ ON" : "❌ OFF")
              });
              saveDB();
              break;

            case "warn":
              let w = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
              if (w) {
                if (!db[from].warns[w]) db[from].warns[w] = 0;
                db[from].warns[w]++;
                await sock.sendMessage(from, { text: `⚠️ Aviso: ${db[from].warns[w]}/2` });
                if (db[from].warns[w] >= 2) {
                  await sock.groupParticipantsUpdate(from, [w], "remove");
                }
                saveDB();
              }
              break;

            case "resetwarn":
              db[from].warns = {};
              saveDB();
              await sock.sendMessage(from, { text: "✅ Avisos resetados!" });
              break;
          }
        } catch (error) {
          console.log('Erro ao processar comando');
        }
      } catch (error) {
        console.log('Erro ao processar mensagem');
      }
    });

    // 🔥 DIVULGAÇÃO AUTOMÁTICA
    setInterval(async () => {
      if (!db.divulgacao) return;
      for (let group in db) {
        if (group.endsWith("@g.us")) {
          try {
            await sock.sendMessage(group, { text: db.divulgacao });
          } catch (error) {
            // ignorar
          }
        }
      }
    }, 40 * 60 * 1000);

  } catch (error) {
    console.log(`❌ Erro: ${error.message}\n`);
    if (reconnectAttempts < 5) {
      reconnectAttempts++;
      console.log(`⏳ Rceonectando (tentativa ${reconnectAttempts})...\n`);
      setTimeout(() => { startBot(); }, 3000);
    }
  }
}

startBot();
