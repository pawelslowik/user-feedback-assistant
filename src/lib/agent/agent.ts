import type { Message, ToolCall, ToolResult, AgentParams, CompletionParams } from "./types.js";
import { completions } from "./openrouter-completions.js";
import * as z from "zod";
import type { FeedbackClassification, FeedbackResearchResult } from "../types.js";
import { getPrompt, getResearchPrompt } from "./prompts.js";
import config from "../../../config.json" with { type: "json" }
import { generateEmbedding } from "./embedding.js";
import { queryFeedbackEmbedding } from "../db.js";

const SENTIMENTS: string[] = ["positive", "negative", "mixed", "neutral", "other"];
const CATEGORIES: string[] = ["product", "services-and-support", "finance", "legal", "other"];
const EMOTIONS: string[] = ["trust", "frustration", "excitement", "satisfaction", "disappointment", 
        "suspicion", "gratitude", "anger", "relief", "anxiety"];

async function getSentiments(): Promise<string[]> {
    return Promise.resolve(SENTIMENTS);
}

async function getCategories(): Promise<string[]> {
    return Promise.resolve(CATEGORIES);
}

async function getEmotions(): Promise<string[]> {
    return Promise.resolve(EMOTIONS);
}

const classificationAgentTools = [
    {
        type: "function",
        function: {
            name: "get-sentiments",
            description: "Returns sentiments for feedback classification",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get-categories",
            description: "Returns categories for feedback classification",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get-emotions",
            description: "Returns emotions for feedback classification",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    }
]

const researchAgentTools = [
    {
        type: "function",
        function: {
            name: "semantic-search-feedback",
            description: "Semantic search over stored customer feedback. Write `query` as text a customer might have written, not as a question. You may call this tool several times.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Customer-style text to match semantically" },
                    sentiment: { type: "string", enum: SENTIMENTS },
                    category: { type: "string", enum: CATEGORIES },
                    emotion: { type: "string", enum: EMOTIONS }
                },
                required: ["query"],
                additionalProperties: false
            }
        }
    }
]

async function classificationAgentToolsHandler(toolName: string, toolCallId: string, args: any): Promise<ToolResult> {
    let awaitedResult = null;

    if (toolName == "get-sentiments") {
        awaitedResult = await getSentiments();
    }
    if (toolName == "get-categories") {
        awaitedResult = await getCategories();
    }
    if (toolName == "get-emotions") {
        awaitedResult = await getEmotions();
    }

    const toolResult: ToolResult = {
        name: toolName,
        id: toolCallId,
        result: awaitedResult
    };
    return Promise.resolve(toolResult);
}

async function researchAgentToolsHandler(toolName: string, toolCallId: string, args: any): Promise<ToolResult> {
    let awaitedResult = null;

    if (toolName == "semantic-search-feedback") {
        try {
            const embedding = await generateEmbedding(args.query);
            //TODO: decouple agent from DB
            awaitedResult = queryFeedbackEmbedding({ embedding, sentiment: args.sentiment, category: args.category, emotion: args.emotion });
        }
        catch (error) {
            console.error(error);
            awaitedResult = "Semantic search failed";
        }
        
    }

    const toolResult: ToolResult = {
        name: toolName,
        id: toolCallId,
        result: awaitedResult
    };
    return Promise.resolve(toolResult);
}

async function runAgent(agentParams: AgentParams): Promise<any> {
    let data = await completions(agentParams);
    let message = data.choices[0].message;
    let toolCalls: ToolCall[] = message?.tool_calls as ToolCall[] ?? [];

    agentParams.messages.push(message);

    let toolCallCounter = 0;
    while (toolCalls.length && toolCallCounter < 100) {
        const tasks: Promise<ToolResult>[] = [];
        for (const toolCall of toolCalls) {
            const toolName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);
            console.log("Running tool:" + toolName);
            tasks.push(agentParams.toolHandler(toolName, toolCall.id, args));
        }
        const parallelToolResults = await Promise.all(tasks);

        for (const toolResult of parallelToolResults) {
            const stringResult = JSON.stringify(toolResult.result);
            toolCallCounter++;
            console.log("Tool " + toolResult.name + " result:" + stringResult);
            agentParams.messages.push({
                role: 'tool',
                tool_call_id: toolResult.id,
                name: toolResult.name,
                content: stringResult,
            });
        }
        data = await completions(agentParams);
        message = data.choices[0].message;
        toolCalls = message?.tool_calls as ToolCall[] ?? [];
        agentParams.messages.push(message);
    }
    return message.content;

}

export async function classifyFeedback(feedback: string): Promise<FeedbackClassification> {
    const systemPrompt = await getPrompt();

    let messages: Message[] = [
        {
            role: 'system', content: systemPrompt
        },
        {
            role: 'user',
            content: `Classify the provided feedback: ${feedback}`,
        },
    ];

    const feedbackClassificationSchema = z.object({
        sentiment: z.string(),
        category: z.string(),
        summary: z.string(),
        weight: z.number(),
        emotion: z.string()
    });

    const agentParams: AgentParams = {
        model: config.model,
        messages: messages,
        allowedTools: classificationAgentTools,
        toolHandler: classificationAgentToolsHandler,
        responseJsonSchema: feedbackClassificationSchema.toJSONSchema()
    };

    const agentResponse = await runAgent(agentParams);
    return JSON.parse(agentResponse) as FeedbackClassification;
}

export async function researchFeedback(query: string): Promise<FeedbackResearchResult> {
    const systemPrompt = await getResearchPrompt();

    let messages: Message[] = [
        {
            role: 'system', content: systemPrompt
        },
        {
            role: 'user',
            content: query,
        },
    ];

    const feedbackResearchSchema = z.object({
        content: z.string(),
        confidence: z.number(),
        sourceSummaries: z.array(z.string())
    });

    const agentParams: AgentParams = {
        model: config.model,
        messages: messages,
        allowedTools: researchAgentTools,
        toolHandler: researchAgentToolsHandler,
        responseJsonSchema: feedbackResearchSchema.toJSONSchema()
    };

    const agentResponse = await runAgent(agentParams);
    return JSON.parse(agentResponse) as FeedbackResearchResult;
}
