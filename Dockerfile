# Usar imagem oficial do Node.js
FROM node:20-alpine

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm install --production

# Copiar código da aplicação
COPY . .

# Criar diretórios necessários
RUN mkdir -p database session

# Comando para iniciar o bot
CMD ["npm", "start"]
