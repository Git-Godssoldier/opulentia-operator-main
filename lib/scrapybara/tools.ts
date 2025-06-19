import { z } from "zod";
import { RunnableTool } from "./Client";
import { UbuntuInstance, BrowserInstance, BrowserCommand } from "./ScrapybaraClient";

export function tool<T>(tool: RunnableTool<T>): RunnableTool<T> {
    return tool;
}

const bashParams = z.object({
    command: z.string(),
});
export function bashTool(instance: UbuntuInstance): RunnableTool<z.infer<typeof bashParams>> {
    return tool({
        name: "bash",
        description: "Run a bash command",
        parameters: bashParams,
        execute: async ({ command }) => {
            return await instance.bash({ command });
        },
    });
}

const computerParams = z.object({
    action: z.string(),
});
export function computerTool(instance: UbuntuInstance | BrowserInstance): RunnableTool<z.infer<typeof computerParams>> {
    return tool({
        name: "computer",
        description: "Control the mouse and keyboard",
        parameters: computerParams,
        execute: async ({ action }) => {
            return await instance.computer(action);
        },
    });
}

const editParams = z.object({
    path: z.string(),
    content: z.string().optional(),
});
export function editTool(instance: UbuntuInstance): RunnableTool<z.infer<typeof editParams>> {
    return tool({
        name: "edit",
        description: "View, create, and edit files",
        parameters: editParams,
        execute: async (args) => {
            return await instance.edit(args);
        },
    });
}

const browserParams = z.object({
    command: z
        .enum(["go_to", "get_html", "evaluate", "click", "type", "screenshot", "get_text", "get_attribute"])
        .describe(
            "The browser command to execute. Required parameters per command:\n- go_to: requires 'url'\n- evaluate: requires 'code'\n- click: requires 'selector'\n- type: requires 'selector' and 'text'\n- get_text: requires 'selector'\n- get_attribute: requires 'selector' and 'attribute'\n- get_html: no additional parameters\n- screenshot: no additional parameters"
        ),
    url: z.string().optional().describe("URL for go_to command (required for go_to)"),
    selector: z
        .string()
        .optional()
        .describe("CSS selector for element operations (required for click, type, get_text, get_attribute)"),
    code: z.string().optional().describe("JavaScript code for evaluate command (required for evaluate)"),
    text: z.string().optional().describe("Text to type for type command (required for type)"),
    timeout: z.number().optional().default(30000).describe("Timeout in milliseconds for operations"),
    attribute: z.string().optional().describe("Attribute to get for get_attribute command"),
});
export function browserTool(instance: UbuntuInstance | BrowserInstance): RunnableTool<z.infer<typeof browserParams>> {
    return tool({
        name: "browser",
        description: "Interact with a browser for web scraping and automation",
        parameters: browserParams,
        execute: async (args: BrowserCommand) => {
            if (instance instanceof BrowserInstance) {
                return await instance.browser(args);
            }
            throw new Error("The browser tool can only be used with a BrowserInstance.");
        },
    });
}
