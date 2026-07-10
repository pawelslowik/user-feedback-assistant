import type { Message, ToolCall, ToolResult, AgentParams, CompletionParams } from "./types.js";
import { completions } from "./openrouter-completions.js";
import * as z from "zod";
import type { FeedbackClassification } from "../types.js";



async function getSentiments(): Promise<string[]> {
    return Promise.resolve(["positive", "negative", "mixed", "other"]);
}

async function getCategories(): Promise<string[]> {
    return Promise.resolve(["product", "services", "finance", "legal", "other"]);
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
            console.log("tool:" + toolName);
            tasks.push(agentParams.toolHandler(toolName, toolCall.id, args));
        }
        const parallelToolResults = await Promise.all(tasks);

        for (const toolResult of parallelToolResults) {
            const stringResult = JSON.stringify(toolResult.result);
            toolCallCounter++;
            console.log("tool " + toolResult.name + " result:" + stringResult);
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
    const systemPrompt = `
    <description>
        You are an analyst responsible for classification of user feedback in a car dealership.
    </description>
    <rules>
        <rule>Summary - brief, one sentence, max 100 characters, only polite language</rule>
        <rule>Weight - integer 0-10, which indicates how important is given feedback with weight 10 being critical importance and 0 being not important. Assess by feedback content and emotion</rule>
        <rule>Category - one or many (comma separated), only values from the list allowed: product, services, finance, other</rule>
        <rule>Sentiment - one value from the list of sentiments, no other values allowed</rule>
    </rules>
    `;

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
        weight: z.number()
    });

    const agentParams: AgentParams = {
        model: 'openai/gpt-5-mini',
        messages: messages,
        allowedTools: classificationAgentTools,
        toolHandler: classificationAgentToolsHandler,
        responseJsonSchema: feedbackClassificationSchema.toJSONSchema()
    };

    const agentResponse = await runAgent(agentParams);
    return JSON.parse(agentResponse) as FeedbackClassification;
}
