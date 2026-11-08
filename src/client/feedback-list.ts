const COLUMN_COUNT = 7;

const feedbackRows = document.getElementById('feedback-rows') as HTMLTableSectionElement;
const message = document.getElementById('message') as HTMLParagraphElement;

interface FeedbackListItem {
  processId: string;
  sentiment: string;
  category: string;
  summary: string;
  weight: number;
  emotion: string;
  createdAt: string;
}

function createCell(text: string): HTMLTableCellElement {
  const cell = document.createElement('td');
  cell.textContent = text;
  return cell;
}

function createCreatedAtCell(createdAt: string): HTMLTableCellElement {
  const cell = document.createElement('td');
  cell.className = 'nowrap';

  const time = document.createElement('time');
  time.dateTime = createdAt;
  time.title = createdAt;

  const date = new Date(createdAt);
  time.textContent = isNaN(date.getTime())
    ? createdAt
    : date.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' });

  cell.append(time);
  return cell;
}

function createFeedbackRow(feedback: FeedbackListItem): HTMLTableRowElement {
  const row = document.createElement('tr');
  const processIdCell = createCell(feedback.processId);
  processIdCell.className = 'nowrap';

  row.append(
    createCreatedAtCell(feedback.createdAt),
    processIdCell,
    createCell(feedback.sentiment),
    createCell(feedback.category),
    createCell(feedback.summary),
    createCell(String(feedback.weight)),
    createCell(feedback.emotion),
  );
  return row;
}

function createEmptyRow(): HTMLTableRowElement {
  const row = document.createElement('tr');
  const cell = createCell('No feedback yet.');
  cell.colSpan = COLUMN_COUNT;
  row.append(cell);
  return row;
}

function renderFeedbacks(feedbacks: FeedbackListItem[]): void {
  if (feedbacks.length === 0) {
    feedbackRows.replaceChildren(createEmptyRow());
    return;
  }
  feedbackRows.replaceChildren(...feedbacks.map(createFeedbackRow));
}

function showError(text: string): void {
  message.textContent = text;
  message.className = 'message error';
}

function clearMessage(): void {
  message.textContent = '';
  message.className = 'message';
}

// SSE: connect to the feedback stream
const source = new EventSource('/api/feedbacks/events');

source.addEventListener('feedback-list', (event: Event) => {
  const messageEvent = event as MessageEvent<string>;
  clearMessage();
  renderFeedbacks(JSON.parse(messageEvent.data) as FeedbackListItem[]);
});

source.addEventListener('error', () => {
  showError('Connection to the server was lost. Reconnecting...');
});
