const { v4: uuidv4 } = require('uuid');
const config = require('../lib/config');

/**
 * Gera numero unico para o contrato
 * Formato: NRMAX-YYYYMMDD-SEQUENCIAL
 */
function generateContractNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const sequence = String(Date.now()).slice(-4);
  return `${config.contract.prefix}-${year}${month}${day}-${sequence}`;
}

/**
 * Gera UUID unico para identificacao
 */
function generateId() {
  return uuidv4();
}

/**
 * Formata valor para moeda brasileira
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata data para formato brasileiro
 */
function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR');
}

/**
 * Formata data e hora para formato brasileiro
 */
function formatDateTime(date) {
  const d = new Date(date);
  return d.toLocaleString('pt-BR');
}

/**
 * Calcula data de entrega
 */
function calculateDeliveryDate(orderDate, days) {
  const date = new Date(orderDate);
  date.setDate(date.getDate() + (days || config.contract.defaultDeliveryDays));
  return date;
}

/**
 * Valida se os dados do pedido estao completos
 */
function validateOrderData(data) {
  const required = [
    'orderNumber',
    'customerName',
    'customerEmail',
    'customerPhone',
    'productName',
    'totalValue',
  ];

  const missing = required.filter((field) => !data[field]);
  return {
    isValid: missing.length === 0,
    missing,
  };
}

/**
 * Limpa e formata CPF/CNPJ
 */
function formatDocument(doc) {
  if (!doc) return '';
  const cleaned = doc.replace(/\D/g, '');

  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (cleaned.length === 14) {
    return cleaned.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      '$1.$2.$3/$4-$5'
    );
  }
  return doc;
}

/**
 * Maskara de telefone
 */
function formatPhone(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

module.exports = {
  generateContractNumber,
  generateId,
  formatCurrency,
  formatDate,
  formatDateTime,
  calculateDeliveryDate,
  validateOrderData,
  formatDocument,
  formatPhone,
};
