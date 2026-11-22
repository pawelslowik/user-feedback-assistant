import { embeddings } from "./openrouter-embeddings.js";
import config from "../../../config.json" with { type: "json" }
import type { EmbeddingParams } from "./types.js";


export async function generateEmbedding(input: string) {
    const embeddingParams: EmbeddingParams = { 
        model: config.research.embedding.model,
        input: input,
        dimensions: config.research.embedding.dimensions
    };
    return embeddings(embeddingParams);
}