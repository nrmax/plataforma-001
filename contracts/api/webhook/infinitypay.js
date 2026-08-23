const contractService = require('../../lib/contractService');
const pdfService = require('../../lib/pdfService');
const signatureService = require('../../lib/signatureService');
const driveService = require('../../lib/driveService');
const emailService = require('../../lib/emailService');
const config = require('../../lib/config');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signature = req.headers['x-infinitepay-signature'];
    const payload = req.body;

    if (!verifyInfinityPaySignature(payload, signature)) {
      console.error('Assinatura do webhook invalida');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const eventType = payload.event || payload.type;

    if (eventType === 'payment.paid' || eventType === 'invoice.paid') {
      await processPayment(payload);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Erro ao processar webhook InfinityPay:', error);
    return res.status(200).json({ received: true, error: error.message });
  }
};

async function processPayment(payload) {
  const orderData = extractOrderData(payload);

  console.log(`Processando pagamento - Pedido: ${orderData.orderNumber}`);

  const contract = await contractService.generateContract(orderData);

  console.log(`Contrato gerado: ${contract.contractNumber}`);

  const pdfResult = await pdfService.generatePdfFromHTML(
    contract.html,
    contract.contractNumber
  );

  console.log(`PDF gerado: ${pdfResult.fileName}`);

  await emailService.sendContractCreated({
    ...contract.contractData,
    totalValue: orderData.totalValue,
  });

  console.log('Email de contrato gerado enviado');

  try {
    const signatureResult = await signatureService.processFullSignatureFlow(
      {
        ...contract.contractData,
        totalValue: orderData.totalValue,
      },
      pdfResult.filePath
    );

    console.log(`Solicitacao de assinatura criada: ${signatureResult.documentId}`);

    await saveToStorage(pdfResult.filePath, contract.contractNumber, orderData);
  } catch (signatureError) {
    console.error('Erro no fluxo de assinatura:', signatureError.message);
  }
}

function extractOrderData(payload) {
  const data = payload.data || payload;

  return {
    orderNumber: data.order_nsu || data.invoice_slug || `PED-${Date.now()}`,
    customerName: data.customer?.name || data.customer_name || data.name || 'Cliente',
    customerDocument:
      data.customer?.document || data.customer_document || data.cpf || '',
    customerEmail:
      data.customer?.email || data.customer_email || data.email || '',
    customerPhone:
      data.customer?.phone || data.customer_phone || data.phone || '',
    customerAddress:
      data.customer?.address || data.customer_address || data.address || '',
    customerCity: data.customer?.city || data.customer_city || data.city || '',
    customerState:
      data.customer?.state || data.customer_state || data.state || '',

    productName:
      data.items?.[0]?.description ||
      data.product_name ||
      'Plataforma Elevatoria de Carga NRMAX',
    capacity: data.items?.[0]?.capacity || data.capacity || '600 kg',
    height: data.items?.[0]?.height || data.height || '3 metros',
    dimensions:
      data.items?.[0]?.dimensions || data.dimensions || '1.210m x 1.090m',
    speed:
      data.items?.[0]?.speed ||
      data.speed ||
      '10 m/min (300kg) / 5 m/min (600kg)',
    noiseLevel:
      data.items?.[0]?.noise_level || data.noise_level || 'Aproximadamente 45 dB',
    features:
      data.items?.[0]?.features ||
      data.features ||
      'Duplo fim de curso, telas de protecao, estrutura reforcada',
    customizations: data.items?.[0]?.customizations || data.customizations || '',

    totalValue: data.amount || data.total || data.paid_amount || 0,
    paymentMethod:
      data.capture_method || data.payment_method || 'A definir',
    installments: data.installments
      ? `${data.installments}x`
      : '',
    transactionDate: data.created_at || new Date().toISOString(),

    deliveryDeadline: data.delivery_deadline || config.contract.defaultDeliveryDays,
  };
}

function verifyInfinityPaySignature(payload, signature) {
  if (!config.infinitypay.webhookSecret) {
    console.warn('Webhook secret da InfinityPay nao configurado');
    return true;
  }

  if (!signature) return false;

  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', config.infinitypay.webhookSecret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

async function saveToStorage(pdfPath, contractNumber, orderData) {
  try {
    if (config.googleDrive.folderId) {
      const driveResult = await driveService.uploadFile(
        pdfPath,
        `contrato-${contractNumber}.pdf`
      );
      if (driveResult.success) {
        console.log(`Contrato salvo no Google Drive: ${driveResult.fileId}`);
      }
    }
  } catch (error) {
    console.error('Erro ao salvar no armazenamento:', error.message);
  }
}
