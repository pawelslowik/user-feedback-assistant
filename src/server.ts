import dotenv from 'dotenv';
dotenv.config();
import "./lib/instrumentation.js";
import { startActiveObservation } from "@langfuse/tracing";
import express from 'express';
import type { Request, Response } from 'express'
import path from 'path';
import { insertFeedback } from './lib/db.js';
import { fileURLToPath } from 'url';
import { classifyFeedback } from './lib/agent/agent.js'
import { v4 as uuid } from 'uuid';

const app = express();
const PORT = Number(process.env.SERVER_PORT) || 3000;
const MAX_LENGTH = 1000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

interface FeedbackBody {
  feedback?: unknown;
}

app.post('/api/feedback', async (req: Request<object, object, FeedbackBody>, res: Response) => {
  const feedback = typeof req.body.feedback === 'string' ? req.body.feedback.trim() : '';

  if (!feedback) {
    return res.status(400).json({ error: 'Feedback is required.' });
  }

  if (feedback.length > MAX_LENGTH) {
    return res.status(400).json({ error: `Feedback must be at most ${MAX_LENGTH} characters.` });
  }

  const processId: string = uuid();
  console.log(`Process [${processId}] processing feedback [${feedback}]`);

  // Respond immediately
  res.status(201).json({ success: true, processId: processId });

  // Fire-and-forget background work
  void startActiveObservation("feedback", async (span) => {
    span.update({ input: { processId, feedback } });

    try {
      const label = await classifyFeedback(feedback);
      console.log(`Label [${label}] assigned to feedback [${feedback}] in process [${processId}]`);

      insertFeedback(feedback, label, processId);

      span.update({
        output: { processId, result: "Feedback successfully processed", label }
      });
    } catch (error) {
      console.error(error);
      span.update({
        output: { processId, result: "Feedback processing failed" }
      });
    } finally {
      span.end();
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
