const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');
const axios = require('axios');
const pino = require('pino');
const qrcode = require('qrcode-terminal');

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });

let db = {};
if (fs.existsSync('./database/db.json')) {
  db = JSON.parse(fs.readFileSync('./database/db.json'));
}

function saveDB() {
  fs.writeFileSync('./database/db.json', JSON.stringify(db, null, 2));
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');

  const sock = makeWASocket({
    auth: state,
    browser: ["ZARAKI_ADM", "Chrome", "1.0"],
    logger: pino({ level: 'silent' }),
    generateHighQualityLinkPreview: true
  });

  sock.ev.on('creds.update', saveCreds);
  
  // Rastrear se o QR code foi exibido para evitar duplicatas
  let qrDisplayed = false;

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    // 📱 Renderizar QR code automaticamente
    if (qr && !qrDisplayed) {
      qrDisplayed = true;
      console.log('\n');
      console.log('╔══════════════════════════════════════════════════╗');
      console.log('║                                                  ║');
      console.log('║          📱 ESCANEIE COM SEU CELULAR 📱          ║');
      console.log('║                                                  ║');
      console.log('║  1️⃣  Abra WhatsApp no seu celular               ║');
      console.log('║  2️⃣  Vá em: Configurações > Dispositivos...    ║');
      console.log('║  3️⃣  Toque em "Vincular um dispositivo"         ║');
      console.log('║  4️⃣  Aponte a câmera para o código abaixo       ║');
      console.log('║                                                  ║');
      console.log('╚══════════════════════════════════════════════════╝');
      console.log('\n');
      
      // Renderizar QR code no terminal
      qrcode.generate(qr, { small: true });
    }
    
    if (connection === 'close') {
      qrDisplayed = false; // Reset para exibir QR na próxima vez
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('\n🔴 Conexão fechada.');
      if (shouldReconnect) {
        console.log('⏳ Reconectando em 5 segundos...\n');
        setTimeout(() => { startBot(); }, 5000);
      } else {
        console.log('❌ Desconectado permanentemente. Execute novamente para fazer login.\n');
      }
    } else if (connection === 'open') {
      console.log('\n');
      console.log('╔══════════════════════════════════════════════════╗');
      console.log('║         ✅ BOT CONECTADO COM SUCESSO! ✅        ║');
      console.log('╚══════════════════════════════════════════════════╝\n');

      // 📸 Atualizar foto de perfil
      (async () => {
        try {
          const imageUrl = 'https://images.wallpapersden.com/image/wxl-kenpachi-zaraki-4k-anime_68076.jpg';
          const response = await axios.get(imageUrl, { responseType: 'arrayBuffer' });
          await sock.updateProfilePicture(sock.user.id, response.data);
          console.log('✅ Foto de perfil atualizada com sucesso!\n');
        } catch (error) {
          console.log('⚠️  Erro ao atualizar foto:', error.message, '\n');
        }
      })();
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
          console.log('❌ Erro ao enviar divulgação:', error.message);
        }
      }
    }
  }, 40 * 60 * 1000); // 40 minutos

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const sender = msg.key.participant || from;
    const isGroup = from.endsWith("@g.us");

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    // 📌 COMANDO NO PRIVADO (CONFIGURAR DIVULGAÇÃO)
    if (!isGroup) {
      if (text.startsWith(".setdivulgacao")) {
        db.divulgacao = text.replace(".setdivulgacao ", "");
        saveDB();
        return sock.sendMessage(from, {
          text: "✅ Mensagem de divulgação salva!"
        });
      }
      return;
    }

    // Obter informações do grupo
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
        console.log('❌ Erro ao processar anti-link:', error.message);
      }
      return;
    }

    // Verificar se é comando
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
            text: `🤖 **ZARAKI ADM**

👮 **ADMIN:**
.ban @user
.add numero
.promote @user
.demote @user

🚫 **MOD:**
.antilink on/off
.warn @user
.resetwarn

📢 **GERAL:**
.hidetag

📢 **DIVULGAÇÃO:**
.setdivulgacao (no PV)

⚙️ **SISTEMA:**
.ping`
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
            await sock.sendMessage(from, { text: "✅ Usuário removido!" });
          } else {
            await sock.sendMessage(from, { text: "❌ Mencione um usuário!" });
          }
          break;

        case "add":
          if (args[0]) {
            try {
              await sock.groupParticipantsUpdate(from, [args[0] + "@s.whatsapp.net"], "add");
              await sock.sendMessage(from, { text: "✅ Usuário adicionado!" });
            } catch (error) {
              await sock.sendMessage(from, { text: "❌ Erro ao adicionar usuário!" });
            }
          } else {
            await sock.sendMessage(from, { text: "❌ Use: .add numero" });
          }
          break;

        case "promote":
          let p = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
          if (p) {
            await sock.groupParticipantsUpdate(from, [p], "promote");
            await sock.sendMessage(from, { text: "✅ Usuário promovido!" });
          } else {
            await sock.sendMessage(from, { text: "❌ Mencione um usuário!" });
          }
          break;

        case "demote":
          let d = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
          if (d) {
            await sock.groupParticipantsUpdate(from, [d], "demote");
            await sock.sendMessage(from, { text: "✅ Usuário rebaixado!" });
          } else {
            await sock.sendMessage(from, { text: "❌ Mencione um usuário!" });
          }
          break;

        case "antilink":
          if (args[0] === "on") {
            db[from].antilink = true;
          } else if (args[0] === "off") {
            db[from].antilink = false;
          }

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

            await sock.sendMessage(from, {
              text: `⚠️ Aviso: ${db[from].warns[w]}/2`
            });

            if (db[from].warns[w] >= 2) {
              await sock.groupParticipantsUpdate(from, [w], "remove");
              await sock.sendMessage(from, { text: "⛔ Usuário removido por excesso de avisos!" });
            }

            saveDB();
          } else {
            await sock.sendMessage(from, { text: "❌ Mencione um usuário!" });
          }
          break;

        case "resetwarn":
          db[from].warns = {};
          saveDB();

          await sock.sendMessage(from, {
            text: "✅ Todos os avisos foram resetados!"
          });
          break;

        default:
          await sock.sendMessage(from, {
            text: "❌ Comando não encontrado! Digite *.menu* para ver os comandos."
          });
      }
    } catch (error) {
      console.log('❌ Erro ao processar comando:', error.message);
      await sock.sendMessage(from, { text: "❌ Erro ao executar comando!" });
    }
  });
}

startBot();
