import { z } from "zod";
import { ScrapybaraClient as FernClient } from "./Client";
import * as Scrapybara from "./api/index";
import { Tool } from "./api/types/Tool";
import {
    Message,
    TextPart,
    ToolCallPart,
    ToolResultPart,
    AssistantMessage,
    ToolMessage,
    Step,
    Model,
    SingleActRequest,
    ApiSingleActResponse,
    convertRequestToApi,
    convertResponseToSdk,
    ActResponse,
    ReasoningPart,
} from "./api/types/Act";
import * as core from "./core";
import * as errors from "./errors";
import * as serializers from "./serialization";
import urlJoin from "url-join";
import { ScrapybaraEnvironment } from "./environments";
import {
    UBUNTU_SYSTEM_PROMPT as OPENAI_UBUNTU_SYSTEM_PROMPT,
    BROWSER_SYSTEM_PROMPT as OPENAI_BROWSER_SYSTEM_PROMPT,
    WINDOWS_SYSTEM_PROMPT as OPENAI_WINDOWS_SYSTEM_PROMPT,
    STRUCTURED_OUTPUT_SECTION as OPENAI_STRUCTURED_OUTPUT_SECTION,
} from "./openai";
import {
    UBUNTU_SYSTEM_PROMPT as ANTHROPIC_UBUNTU_SYSTEM_PROMPT,
    BROWSER_SYSTEM_PROMPT as ANTHROPIC_BROWSER_SYSTEM_PROMPT,
    WINDOWS_SYSTEM_PROMPT as ANTHROPIC_WINDOWS_SYSTEM_PROMPT,
    STRUCTURED_OUTPUT_SECTION as ANTHROPIC_STRUCTURED_OUTPUT_SECTION,
} from "./anthropic";
import { chromium, Browser as PlaywrightBrowser, BrowserContext, Page } from "playwright";

function structuredOutputTool<T extends z.ZodType>(schema: T) {
    return {
        name: "structured_output",
        description:
            "Output structured data according to the provided schema parameters. Only use this tool at the end of your task. The output data is final and will be passed directly back to the user.",
        parameters: schema,
        execute: async (parameters: z.infer<T>): Promise<z.infer<T>> => {
            return schema.parse(parameters);
        },
    };
}

export declare namespace ScrapybaraClient {
    type Options = FernClient.Options;
    type RequestOptions = FernClient.RequestOptions;
}

export class Beta {
    constructor(
        private readonly fern: FernClient,
    ) {}

    public async takeSnapshot(
        instanceId: string,
        requestOptions?: FernClient.RequestOptions,
    ): Promise<Scrapybara.SnapshotResponse> {
        return await this.fern.betaVmManagement.takeSnapshot(instanceId, requestOptions);
    }

    public async warmupSnapshot(
        snapshotId: string, 
        requestOptions?: FernClient.RequestOptions,
    ): Promise<Scrapybara.SuccessResponse> {
        return await this.fern.betaVmManagement.warmupSnapshot(snapshotId, requestOptions);
    }

    public async deleteSnapshot(
        snapshotId: string,
        requestOptions?: FernClient.RequestOptions,
    ): Promise<Scrapybara.SuccessResponse> {
        return await this.fern.betaVmManagement.deleteSnapshot(snapshotId, requestOptions);
    }
}

export class ScrapybaraClient {
    private _fern: FernClient;
    private _beta: Beta | undefined;

    constructor(readonly _options?: ScrapybaraClient.Options) {
        this._fern = new FernClient(_options);
    }

    public get beta(): Beta {
        return (this._beta ??= new Beta(this._fern));
    }

    public async startUbuntu(
        request: Omit<Scrapybara.DeploymentConfig, "instanceType"> = {},
        requestOptions?: ScrapybaraClient.RequestOptions,
    ): Promise<UbuntuInstance> {
        const response = await this._fern.start({ ...request, instanceType: "ubuntu" }, requestOptions);
        return new UbuntuInstance(response.id, response.launchTime, response.status, this._fern);
    }

    public async startBrowser(
        request: Omit<Scrapybara.DeploymentConfig, "instanceType"> = {},
        requestOptions?: ScrapybaraClient.RequestOptions,
    ): Promise<BrowserInstance> {
        const response = await this._fern.start({ ...request, instanceType: "browser" }, requestOptions);
        return new BrowserInstance(response.id, response.launchTime, response.status, this._fern);
    }

    public async startWindows(
        request: Omit<Scrapybara.DeploymentConfig, "instanceType"> = {},
        requestOptions?: ScrapybaraClient.RequestOptions,
    ): Promise<WindowsInstance> {
        const response = await this._fern.start({ ...request, instanceType: "windows" }, requestOptions);
        return new WindowsInstance(response.id, response.launchTime, response.status, this._fern);
    }

    public async get(
        instanceId: string,
        requestOptions?: ScrapybaraClient.RequestOptions,
    ): Promise<UbuntuInstance | BrowserInstance | WindowsInstance> {
        const response = await this._fern.get(instanceId, requestOptions);
        switch (response.instanceType) {
            case "ubuntu":
                return new UbuntuInstance(response.id, response.launchTime, response.status, this._fern);
            case "browser":
                return new BrowserInstance(response.id, response.launchTime, response.status, this._fern);
            case "windows":
                return new WindowsInstance(response.id, response.launchTime, response.status, this._fern);
            default:
                throw new Error(`Unknown instance type: ${response.instanceType}`);
        }
    }

    public async getInstances(
        requestOptions?: ScrapybaraClient.RequestOptions,
    ): Promise<(UbuntuInstance | BrowserInstance | WindowsInstance)[]> {
        const response = await this._fern.getInstances(requestOptions);
        return response.map((instance) => {
            switch (instance.instanceType) {
                case "ubuntu":
                    return new UbuntuInstance(instance.id, instance.launchTime, instance.status, this._fern);
                case "browser":
                    return new BrowserInstance(instance.id, instance.launchTime, instance.status, this._fern);
                case "windows":
                    return new WindowsInstance(instance.id, instance.launchTime, instance.status, this._fern);
                default:
                    throw new Error(`Unknown instance type: ${instance.instanceType}`);
            }
        });
    }

    public async getAuthStates(
        requestOptions?: ScrapybaraClient.RequestOptions,
    ): Promise<Scrapybara.AuthStateResponse[]> {
        const response = await this._fern.getAuthStates(requestOptions);
        return response;
    }

    /**
     * Run an agent loop with the given tools and model, returning all messages at the end.
     * Include either prompt or messages, but not both.
     *
     * @param model - The model to use for generating responses
     * @param tools - List of tools available to the agent
     * @param system - System prompt for the agent
     * @param prompt - Initial user prompt
     * @param messages - List of messages to start with
     * @param schema - Optional schema for structured output
     * @param onAssistantMessage - Callback for each assistant message
     * @param onToolMessage - Callback for each tool message
     * @param onStep - Callback for each step of the conversation
     * @param temperature - Optional temperature parameter for the model
     * @param maxTokens - Optional max tokens parameter for the model
     * @param imagesToKeep - Optional maximum number of most recent images to retain in messages and model call, defaults to 4
     * @param requestOptions - Optional request configuration
     * @returns Promise that resolves to list of all messages from the conversation
     */
    public async act<T extends z.ZodType>({
        model,
        tools,
        system,
        prompt,
        messages,
        schema,
        onAssistantMessage,
        onToolMessage,
        onStep,
        temperature,
        maxTokens,
        imagesToKeep = 4,
        requestOptions,
    }: {
        model: Model;
        tools?: Tool[];
        system?: string;
        prompt?: string;
        messages?: Message[];
        schema?: T;
        onAssistantMessage?: (message: AssistantMessage) => void | Promise<void>;
        onToolMessage?: (message: ToolMessage) => void | Promise<void>;
        onStep?: (step: Step) => void | Promise<void>;
        temperature?: number;
        maxTokens?: number;
        imagesToKeep?: number;
        requestOptions?: ScrapybaraClient.RequestOptions;
    }): Promise<ActResponse<z.infer<T>>> {
        const resultMessages: Message[] = [];
        const steps: Step[] = [];
        let totalPromptTokens = 0;
        let totalCompletionTokens = 0;
        let totalTokens = 0;

        if (messages) {
            resultMessages.push(...messages);
        }

        for await (const step of this.actStream({
            model,
            system,
            prompt,
            messages,
            tools,
            schema,
            onAssistantMessage,
            onToolMessage,
            onStep,
            temperature,
            maxTokens,
            imagesToKeep,
            requestOptions,
        })) {
            steps.push(step);
            const assistantMsg: AssistantMessage = {
                role: "assistant",
                responseId: step.responseId,
                content: [
                    ...(step.text ? [{ type: "text", text: step.text } as TextPart] : []),
                    ...(step.reasoningParts || []),
                    ...(step.toolCalls || []),
                ],
            };
            resultMessages.push(assistantMsg);

            if (step.toolResults) {
                const toolMsg: ToolMessage = {
                    role: "tool",
                    content: step.toolResults,
                };
                resultMessages.push(toolMsg);
            }

            if (step.usage) {
                totalPromptTokens += step.usage.promptTokens;
                totalCompletionTokens += step.usage.completionTokens;
                totalTokens += step.usage.totalTokens;
            }
        }

        const usage =
            totalTokens > 0
                ? {
                      promptTokens: totalPromptTokens,
                      completionTokens: totalCompletionTokens,
                      totalTokens: totalTokens,
                  }
                : undefined;

        const text = steps.length > 0 ? steps[steps.length - 1].text : undefined;
        let output: z.infer<T> | undefined;

        if (schema && steps.length > 0) {
            const lastStep = steps[steps.length - 1];
            if (lastStep.toolResults && lastStep.toolResults.length > 0) {
                output = lastStep.toolResults[lastStep.toolResults.length - 1].result;
            }
        }

        _filterImages(resultMessages, imagesToKeep);

        return {
            messages: resultMessages,
            steps,
            text,
            output,
            usage,
        };
    }

    /**
     * Run an interactive agent loop with the given tools and model.
     * Include either prompt or messages, but not both.
     *
     * @param model - The model to use for generating responses
     * @param tools - List of tools available to the agent
     * @param system - System prompt for the agent
     * @param prompt - Initial user prompt
     * @param messages - List of messages to start with
     * @param schema - Optional schema for structured output
     * @param onAssistantMessage - Callback for each assistant message
     * @param onToolMessage - Callback for each tool message
     * @param onStep - Callback for each step of the conversation
     * @param temperature - Optional temperature parameter for the model
     * @param maxTokens - Optional max tokens parameter for the model
     * @param imagesToKeep - Optional maximum number of most recent images to retain in messages and model call, defaults to 4
     * @param requestOptions - Optional request configuration
     * @yields Steps from the conversation, including tool results
     */
    public async *actStream<T extends z.ZodType>({
        model,
        tools,
        system,
        prompt,
        messages,
        schema,
        onAssistantMessage,
        onToolMessage,
        onStep,
        temperature,
        maxTokens,
        imagesToKeep = 4,
        requestOptions,
    }: {
        model: Model;
        tools?: Tool[];
        system?: string;
        prompt?: string;
        messages?: Message[];
        schema?: T;
        onAssistantMessage?: (message: AssistantMessage) => void | Promise<void>;
        onToolMessage?: (message: ToolMessage) => void | Promise<void>;
        onStep?: (step: Step) => void | Promise<void>;
        temperature?: number;
        maxTokens?: number;
        imagesToKeep?: number;
        requestOptions?: ScrapybaraClient.RequestOptions;
    }): AsyncGenerator<Step, void, unknown> {
        let currentMessages: Message[] = [];
        if (!messages) {
            if (!prompt) {
                throw new Error("prompt or messages must be provided.");
            }
            currentMessages = [
                {
                    role: "user" as const,
                    content: [
                        {
                            type: "text" as const,
                            text: prompt,
                        },
                    ],
                },
            ];
        } else {
            currentMessages = [...messages];
        }

        let currentTools: Tool[] = [];
        if (tools) {
            if (model.name === "ui-tars-72b") {
                const computerTools = tools.filter((tool) => tool.name === "computer");
                if (computerTools.length === 0) {
                    console.warn("No compatible tools found for ui-tars-72b model. Only ComputerTool is supported.");
                } else {
                    currentTools = computerTools;
                    if (tools.length > computerTools.length) {
                        console.warn(
                            "Only ComputerTool is compatible with ui-tars-72b model. Other tools will be ignored.",
                        );
                    }
                }
            } else {
                currentTools = [...tools];
            }
        }

        if (schema) {
            if (model.name === "ui-tars-72b") {
                throw new Error("Schema is not supported with ui-tars-72b model.");
            } else {
                currentTools.push(structuredOutputTool(schema));

                // Add structured output section to system prompt if it matches a default prompt
                if (system) {
                    if (model.provider === "anthropic") {
                        if (
                            system === ANTHROPIC_UBUNTU_SYSTEM_PROMPT ||
                            system === ANTHROPIC_BROWSER_SYSTEM_PROMPT ||
                            system === ANTHROPIC_WINDOWS_SYSTEM_PROMPT
                        ) {
                            // For Anthropic prompts, add inside the system capability section
                            system = system.replace(
                                "</SYSTEM_CAPABILITY>",
                                `${ANTHROPIC_STRUCTURED_OUTPUT_SECTION}\n</SYSTEM_CAPABILITY>`,
                            );
                        }
                    } else if (model.provider === "openai") {
                        if (
                            system === OPENAI_UBUNTU_SYSTEM_PROMPT ||
                            system === OPENAI_BROWSER_SYSTEM_PROMPT ||
                            system === OPENAI_WINDOWS_SYSTEM_PROMPT
                        ) {
                            // For OpenAI prompts, simply append the structured output section
                            system = system + OPENAI_STRUCTURED_OUTPUT_SECTION;
                        }
                    }
                }
            }
        }

        while (true) {
            _filterImages(currentMessages, imagesToKeep);

            const request: SingleActRequest = {
                model,
                system,
                messages: currentMessages,
                tools: currentTools,
                temperature,
                maxTokens,
            };

            const response = await core.fetcher({
                url: urlJoin(
                    (await core.Supplier.get(this._options?.environment)) ?? ScrapybaraEnvironment.Production,
                    "act",
                ),
                method: "POST",
                headers: {
                    "X-Fern-Language": "JavaScript",
                    "X-Fern-SDK-Name": "scrapybara",
                    "X-Fern-SDK-Version": "2.4.2",
                    "User-Agent": "scrapybara/2.4.2",
                    "X-Fern-Runtime": core.RUNTIME.type,
                    "X-Fern-Runtime-Version": core.RUNTIME.version,
                    ...(await this._getCustomAuthorizationHeaders()),
                    ...requestOptions?.headers,
                },
                contentType: "application/json",
                body: convertRequestToApi(request),
                requestType: "json",
                timeoutMs: requestOptions?.timeoutInSeconds != null ? requestOptions.timeoutInSeconds * 1000 : 600000,
                maxRetries: requestOptions?.maxRetries,
                abortSignal: requestOptions?.abortSignal,
            });

            if (!response.ok) {
                if (response.error.reason === "status-code") {
                    switch (response.error.statusCode) {
                        case 422:
                            throw new Scrapybara.UnprocessableEntityError(
                                serializers.HttpValidationError.parseOrThrow(response.error.body, {
                                    unrecognizedObjectKeys: "passthrough",
                                    allowUnrecognizedUnionMembers: true,
                                    allowUnrecognizedEnumValues: true,
                                    breadcrumbsPrefix: ["response"],
                                }),
                            );
                        default:
                            throw new errors.ScrapybaraError({
                                statusCode: response.error.statusCode,
                                body: response.error.body,
                            });
                    }
                }

                switch (response.error.reason) {
                    case "non-json":
                        throw new errors.ScrapybaraError({
                            statusCode: response.error.statusCode,
                            body: response.error.rawBody,
                        });
                    case "timeout":
                        throw new errors.ScrapybaraTimeoutError("Timeout exceeded when calling POST /act.");
                    case "unknown":
                        throw new errors.ScrapybaraError({
                            message: response.error.errorMessage,
                        });
                }
            }

            const apiResponse = response.body as ApiSingleActResponse;
            const actResponse = convertResponseToSdk(apiResponse);
            const assistantMessage: AssistantMessage = {
                role: "assistant",
                responseId: actResponse.message.responseId,
                content: actResponse.message.content,
            };
            currentMessages.push(assistantMessage);
            if (onAssistantMessage) {
                await onAssistantMessage(assistantMessage);
            }

            // Extract text from assistant message
            const text = actResponse.message.content
                .filter((part): part is TextPart => part.type === "text")
                .map((part) => part.text)
                .join("\n");

            // Extract tool calls
            const toolCalls = actResponse.message.content.filter(
                (part): part is ToolCallPart => part.type === "tool-call",
            );

            // Extract reasoning
            const reasoningParts = actResponse.message.content.filter(
                (part): part is ReasoningPart => part.type === "reasoning",
            );

            // Create initial step
            const step: Step = {
                text,
                responseId: actResponse.message.responseId,
                reasoningParts: reasoningParts.length > 0 ? reasoningParts : undefined,
                toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
                finishReason: actResponse.finishReason,
                usage: actResponse.usage,
            };

            // Check if there are tool calls
            const hasToolCalls = toolCalls.length > 0;
            let hasStructuredOutput = false;

            if (hasToolCalls) {
                const toolResults: ToolResultPart[] = [];
                for (const part of toolCalls) {
                    const tool = currentTools.find((t) => t.name === part.toolName);
                    if (!tool) continue;

                    try {
                        const result = await tool.execute(part.args);
                        toolResults.push({
                            type: "tool-result",
                            toolCallId: part.toolCallId,
                            toolName: part.toolName,
                            result,
                        });
                        if (part.toolName === "structured_output") {
                            hasStructuredOutput = true;
                        }
                    } catch (error: any) {
                        toolResults.push({
                            type: "tool-result",
                            toolCallId: part.toolCallId,
                            toolName: part.toolName,
                            result: error?.message || String(error),
                            isError: true,
                        });
                    }
                }

                step.toolResults = toolResults;
                const toolMessage: ToolMessage = {
                    role: "tool",
                    content: toolResults,
                };
                currentMessages.push(toolMessage);
                if (onToolMessage) {
                    await onToolMessage(toolMessage);
                }
            }

            if (onStep) {
                await onStep(step);
            }
            yield step;

            if (!hasToolCalls || hasStructuredOutput) {
                break;
            }
        }
    }

    protected async _getCustomAuthorizationHeaders() {
        const apiKeyValue = (await core.Supplier.get(this._options?.apiKey)) ?? process?.env["SCRAPYBARA_API_KEY"];
        return { "x-api-key": apiKeyValue };
    }
}

/** Commands for interacting with a remote browser instance. */
export type BrowserCommand = {
    /** The browser command to execute. */
    command:
        | "go_to"
        | "get_html"
        | "evaluate"
        | "click"
        | "type"
        | "screenshot"
        | "get_text"
        | "get_attribute";
    /** URL for go_to command. */
    url?: string;
    /** CSS selector for element operations. */
    selector?: string;
    /** JavaScript code for evaluate command. */
    code?: string;
    /** Text to type for type command. */
    text?: string;
    /** Timeout in milliseconds for operations. */
    timeout?: number;
    /** Attribute to get for get_attribute command. */
    attribute?: string;
};

export class BaseInstance {
    public readonly id: string;
    public readonly launchTime: Date;
    public readonly status: string;
    protected readonly fern: FernClient;

    constructor(id: string, launchTime: Date, status: string, fern: FernClient) {
        this.id = id;
        this.launchTime = launchTime;
        this.status = status;
        this.fern = fern;
    }

    public async screenshot(
        requestOptions?: FernClient.RequestOptions,
    ): Promise<Scrapybara.InstanceScreenshotResponse> {
        return await this.fern.instance.screenshot(this.id, requestOptions);
    }

    public async getStreamUrl(
        requestOptions?: FernClient.RequestOptions,
    ): Promise<Scrapybara.InstanceGetStreamUrlResponse> {
        return await this.fern.instance.getStreamUrl(this.id, requestOptions);
    }

    public async computer(
        request: Scrapybara.Request,
        requestOptions?: FernClient.RequestOptions,
    ): Promise<Scrapybara.ComputerResponse> {
        return await this.fern.instance.computer(this.id, request, requestOptions);
    }

    public async stop(requestOptions?: FernClient.RequestOptions): Promise<Scrapybara.StopInstanceResponse> {
        return await this.fern.instance.stop(this.id, requestOptions);
    }

    public async pause(requestOptions?: FernClient.RequestOptions): Promise<Scrapybara.StopInstanceResponse> {
        return await this.fern.instance.pause(this.id, requestOptions);
    }

    public async resume(
        request: Scrapybara.InstanceResumeRequest = {},
        requestOptions?: FernClient.RequestOptions,
    ): Promise<Scrapybara.GetInstanceResponse> {
        return await this.fern.instance.resume(this.id, request, requestOptions);
    }

    /**
     * Reschedule the termination time for the instance.
     */
    public async rescheduleTermination(
        request: Scrapybara.InstanceRescheduleTerminationRequest = {},
        requestOptions?: FernClient.RequestOptions,
    ): Promise<Scrapybara.StopInstanceResponse> {
        return await this.fern.instance.rescheduleTermination(this.id, request, requestOptions);
    }

    /**
     * Upload a file to the instance
     */
    public async upload(
        file: File | Blob | any,
        request: Scrapybara.BodyUploadV1InstanceInstanceIdUploadPost,
        requestOptions?: FernClient.RequestOptions
    ): Promise<Scrapybara.UploadResponse> {
        return await this.fern.instance.upload(file, this.id, request, requestOptions);
    }

    /**
     * Expose a port on the instance with a public-facing URL.
     */
    public async exposePort(
        request: Scrapybara.ExposePortRequest,
        requestOptions?: FernClient.RequestOptions
    ): Promise<Scrapybara.ExposePortResponse> {
        return await this.fern.instance.exposePort(this.id, request, requestOptions);
    }

    /**
     * Deploy a directory from the instance to Netlify.
     */
    public async deployToNetlify(
        request: Scrapybara.NetlifyDeployRequest,
        requestOptions?: FernClient.RequestOptions
    ): Promise<Scrapybara.NetlifyDeployResponse> {
        return await this.fern.instance.deployToNetlify(this.id, request, requestOptions);
    }
}

export class UbuntuInstance extends BaseInstance {
    public readonly browser: Browser;
    public readonly code: Code;
    public readonly notebook: Notebook;
    public readonly env: Env;

    constructor(id: string, launchTime: Date, status: string, fern: FernClient) {
        super(id, launchTime, status, fern);
        this.browser = new Browser(this.id, this.fern);
        this.env = new Env(this.id, this.fern);
        this.notebook = new Notebook(this.id, this.fern);
        this.code = new Code(this.id, this.fern);
    }

    public async bash(
        request: Scrapybara.BashRequest = {},
        requestOptions?: FernClient.RequestOptions,
    ): Promise<Scrapybara.BashResponse> {
        return await this.fern.instance.bash(this.id, request, requestOptions);
    }

    public async edit(
        request: Scrapybara.EditRequest,
        requestOptions?: FernClient.RequestOptions,
    ): Promise<Scrapybara.EditResponse> {
        return await this.fern.instance.edit(this.id, request, requestOptions);
    }

    public async file(
        request: Scrapybara.FileRequest,
        requestOptions?: FernClient.RequestOptions,
    ): Promise<Scrapybara.FileResponse> {
        return await this.fern.instance.file(this.id, request, requestOptions);
    }
}

export class BrowserInstance extends BaseInstance {
    constructor(id: string, launchTime: Date, status: string, fern: FernClient) {
        super(id, launchTime, status, fern);
    }

    private _pwBrowser?: PlaywrightBrowser;
    private _pwContext?: BrowserContext;
    private _pwPage?: Page;

    public async browser(
        request: BrowserCommand,
        requestOptions?: FernClient.RequestOptions,
    ): Promise<any> {
        if (!this._pwBrowser) {
            const { cdpUrl } = await this.fern.browser.getCdpUrl(this.id, requestOptions);
            this._pwBrowser = await chromium.connectOverCDP(cdpUrl);
            const contexts = this._pwBrowser.contexts();
            this._pwContext = contexts.length > 0 ? contexts[0] : await this._pwBrowser.newContext();
            this._pwPage = this._pwContext.pages()[0] ?? await this._pwContext.newPage();
        }
        if (!this._pwPage) {
            if (!this._pwContext) throw new Error("Browser context not initialized");
            this._pwPage = await this._pwContext.newPage();
        }

        const timeout = request.timeout;
        switch (request.command) {
            case "go_to":
                if (!request.url) throw new Error("Missing 'url' for go_to command");
                return await this._pwPage.goto(request.url, { timeout });
            case "get_html":
                return await this._pwPage.content();
            case "evaluate":
                if (request.code === undefined) throw new Error("Missing 'code' for evaluate command");
                return await this._pwPage.evaluate(request.code);
            case "click":
                if (!request.selector) throw new Error("Missing 'selector' for click command");
                return await this._pwPage.click(request.selector, { timeout });
            case "type":
                if (!request.selector) throw new Error("Missing 'selector' for type command");
                if (request.text === undefined) throw new Error("Missing 'text' for type command");
                return await this._pwPage.type(request.selector, request.text, { timeout });
            case "get_text":
                if (!request.selector) throw new Error("Missing 'selector' for get_text command");
                return await this._pwPage.textContent(request.selector);
            case "get_attribute":
                if (!request.selector) throw new Error("Missing 'selector' for get_attribute command");
                if (!request.attribute) throw new Error("Missing 'attribute' for get_attribute command");
                return await this._pwPage.getAttribute(request.selector, request.attribute);
            case "screenshot": {
                const buffer = await this._pwPage.screenshot({ timeout });
                return buffer.toString("base64");
            }
            default:
                throw new Error(`Unsupported browser command: ${request.command}`);
        }
    }

    public async getCdpUrl(requestOptions?: FernClient.RequestOptions): Promise<Scrapybara.BrowserGetCdpUrlResponse> {
        return await this.fern.browser.getCdpUrl(this.id, requestOptions);
    }

    public async getCurrentUrl(
        requestOptions?: FernClient.RequestOptions,
    ): Promise<Scrapybara.BrowserGetCurrentUrlResponse> {
        return await this.fern.browser.getCurrentUrl(this.id, requestOptions);
    }

    public async saveAuth(
        request: Scrapybara.BrowserSaveAuthRequest,
        requestOptions?: FernClient.RequestOptions,
    ): Promise<Scrapybara.SaveBrowserAuthResponse> {
        return await this.fern.browser.saveAuth(this.id, request, requestOptions);
    }

    public async modifyAuth(
        request: Scrapybara.BrowserModifyAuthRequest,
        requestOptions?: FernClient.RequestOptions,
    ): Promise<Scrapybara.ModifyBrowserAuthResponse> {
        return await this.fern.browser.modifyAuth(this.id, request, requestOptions);
    }

    public async authenticate(
        request: Scrapybara.BrowserAuthenticateRequest,
        requestOptions?: FernClient.RequestOptions,
    ): Promise<Scrapybara.BrowserAuthenticateResponse> {
        return await this.fern.browser.authenticate(this.id, request, requestOptions);
    }

    public async getStreamUrl(
        requestOptions?: FernClient.RequestOptions,
    ): Promise<Scrapybara.BrowserGetStreamUrlResponse> {
        return await this.fern.browser.getStreamUrl(this.id, requestOptions);
    }
}

export class WindowsInstance extends BaseInstance {
    constructor(id: string, launchTime: Date, status: string, fern: FernClient) {
        super(id, launchTime, status, fern);
    }
}

export class Browser {
    constructor(
        private readonly instanceId: string,
        private readonly fern: FernClient,
    ) {}

    public async start(request: Scrapybara.BrowserStartRequest = {}, requestOptions?: FernClient.RequestOptions): Promise<Scrapybara.StartBrowserResponse> {
        return await this.fern.browser.start(this.instanceId, request, requestOptions);
    }

    public async getCdpUrl(requestOptions?: FernClient.RequestOptions): Promise<Scrapybara.BrowserGetCdpUrlResponse> {
        return await this.fern.browser.getCdpUrl(this.instanceId, requestOptions);
    }

    public async getCurrentUrl(
        requestOptions?: FernClient.RequestOptions,
    ): Promise<Scrapybara.BrowserGetCurrentUrlResponse> {
        return await this.fern.browser.getCurrentUrl(this.instanceId, requestOptions);
    }

    public async saveAuth(
        request: Scrapybara.BrowserSaveAuthRequest,
        requestOptions?: FernClient.RequestOptions,
    ): Promise<Scrapybara.SaveBrowserAuthResponse> {
        return await this.fern.browser.saveAuth(this.instanceId, request, requestOptions);
    }

    public async modifyAuth(
        request: Scrapybara.BrowserModifyAuthRequest,
        requestOptions?: FernClient.RequestOptions,
    ): Promise<Scrapybara.ModifyBrowserAuthResponse> {
        return await this.fern.browser.modifyAuth(this.instanceId, request, requestOptions);
    }

    public async authenticate(
        request: Scrapybara.BrowserAuthenticateRequest,
        requestOptions?: FernClient.RequestOptions,
    ): Promise<Scrapybara.BrowserAuthenticateResponse> {
        return await this.fern.browser.authenticate(this.instanceId, request, requestOptions);
    }

    public async getStreamUrl(
        requestOptions?: FernClient.RequestOptions,
    ): Promise<Scrapybara.BrowserGetStreamUrlResponse> {
        return await this.fern.browser.getStreamUrl(this.instanceId, requestOptions);
    }

    public async stop(requestOptions?: FernClient.RequestOptions): Promise<Scrapybara.StopBrowserResponse> {
        return await this.fern.browser.stop(this.instanceId, requestOptions);
    }
}

export class Code {
    constructor(
        private readonly instanceId: string,
        private readonly fern: FernClient,
    ) {}

    public async execute(request: Scrapybara.CodeExecuteRequest, requestOptions?: FernClient.RequestOptions) {
        return await this.fern.code.execute(this.instanceId, request, requestOptions);
    }
}

export class Notebook {
    constructor(
        private readonly instanceId: string,
        private readonly fern: FernClient,
    ) {}

    public async listKernels(requestOptions?: FernClient.RequestOptions) {
        return await this.fern.notebook.listKernels(this.instanceId, requestOptions);
    }

    public async create(request: Scrapybara.CreateNotebookRequest, requestOptions?: FernClient.RequestOptions) {
        return await this.fern.notebook.create(this.instanceId, request, requestOptions);
    }

    public async get(notebookId: string, requestOptions?: FernClient.RequestOptions) {
        return await this.fern.notebook.get(this.instanceId, notebookId, requestOptions);
    }

    public async delete(notebookId: string, requestOptions?: FernClient.RequestOptions) {
        return await this.fern.notebook.delete(this.instanceId, notebookId, requestOptions);
    }

    public async addCell(
        notebookId: string,
        request: Scrapybara.AddCellRequest,
        requestOptions?: FernClient.RequestOptions,
    ) {
        return await this.fern.notebook.addCell(this.instanceId, notebookId, request, requestOptions);
    }

    public async executeCell(
        notebookId: string,
        cellId: string,
        request: Scrapybara.ExecuteCellRequest,
        requestOptions?: FernClient.RequestOptions,
    ) {
        return await this.fern.notebook.executeCell(this.instanceId, notebookId, cellId, request, requestOptions);
    }

    public async execute(
        notebookId: string,
        request: Scrapybara.ExecuteCellRequest,
        requestOptions?: FernClient.RequestOptions,
    ) {
        return await this.fern.notebook.execute(this.instanceId, notebookId, request, requestOptions);
    }
}

export class Env {
    constructor(
        private readonly instanceId: string,
        private readonly fern: FernClient,
    ) {}

    public async set(request: Scrapybara.EnvSetRequest, requestOptions?: FernClient.RequestOptions) {
        return await this.fern.env.set(this.instanceId, request, requestOptions);
    }

    public async get(requestOptions?: FernClient.RequestOptions) {
        return await this.fern.env.get(this.instanceId, requestOptions);
    }

    public async delete(request: Scrapybara.EnvDeleteRequest, requestOptions?: FernClient.RequestOptions) {
        return await this.fern.env.delete(this.instanceId, request, requestOptions);
    }
}

/**
 * Helper function to filter base64 images in messages, keeping only the latest ones up to specified limit.
 * @param messages - List of messages to filter
 * @param imagesToKeep - Maximum number of images to keep
 */
function _filterImages(messages: Message[], imagesToKeep: number) {
    let imagesKept = 0;
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg.role === "tool" && Array.isArray(msg.content)) {
            for (let j = msg.content.length - 1; j >= 0; j--) {
                const toolResult = msg.content[j];
                if (toolResult && toolResult.result && toolResult.result.base64Image) {
                    if (imagesKept < imagesToKeep) {
                        imagesKept++;
                    } else {
                        delete toolResult.result.base64Image;
                    }
                }
            }
        }
    }
}
