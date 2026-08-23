const nodemailer = require('nodemailer');
const fs = require('fs');
const config = require('./config');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;

    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });

    this.initialized = true;
  }

  async sendEmail(options) {
    if (!this.initialized) {
      this.initialize();
    }

    try {
      const info = await this.transporter.sendMail({
        from: config.email.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments || [],
      });

      return {
        success: true,
        messageId: info.messageId,
        response: info.response,
      };
    } catch (error) {
      console.error('Erro ao enviar email:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendContractCreated(contractData) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1A1A1A; color: #fff; padding: 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .header span { color: #FADB14; }
          .content { padding: 20px; background: #f8f9fa; }
          .info-box { background: #fff; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #FADB14; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          .btn { display: inline-block; background: #FADB14; color: #1A1A1A; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>NR<span>MAX</span></h1>
          </div>
          <div class="content">
            <h2>Contrato Gerado com Sucesso!</h2>
            <p>Olá, <strong>${contractData.customerName}</strong>!</p>
            <p>Seu contrato foi gerado e encaminhado para assinatura eletronica.</p>
            
            <div class="info-box">
              <p><strong>Numero do Contrato:</strong> ${contractData.contractNumber}</p>
              <p><strong>Pedido:</strong> ${contractData.orderNumber}</p>
              <p><strong>Produto:</strong> ${contractData.productName}</p>
              <p><strong>Valor:</strong> ${contractData.totalValue}</p>
            </div>
            
            <p>Voce receberá em breve um email da SuperSign com as instrucoes para assinatura eletronica do documento.</p>
            
            <p>Apos a assinatura, uma copia do contrato sera salva e enviada por email.</p>
            
            <p>Se tiver alguma duvida, entre em contato conosco.</p>
            
            <p>Atenciosamente,<br><strong>Equipe NRMAX</strong></p>
          </div>
          <div class="footer">
            <p>NRMAX - Solucoes em Plataformas Elevatorias</p>
            <p>Este email foi gerado automaticamente.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: contractData.customerEmail,
      subject: `Contrato ${contractData.contractNumber} - NRMAX`,
      html,
    });
  }

  async sendContractSigned(contractData, signedPdfPath) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1A1A1A; color: #fff; padding: 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .header span { color: #FADB14; }
          .content { padding: 20px; background: #f8f9fa; }
          .success-box { background: #d4edda; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #28a745; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>NR<span>MAX</span></h1>
          </div>
          <div class="content">
            <h2>Contrato Assinado com Sucesso!</h2>
            <p>Olá, <strong>${contractData.customerName}</strong>!</p>
            
            <div class="success-box">
              <p><strong>Seu contrato foi assinado eletronicamente!</strong></p>
              <p>Numero: ${contractData.contractNumber}</p>
            </div>
            
            <p>Em anexo, voce encontrara a copia do contrato assinado.</p>
            
            <p>Este documento possui validade juridica conforme a MP 2.200-2/2001 e Lei 14.063/2020.</p>
            
            <p>Guarde este email para sua referencia.</p>
            
            <p>Se tiver alguma duvida, entre em contato conosco.</p>
            
            <p>Atenciosamente,<br><strong>Equipe NRMAX</strong></p>
          </div>
          <div class="footer">
            <p>NRMAX - Solucoes em Plataformas Elevatorias</p>
            <p>Este email foi gerado automaticamente.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const attachments = [];
    if (signedPdfPath && fs.existsSync(signedPdfPath)) {
      attachments.push({
        filename: `contrato-${contractData.contractNumber}-assinado.pdf`,
        path: signedPdfPath,
      });
    }

    return this.sendEmail({
      to: contractData.customerEmail,
      subject: `Contrato Assinado ${contractData.contractNumber} - NRMAX`,
      html,
      attachments,
    });
  }

  async verifyConnection() {
    if (!this.initialized) {
      this.initialize();
    }

    try {
      await this.transporter.verify();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new EmailService();
