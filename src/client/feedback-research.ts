const MAX_LENGTH = 1000;

const form = document.getElementById('research-form') as HTMLFormElement;
const textarea = document.getElementById('query') as HTMLTextAreaElement;
const charCount = document.getElementById('char-count') as HTMLSpanElement;
const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
const message = document.getElementById('message') as HTMLParagraphElement;
const result = document.getElementById('research-result') as HTMLElement;
const answerContent = document.getElementById('answer-content') as HTMLParagraphElement;
const answerConfidence = document.getElementById('answer-confidence') as HTMLParagraphElement;
const answerSources = document.getElementById('answer-sources') as HTMLUListElement;

type MessageType = 'info' | 'error';

interface ResearchResponse {
  content?: string;
  confidence?: number;
  sourceSummaries?: string[];
  error?: string;
}

function updateCharCount(): void {
  charCount.textContent = `${textarea.value.length} / ${MAX_LENGTH}`;
}

function showMessage(text: string, type: MessageType): void {
  message.textContent = text;
  message.className = `message ${type}`;
}

function clearMessage(): void {
  message.textContent = '';
  message.className = 'message';
}

function createSourceItem(text: string): HTMLLIElement {
  const item = document.createElement('li');
  item.textContent = text;
  return item;
}

function showResult(research: ResearchResponse): void {
  const sources = research.sourceSummaries ?? [];

  answerContent.textContent = research.content || 'No answer was returned.';
  answerConfidence.textContent = `Confidence: ${research.confidence ?? 0}%`;
  answerSources.replaceChildren(
    ...(sources.length ? sources.map(createSourceItem) : [createSourceItem('No sources')])
  );
  result.hidden = false;
}

textarea.addEventListener('input', updateCharCount);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage();

  const query = textarea.value.trim();

  if (!query) {
    showMessage('Please enter a query before running the research.', 'error');
    return;
  }

  if (query.length > MAX_LENGTH) {
    showMessage(`Query must be at most ${MAX_LENGTH} characters.`, 'error');
    return;
  }

  submitBtn.disabled = true;
  result.hidden = true;
  showMessage('Researching... this can take a while.', 'info');

  try {
    const response = await fetch('/api/feedbacks/researches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const data = (await response.json().catch(() => ({}))) as ResearchResponse;

    if (response.ok) {
      clearMessage();
      showResult(data);
      return;
    }

    showMessage(data.error || 'Something went wrong. Please try again.', 'error');
  } catch {
    showMessage('Unable to reach the server. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
  }
});

updateCharCount();
