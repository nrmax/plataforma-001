const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const config = require('./lib/config');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/webhook/infinitypay', require('./api/webhook/infinitypay'));
app.use('/api/webhook/signature', require('./api/webhook/signature'));
app.use('/api/contracts/status', require('./api/contracts/status'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'NRMAX Contracts API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/contracts/test', async (req, res) => {
  try {
    const contractService = require('./lib/contractService');
    const pdfService = require('./lib/pdfService');

    const testData = {
      orderNumber: 'TEST-001',
      customerName: 'Joao da Silva',
      customerDocument: '12345678901',
      customerEmail: 'joao@email.com',
      customerPhone: '11999998888',
      customerAddress: 'Rua Teste, 123',
      customerCity: 'Sao Paulo',
      customerState: 'SP',
      productName: 'Plataforma Elevatoria de Carga NRMAX',
      capacity: '600 kg',
      height: '3 metros',
      dimensions: '1.210m x 1.090m',
      totalValue: 15000,
      paymentMethod: 'Pix',
    };

    const contract = await contractService.generateContract(testData);

    const pdfResult = await pdfService.generatePdfFromHTML(
      contract.html,
      contract.contractNumber
    );

    res.json({
      success: true,
      contractNumber: contract.contractNumber,
      pdfFile: pdfResult.fileName,
      pdfSize: pdfResult.fileSize,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get('/', (req, res) => {
  res.json({
    name: 'NRMAX Contracts API',
    version: '1.0.0',
    documentation: '/api/health',
    endpoints: {
      webhook: {
        infinitypay: 'POST /api/webhook/infinitypay',
        signature: 'POST /api/webhook/signature',
      },
      contracts: {
        status: 'GET /api/contracts/status?id={documentId}',
      },
    },
  });
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = config.server.port;
  app.listen(PORT, () => {
    console.log(`NRMAX Contracts API rodando na porta ${PORT}`);
    console.log(`Ambiente: ${config.server.env}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;
