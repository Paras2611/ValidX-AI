import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database';
import { config } from '../../config';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AuditService } from '../audit/audit.service';
import { User } from '../../types';

export class AuthController {
  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, full_name } = req.body;
      if (!email || !password || !full_name) {
        res.status(400).json({ error: 'Validation Error', message: 'Email, password, and full name are required' });
        return;
      }

      const existing = db.findOne('users', (u) => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        res.status(409).json({ error: 'Conflict', message: 'An account with this email address already exists' });
        return;
      }

      const defaultOrg = db.findOne('organizations', (o) => o.code === 'AICTE');
      const passwordHash = bcrypt.hashSync(password, 10);
      const newUser: User = {
        id: uuidv4(),
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        full_name: full_name.trim(),
        role: 'applicant', // default registered role
        organization_id: defaultOrg?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      db.insert('users', newUser);

      AuditService.log({
        actorId: newUser.id,
        actorRole: newUser.role,
        action: 'USER_REGISTERED',
        resourceType: 'USER',
        resourceId: newUser.id,
        outcome: 'success',
        ipAddress: req.ip,
      });

      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, role: newUser.role, organization_id: newUser.organization_id },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn as any }
      );

      res.status(201).json({
        message: 'Account registered successfully',
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          full_name: newUser.full_name,
          role: newUser.role,
          organization_id: newUser.organization_id,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'Validation Error', message: 'Email and password are required' });
        return;
      }

      const user = db.findOne('users', (u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        AuditService.log({
          action: 'LOGIN_FAILED',
          resourceType: 'USER',
          outcome: 'failure',
          ipAddress: req.ip,
          metadata: { email },
        });
        res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials provided' });
        return;
      }

      const isMatch = bcrypt.compareSync(password, user.password_hash);
      if (!isMatch) {
        AuditService.log({
          actorId: user.id,
          actorRole: user.role,
          action: 'LOGIN_FAILED',
          resourceType: 'USER',
          resourceId: user.id,
          outcome: 'failure',
          ipAddress: req.ip,
        });
        res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials provided' });
        return;
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, organization_id: user.organization_id },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn as any }
      );

      AuditService.log({
        actorId: user.id,
        actorRole: user.role,
        action: 'LOGIN_SUCCESS',
        resourceType: 'USER',
        resourceId: user.id,
        outcome: 'success',
        ipAddress: req.ip,
      });

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          organization_id: user.organization_id,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }

  public static async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const user = db.findById('users', req.user.id);
    if (!user) {
      res.status(404).json({ error: 'Not Found', message: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        organization_id: user.organization_id,
      },
    });
  }
}
