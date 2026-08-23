const signatureService = require('./lib/signatureService');
const contractService = require('./lib/contractService');
const pdfService = require('./lib/pdfService');

async function test() {
  const testData = {
    orderNumber: 'TEST-001',
    customerName: 'Wilson Medeiros',
    customerDocument: '21992961808',
    customerEmail: 'wilson.3ds@gmail.com',
    customerPhone: '11967809326',
    totalValue: 15000,
    productName: 'Plataforma Elevatoria 600kg',
  };

  const contract = await contractService.generateContract(testData);
  const pdf = await pdfService.generatePdfFromHTML(contract.html, contract.contractNumber);

  console.log('Contrato gerado:', contract.contractNumber);
  console.log('Enviando para Assinafy...');

  const result = await signatureService.processFullSignatureFlow(
    { ...contract.contractData, totalValue: 15000 },
    pdf.filePath
  );

  console.log('Resultado:', JSON.stringify(result, null, 2));
}

test().catch(console.error);
