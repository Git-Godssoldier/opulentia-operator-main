import { NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
// import { openai } from "@ai-sdk/openai";
import { CoreMessage, generateObject, LanguageModelV1, UserContent } from "ai";
import { ScrapybaraClient } from "../../../lib/scrapybara";
import { z } from "zod";

// Initialize Scrapybara client
const scrapybaraClient = new ScrapybaraClient({
  apiKey: process.env.SCRAPYBARA_API_KEY,
});

// Debug logging for API key (remove in production)
console.log("API Key available:", !!process.env.SCRAPYBARA_API_KEY);
console.log("API Key length:", process.env.SCRAPYBARA_API_KEY?.length || 0);

// Use Claude 4 Sonnet as the primary model
const getModel = () => {
  // Claude 4 Sonnet - Latest model with extended thinking capabilities
  return anthropic("claude-sonnet-4-20250514");
};

// Task complexity analysis for enhanced prompting
const analyzeTaskComplexity = (goal: string, previousSteps: any[] = []): "simple" | "moderate" | "complex" => {
  const goalLower = goal.toLowerCase();
  const stepCount = previousSteps.length;
  
  // Complex reasoning indicators
  const complexKeywords = [
    'analyze', 'calculate', 'solve', 'proof', 'mathematical', 'algorithm', 
    'complex', 'reasoning', 'logic', 'scientific', 'research', 'compare',
    'evaluate', 'strategy', 'optimize', 'debug complex', 'advanced'
  ];
  
  // Simple task indicators
  const simpleKeywords = [
    'simple', 'quick', 'fast', 'basic', 'summarize', 'list', 'find',
    'navigate', 'click', 'type', 'scroll', 'search', 'download',
    'copy', 'paste', 'open', 'close', 'screenshot'
  ];
  
  if (complexKeywords.some(keyword => goalLower.includes(keyword)) || stepCount > 5) {
    return "complex";
  }
  
  if (simpleKeywords.some(keyword => goalLower.includes(keyword)) && stepCount <= 3) {
    return "simple";
  }
  
  return "moderate";
};

// Claude 4 Sonnet configuration based on task complexity
const getClaudeConfig = (complexity: "simple" | "moderate" | "complex" = "moderate") => {
  const configs = {
    simple: {
      max_tokens: 4096,
      temperature: 0.1,
      description: "Quick responses for simple tasks"
    },
    moderate: {
      max_tokens: 8192,
      temperature: 0.2,
      description: "Balanced approach for most tasks"
    },
    complex: {
      max_tokens: 16384,
      temperature: 0.3,
      description: "Extended reasoning for complex problems"
    }
  };
  
  return configs[complexity];
};

// Claude 4 Sonnet token configuration
const getTokenBudget = () => {
  return {
    max_tokens: 64000, // Claude 4 Sonnet supports up to 64K output tokens
    context_window: 200000,
    cost_per_input_token: 0.000003, // $3 per million
    cost_per_output_token: 0.000015, // $15 per million
    description: "Claude 4 Sonnet - Advanced reasoning with extended output"
  };
};

// Enhanced system prompts with Claude 4 Sonnet problem decomposition patterns
const SYSTEM_PROMPTS = {
  ubuntu: `You are an expert computer use agent operating in an Ubuntu Linux environment. You can:
- Execute bash commands to interact with the system
- Use computer vision to see the screen and click/type on elements
- Edit files and manipulate the filesystem
- Install software and manage processes

You should break down complex tasks into smaller steps and execute them systematically. Always explain what you're doing and why.`,

  browser: `You are an expert web automation agent operating in a browser environment. You MUST take specific actions to complete tasks. You can:
- Navigate to websites using COMPUTER_ACTION to visit URLs
- Click buttons, fill forms, and search using COMPUTER_ACTION
- Take SCREENSHOT to see the current state of the page
- Extract information from visible content using COMPUTER_ACTION
- Handle dynamic content and wait for elements to load using WAIT

IMPORTANT: You must actually perform actions! Don't just say "task completed" - take specific steps like:
1. Take a screenshot to see current state
2. Navigate to relevant websites (Google, Meta's website, news sites)  
3. Search for the requested information
4. Extract and return the findings

Always start with a screenshot and then take concrete actions to fulfill the user's request.`,

  windows: `You are an expert computer use agent operating in a Windows environment. You can:
- Use computer vision to see the screen and interact with GUI elements
- Execute commands and manage applications
- Navigate the file system and work with documents
- Automate repetitive tasks

Always be careful with system-level operations and explain your actions clearly.`
};

// Claude 4 Sonnet problem decomposition patterns
const CLAUDE_DECOMPOSITION_PATTERNS = {
  mathematical: `For mathematical problems, follow this extended reasoning pattern:
1. **Problem Analysis**: Break down the problem into its fundamental components
2. **Strategy Selection**: Choose the most appropriate mathematical approach
3. **Step-by-Step Solution**: Work through each calculation methodically
4. **Verification**: Check your work using alternative methods when possible
5. **Interpretation**: Explain the meaning of the result in context`,

  coding: `For coding tasks, use this structured approach:
1. **Requirements Analysis**: Understand what needs to be built
2. **Design Planning**: Outline the architecture and approach
3. **Implementation**: Write code incrementally with testing
4. **Debugging**: Identify and fix issues systematically
5. **Optimization**: Improve performance and readability
6. **Documentation**: Explain the solution clearly`,

  research: `For research and analysis tasks:
1. **Question Formulation**: Define what needs to be investigated
2. **Information Gathering**: Collect relevant data systematically
3. **Analysis**: Examine patterns, relationships, and significance
4. **Synthesis**: Combine findings into coherent insights
5. **Validation**: Cross-check conclusions against evidence
6. **Presentation**: Communicate findings clearly and accurately`,

  automation: `For automation tasks:
1. **Process Mapping**: Understand the current workflow
2. **Step Identification**: Break down into atomic actions
3. **Error Handling**: Plan for potential failures
4. **Testing**: Validate each step works correctly
5. **Integration**: Combine steps into smooth workflow
6. **Monitoring**: Verify successful completion`
};

// Claude 4 Sonnet step-by-step verification patterns
const CLAUDE_VERIFICATION_PATTERNS = {
  execution_check: `After each step, verify:
- Did the action complete as expected?
- Are there any error messages or unexpected outcomes?
- Is the system in the expected state?
- Can we proceed to the next step safely?`,

  reasoning_check: `For reasoning tasks, validate:
- Are the assumptions correct?
- Does the logic flow make sense?
- Have we considered alternative approaches?
- Is the conclusion supported by the evidence?`,

  calculation_check: `For mathematical operations:
- Double-check calculations using different methods
- Verify units and order of magnitude
- Test edge cases and boundary conditions
- Ensure the result makes intuitive sense`,

  code_check: `For code-related tasks:
- Does the code compile/run without errors?
- Are there any logical bugs or edge cases?
- Is the code readable and maintainable?
- Does it meet the original requirements?`
};

// Enhanced system prompts based on task complexity
const getEnhancedSystemPrompt = (instanceType: "ubuntu" | "browser" | "windows", complexity: "simple" | "moderate" | "complex", taskType?: string) => {
  let basePrompt = SYSTEM_PROMPTS[instanceType];
  
  if (complexity === "complex") {
    // Add extended reasoning guidance for complex tasks
    basePrompt += `\n\nAs Claude 4 Sonnet, you excel at extended thinking and complex problem-solving. Use these capabilities:

EXTENDED REASONING APPROACH:
- Take time to think through problems step-by-step
- Consider multiple approaches before choosing the best one
- Break complex tasks into logical sub-problems
- Verify your reasoning at each step
- Use deliberative alignment to ensure safe and correct actions

${taskType && CLAUDE_DECOMPOSITION_PATTERNS[taskType as keyof typeof CLAUDE_DECOMPOSITION_PATTERNS] 
  ? `\nTASK-SPECIFIC GUIDANCE:\n${CLAUDE_DECOMPOSITION_PATTERNS[taskType as keyof typeof CLAUDE_DECOMPOSITION_PATTERNS]}`
  : ''
}

${CLAUDE_VERIFICATION_PATTERNS.execution_check}`;
  } else if (complexity === "simple") {
    // Add efficiency guidance for simple tasks
    basePrompt += `\n\nFor this simple task, focus on efficiency:
- Take direct, actionable steps
- Minimize unnecessary complexity
- Prioritize speed while maintaining accuracy
- Use simple, proven approaches
- Avoid over-analysis for straightforward tasks`;
  }
  
  return basePrompt;
};

// Structured output schema for enhanced data extraction
const createStructuredSchema = () => {
  return z.object({
    result: z.string().describe("The final result or answer"),
    data: z.array(z.object({
      title: z.string().optional(),
      url: z.string().optional(),
      content: z.string().optional(),
      value: z.union([z.string(), z.number()]).optional(),
    })).optional().describe("Extracted structured data if applicable"),
    summary: z.string().optional().describe("Brief summary of what was accomplished"),
    success: z.boolean().describe("Whether the task was completed successfully"),
  });
};

// Define the enhanced step result type
interface EnhancedStepResult {
  text: string;
  reasoning: string;
  tool: string;
  instruction: string;
  expectedOutcome?: string;
  verification?: string;
  fallbackAction?: string;
  confidence?: number;
  taskComplexity?: string;
  stepNumber?: number;
  result?: any;
  modelUsed: string;
  tokenBudget: any;
  claudeConfig: any;
}

// Enhanced step generation with Claude 4 Sonnet
async function generateEnhancedStep({
  goal,
  sessionID,
  instanceType,
  previousSteps = [],
}: {
  goal: string;
  sessionID: string;
  instanceType: "ubuntu" | "browser" | "windows";
  previousSteps?: any[];
}): Promise<EnhancedStepResult> {
  // Analyze task complexity for optimal prompting
  const complexity = analyzeTaskComplexity(goal, previousSteps);
  const model = getModel();
  
  // Determine task type for decomposition patterns
  const taskType = goal.toLowerCase().includes('math') || goal.toLowerCase().includes('calculate') ? 'mathematical' :
                  goal.toLowerCase().includes('code') || goal.toLowerCase().includes('program') ? 'coding' :
                  goal.toLowerCase().includes('research') || goal.toLowerCase().includes('analyze') ? 'research' : 
                  'automation';
  
  const systemPrompt = getEnhancedSystemPrompt(instanceType, complexity, taskType);
  const tokenBudget = getTokenBudget();

  const content: UserContent = [
    {
      type: "text",
      text: `${systemPrompt}

Goal: "${goal}"
Model: Claude 4 Sonnet (${tokenBudget.description})
Task Type: ${taskType}
Complexity: ${complexity}

${previousSteps.length > 0 
  ? `Previous steps taken:\n${previousSteps.map((step, i) => 
      `${i + 1}. ${step.text} (Tool: ${step.tool}) - ${step.result?.success ? '✅' : '❌'}`
    ).join('\n')}\n`
  : ''
}

Based on the goal and any previous steps, determine the next action to take.

STEP REQUIREMENTS:
- If this is step 1 and instanceType is "browser", you MUST use SCREENSHOT first
- If you haven't taken a screenshot yet, use SCREENSHOT
- If you haven't navigated to a website yet, use COMPUTER_ACTION to navigate
- Only use CLOSE_INSTANCE after you have successfully completed the browser task 

${complexity === 'complex' ? `
🧠 EXTENDED REASONING MODE:
- Use your advanced reasoning capabilities to think through this problem step-by-step
- Consider multiple approaches and choose the optimal one
- Verify your reasoning before proposing the action
- Break down complex operations into logical sub-steps
- Apply domain-specific decomposition patterns for ${taskType} tasks
- ALWAYS start with SCREENSHOT for browser tasks to see the current state
` : complexity === 'simple' ? `
⚡ EFFICIENT MODE:
- Focus on efficient, direct actions
- Minimize complexity while maintaining accuracy
- Use proven, straightforward approaches
- Prioritize speed for simple operations
` : ''}

Consider the Act SDK principles:
1. Break complex tasks into atomic steps
2. Use appropriate tools for the environment
3. Provide clear reasoning for each action
4. Focus on achieving the specific goal
5. Verify each step before proceeding

For browser tasks specifically:
- ALWAYS start with SCREENSHOT to see current state  
- Use COMPUTER_ACTION to navigate, search, and interact
- Take multiple screenshots throughout to track progress
- For questions like "How many wins do the 49ers have?" you MUST:
  1. Take SCREENSHOT first
  2. Navigate to Google or ESPN using COMPUTER_ACTION
  3. Search for "49ers wins 2024" or similar
  4. Extract the information from the results
  5. Continue until you find the answer

CRITICAL RULES:
- NEVER use CLOSE_INSTANCE as your first step!
- NEVER use CLOSE_INSTANCE until you have completed the actual browser automation
- You must take at least 3-5 browser actions before considering the task complete
- ALWAYS perform the actual web search and information extraction

IMPORTANT: Do NOT just provide a text response without taking browser actions!

Choose the most appropriate tool and provide a clear instruction.`,
    },
  ];

  const message: CoreMessage = {
    role: "user",
    content,
  };

  // Configure Claude 4 Sonnet parameters
  const claudeConfig = getClaudeConfig(complexity);
  const modelConfig: any = {
    model: model as LanguageModelV1,
    schema: z.object({
      text: z.string().describe("Description of what this step will do"),
      reasoning: z.string().describe("Why this step is necessary - be thorough for complex tasks"),
      tool: z.enum([
        "START_UBUNTU",
        "START_BROWSER", 
        "START_WINDOWS",
        "COMPUTER_ACTION",
        "BASH_COMMAND",
        "EDIT_FILE",
        "SCREENSHOT",
        "EXTRACT_DATA",
        "WAIT",
        "CLOSE_INSTANCE"
      ]).describe("The tool to use for this step"),
      instruction: z.string().describe("Specific instruction for the tool"),
      expectedOutcome: z.string().optional().describe("What we expect to happen"),
      verification: z.string().optional().describe("How to verify this step succeeded"),
      fallbackAction: z.string().optional().describe("What to do if this step fails"),
      confidence: z.number().min(0).max(1).optional().describe("Confidence level (0-1) in this approach"),
      taskComplexity: z.enum(["simple", "moderate", "complex"]).optional().describe("Assessed complexity of this step"),
    }),
    messages: [message],
    maxTokens: claudeConfig.max_tokens,
    temperature: claudeConfig.temperature,
  };

  const result = await generateObject(modelConfig);

  // Add metadata about model selection and reasoning
  const enhancedResult = {
    ...(result.object as Record<string, any>),
    modelUsed: "claude-sonnet-4-20250514",
    taskComplexity: complexity,
    tokenBudget: tokenBudget,
    claudeConfig: claudeConfig,
  };

  return enhancedResult as EnhancedStepResult;
}

// Execute step with enhanced error handling
async function executeEnhancedStep({
  sessionID,
  step,
  instanceType,
}: {
  sessionID: string;
  step: any;
  instanceType: "ubuntu" | "browser" | "windows";
}) {
  const session = activeSessions.get(sessionID);
  if (!session?.instance) {
    return {
      success: false,
      error: "No active instance found for session",
    };
  }

  try {
    const { instance } = session;
    
    switch (step.tool) {
      case "SCREENSHOT":
        const screenshot = await instance.screenshot();
        return {
          success: true,
          result: "Screenshot taken",
          data: { screenshot: screenshot.base64Image },
        };

      case "COMPUTER_ACTION":
        // Parse the instruction for computer actions
        const computerResult = await instance.computer({
          action: "act",
          coordinate: step.coordinate || [0, 0],
          text: step.instruction,
        });
        return {
          success: true,
          result: `Computer action executed: ${step.instruction}`,
          data: computerResult,
        };

      case "BASH_COMMAND":
        if (instanceType === "ubuntu" && 'bash' in instance) {
          const bashResult = await (instance as any).bash({
            command: step.instruction,
          });
          return {
            success: true,
            result: `Bash command executed: ${step.instruction}`,
            data: bashResult,
          };
        }
        return {
          success: false,
          error: "Bash commands only supported on Ubuntu instances",
        };

      case "EDIT_FILE":
        if (instanceType === "ubuntu" && 'edit' in instance) {
          const editResult = await (instance as any).edit({
            path: step.filePath || "/tmp/file.txt",
            text: step.instruction,
          });
          return {
            success: true,
            result: `File edited: ${step.filePath}`,
            data: editResult,
          };
        }
        return {
          success: false,
          error: "File editing only supported on Ubuntu instances",
        };

      case "WAIT":
        const waitTime = parseInt(step.instruction) || 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return {
          success: true,
          result: `Waited ${waitTime}ms`,
          data: null,
        };

      case "CLOSE_INSTANCE":
        await instance.stop();
        activeSessions.delete(sessionID);
        return {
          success: true,
          result: "Instance stopped",
          data: null,
        };

      default:
        // For any other tool, use the computer action as a fallback
        try {
          const result = await instance.computer({
            action: "act",
            text: step.instruction,
          });
          return {
            success: true,
            result: `Action executed: ${step.instruction}`,
            data: result,
          };
        } catch (error) {
          return {
            success: false,
            error: `Failed to execute ${step.tool}: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Global session storage (in production, use Redis or database)
const activeSessions = new Map<string, any>();

export async function GET() {
  return NextResponse.json({ 
    message: "Claude 4 Sonnet Enhanced Scrapybara Agent Ready",
    capabilities: [
      "🧠 Claude 4 Sonnet Extended Thinking Capabilities",
      "🤖 Task Complexity Analysis (Simple/Moderate/Complex)",
      "🔄 Act SDK-Inspired Agent Architecture",
      "🖥️ Multi-Instance Support (Ubuntu, Browser, Windows)",
      "📊 Structured Output with Zod Schemas",
      "🎯 Task-Specific Problem Decomposition",
      "✅ Step-by-Step Verification Patterns",
      "💰 Optimized Token Budget Management",
      "🔧 Advanced Error Handling & Recovery",
      "⚡ Adaptive Response Configuration",
    ],
    model: {
      "Claude 4 Sonnet": {
        api_name: "claude-sonnet-4-20250514",
        description: "Advanced reasoning with extended output capabilities",
        context_window: "200K tokens",
        max_output: "64K tokens",
        pricing: "$3/$15 per million tokens (input/output)",
        best_for: "All tasks with adaptive complexity handling"
      }
    },
    features: {
      "Extended Thinking": "Claude 4 Sonnet provides step-by-step reasoning for complex problems",
      "Complexity Analysis": "Automatic task analysis: Simple/Moderate/Complex",
      "Adaptive Configuration": "Dynamic token and temperature settings based on task complexity",
      "Verification Patterns": "Built-in step verification and error recovery",
      "Act SDK Integration": "Full browser automation with screenshot and computer actions"
    }
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      goal, 
      sessionId, 
      action, 
      instanceType = "browser", 
      useStructuredOutput = false
    } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId in request body" },
        { status: 400 }
      );
    }

    switch (action) {
      case "START": {
        if (!goal) {
          return NextResponse.json(
            { error: "Missing goal in request body" },
            { status: 400 }
          );
        }

        try {
          // Start the appropriate instance type
          let instance;
          let streamUrl: any;
          
          switch (instanceType) {
            case "ubuntu":
              instance = await scrapybaraClient.startUbuntu();
              break;
            case "windows":
              instance = await scrapybaraClient.startWindows();
              break;
            case "browser":
            default:
              instance = await scrapybaraClient.startBrowser();
              break;
          }
          
          streamUrl = await instance.getStreamUrl();
          
          // Store session with Act SDK-inspired structure
          activeSessions.set(sessionId, {
            instance,
            instanceType,
            streamUrl: streamUrl.streamUrl,
            goal,
            steps: [],
            useStructuredOutput,
          });

          return NextResponse.json({
            success: true,
            sessionUrl: streamUrl.streamUrl,
            instanceId: instance.id,
            instanceType,
            message: `Started ${instanceType} instance with Act SDK-inspired agent`,
          });
          
        } catch (error) {
          console.error("Error starting instance:", error);
          return NextResponse.json(
            { error: `Failed to start ${instanceType} instance` },
            { status: 500 }
          );
        }
      }

      case "EXECUTE": {
        const session = activeSessions.get(sessionId);
        if (!session) {
          return NextResponse.json(
            { error: "No active session found" },
            { status: 400 }
          );
        }

        if (!goal) {
          return NextResponse.json(
            { error: "Missing goal in request body" },
            { status: 400 }
          );
        }

        try {
          // Generate enhanced steps using Act SDK concepts
          const steps = [];
          let currentSteps = [];
          let maxSteps = 10; // Prevent infinite loops
          let stepCount = 0;

          while (stepCount < maxSteps) {
            // Generate next step with Claude 4 Sonnet
            console.log(`Generating step ${stepCount + 1} for goal: "${goal}"`);
            const nextStep = await generateEnhancedStep({
              goal,
              sessionID: sessionId,
              instanceType: session.instanceType,
              previousSteps: currentSteps,
            });

            console.log(`Generated step ${stepCount + 1}: ${nextStep.tool} - ${nextStep.text}`);
            nextStep.stepNumber = stepCount + 1;
            steps.push(nextStep);
            currentSteps.push(nextStep);

            // Execute step
            console.log(`Executing step ${stepCount + 1}: ${nextStep.tool}`);
            const execution = await executeEnhancedStep({
              sessionID: sessionId,
              step: nextStep,
              instanceType: session.instanceType,
            });

            console.log(`Step ${stepCount + 1} execution result:`, execution.success ? 'SUCCESS' : 'FAILED', execution.error || '');
            nextStep.result = execution;

            // For browser tasks, don't stop until we have multiple steps and have actually performed actions
            if (nextStep.tool === "CLOSE_INSTANCE" && stepCount >= 2) {
              console.log(`Stopping after ${stepCount + 1} steps - CLOSE_INSTANCE encountered`);
              break;
            }
            
            // Prevent early termination on first few steps
            if (nextStep.tool === "CLOSE_INSTANCE" && stepCount < 2) {
              console.log(`Ignoring early CLOSE_INSTANCE on step ${stepCount + 1} - continuing execution`);
              // Continue instead of breaking
            }
            
            // For browser automation, continue even if some steps fail
            // Only stop early if we get a critical error (session not found, etc.)
            if (!execution.success && execution.error && execution.error.includes("No active session")) {
              console.log(`Critical error - no active session found`);
              break;
            }

            stepCount++;
          }
          
          console.log(`Completed execution with ${steps.length} total steps`);

          // Generate final result with optional structured output
          let finalResult: any = {
            text: steps.length > 0 ? steps[steps.length - 1].text : "Task completed",
            steps,
            usage: {
              input_tokens: stepCount * 1000, // Estimated
              output_tokens: stepCount * 500,  // Estimated
            },
            messages: [], // Would contain actual conversation history
          };

          // Add structured output if requested
          if (session.useStructuredOutput) {
            try {
              const model = getModel();
              const structuredResult = await generateObject({
                model: model as LanguageModelV1,
                schema: createStructuredSchema(),
                messages: [{
                  role: "user",
                  content: `Based on the completed task "${goal}" and the steps taken, provide a structured summary of the results.`,
                }],
              });
              finalResult.output = structuredResult.object;
            } catch (error) {
              console.error("Error generating structured output:", error);
            }
          }

          return NextResponse.json({
            success: true,
            result: finalResult,
            sessionUrl: session.streamUrl,
          });

        } catch (error) {
          console.error("Error in enhanced Scrapybara agent execution:", error);
          return NextResponse.json(
            { error: `Agent execution failed: ${error instanceof Error ? error.message : String(error)}` },
            { status: 500 }
          );
        }
      }

      case "STOP": {
        const session = activeSessions.get(sessionId);
        if (session) {
          try {
            await session.instance.stop();
            activeSessions.delete(sessionId);
            
            return NextResponse.json({
              success: true,
              message: "Session stopped successfully",
            });
          } catch (error) {
            console.error("Error stopping session:", error);
            return NextResponse.json(
              { error: "Failed to stop session" },
              { status: 500 }
            );
          }
        } else {
          return NextResponse.json({
            success: true,
            message: "Session not found or already stopped",
          });
        }
      }

      default:
        return NextResponse.json(
          { error: "Invalid action type. Use START, EXECUTE, or STOP" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in enhanced Scrapybara agent endpoint:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 }
    );
  }
}