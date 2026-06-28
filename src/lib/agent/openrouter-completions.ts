import dotenv from 'dotenv';
dotenv.config();
import type { Message } from "./types.js";

const OPENROUTER_COMPLETIONS_API: string = process.env.OPENROUTER_COMPLETIONS_API || '';
const OPENROUTER_API_KEY: string = process.env.OPENROUTER_API_KEY || '';

export async function completions(model: string, messages: Message[], allowedTools: any[]) {
    const body = {
        model: model,
        tools: allowedTools,
        messages: messages,
        parallel_tool_calls: false,
        stream: false
    };
    const response = await fetch(OPENROUTER_COMPLETIONS_API, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    const json = await response.json();
    return json;
}
