import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class Database {
  private db: sqlite3.Database;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.db = new sqlite3.Database(dbPath);
  }

  initialize(): void {
    this.db.serialize(() => {
      // Users table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          fullName TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT CHECK(role IN ('admin', 'hospital', 'general')) NOT NULL,
          organizationId TEXT,
          isActive INTEGER DEFAULT 1,
          createdAt INTEGER NOT NULL,
          FOREIGN KEY (organizationId) REFERENCES hospitals(id)
        )
      `);

      // Hospitals table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS hospitals (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          code TEXT UNIQUE NOT NULL,
          createdAt INTEGER NOT NULL,
          createdByUserId TEXT NOT NULL,
          FOREIGN KEY (createdByUserId) REFERENCES users(id)
        )
      `);

      // Patients table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS patients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          patientId TEXT UNIQUE NOT NULL,
          name TEXT,
          age INTEGER,
          studyDate TEXT NOT NULL,
          remarks TEXT,
          organizationId TEXT NOT NULL,
          uploadedByUserId TEXT NOT NULL,
          visibility TEXT CHECK(visibility IN ('sample', 'protected')) DEFAULT 'protected',
          FOREIGN KEY (organizationId) REFERENCES hospitals(id),
          FOREIGN KEY (uploadedByUserId) REFERENCES users(id)
        )
      `);

      // Images table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS images (
          id TEXT PRIMARY KEY,
          patientId TEXT NOT NULL,
          originalFilename TEXT NOT NULL,
          storageKey TEXT NOT NULL,
          ageAtUpload INTEGER,
          viewCode INTEGER CHECK(viewCode IN (0, 1)) NOT NULL,
          sideCode INTEGER CHECK(sideCode IN (0, 1)) NOT NULL,
          remarks TEXT,
          status TEXT CHECK(status IN ('Not Reviewed', 'In Progress', 'Annotated', 'Reviewed', 'Approved')) DEFAULT 'Not Reviewed',
          uploadTimestamp INTEGER NOT NULL,
          organizationId TEXT NOT NULL,
          uploadedByUserId TEXT NOT NULL,
          visibility TEXT CHECK(visibility IN ('sample', 'protected')) DEFAULT 'protected',
          FOREIGN KEY (patientId) REFERENCES patients(patientId),
          FOREIGN KEY (organizationId) REFERENCES hospitals(id),
          FOREIGN KEY (uploadedByUserId) REFERENCES users(id)
        )
      `);

      // Annotations table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS annotations (
          id TEXT PRIMARY KEY,
          imageId TEXT NOT NULL,
          type TEXT CHECK(type IN ('bbox', 'polygon', 'point', 'freehand')) NOT NULL,
          coordinates TEXT NOT NULL,
          tumorCenterX REAL,
          tumorCenterY REAL,
          tumorArea REAL,
          label TEXT,
          remarks TEXT,
          biRads TEXT,
          strokeColor TEXT,
          strokeWidth INTEGER,
          opacity REAL,
          timestamp INTEGER NOT NULL,
          organizationId TEXT NOT NULL,
          createdByUserId TEXT NOT NULL,
          version INTEGER DEFAULT 1,
          previousVersionId TEXT,
          FOREIGN KEY (imageId) REFERENCES images(id),
          FOREIGN KEY (organizationId) REFERENCES hospitals(id),
          FOREIGN KEY (createdByUserId) REFERENCES users(id),
          FOREIGN KEY (previousVersionId) REFERENCES annotations(id)
        )
      `);

      // Download Requests table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS downloadRequests (
          id TEXT PRIMARY KEY,
          requesterUserId TEXT NOT NULL,
          requesterEmail TEXT NOT NULL,
          organizationId TEXT NOT NULL,
          requestedAt INTEGER NOT NULL,
          status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
          requestedDatasetSummary TEXT,
          reviewedByUserId TEXT,
          reviewedAt INTEGER,
          reviewerNotes TEXT,
          FOREIGN KEY (requesterUserId) REFERENCES users(id),
          FOREIGN KEY (organizationId) REFERENCES hospitals(id),
          FOREIGN KEY (reviewedByUserId) REFERENCES users(id)
        )
      `);

      // Audit Logs table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS auditLogs (
          id TEXT PRIMARY KEY,
          actorUserId TEXT NOT NULL,
          actorRole TEXT NOT NULL,
          organizationId TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          action TEXT NOT NULL,
          targetType TEXT,
          targetId TEXT,
          details TEXT,
          FOREIGN KEY (actorUserId) REFERENCES users(id),
          FOREIGN KEY (organizationId) REFERENCES hospitals(id)
        )
      `);

      console.log('✓ Database tables initialized');
    });
  }

  run(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

export default Database;
