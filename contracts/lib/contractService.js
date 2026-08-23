const Handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const {
  generateContractNumber,
  formatDate,
  formatDateTime,
  formatCurrency,
  formatDocument,
  formatPhone,
  calculateDeliveryDate,
  validateOrderData,
} = require('../utils/helpers');

class ContractService {
  constructor() {
    this.templatePath = path.join(__dirname, '..', 'templates', 'contract.html');
    this.template = null;
    this.loadTemplate();
  }

  loadTemplate() {
    try {
      const templateSource = fs.readFileSync(this.templatePath, 'utf-8');
      this.template = Handlebars.compile(templateSource);
    } catch (error) {
      console.error('Erro ao carregar template do contrato:', error);
      throw new Error('Template do contrato nao encontrado');
    }
  }

  prepareContractData(orderData) {
    const validation = validateOrderData(orderData);
    if (!validation.isValid) {
      throw new Error(
        `Dados incompletos: campos obrigatorios faltando: ${validation.missing.join(', ')}`
      );
    }

    const now = new Date();
    const contractNumber = generateContractNumber();
    const issueDate = formatDate(now);
    const deliveryDeadline =
      orderData.deliveryDeadline || config.contract.defaultDeliveryDays;
    const estimatedDelivery = calculateDeliveryDate(
      now,
      deliveryDeadline
    );

    const data = {
      contractNumber,
      issueDate,
      issueDateTime: formatDateTime(now),
      orderNumber: orderData.orderNumber,

      customerName: orderData.customerName,
      customerDocument: formatDocument(orderData.customerDocument),
      customerEmail: orderData.customerEmail,
      customerPhone: formatPhone(orderData.customerPhone),
      customerAddress: orderData.customerAddress || '',
      customerCity: orderData.customerCity || '',
      customerState: orderData.customerState || '',

      productName: orderData.productName || 'Plataforma Elevatoria de Carga NRMAX',
      capacity: orderData.capacity || '600 kg',
      height: orderData.height || '3 metros',
      dimensions: orderData.dimensions || '1.210m x 1.090m',
      speed: orderData.speed || '10 m/min (300kg) / 5 m/min (600kg)',
      noiseLevel: orderData.noiseLevel || 'Aproximadamente 45 dB',
      features:
        orderData.features ||
        'Duplo fim de curso, telas de protecao, estrutura reforçada',
      customizations: orderData.customizations || '',

      totalValue: formatCurrency(orderData.totalValue),
      paymentMethod: orderData.paymentMethod || 'A definir',
      installments: orderData.installments || '',
      transactionDate: orderData.transactionDate
        ? formatDate(orderData.transactionDate)
        : issueDate,

      deliveryDeadline,
      estimatedDeliveryDate: formatDate(estimatedDelivery),
    };

    return data;
  }

  generateContractHTML(orderData) {
    const contractData = this.prepareContractData(orderData);
    const html = this.template(contractData);

    return {
      html,
      contractNumber: contractData.contractNumber,
      contractData,
    };
  }

  async generateContract(orderData) {
    const { html, contractNumber, contractData } =
      this.generateContractHTML(orderData);

    return {
      contractNumber,
      html,
      contractData,
      metadata: {
        generatedAt: new Date().toISOString(),
        orderNumber: orderData.orderNumber,
        customerEmail: orderData.customerEmail,
      },
    };
  }
}

module.exports = new ContractService();
