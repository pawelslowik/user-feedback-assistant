export type FeedbackClassification = {
    valid: boolean;
    sentiment: string;
    category: string;
    summary: string;
    weight: number;
    emotion: string
};

export type FeedbackResearchResult = {
    content: string;
    confidence: number;
    sourceSummaries: string[];
};
