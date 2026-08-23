const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const config = require('./config');

class DriveService {
  constructor() {
    this.drive = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      const credentialsPath = path.resolve(config.googleDrive.credentialsPath);

      if (!fs.existsSync(credentialsPath)) {
        console.warn('Arquivo de credenciais do Google Drive nao encontrado');
        return;
      }

      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });

      this.drive = google.drive({ version: 'v3', auth });
      this.initialized = true;
    } catch (error) {
      console.error('Erro ao inicializar Google Drive:', error.message);
    }
  }

  async uploadFile(filePath, fileName, folderId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.drive) {
      throw new Error('Google Drive nao configurado');
    }

    try {
      const targetFolder = folderId || config.googleDrive.folderId;

      const fileMetadata = {
        name: fileName,
        parents: targetFolder ? [targetFolder] : [],
      };

      const media = {
        mimeType: 'application/pdf',
        body: fs.createReadStream(filePath),
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media,
        fields: 'id, name, webViewLink, webContentLink',
      });

      return {
        success: true,
        fileId: response.data.id,
        fileName: response.data.name,
        viewUrl: response.data.webViewLink,
        downloadUrl: response.data.webContentLink,
      };
    } catch (error) {
      console.error('Erro ao fazer upload para Google Drive:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async uploadBuffer(buffer, fileName, folderId, mimeType = 'application/pdf') {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.drive) {
      throw new Error('Google Drive nao configurado');
    }

    try {
      const targetFolder = folderId || config.googleDrive.folderId;

      const fileMetadata = {
        name: fileName,
        parents: targetFolder ? [targetFolder] : [],
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: {
          mimeType,
          body: buffer,
        },
        fields: 'id, name, webViewLink, webContentLink',
      });

      return {
        success: true,
        fileId: response.data.id,
        fileName: response.data.name,
        viewUrl: response.data.webViewLink,
        downloadUrl: response.data.webContentLink,
      };
    } catch (error) {
      console.error('Erro ao fazer upload para Google Drive:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async createFolder(folderName, parentFolderId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.drive) {
      throw new Error('Google Drive nao configurado');
    }

    try {
      const targetParent = parentFolderId || config.googleDrive.folderId;

      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: targetParent ? [targetParent] : [],
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id, name',
      });

      return {
        success: true,
        folderId: response.data.id,
        folderName: response.data.name,
      };
    } catch (error) {
      console.error('Erro ao criar pasta no Google Drive:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async listFiles(folderId, pageSize = 10) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.drive) {
      throw new Error('Google Drive nao configurado');
    }

    try {
      const targetFolder = folderId || config.googleDrive.folderId;

      const response = await this.drive.files.list({
        q: `'${targetFolder}' in parents`,
        pageSize,
        fields: 'files(id, name, createdTime, size)',
        orderBy: 'createdTime desc',
      });

      return {
        success: true,
        files: response.data.files || [],
      };
    } catch (error) {
      console.error('Erro ao listar arquivos:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async deleteFile(fileId) {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.drive) {
      throw new Error('Google Drive nao configurado');
    }

    try {
      await this.drive.files.delete({ fileId });

      return {
        success: true,
      };
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new DriveService();
