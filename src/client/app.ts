const MAX_LENGTH = 1000;

const form = document.getElementById('feedback-form') as HTMLFormElement;
const textarea = document.getElementById('feedback') as HTMLTextAreaElement;
const charCount = document.getElementById('char-count') as HTMLSpanElement;
const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
const message = document.getElementById('message') as HTMLParagraphElement;

type MessageType = 'success' | 'error';

interface FeedbackErrorResponse {
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

textarea.addEventListener('input', updateCharCount);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage();

  const feedback = textarea.value.trim();

  if (!feedback) {
    showMessage('Please enter your feedback before submitting.', 'error');
    return;
  }

  if (feedback.length > MAX_LENGTH) {
    showMessage(`Feedback must be at most ${MAX_LENGTH} characters.`, 'error');
    return;
  }

  submitBtn.disabled = true;

  try {
    const response = await fetch('/api/feedbacks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback }),
    });

    const data = (await response.json().catch(() => ({}))) as FeedbackErrorResponse;

    if (response.ok) {
      textarea.value = '';
      updateCharCount();
      showMessage('Thank you! Your feedback has been submitted.', 'success');
      return;
    }

    showMessage(data.error || 'Something went wrong. Please try again.', 'error');
  } catch {
    showMessage('Unable to reach the server. Please try again.', 'error');
  } finally {
    submitBtn.disabled = false;
  }
});

// SSE: connect to the feedback stream
const source = new EventSource('/api/feedbacks/events');

source.addEventListener('feedback-list', (event: Event) => {
  const messageEvent = event as MessageEvent<string>;
  console.log(messageEvent.data);
});

updateCharCount();