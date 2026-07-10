export type TextContent = {
    type: 'text';
    text: string;
};

export type ImageContentPart = {
    type: 'image_url';
    image_url: {
        url: string; // URL or base64 encoded image data
        detail?: string; // Optional, defaults to "auto"
    };
};

export type AudioContentPart = {
    type: 'input_audio';
    input_audio: {
        data: string;
        format: string;
    };
};

export type ContentPart = TextContent | ImageContentPart | AudioContentPart;

export type Message =
    | {
        role: 'user' | 'assistant' | 'system';
        // ContentParts are only for the "user" role:
        content: string | ContentPart[];
        // If "name" is included, it will be prepended like this
        // for non-OpenAI models: `{name}: {content}`
        name?: string;
        tool_calls?: ToolCall[]
    }
    | {
        role: 'tool';
        content: string;
        tool_call_id: string;
        name?: string;
    };

export type ToolCall = {
    id: string;
    type: "function";
    function: {
        name: string;
        arguments: string; // JSON string
    };
    indes?: number
};

export type ToolResult = {
    name: string;
    id: string;
    result: any
};

export type TooHandler = (toolName: string, toolCallId: string, args: any) => Promise<ToolResult>;

export type CompletionParams = {
    model: string;
    messages: Message[];
    allowedTools: any[];
    responseJsonSchema: any;
}

export type AgentParams = CompletionParams & {
    toolHandler: TooHandler;
}