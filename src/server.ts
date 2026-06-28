import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import type { Request, Response } from 'express'
import path from 'path';
import { insertFeedback } from './lib/db.js';
import { fileURLToPath } from 'url';
import { classifyFeedback } from './lib/agent/agent.js'

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

  try {
    console.log(`Processing feedback [${feedback}]`);
    classifyFeedback(feedback).then(label => {
      console.log(`Label [${label}] assigned to feedback [${feedback}]`);
      insertFeedback(feedback, label);
    }).catch(error => console.log(error));
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('Failed to save feedback:', err);
    return res.status(500).json({ error: 'Failed to process feedback.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
