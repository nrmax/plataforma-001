const signatureService = require('../../lib/signatureService');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        error: 'ID do documento e obrigatorio',
      });
    }

    const statusResult = await signatureService.getDocumentStatus(id);

    if (!statusResult.success) {
      return res.status(404).json({
        error: 'Documento nao encontrado',
        details: statusResult.error,
      });
    }

    return res.status(200).json({
      documentId: id,
      status: statusResult.status,
      signedAt: statusResult.signedAt,
      downloadUrl: statusResult.downloadUrl,
    });
  } catch (error) {
    console.error('Erro ao consultar status do contrato:', error);
    return res.status(500).json({
      error: 'Erro interno ao consultar status',
    });
  }
};
