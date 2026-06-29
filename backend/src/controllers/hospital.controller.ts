import { Request, Response } from 'express';
import { Database } from '../database';
import type { AuthRequest } from '../types/user.types';
import { v4 as uuidv4 } from 'uuid';

export class HospitalController {
  constructor(private db: Database) {}

  async listHospitals(req: AuthRequest, res: Response): Promise<void> {
    try {
      const hospitals = await this.db.all('SELECT * FROM hospitals');
      res.json({ success: true, data: hospitals });
    } catch (error) {
      res.status(500).json({ error: 'Failed to list hospitals' });
    }
  }

  async getHospital(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const hospital = await this.db.get('SELECT * FROM hospitals WHERE id = ?', [id]);
      if (!hospital) {
        res.status(404).json({ error: 'Hospital not found' });
        return;
      }
      res.json({ success: true, data: hospital });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get hospital' });
    }
  }

  async createHospital(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, code } = req.body;
      const id = uuidv4();
      
      await this.db.run(
        'INSERT INTO hospitals (id, name, code, createdAt, createdByUserId) VALUES (?, ?, ?, ?, ?)',
        [id, name, code, Date.now(), req.user?.userId]
      );

      const hospital = await this.db.get('SELECT * FROM hospitals WHERE id = ?', [id]);
      res.status(201).json({ success: true, data: hospital });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create hospital' });
    }
  }

  async updateHospital(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      // Implementation for updating hospital
      res.json({ success: true, message: 'Hospital updated' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update hospital' });
    }
  }
}

export default HospitalController;
