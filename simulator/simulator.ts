import dotenv from 'dotenv';
dotenv.config();

import type { Message, CompletionParams } from "../dist/lib/agent/types.js";
import { completions } from "../dist/lib/agent/openrouter-completions.js";
import * as z from "zod";

const PORT = Number(process.env.SERVER_PORT) || 3000;

async function waitForServer(url: string, timeout = 10000) {
    const start = Date.now();

    while(Date.now() - start < timeout) {
        try {
            const response = await fetch(url);

            if (response.ok) {
                console.log(`Server ready`);
                return;
            }
        } catch {
            console.log("Server not ready");
        }
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    throw new Error("Server did not start");
}

async function sendFeedback(feedback: string) {
    const start = Date.now();

    const response = await fetch(`http://localhost:${PORT}/api/feedbacks`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ feedback: feedback })
    });

    const duration = Date.now() - start;
    const content = await response.text();

    return {
        status: response.status,
        duration,
        content: content
    }
}

async function generateFeedbacks(amount: number): Promise<string[]> {

    let messages: Message[] = [
        {
            role: 'system', content: `You are responsible for generating customer feedback for a car dealership. 
            Genenerate ${amount} user feedbacks. Make them vary on sentiment, emotions, length (max 500 chars) and topics (customer experience, cars, finance, service, etc.)`
        }
    ];

    const feedbacksSchema = z.object({
        feedbacks: z.array(z.string())
    });

    const completionParams: CompletionParams = {
        model: 'openai/gpt-5-mini',
        messages: messages,
        allowedTools: [],
        responseJsonSchema: feedbacksSchema.toJSONSchema()
    };
    const completion = await completions(completionParams);
    return JSON.parse(completion.choices[0].message.content).feedbacks as string[];
}

async function simulate() {
    const feedbacks = await generateFeedbacks(5);
    console.log(JSON.stringify(feedbacks));

    for (var feedback of feedbacks) {
        const response = await sendFeedback(feedback);
        console.log(`Request [${feedback}] returned status ${response.status} with content ${response.content} in ${response.duration} ms`);
    }
}

async function main() {
    console.log("Starting server...")
    await waitForServer(`http://localhost:${PORT}/api/health`);
    await simulate();
}

main().catch(error => {
    console.log(error);
    process.exit(1);
})

