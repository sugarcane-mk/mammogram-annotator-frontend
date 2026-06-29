import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '../database';
import { generateToken } from '../middleware/auth.middleware';
import type { User, UserRole } from '../types/user.types';

export class AuthController {
  constructor(private db: Database) {}

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const user = await this.db.get(
        'SELECT * FROM users WHERE email = ?',
        [email]
      ) as User;

      if (!user || !user.isActive) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
        token,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      res.status(500).json({ error: message });
    }
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, fullName, role = 'general' } = req.body;

      if (!email || !password || !fullName) {
        res.status(400).json({ error: 'Email, password, and full name are required' });
        return;
      }

      // Check if user already exists
      const existing = await this.db.get(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existing) {
        res.status(400).json({ error: 'User already exists' });
        return;
      }

      const userId = uuidv4();
      const hashedPassword = await bcrypt.hash(password, 10);

      await this.db.run(
        `INSERT INTO users (id, fullName, email, password, role, isActive, createdAt)
         VALUES (?, ?, ?, ?, ?, 1, ?)`,
        [userId, fullName, email, hashedPassword, role, Date.now()]
      );

      const user = await this.db.get(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      ) as User;

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      });

      res.status(201).json({
        success: true,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
        token,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      res.status(500).json({ error: message });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Logged out successfully' });
  }
}

export default AuthController;
