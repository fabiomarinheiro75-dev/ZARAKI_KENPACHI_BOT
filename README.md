# 🤖 ZARAKI ADM Bot

Bot administrativo para WhatsApp usando Baileys

## 📋 Funcionalidades

- ✅ Anti-Link automático
- ✅ Sistema de avisos
- ✅ Comandos administrativos (ban, kick, promote, demote)
- ✅ Divulgação automática
- ✅ Foto de perfil customizável

## 🚀 Instalação Local

```bash
npm install
npm start
```

## 📦 Deploy no Railway

1. Faça push do seu código para GitHub
2. Conecte seu repositório no Railway
3. O Dockerfile será detectado automaticamente
4. Configure variáveis de ambiente se necessário

## 📌 Comandos

- `.menu` - Mostra todos os comandos
- `.ping` - Testa a conexão
- `.ban @user` - Remove um usuário
- `.add numero` - Adiciona um usuário
- `.promote @user` - Promove um admin
- `.demote @user` - Remove privilégios de admin
- `.antilink on/off` - Ativa/desativa anti-link
- `.warn @user` - Avisa um usuário
- `.resetwarn` - Reseta todos os avisos
- `.hidetag` - Menciona todos do grupo
- `.setdivulgacao` (no PV) - Define mensagem de divulgação

## 📁 Estrutura

```
├── index.js           # Código principal
├── package.json       # Dependências
├── Dockerfile         # Configuração Docker
├── database/
│   └── db.json       # Dados dos grupos
└── session/          # Arquivos de autenticação
```

## ⚙️ Dependências

- `@whiskeysockets/baileys` - Biblioteca WhatsApp
- `axios` - HTTP client para download de imagens

## 📝 Licença

MIT
