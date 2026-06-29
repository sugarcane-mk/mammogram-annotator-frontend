import { Request, Response } from 'express';
import { Database } from '../database';
import type { AuthRequest } from '../types/user.types';
import { v4 as uuidv4 } from 'uuid';

export class AnnotationController {
  constructor(private db: Database) {}

  async listAnnotations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { imageId } = req.query;
      const query = imageId 
        ? 'SELECT * FROM annotations WHERE imageId = ?'
        : 'SELECT * FROM annotations';
      const params = imageId ? [imageId] : [];
      
      const annotations = await this.db.all(query, params);
      res.json({ success: true, data: annotations });
    } catch (error) {
      res.status(500).json({ error: 'Failed to list annotations' });
    }
  }

  async getAnnotation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const annotation = await this.db.get('SELECT * FROM annotations WHERE id = ?', [id]);
      if (!annotation) {
        res.status(404).json({ error: 'Annotation not found' });
        return;
      }
      res.json({ success: true, data: annotation });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get annotation' });
    }
  }

  async createAnnotation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { imageId, type, coordinates, tumorCenterX, tumorCenterY, tumorArea, label, remarks, biRads, strokeColor, strokeWidth, opacity, organizationId } = req.body;
      const id = uuidv4();

      await this.db.run(
        `INSERT INTO annotations (id, imageId, type, coordinates, tumorCenterX, tumorCenterY, tumorArea, label, remarks, biRads, strokeColor, strokeWidth, opacity, timestamp, organizationId, createdByUserId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, imageId, type, JSON.stringify(coordinates), tumorCenterX, tumorCenterY, tumorArea, label, remarks, biRads, strokeColor, strokeWidth, opacity, Date.now(), organizationId, req.user?.userId]
      );

      const annotation = await this.db.get('SELECT * FROM annotations WHERE id = ?', [id]);
      res.status(201).json({ success: true, data: annotation });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create annotation' });
    }
  }

  async updateAnnotation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Get current annotation for versioning
      const current = await this.db.get('SELECT version FROM annotations WHERE id = ?', [id]);
      const newVersion = (current?.version || 1) + 1;

      // Update with versioning
      const updateSql = `
        UPDATE annotations 
        SET ${Object.keys(updates).map(k => `${k} = ?`).join(', ')}, timestamp = ?, version = ?
        WHERE id = ?
      `;
      const params = [...Object.values(updates), Date.now(), newVersion, id];
      
      await this.db.run(updateSql, params);

      const annotation = await this.db.get('SELECT * FROM annotations WHERE id = ?', [id]);
      res.json({ success: true, data: annotation });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update annotation' });
    }
  }

  async deleteAnnotation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.db.run('DELETE FROM annotations WHERE id = ?', [id]);
      res.json({ success: true, message: 'Annotation deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete annotation' });
    }
  }
}

export default AnnotationController;
