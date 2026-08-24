const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PdfService {
  constructor() {
    this.outputDir = process.env.NODE_ENV === 'production'
      ? '/tmp'
      : path.join(__dirname, '..', 'tmp');
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async generatePdfFromHTML(html, contractNumber) {
    return new Promise((resolve, reject) => {
      try {
        const fileName = `contrato-${contractNumber}.pdf`;
        const filePath = path.join(this.outputDir, fileName);

        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50,
          },
          info: {
            Title: `Contrato ${contractNumber} - NRMAX`,
            Author: 'NRMAX Solucoes',
            Subject: 'Contrato de Compra - Plataforma Elevatoria',
            Keywords: 'contrato, nrmax, plataforma, carga',
          },
        });

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        this.addHeader(doc);
        this.addContent(doc, html);
        this.addFooter(doc, contractNumber);

        doc.end();

        stream.on('finish', () => {
          resolve({
            filePath,
            fileName,
            fileSize: fs.statSync(filePath).size,
          });
        });

        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  addHeader(doc) {
    doc
      .font('Helvetica-Bold')
      .fontSize(28)
      .fillColor('#1A1A1A')
      .text('NRMAX', { align: 'center' })
      .moveDown(0.2);

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#666666')
      .text('Solucoes em Plataformas Elevatorias e Estruturas Metalicas', {
        align: 'center',
      })
      .moveDown(0.5);

    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .lineWidth(2)
      .strokeColor('#FADB14')
      .stroke()
      .moveDown(1);
  }

  addContent(doc, html) {
    const content = this.parseHTMLToContent(html);

    content.sections.forEach((section) => {
      if (section.type === 'title') {
        doc
          .font('Helvetica-Bold')
          .fontSize(14)
          .fillColor('#1A1A1A')
          .text(section.text)
          .moveDown(0.3);

        doc
          .moveTo(50, doc.y)
          .lineTo(200, doc.y)
          .lineWidth(1)
          .strokeColor('#FADB14')
          .stroke()
          .moveDown(0.5);
      } else if (section.type === 'field') {
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#555555')
          .text(section.label, { continued: true })
          .font('Helvetica')
          .fillColor('#333333')
          .text(` ${section.value}`)
          .moveDown(0.2);
      } else if (section.type === 'paragraph') {
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor('#333333')
          .text(section.text, {
            align: 'justify',
            lineGap: 5,
          })
          .moveDown(0.5);
      } else if (section.type === 'highlight') {
        const y = doc.y;
        doc
          .rect(50, y, 495, 40)
          .fill('#FADB14');

        doc
          .font('Helvetica-Bold')
          .fontSize(16)
          .fillColor('#1A1A1A')
          .text(section.text, 50, y + 12, {
            align: 'center',
            width: 495,
          })
          .moveDown(1);
      }
    });
  }

  addFooter(doc, contractNumber) {
    const pageHeight = doc.page.height;
    const footerY = pageHeight - 100;

    doc
      .moveTo(50, footerY)
      .lineTo(545, footerY)
      .lineWidth(1)
      .strokeColor('#FADB14')
      .stroke();

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#666666')
      .text(`Contrato: ${contractNumber}`, 50, footerY + 10)
      .text(
        `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
        50,
        footerY + 25
      )
      .text('NRMAX - Documento gerado eletronicamente', 50, footerY + 40);
  }

  parseHTMLToContent(html) {
    const sections = [];

    sections.push({
      type: 'title',
      text: 'CONTRATO DE COMPRA',
    });

    const contractMatch = html.match(
      /Numero do Contrato:<\/span>\s*<span[^>]*><strong>([^<]+)<\/strong>/
    );
    if (contractMatch) {
      sections.push({
        type: 'field',
        label: 'Numero do Contrato:',
        value: contractMatch[1],
      });
    }

    const orderMatch = html.match(
      /Numero do Pedido:<\/span>\s*<span[^>]*>([^<]+)<\/span>/
    );
    if (orderMatch) {
      sections.push({
        type: 'field',
        label: 'Numero do Pedido:',
        value: orderMatch[1].trim(),
      });
    }

    const dateMatch = html.match(
      /Data de Emissao:<\/span>\s*<span[^>]*>([^<]+)<\/span>/
    );
    if (dateMatch) {
      sections.push({
        type: 'field',
        label: 'Data de Emissao:',
        value: dateMatch[1].trim(),
      });
    }

    sections.push({ type: 'title', text: '1. DADOS DO COMPRADOR' });

    const nameMatch = html.match(
      /Nome\/Razao Social:<\/span>\s*<span[^>]*>([^<]+)<\/span>/
    );
    if (nameMatch) {
      sections.push({
        type: 'field',
        label: 'Nome:',
        value: nameMatch[1].trim(),
      });
    }

    const docMatch = html.match(
      /CPF\/CNPJ:<\/span>\s*<span[^>]*>([^<]+)<\/span>/
    );
    if (docMatch) {
      sections.push({
        type: 'field',
        label: 'CPF/CNPJ:',
        value: docMatch[1].trim(),
      });
    }

    const emailMatch = html.match(
      /Email:<\/span>\s*<span[^>]*>([^<]+)<\/span>/
    );
    if (emailMatch) {
      sections.push({
        type: 'field',
        label: 'Email:',
        value: emailMatch[1].trim(),
      });
    }

    const phoneMatch = html.match(
      /Telefone:<\/span>\s*<span[^>]*>([^<]+)<\/span>/
    );
    if (phoneMatch) {
      sections.push({
        type: 'field',
        label: 'Telefone:',
        value: phoneMatch[1].trim(),
      });
    }

    sections.push({ type: 'title', text: '2. OBJETO DO CONTRATO' });

    const productMatch = html.match(/<h4>([^<]+)<\/h4>/);
    if (productMatch) {
      sections.push({
        type: 'field',
        label: 'Produto:',
        value: productMatch[1],
      });
    }

    const capacityMatch = html.match(
      /Capacidade<\/span>\s*<span[^>]*>([^<]+)<\/span>/
    );
    if (capacityMatch) {
      sections.push({
        type: 'field',
        label: 'Capacidade:',
        value: capacityMatch[1].trim(),
      });
    }

    const heightMatch = html.match(
      /Altura de Elevacao<\/span>\s*<span[^>]*>([^<]+)<\/span>/
    );
    if (heightMatch) {
      sections.push({
        type: 'field',
        label: 'Altura:',
        value: heightMatch[1].trim(),
      });
    }

    const dimsMatch = html.match(
      /Dimensoes Uteis<\/span>\s*<span[^>]*>([^<]+)<\/span>/
    );
    if (dimsMatch) {
      sections.push({
        type: 'field',
        label: 'Dimensoes:',
        value: dimsMatch[1].trim(),
      });
    }

    sections.push({ type: 'title', text: '3. VALOR E PAGAMENTO' });

    const valueMatch = html.match(/VALOR TOTAL:\s*([^<]+)/);
    if (valueMatch) {
      sections.push({
        type: 'highlight',
        text: `VALOR TOTAL: ${valueMatch[1].trim()}`,
      });
    }

    const paymentMatch = html.match(
      /Forma de Pagamento:<\/span>\s*<span[^>]*>([^<]+)<\/span>/
    );
    if (paymentMatch) {
      sections.push({
        type: 'field',
        label: 'Pagamento:',
        value: paymentMatch[1].trim(),
      });
    }

    sections.push({ type: 'title', text: '4. PRAZO DE ENTREGA' });

    const deliveryMatch = html.match(
      /Prazo de Entrega:<\/span>\s*<span[^>]*>([^<]+)<\/span>/
    );
    if (deliveryMatch) {
      sections.push({
        type: 'field',
        label: 'Prazo:',
        value: deliveryMatch[1].trim(),
      });
    }

    const estimatedMatch = html.match(
      /Data Estimada:<\/span>\s*<span[^>]*>([^<]+)<\/span>/
    );
    if (estimatedMatch) {
      sections.push({
        type: 'field',
        label: 'Data Estimada:',
        value: estimatedMatch[1].trim(),
      });
    }

    sections.push({ type: 'title', text: '5. CLAUSULAS E CONDICOES' });

    const clauses = [
      '5.1. O presente contrato regula a compra e venda do equipamento descrito acima, nas condicoes estabelecidas pelas partes.',
      '5.2. A NRMAX se compromete a entregar o equipamento no prazo estipulado, sujeito a disponibilidade de estoque e condicoes logisticas.',
      '5.3. O equipamento sera entregue com manual de montagem e operacao. A montagem nao esta inclusa no valor.',
      '5.4. O equipamento possui garantia de fabricacao contra defeitos de material e mao de obra.',
      '5.5. Para cancelamento ou devolucao, o comprador devera entrar em contato no prazo de 7 dias apos o recebimento.',
      '5.6. As partes elegem o foro da Comarca de Sao Paulo para dirimir quaisquer questoes.',
    ];

    clauses.forEach((clause) => {
      sections.push({
        type: 'paragraph',
        text: clause,
      });
    });

    return { sections };
  }
}

module.exports = new PdfService();
