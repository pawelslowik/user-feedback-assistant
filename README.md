# User Feedback Assistant

This project demonstrates various building blocks and patterns used when building agentic applications with LLMs:

* structured output
* tool calling
* evals
* Langfuse integration (tracing/prompt management)
* OpenRouter integration
* embeddings

This application provides an agent with an API that accepts user feedback about a product/service and runs an async classification process that assigns sentiment, category, emotion, weight and adds a summary.  

## Setup

Install the dependencies:

```
npm install
```

Create a `.env` file in the project root:

```
OPENROUTER_API_KEY=<your OpenRouter API key>
OPENROUTER_COMPLETIONS_API=https://openrouter.ai/api/v1/chat/completions
OPENROUTER_EMBEDDINGS_API=https://openrouter.ai/api/v1/embeddings
SERVER_PORT=3000
LANGFUSE_SECRET_KEY=<your Langfuse secret key>
LANGFUSE_PUBLIC_KEY=<your Langfuse public key>
LANGFUSE_BASE_URL=<your Langfuse URL>
```

Model and prompt settings are in `config.json`.

## Build

Compile the server and the client:

```
npm run build
```

## Run

Build the project and start the server:

```
npm run dev
```

The app is available at `http://localhost:3000`, or on the port set in `SERVER_PORT`.

The server restarts when the contents of `dist/` change, but source files aren't watched. After editing code, run `npm run build` in another terminal.

## Evals

Run the promptfoo evals. They run the test cases from `evals/test-cases.json` through the classification agent, so they make real LLM calls:

```
npm run eval
```

View the results in the promptfoo web UI:

```
npm run eval:view
```

## Simulator

The simulator uses an LLM to generate customer feedback and submits it to the running server. It doesn't start the server and it imports from `dist/`, so start the server first:

```
npm run dev
```

Then run this in a second terminal:

```
npm run simulator
```
