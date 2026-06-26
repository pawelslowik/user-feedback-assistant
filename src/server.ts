import express, { Request, Response } from 'express';
import path from 'path';
import { insertFeedback } from './lib/db';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const MAX_LENGTH = 1000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

interface FeedbackBody {
  feedback?: unknown;
}

app.post('/api/feedback', (req: Request<object, object, FeedbackBody>, res: Response) => {
  const feedback = typeof req.body.feedback === 'string' ? req.body.feedback.trim() : '';

  if (!feedback) {
    return res.status(400).json({ error: 'Feedback is required.' });
  }

  if (feedback.length > MAX_LENGTH) {
    return res.status(400).json({ error: `Feedback must be at most ${MAX_LENGTH} characters.` });
  }

  try {
    console.log('Saving feedback:', feedback);
    insertFeedback(feedback);
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('Failed to save feedback:', err);
    return res.status(500).json({ error: 'Failed to save feedback.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
