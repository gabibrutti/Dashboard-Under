const dotenv = require('dotenv');

dotenv.config();

const config = {
  freshservice: {
    domain: process.env.FRESHSERVICE_DOMAIN || 'https://under.freshservice.com',
    apiKey: process.env.FRESHSERVICE_API_KEY,
  },
  zenvia: {
    baseUrl: process.env.ZENVIA_BASE_URL || 'https://api.totalvoice.com.br',
    apiToken: process.env.ZENVIA_API_TOKEN,
    uraId: process.env.ZENVIA_URA_ID || '44165', // URA fixa: Central de serviços_HC
  },
  server: {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
  },
};

// Função para construir header de autenticação Freshservice
function buildFsAuthHeader() {
  if (!config.freshservice.apiKey) {
    throw new Error('FRESHSERVICE_API_KEY não configurada');
  }
  const token = Buffer.from(`${config.freshservice.apiKey}:X`).toString('base64');
  return `Basic ${token}`;
}

module.exports = { config, buildFsAuthHeader };
