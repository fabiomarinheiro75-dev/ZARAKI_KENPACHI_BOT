const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const fs = require('fs');
const pino = require('pino');
const readline = require('readline');
const https = require('https');

// Suprimir logs do Baileys
const logger = pino({ level: 'fatal' });

// Estrutura padrão do DB
let db = { divulgacao: null, grupos: {} };
if (fs.existsSync('./database/db.json')) {
  const loaded = JSON.parse(fs.readFileSync('./database/db.json'));
  db = { ...db, ...loaded };
}

function saveDB() {
  fs.writeFileSync('./database/db.json', JSON.stringify(db, null, 2));
}

// Inicializar grupo com valores padrão
function initializeGroup(groupId) {
  if (!db.grupos[groupId]) {
    db.grupos[groupId] = { antilink: true, warns: {} };
  }
}

// 💳 Função para checar cartão
async function checkCard(cardNumber, month, year, cvv) {
  return new Promise((resolve) => {
    // Fazer a chamada com todos os parâmetros
    const queryParams = new URLSearchParams({
      cc: cardNumber,
      mm: month,
      yy: year,
      cvv: cvv
    });
    
    const apiUrl = `https://api.fdxapis.us/temp/c8935f44-1d76-4c0b-bdf6-faa718e6af77?${queryParams.toString()}`;
    
    https.get(apiUrl, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (e) {
          resolve({ error: 'Erro ao processar resposta', raw: data });
        }
      });
    }).on('error', (error) => {
      resolve({ error: error.message });
    });
  });
}

// 🎌 Função para pesquisar animes
async function searchAnime(query) {
  return new Promise((resolve) => {
    const url = `https://api.jikan.moe/v4/anime?query=${encodeURIComponent(query)}&limit=1`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.data && result.data.length > 0) {
            resolve(result.data[0]);
          } else {
            resolve({ error: 'Anime não encontrado' });
          }
        } catch (e) {
          resolve({ error: 'Erro ao processar resposta' });
        }
      });
    }).on('error', (error) => {
      resolve({ error: error.message });
    });
  });
}

// Ler entrada do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Proteger contra recursão infinita
let maxRetries = 0;
function askPhoneNumber() {
  return new Promise((resolve) => {
    maxRetries++;
    if (maxRetries > 10) {
      console.error('\n❌ Muitas tentativas. Encerrando.\n');
      process.exit(1);
    }
    
    console.clear();
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║           🤖 ZARAKI ADM BOT LOGIN 🤖            ║');
    console.log('╚══════════════════════════════════════════════════╝\n');
    
    rl.question('📱 Digite seu número WhatsApp (Ex: 5511999999999):\n> ', (answer) => {
      let numero = answer.replace(/\D/g, '');
      
      // Garantir que começa com 55 (código do Brasil)
      if (!numero.startsWith('55')) {
        numero = '55' + numero;
      }
      
      if (numero.length < 12) {
        console.log('\n❌ Número inválido! Formato: 55[DDD][9]NÚMERO.\n');
        setTimeout(() => askPhoneNumber().then(resolve), 1000);
      } else {
        maxRetries = 0; // Reset
        resolve(numero);
      }
    });
  });
}

async function startBot(phoneNumber) {
  try {
    // Garantir formato com código do país
    let formattedNumber = phoneNumber;
    if (!formattedNumber.startsWith('55')) {
      formattedNumber = '55' + formattedNumber;
    }
    
    console.clear();
    console.log(`\n🔌 Conectando com: +${formattedNumber}\n`);
    
    const { state, saveCreds } = await useMultiFileAuthState('./session');

    const sock = makeWASocket({
      auth: state,
      logger: logger,
      browser: Browsers.ubuntu("Chrome"),
      printQRInTerminal: false,
    });

    sock.ev.on('creds.update', () => {
      try {
        saveCreds();
      } catch (error) {
        console.error(`❌ Erro ao salvar credenciais: ${error.message}`);
      }
    });
    
    let qrDisplayed = false;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      // 📱 Exibir QR code em TEXTO
      if (qr && !qrDisplayed) {
        qrDisplayed = true;
        reconnectAttempts = 0;
        console.clear();
        console.log('\n╔══════════════════════════════════════════════════╗');
        console.log('║                                                  ║');
        console.log('║        📱 SCANEIE COM SEU CELULAR 📱            ║');
        console.log('║                                                  ║');
        console.log('║  Número: +' + formattedNumber);
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
        console.log(`👤 Conectado: +${formattedNumber}\n`);
        console.log('📢 Pronto para receber comandos nos grupos...\n');
      }
      
      // Desconectado
      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        console.log(`\n🔴 Desconectado (código: ${statusCode})\n`);
        
        // Erro 405 - Número bloqueado ou não elegível
        if (statusCode === 405) {
          reconnectAttempts++;
          console.log(`⚠️  Erro 405: Número pode estar bloqueado (tentativa ${reconnectAttempts}/${maxReconnectAttempts})\n`);
          
          if (reconnectAttempts >= maxReconnectAttempts) {
            console.log('❌ Número não elegível para WhatsApp Web.\n');
            console.log('💡 Soluções:\n');
            console.log('  1. Aguarde 24-48 horas e tente novamente\n');
            console.log('  2. Use outro número com WhatsApp ativo\n');
            console.log('  3. Verifique em: https://web.whatsapp.com\n');
            process.exit(1);
          }
          
          const delay = 10000 * reconnectAttempts;
          console.log(`⏳ Reconectando em ${delay/1000}s...\n`);
          setTimeout(() => { startBot(formattedNumber); }, delay);
        } else if (statusCode !== DisconnectReason.loggedOut && statusCode !== 403) {
          console.log('⏳ Reconectando em 5s...\n');
          setTimeout(() => { startBot(formattedNumber); }, 5000);
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

        initializeGroup(from);
        const groupData = db.grupos[from];

        // 🚫 ANTI-LINK
        const isLink = /(https?:\/\/|chat\.whatsapp\.com|t\.me|telegram\.me)/gi.test(text);
        if (groupData.antilink && isLink && !isAdmin) {
          try {
            try {
              await sock.sendMessage(from, { delete: msg.key });
            } catch (deleteError) {}
            
            if (!groupData.warns[sender]) groupData.warns[sender] = 0;
            groupData.warns[sender]++;
            await sock.sendMessage(from, { text: `⚠️ Aviso ${groupData.warns[sender]}/2 - Proibido links` });
            
            if (groupData.warns[sender] >= 2) {
              await sock.groupParticipantsUpdate(from, [sender], "remove");
              delete groupData.warns[sender];
              await sock.sendMessage(from, { text: `🔴 Removido por spam de links` });
            }
            saveDB();
          } catch (error) {
            console.error(`Erro anti-link: ${error.message}`);
          }
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
              text: `🤖 *ZARAKI ADM*\n\n👮 *ADMIN:*\n.ban @user\n.add numero\n.promote @user\n.demote @user\n\n🚫 *MOD:*\n.antilink on/off\n.warn @user\n.resetwarn\n\n💳 *TOOLS:*\n.chk cc|mm|yy|cvv\n\n🎌 *ANIME:*\n.anime [nome]\n\n📢 *GERAL:*\n.hidetag\n\n⚙️ *SISTEMA:*\n.ping`
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
            if (args[0]) {
              const numero = args[0].replace(/\D/g, '');
              if (numero.length >= 10 && numero.length <= 15) {
                try {
                  await sock.groupParticipantsUpdate(from, [numero + "@s.whatsapp.net"], "add");
                  await sock.sendMessage(from, { text: `✅ ${numero} adicionado` });
                } catch (error) {
                  await sock.sendMessage(from, { text: `❌ Erro ao adicionar` });
                }
              } else {
                await sock.sendMessage(from, { text: `❌ Número inválido. Use: .add 5511999999999` });
              }
            }
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
            if (args[0] === "on") groupData.antilink = true;
            if (args[0] === "off") groupData.antilink = false;
            if (!args[0]) {
              await sock.sendMessage(from, { text: `🔗 Antilink: ${groupData.antilink ? "✅ ATIVO" : "❌ INATIVO"}\nUse: .antilink on/off` });
              break;
            }
            await sock.sendMessage(from, { text: "🔗 Antilink: " + (groupData.antilink ? "✅ ATIVADO" : "❌ DESATIVADO") });
            saveDB();
            break;
          case "warn":
            let w = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (w) {
              if (!groupData.warns[w]) groupData.warns[w] = 0;
              groupData.warns[w]++;
              try {
                await sock.sendMessage(from, { text: `⚠️ Aviso: ${groupData.warns[w]}/2` });
                if (groupData.warns[w] >= 2) {
                  await sock.groupParticipantsUpdate(from, [w], "remove");
                  delete groupData.warns[w];
                }
              } catch (error) {
                console.error(`Erro ao avisar: ${error.message}`);
              }
              saveDB();
            }
            break;
          case "resetwarn":
            groupData.warns = {};
            saveDB();
            await sock.sendMessage(from, { text: "✅ Avisos resetados!" });
            break;
          case "chk":
            if (!args[0]) {
              await sock.sendMessage(from, { text: "❌ Digite: .chk cc|mm|yy|cvv\n\n📋 Formato: 4532123456789010|12|25|123\n\n💡 cc = número do cartão\nmm = mês de expiração\nyy = ano de expiração\ncvv = código de segurança" });
              break;
            }
            
            const cardData = args[0];
            const parts = cardData.split('|');
            
            // Validar formato
            if (parts.length !== 4) {
              await sock.sendMessage(from, { text: "❌ Formato inválido!\n\nUse: .chk cc|mm|yy|cvv\n\nExemplo: .chk 4532123456789010|12|25|123" });
              break;
            }
            
            const [cc, mm, yy, cvv] = parts;
            
            // Validar cartão
            if (!/^\d{13,19}$/.test(cc)) {
              await sock.sendMessage(from, { text: "❌ Número de cartão inválido! (13-19 dígitos)" });
              break;
            }
            
            // Validar mês
            if (!/^\d{2}$/.test(mm) || parseInt(mm) < 1 || parseInt(mm) > 12) {
              await sock.sendMessage(from, { text: "❌ Mês inválido! (01-12)" });
              break;
            }
            
            // Validar ano
            if (!/^\d{2}$/.test(yy)) {
              await sock.sendMessage(from, { text: "❌ Ano inválido! (formato: YY)" });
              break;
            }
            
            // Validar CVV
            if (!/^\d{3,4}$/.test(cvv)) {
              await sock.sendMessage(from, { text: "❌ CVV inválido! (3-4 dígitos)" });
              break;
            }
            
            await sock.sendMessage(from, { text: "🔍 Checando cartão... Aguarde..." });
            
            try {
              const result = await checkCard(cc, mm, yy, cvv);
              
              if (result.error) {
                await sock.sendMessage(from, { text: `❌ Erro: ${result.error}` });
              } else {
                // Formatar resposta
                let response = "💳 *RESULTADO DO CHK*\n\n";
                response += `💳 Cartão: ${cc.slice(0, 4)}***${cc.slice(-4)}\n`;
                response += `📅 Validade: ${mm}/${yy}\n`;
                response += `🔐 CVV: ${cvv}\n\n`;
                
                if (result.status) response += `✅ Status: ${result.status}\n`;
                if (result.brand) response += `🏦 Bandeira: ${result.brand}\n`;
                if (result.type) response += `📋 Tipo: ${result.type}\n`;
                if (result.country) response += `🌍 País: ${result.country}\n`;
                if (result.issuer) response += `🏢 Emissor: ${result.issuer}\n`;
                if (result.valid) response += `✅ Válido: ${result.valid}\n`;
                
                await sock.sendMessage(from, { text: response });
                
                // Log em privado (segurança)
                console.log(`[CHK] ${sender.split('@')[0]} checou cartão: ${cc.slice(-4)}`);
              }
            } catch (error) {
              await sock.sendMessage(from, { text: `❌ Erro ao processar: ${error.message}` });
            }
            break;
          case "anime":
            if (!args[0]) {
              await sock.sendMessage(from, { text: "❌ Digite: .anime [nome do anime]\n\nExemplo: .anime Demon Slayer" });
              break;
            }
            
            const animeName = args.join(" ");
            await sock.sendMessage(from, { text: "🔍 Pesquisando anime... Aguarde..." });
            
            try {
              const animeData = await searchAnime(animeName);
              
              if (animeData.error) {
                await sock.sendMessage(from, { text: `❌ ${animeData.error}` });
              } else {
                // Formatar resposta
                let response = "🎌 *INFORMAÇÕES DO ANIME*\n\n";
                response += `📽️ Título: ${animeData.title || 'N/A'}\n`;
                response += `🌐 Título EN: ${animeData.title_english || 'N/A'}\n`;
                response += `📊 Tipo: ${animeData.type || 'N/A'}\n`;
                response += `📺 Episódios: ${animeData.episodes || 'N/A'}\n`;
                response += `⭐ Score: ${animeData.score || 'N/A'}\n`;
                response += `📅 Status: ${animeData.status || 'N/A'}\n`;
                response += `🕐 Aired: ${animeData.aired?.string || 'N/A'}\n`;
                response += `🎬 Estúdio: ${animeData.studios?.[0]?.name || 'N/A'}\n\n`;
                response += `📝 Sinopse:\n${(animeData.synopsis || 'N/A').substring(0, 200)}...\n\n`;
                response += `🔗 Link: ${animeData.url || 'N/A'}`;
                
                await sock.sendMessage(from, { text: response });
              }
            } catch (error) {
              await sock.sendMessage(from, { text: `❌ Erro ao buscar anime: ${error.message}` });
            }
            break;
        }
      } catch (error) {
        console.error(`❌ Erro ao processar comando: ${error.message}`);
      }
    });

    // 🔥 DIVULGAÇÃO
    setInterval(async () => {
      if (!db.divulgacao) return;
      
      const grupos = Object.keys(db.grupos).filter(g => g.endsWith("@g.us"));
      if (grupos.length === 0) return;
      
      console.log(`📢 Enviando divulgação para ${grupos.length} grupo(s)...`);
      
      for (const group of grupos) {
        try {
          await sock.sendMessage(group, { text: db.divulgacao });
          console.log(`✅ Divulgação enviada para ${group}`);
        } catch (error) {
          console.error(`❌ Erro ao enviar divulgação: ${error.message}`);
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
