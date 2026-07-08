import fs from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "audit.log");

export function logAudit(event: {
  userId?: string;
  role?: string;
  action: string;
  target: string;
  status: string;
  details?: string;
}) {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      ...event,
    };

    fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + "\n");
    console.log(`[Audit Log] ${JSON.stringify(logEntry)}`);
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
