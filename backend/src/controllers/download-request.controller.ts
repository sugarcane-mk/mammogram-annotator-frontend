import { Request, Response } from 'express';
import { Database } from '../database';
import type { AuthRequest } from '../types/user.types';
import { v4 as uuidv4 } from 'uuid';

export class DownloadRequestController {
  constructor(private db: Database) {}

  async listDownloadRequests(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { status, requesterUserId } = req.query;
      let query = 'SELECT * FROM downloadRequests WHERE 1=1';
      const params: any[] = [];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      if (requesterUserId) {
        query += ' AND requesterUserId = ?';
        params.push(requesterUserId);
      }

      const requests = await this.db.all(query, params);
      res.json({ success: true, data: requests });
    } catch (error) {
      res.status(500).json({ error: 'Failed to list download requests' });
    }
  }

  async createDownloadRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { requesterEmail, organizationId, requestedDatasetSummary } = req.body;
      const id = uuidv4();

      await this.db.run(
        `INSERT INTO downloadRequests (id, requesterUserId, requesterEmail, organizationId, requestedAt, status, requestedDatasetSummary)
         VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
        [id, req.user?.userId, requesterEmail, organizationId, Date.now(), requestedDatasetSummary]
      );

      const request = await this.db.get('SELECT * FROM downloadRequests WHERE id = ?', [id]);
      res.status(201).json({ success: true, data: request });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create download request' });
    }
  }

  async approveDownloadRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      await this.db.run(
        `UPDATE downloadRequests SET status = 'approved', reviewedByUserId = ?, reviewedAt = ?, reviewerNotes = ? WHERE id = ?`,
        [req.user?.userId, Date.now(), notes, id]
      );

      const request = await this.db.get('SELECT * FROM downloadRequests WHERE id = ?', [id]);
      res.json({ success: true, data: request });
    } catch (error) {
      res.status(500).json({ error: 'Failed to approve download request' });
    }
  }

  async rejectDownloadRequest(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      await this.db.run(
        `UPDATE downloadRequests SET status = 'rejected', reviewedByUserId = ?, reviewedAt = ?, reviewerNotes = ? WHERE id = ?`,
        [req.user?.userId, Date.now(), notes, id]
      );

      const request = await this.db.get('SELECT * FROM downloadRequests WHERE id = ?', [id]);
      res.json({ success: true, data: request });
    } catch (error) {
      res.status(500).json({ error: 'Failed to reject download request' });
    }
  }
}

export default DownloadRequestController;
