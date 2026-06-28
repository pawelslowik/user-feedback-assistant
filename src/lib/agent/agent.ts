import type { Message, ToolCall } from "./types.js";
import { completions } from "./openrouter-completions.js";

type ToolResult = {
    name: string;
    id: string;
    result: any
};

type TooHandler = (toolName: string, toolCallId: string, args: any) => Promise<ToolResult>;

async function getLabels(): Promise<string[]> {
    return Promise.resolve(["positive", "negative", "mixed"]);
}

const classificationAgentTools = [
    {
        type: "function",
        function: {
            name: "get-labels",
            description: "Returns current labels for feedback classification",
            parameters: {
                type: "object",
                properties: {}
            }
        }
    }
]

async function classificationAgentToolsHandler(toolName: string, toolCallId: string, args: any): Promise<ToolResult> {
    let awaitedResult = null;

    if (toolName == "get-labels") {
        awaitedResult = await getLabels();
    }

    const toolResult: ToolResult = {
        name: toolName,
        id: toolCallId,
        result: awaitedResult
    };
    return Promise.resolve(toolResult);
}

async function runAgent(model: string, messages: Message[], allowedTools: any[], toolHandler: TooHandler): Promise<any> {
    let data = await completions(model, messages, allowedTools);
    let message = data.choices[0].message;
    let toolCalls: ToolCall[] = message?.tool_calls as ToolCall[] ?? [];

    messages.push(message);

    let toolCallCounter = 0;
    while (toolCalls.length && toolCallCounter < 100) {
        const tasks: Promise<ToolResult>[] = [];
        for (const toolCall of toolCalls) {
            const toolName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);
            console.log("tool:" + toolName);
            tasks.push(toolHandler(toolName, toolCall.id, args));
        }
        const parallelToolResults = await Promise.all(tasks);

        for (const toolResult of parallelToolResults) {
            const stringResult = JSON.stringify(toolResult.result);
            toolCallCounter++;
            console.log("tool " + toolResult.name + " result:" + stringResult);
            messages.push({
                role: 'tool',
                tool_call_id: toolResult.id,
                name: toolResult.name,
                content: stringResult,
            });
        }
        data = await completions(model, messages, allowedTools);
        message = data.choices[0].message;
        toolCalls = message?.tool_calls as ToolCall[] ?? [];
        messages.push(message);
    }
    return message.content;

}

export async function classifyFeedback(feedback: string): Promise<string> {
    const systemPrompt = `
    <description>
        You are an analyst responsible for classification of user feedback by assigning one of the available labels.
    </description>
    <rules>
        <rule>Return only the label as plain text</rule>
    </rules>
    `;

    let messages: Message[] = [
        {
            role: 'system', content: systemPrompt
        },
        {
            role: 'user',
            content: `Assign the label for the provided feedback: ${feedback}`,
        },
    ];

    return await runAgent('openai/gpt-5-mini', messages, classificationAgentTools, classificationAgentToolsHandler);
}
