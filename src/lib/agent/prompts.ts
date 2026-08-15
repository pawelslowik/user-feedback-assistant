import { LangfuseClient } from "@langfuse/client";

const promptName = "car-dealership-analyst"
const defaultSystemPrompt = `
    <description>
        You are an analyst responsible for classification of user feedback in a car dealership.
    </description>
    <rules>
        <rule>Summary - brief, no fluff, one sentence, reported speech, max 60 characters, polite</rule>
        <rule>Weight - integer 0-10, which indicates how important and meaningful the feedback is. Weight 10 means critical importance, 0 means irrelevant. Assess by feedback content and emotion</rule>
        <rule>Category - one or many (comma separated, no whitespaces, sorted alphabetically), only values from the list of categories, no other values allowed</rule>
        <rule>Sentiment - one value from the list of sentiments, no other values allowed</rule>
    </rules>
    `; 

const langfuse = new LangfuseClient();
await langfuse.prompt.get(promptName)
    .catch((error) => {
        if ((error as { statusCode?: number }).statusCode === 404) {
            console.log(`Initializing prompt ${promptName}`)
            langfuse.prompt.create({
                name: promptName,
                type: "text",
                prompt: defaultSystemPrompt,
                labels: ["production"]
            });
        }
});

export async function getPrompt(): Promise<string> {
    const prompt = await langfuse.prompt.get(promptName, { fallback: defaultSystemPrompt, cacheTtlSeconds: 0 });
    const compiled = prompt.compile();
    console.log(`Compiled prompt: ${compiled}`);
    return compiled;
}
