 import express, { type Request, Response, NextFunction } from "express";
 import { registerRoutes } from "./routes";
 import { setupVite, serveStatic, log } from "./vite";
 import "./db";
 import { setupHealthCheck } from "./health";
 import fs from "fs";
 import path from "path";
+import cors from "cors";

 const app = express();

-app.use(cors({
-  origin: ["https://plottwist.pages.dev"], // your Pages URL here
-  credentials: true
-}));
+app.use(cors({
+  origin: ["https://dc1ac165.plottwist-client.pages.dev"], // Cloudflare Pages URL
+  credentials: true,
+}));

-const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;
+const port = Number(process.env.PORT) || 8080;

 // Trust proxy for session cookies
 app.set('trust proxy', 1);

@@
   app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
@@
-    // Log to file for persistence
-    const logsDir = path.join(process.cwd(), 'logs');
-
-    if (!fs.existsSync(logsDir)) {
-      fs.mkdirSync(logsDir, { recursive: true });
-    }
-
-    const logFile = path.join(logsDir, `error-${new Date().toISOString().split('T')[0]}.log`);
-    fs.appendFileSync(logFile, JSON.stringify(errorDetails) + '\n');
+    // In Cloud Run, prefer stdout/stderr (structured logs). If you really want a file, use /tmp.
+    try {
+      const logsDir = path.join('/tmp', 'logs');
+      if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
+      const logFile = path.join(logsDir, `error-${new Date().toISOString().split('T')[0]}.log`);
+      fs.appendFileSync(logFile, JSON.stringify(errorDetails) + '\n');
+    } catch (_) {
+      // ignore file logging errors in serverless
+    }

@@
-  // ALWAYS serve the app on port 5000
-  // this serves both the API and the client.
-  // It is the only port that is not firewalled.
   server.listen({
     port,
     host: "0.0.0.0",
-    reusePort: true,
   }, () => {
     log(`serving on port ${port}`);
   });
 })();
