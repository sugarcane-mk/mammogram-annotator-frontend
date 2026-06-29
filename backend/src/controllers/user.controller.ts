import { Request, Response } from 'express';
import { Database } from '../database';
import type { AuthRequest } from '../types/user.types';

export class UserController {
  constructor(private db: Database) {}

  async listUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const users = await this.db.all('SELECT id, fullName, email, role, organizationId, isActive, createdAt FROM users');
      res.json({ success: true, data: users });
    } catch (error) {
      res.status(500).json({ error: 'Failed to list users' });
    }
  }

  async getUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await this.db.get(
        'SELECT id, fullName, email, role, organizationId, isActive, createdAt FROM users WHERE id = ?',
        [id]
      );
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get user' });
    }
  }

  async updateUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      // Implementation for updating user
      res.json({ success: true, message: 'User updated' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update user' });
    }
  }

  async deleteUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.db.run('DELETE FROM users WHERE id = ?', [id]);
      res.json({ success: true, message: 'User deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }
}

export default UserController;
