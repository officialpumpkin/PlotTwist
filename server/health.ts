
import type { Express } from "express";
import { logger } from "./logger";
import fs from 'fs';
import path from 'path';

export function setupHealthCheck(app: Express) {
  app.get('/api/health', (req, res) => {
    const healthCheck = {
      timestamp: new Date().toISOString(),
      status: 'OK',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0'
    };

    logger.debug('Health check requested', healthCheck);
    res.status(200).json(healthCheck);
  });

  app.get('/api/logs', (req, res) => {
    try {
      const logsDir = path.join(process.cwd(), 'logs');
      
      if (!fs.existsSync(logsDir)) {
        return res.status(404).json({ message: 'No logs directory found' });
      }

      const logFiles = fs.readdirSync(logsDir)
        .filter(file => file.endsWith('.log'))
        .map(file => ({
          name: file,
          size: fs.statSync(path.join(logsDir, file)).size,
          modified: fs.statSync(path.join(logsDir, file)).mtime
        }))
        .sort((a, b) => b.modified.getTime() - a.modified.getTime());

      res.json({ logFiles });
    } catch (error) {
      logger.error('Failed to list log files', error as Error);
      res.status(500).json({ message: 'Failed to list log files' });
    }
  });

  app.get('/api/logs/:filename', (req, res) => {
    try {
      const filename = req.params.filename;
      const logFile = path.join(process.cwd(), 'logs', filename);
      
      if (!fs.existsSync(logFile) || !filename.endsWith('.log')) {
        return res.status(404).json({ message: 'Log file not found' });
      }

      const lines = req.query.lines ? parseInt(req.query.lines as string) : 100;
      const content = fs.readFileSync(logFile, 'utf8');
      const logLines = content.split('\n').filter(line => line.trim());
      
      const recentLines = logLines.slice(-lines).map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { raw: line };
        }
      });

      res.json({ 
        filename,
        totalLines: logLines.length,
        displayedLines: recentLines.length,
        logs: recentLines
      });
    } catch (error) {
      logger.error('Failed to read log file', error as Error, { filename: req.params.filename });
      res.status(500).json({ message: 'Failed to read log file' });
    }
  });
}
