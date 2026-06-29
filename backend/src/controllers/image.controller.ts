import { Request, Response } from 'express';
import { Database } from '../database';
import type { AuthRequest } from '../types/user.types';
import { v4 as uuidv4 } from 'uuid';

export class ImageController {
  constructor(private db: Database) {}

  async listImages(req: AuthRequest, res: Response): Promise<void> {
    try {
      const images = await this.db.all('SELECT * FROM images');
      res.json({ success: true, data: images });
    } catch (error) {
      res.status(500).json({ error: 'Failed to list images' });
    }
  }

  async getImage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const image = await this.db.get('SELECT * FROM images WHERE id = ?', [id]);
      if (!image) {
        res.status(404).json({ error: 'Image not found' });
        return;
      }
      res.json({ success: true, data: image });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get image' });
    }
  }

  async uploadImage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { patientId, originalFilename, viewCode, sideCode, ageAtUpload, remarks, organizationId } = req.body;
      // TODO: Handle file upload using multer or similar
      const id = uuidv4();
      const storageKey = `images/${id}`;

      await this.db.run(
        `INSERT INTO images (id, patientId, originalFilename, storageKey, viewCode, sideCode, ageAtUpload, remarks, organizationId, uploadedByUserId, uploadTimestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, patientId, originalFilename, storageKey, viewCode, sideCode, ageAtUpload, remarks, organizationId, req.user?.userId, Date.now()]
      );

      const image = await this.db.get('SELECT * FROM images WHERE id = ?', [id]);
      res.status(201).json({ success: true, data: image });
    } catch (error) {
      res.status(500).json({ error: 'Failed to upload image' });
    }
  }

  async updateImage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      // Implementation for updating image
      res.json({ success: true, message: 'Image updated' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update image' });
    }
  }
}

export default ImageController;
