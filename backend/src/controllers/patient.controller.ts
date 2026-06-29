import { Request, Response } from 'express';
import { Database } from '../database';
import type { AuthRequest } from '../types/user.types';
import { v4 as uuidv4 } from 'uuid';

export class PatientController {
  constructor(private db: Database) {}

  async listPatients(req: AuthRequest, res: Response): Promise<void> {
    try {
      const patients = await this.db.all('SELECT * FROM patients');
      res.json({ success: true, data: patients });
    } catch (error) {
      res.status(500).json({ error: 'Failed to list patients' });
    }
  }

  async getPatient(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const patient = await this.db.get('SELECT * FROM patients WHERE id = ?', [id]);
      if (!patient) {
        res.status(404).json({ error: 'Patient not found' });
        return;
      }
      res.json({ success: true, data: patient });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get patient' });
    }
  }

  async createPatient(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { patientId, name, age, studyDate, remarks, organizationId } = req.body;
      
      await this.db.run(
        `INSERT INTO patients (patientId, name, age, studyDate, remarks, organizationId, uploadedByUserId, visibility)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'protected')`,
        [patientId, name, age, studyDate, remarks, organizationId, req.user?.userId]
      );

      const patient = await this.db.get('SELECT * FROM patients WHERE patientId = ?', [patientId]);
      res.status(201).json({ success: true, data: patient });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create patient' });
    }
  }

  async updatePatient(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      // Implementation for updating patient
      res.json({ success: true, message: 'Patient updated' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update patient' });
    }
  }
}

export default PatientController;
