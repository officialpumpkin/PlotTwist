import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import "./db";
import { setupHealthCheck } from "./health";
import fs from "fs";
import path from "path";

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;

// Trust proxy for session cookies
app.set('trust proxy', 1);

// Optimize express settings
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Simplified performance logging (only for slow requests)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    // Only log API requests that take longer than 100ms
    if (path.startsWith("/api") && duration > 100) {
      log(`SLOW: ${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Setup health check and monitoring endpoints
  setupHealthCheck(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Detailed error logging
    const errorDetails = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      query: req.query,
      params: req.params,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      sessionId: (req as any).sessionID,
      userId: (req as any).session?.userId || (req as any).user?.claims?.sub,
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
        status: status,
        code: err.code,
        errno: err.errno,
        syscall: err.syscall
      }
    };

    console.error('=== SERVER ERROR ===');
    console.error(JSON.stringify(errorDetails, null, 2));
    console.error('===================');

    // Log to file for persistence
    const logsDir = path.join(process.cwd(), 'logs');

    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const logFile = path.join(logsDir, `error-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, JSON.stringify(errorDetails) + '\n');

    res.status(status).json({ 
      message,
      ...(process.env.NODE_ENV === 'development' && {
        error: err.message,
        stack: err.stack,
        details: errorDetails
      })
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
