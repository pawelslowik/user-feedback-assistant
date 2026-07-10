import dotenv from 'dotenv';
dotenv.config();
import type { CompletionParams } from "./types.js";
import { startObservation } from "@langfuse/tracing";

const OPENROUTER_COMPLETIONS_API: string = process.env.OPENROUTER_COMPLETIONS_API || '';
const OPENROUTER_API_KEY: string = process.env.OPENROUTER_API_KEY || '';

export async function completions(completionParams: CompletionParams) {
    const generation = startObservation(
        "llm-call",
        {
          model: completionParams.model,
          input: completionParams.messages,
        },
        { asType: "generation" },
      );
    
       
    const body = {
        model: completionParams.model,
        tools: completionParams.allowedTools,
        messages: completionParams.messages,
        response_format: {
            type: "json_schema",
            json_schema: {
                name: "schema",
                strict: true,
                schema: completionParams.responseJsonSchema
            },
        },
        parallel_tool_calls: true,
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

    generation.update({ output: json}).end();
    return json;
}
