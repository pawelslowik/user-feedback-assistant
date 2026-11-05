import dotenv from 'dotenv';
dotenv.config();
import type { EmbeddingParams } from "./types.js";
import { startObservation } from "@langfuse/tracing";

const OPENROUTER_EMBEDDINGS_API: string = process.env.OPENROUTER_EMBEDDINGS_API || '';
const OPENROUTER_API_KEY: string = process.env.OPENROUTER_API_KEY || '';

export async function embeddings(embeddingParams: EmbeddingParams): Promise<number[]> {
    console.log(`Generating embedding using params ${JSON.stringify(embeddingParams)}`);
    const generation = startObservation(
        "embedding-call",
        {
            model: embeddingParams.model,
            input: embeddingParams.input,
        },
        { asType: "embedding" },
    );


    const body = {
        model: embeddingParams.model,
        input: embeddingParams.input,
        dimensions: embeddingParams.dimensions
    };

    try {
        const response = await fetch(OPENROUTER_EMBEDDINGS_API, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const json = await response.json();
        if (!response.ok || !json.data?.[0]?.embedding) {
            throw new Error(`Embedding request failed (${response.status}): ${JSON.stringify(json.error ?? json)}`);
        }

        const embedding = json.data[0].embedding;
        console.log(`Embedding dimension: ${embedding.length}`);
        generation.update({ output: { dimensions: embedding.length, usage: json.usage } });
        return embedding;
    }
    catch (error) {
        generation.update({ level: "ERROR", statusMessage: String(error) });
        throw error;
    }
    finally {
        generation.end();
    }
}
