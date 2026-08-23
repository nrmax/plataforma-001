const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const config = require('./config');

class SignatureService {
  constructor() {
    this.baseURL = 'https://api.assinafy.com.br/v1';
    this.headers = {
      'X-Api-Key': config.assinafy.apiKey,
    };
  }

  async uploadDocument(filePath, fileName) {
    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(filePath), {
        filename: fileName || 'contrato.pdf',
        contentType: 'application/pdf',
      });

      const response = await axios.post(
        `${this.baseURL}/accounts/${config.assinafy.accountId}/documents`,
        form,
        {
          headers: {
            ...this.headers,
            ...form.getHeaders(),
          },
        }
      );

      return {
        success: true,
        documentId: response.data.data.id,
        status: response.data.data.status,
        signingUrl: response.data.data.signing_url,
      };
    } catch (error) {
      console.error('Erro ao uploadar documento:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async createSigner(signerData) {
    try {
      const listResponse = await axios.get(
        `${this.baseURL}/accounts/${config.assinafy.accountId}/signers`,
        { headers: this.headers }
      );

      const signers = listResponse.data.data || [];
      const existing = signers.find(
        (s) => s.email === signerData.email
      );

      if (existing) {
        console.log(`Signatario existente encontrado: ${existing.id}`);
        return {
          success: true,
          signerId: existing.id,
        };
      }

      const response = await axios.post(
        `${this.baseURL}/accounts/${config.assinafy.accountId}/signers`,
        {
          full_name: signerData.name,
          email: signerData.email,
          whatsapp_phone_number: signerData.phone || null,
        },
        { headers: this.headers }
      );

      return {
        success: true,
        signerId: response.data.data.id,
      };
    } catch (error) {
      console.error('Erro ao criar signatario:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async createAssignment(documentId, signerId, message) {
    try {
      const response = await axios.post(
        `${this.baseURL}/documents/${documentId}/assignments`,
        {
          method: 'virtual',
          signers: [
            {
              id: signerId,
              verification_method: 'Email',
              step: 1,
            },
          ],
          message: message || 'Por favor, assine o contrato.',
          expires_at: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
        { headers: this.headers }
      );

      return {
        success: true,
        assignmentId: response.data.data.id,
        signingUrls: response.data.data.signing_urls,
      };
    } catch (error) {
      console.error('Erro ao criar assignment:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async getDocumentStatus(documentId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/accounts/${config.assinafy.accountId}/documents/${documentId}`,
        { headers: this.headers }
      );

      return {
        success: true,
        status: response.data.data.status,
        isClosed: response.data.data.is_closed,
        declineReason: response.data.data.decline_reason,
      };
    } catch (error) {
      console.error('Erro ao consultar status:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async downloadDocument(documentId, artifactType = 'original') {
    try {
      const response = await axios.get(
        `${this.baseURL}/accounts/${config.assinafy.accountId}/documents/${documentId}/download/${artifactType}`,
        {
          headers: this.headers,
          responseType: 'arraybuffer',
        }
      );

      return {
        success: true,
        data: Buffer.from(response.data),
        contentType: response.headers['content-type'],
      };
    } catch (error) {
      console.error('Erro ao baixar documento:', error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async processFullSignatureFlow(contractData, pdfPath) {
    const uploadResult = await this.uploadDocument(
      pdfPath,
      `contrato-${contractData.contractNumber}.pdf`
    );
    if (!uploadResult.success) {
      throw new Error(`Falha ao uploadar documento: ${uploadResult.error}`);
    }

    console.log(`Documento uploadado: ${uploadResult.documentId}`);

    const signerResult = await this.createSigner({
      name: contractData.customerName,
      email: contractData.customerEmail,
      phone: contractData.customerPhone,
    });
    if (!signerResult.success) {
      throw new Error(`Falha ao criar signatario: ${signerResult.error}`);
    }

    console.log(`Signatario criado: ${signerResult.signerId}`);

    const assignmentResult = await this.createAssignment(
      uploadResult.documentId,
      signerResult.signerId,
      `Contrato ${contractData.contractNumber} - NRMAX`
    );
    if (!assignmentResult.success) {
      throw new Error(`Falha ao criar assignment: ${assignmentResult.error}`);
    }

    console.log(`Assignment criado: ${assignmentResult.assignmentId}`);

    return {
      documentId: uploadResult.documentId,
      signerId: signerResult.signerId,
      assignmentId: assignmentResult.assignmentId,
      signingUrls: assignmentResult.signingUrls,
    };
  }

  verifyWebhookSignature(payload, signature) {
    if (!config.assinafy.webhookSecret) {
      console.warn('Webhook secret da Assinafy nao configurado');
      return true;
    }

    if (!signature) return false;

    const crypto = require('crypto');
    const rawBody = JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', config.assinafy.webhookSecret)
      .update(rawBody)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

module.exports = new SignatureService();
