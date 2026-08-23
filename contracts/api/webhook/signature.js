const signatureService = require('../../lib/signatureService');
const driveService = require('../../lib/driveService');
const emailService = require('../../lib/emailService');
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signature = req.headers['x-assinafy-signature'];
    const payload = req.body;

    if (!signatureService.verifyWebhookSignature(payload, signature)) {
      console.error('Assinatura do webhook invalida');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const eventType = payload.event || payload.type;

    console.log(`Webhook Assinafy recebido: ${eventType}`);

    switch (eventType) {
      case 'document_ready':
        await handleDocumentReady(payload);
        break;
      case 'signer_signed_document':
        await handleSignerSigned(payload);
        break;
      case 'document_completed':
        await handleDocumentCompleted(payload);
        break;
      case 'document_declined':
        await handleDocumentDeclined(payload);
        break;
      default:
        console.log(`Evento nao tratado: ${eventType}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Erro ao processar webhook Assinafy:', error);
    return res.status(200).json({ received: true, error: error.message });
  }
};

async function handleDocumentReady(payload) {
  const documentId = payload.object?.id || payload.document_id;
  console.log(`Documento pronto para assinatura: ${documentId}`);
}

async function handleSignerSigned(payload) {
  const documentId = payload.object?.id || payload.document_id;
  console.log(`Signatario assinou o documento: ${documentId}`);
}

async function handleDocumentCompleted(payload) {
  const documentId = payload.object?.id || payload.document_id;

  console.log(`Documento completado: ${documentId}`);

  await processSignedDocument(documentId, payload);
}

async function handleDocumentDeclined(payload) {
  const documentId = payload.object?.id || payload.document_id;
  const reason = payload.object?.decline_reason || 'Motivo nao informado';

  console.log(`Documento recusado: ${documentId}. Motivo: ${reason}`);
}

async function processSignedDocument(documentId, payload) {
  try {
    const downloadResult = await signatureService.downloadDocument(
      documentId,
      'certificated'
    );

    if (!downloadResult.success) {
      throw new Error(`Falha ao baixar documento: ${downloadResult.error}`);
    }

    const contractNumber =
      payload.object?.tags?.[0]?.name ||
      payload.metadata?.contract_number ||
      `DOC-${documentId}`;

    const tempDir = path.join(__dirname, '..', '..', 'tmp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const pdfPath = path.join(
      tempDir,
      `contrato-${contractNumber}-assinado.pdf`
    );
    fs.writeFileSync(pdfPath, downloadResult.data);

    console.log(`PDF assinado salvo: ${pdfPath}`);

    await uploadToStorage(pdfPath, contractNumber);

    const customerEmail =
      payload.object?.assignment?.signers?.[0]?.email ||
      payload.metadata?.customer_email;

    if (customerEmail) {
      const contractService = require('../../lib/contractService');
      await emailService.sendContractSigned(
        {
          contractNumber,
          customerEmail,
          customerName:
            payload.object?.assignment?.signers?.[0]?.full_name || 'Cliente',
        },
        pdfPath
      );
      console.log('Email com contrato assinado enviado');
    }

    cleanupTempFile(pdfPath);
  } catch (error) {
    console.error('Erro ao processar documento assinado:', error.message);
  }
}

async function uploadToStorage(pdfPath, contractNumber) {
  try {
    const config = require('../../lib/config');

    if (config.googleDrive.folderId) {
      const driveResult = await driveService.uploadFile(
        pdfPath,
        `contrato-${contractNumber}-assinado.pdf`
      );

      if (driveResult.success) {
        console.log(
          `Contrato assinado salvo no Google Drive: ${driveResult.fileId}`
        );
      }
    }
  } catch (error) {
    console.error('Erro ao salvar no Google Drive:', error.message);
  }
}

function cleanupTempFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.warn('Erro ao limpar arquivo temporario:', error.message);
  }
}
