"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import { useWindowSize } from "usehooks-ts";
import Image from "next/image";
import posthog from "posthog-js";

interface ScrapybaraChatFeedProps {
  initialMessage?: string;
  onClose: () => void;
}

export interface ActSDKStep {
  text: string;
  tool_calls?: any[];
  tool_results?: any[];
}

interface ActSDKResult {
  text: string;
  steps: ActSDKStep[];
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  output?: any; // Structured output when schema is used
  messages: any[];
}

interface ScrapybaraAgentState {
  sessionId: string | null;
  sessionUrl: string | null;
  result: ActSDKResult | null;
  isLoading: boolean;
  instanceType: "ubuntu" | "browser" | "windows";
  instanceId: string | null;
  isFinished: boolean;
}

export default function ScrapybaraChatFeed({ 
  initialMessage, 
  onClose 
}: ScrapybaraChatFeedProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [aiProvider, setAiProvider] = useState<"anthropic" | "openai">("openai");
  const [instanceType, setInstanceType] = useState<"ubuntu" | "browser" | "windows">("browser");
  const [useStructuredOutput, setUseStructuredOutput] = useState(false);
  const [modelType, setModelType] = useState<"auto" | "reasoning" | "fast" | "standard">("auto");
  const [computeLevel, setComputeLevel] = useState<"low" | "medium" | "high">("medium");
  const { width } = useWindowSize();
  const isMobile = width ? width < 768 : false;
  const initializationRef = useRef(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const [uiState, setUiState] = useState<ScrapybaraAgentState>({
    sessionId: null,
    sessionUrl: null,
    result: null,
    isLoading: false,
    instanceType: "browser",
    instanceId: null,
    isFinished: false,
  });

  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [uiState.result, scrollToBottom]);

  const generateSessionId = () => `scrapybara-act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    const initializeAndExecuteAgent = async () => {
      if (initializationRef.current) return;
      initializationRef.current = true;

      if (initialMessage) {
        setIsLoading(true);
        try {
          const sessionId = generateSessionId();
          
          setUiState(prev => ({
            ...prev,
            sessionId,
            instanceType,
            isLoading: true,
          }));

          // Step 1: Start the instance
          const startResponse = await fetch("/api/scrapybara-agent", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "START",
              sessionId,
              goal: initialMessage,
              instanceType,
            }),
          });

          const startData = await startResponse.json();
          
          if (!startData.success) {
            throw new Error(startData.error || "Failed to start instance");
          }

          setUiState(prev => ({
            ...prev,
            sessionUrl: startData.sessionUrl,
            instanceId: startData.instanceId,
          }));

          posthog.capture("scrapybara_act_instance_started", {
            goal: initialMessage,
            sessionId,
            aiProvider,
            instanceType,
          });

          // Step 2: Execute the agent with O3/O4-mini enhanced capabilities
          const executeResponse = await fetch("/api/scrapybara-agent", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "EXECUTE",
              sessionId,
              goal: initialMessage,
              aiProvider,
              useStructuredOutput,
              modelType: modelType === "auto" ? undefined : modelType,
              computeLevel,
            }),
          });

          const executeData = await executeResponse.json();
          
          if (executeData.success) {
            setUiState(prev => ({
              ...prev,
              result: executeData.result,
              isFinished: true,
              isLoading: false,
            }));

            posthog.capture("scrapybara_act_execution_completed", {
              sessionId,
              aiProvider,
              steps: executeData.result.steps.length,
              usage: executeData.result.usage,
              hasStructuredOutput: !!executeData.result.output,
            });
          } else {
            throw new Error(executeData.error || "Failed to execute agent");
          }

        } catch (error) {
          console.error("Scrapybara Act SDK execution error:", error);
          posthog.capture("scrapybara_act_execution_failed", {
            error: error instanceof Error ? error.message : String(error),
          });
          setUiState(prev => ({
            ...prev,
            isLoading: false,
            isFinished: true,
          }));
        } finally {
          setIsLoading(false);
        }
      }
    };

    initializeAndExecuteAgent();
  }, [initialMessage, aiProvider, instanceType, useStructuredOutput]);

  const stopSession = async () => {
    if (uiState.sessionId) {
      try {
        await fetch("/api/scrapybara-agent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "STOP",
            sessionId: uiState.sessionId,
          }),
        });
      } catch (error) {
        console.error("Error stopping session:", error);
      }
    }
  };

  const handleClose = () => {
    stopSession();
    onClose();
  };

  const getInstanceIcon = (instanceType: string) => {
    switch (instanceType) {
      case "ubuntu": return "🐧";
      case "browser": return "🌐";
      case "windows": return "🪟";
      default: return "🖥️";
    }
  };

  // Spring configuration for smoother animations
  const springConfig = {
    type: "spring",
    stiffness: 350,
    damping: 30,
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        ...springConfig,
        staggerChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.2 },
    },
  };

  const messageVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <motion.div
      className="min-h-screen bg-[#0F0F0F] flex flex-col"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.nav
        className="flex justify-between items-center px-8 py-4 bg-[#141414] border-b border-[#080808] shadow-sm"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2">
          <Image
            src="/favicon.svg"
            alt="Open Operator"
            className="w-8 h-8"
            width={32}
            height={32}
          />
          <span className="font-ppneue text-[#EFEFEF]">Opulentia Operator</span>
          <span className="px-2 py-1 bg-[#FFAA6E] text-[#0F0F0F] rounded-full text-xs font-medium">
            O3/O4-mini Enhanced
          </span>
          {uiState.instanceType && (
            <span className="px-2 py-1 bg-[#4ECDC4] text-[#0F0F0F] rounded-full text-xs font-medium">
              {getInstanceIcon(uiState.instanceType)} {uiState.instanceType.toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={instanceType}
            onChange={(e) => setInstanceType(e.target.value as "ubuntu" | "browser" | "windows")}
            className="px-3 py-1 border border-[#080808] bg-[#1B1B1B] text-[#EFEFEF] rounded-[0.625rem] text-sm"
            disabled={isLoading || uiState.sessionId !== null}
          >
            <option value="browser">Browser Instance</option>
            <option value="ubuntu">Ubuntu Instance</option>
            <option value="windows">Windows Instance</option>
          </select>
          <select
            value={aiProvider}
            onChange={(e) => setAiProvider(e.target.value as "anthropic" | "openai")}
            className="px-3 py-1 border border-[#080808] bg-[#1B1B1B] text-[#EFEFEF] rounded-[0.625rem] text-sm"
            disabled={isLoading}
          >
            <option value="anthropic">Claude 4 Sonnet</option>
            <option value="openai">OpenAI Models</option>
          </select>
          {aiProvider === "openai" && (
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value as "auto" | "reasoning" | "fast" | "standard")}
              className="px-3 py-1 border border-[#080808] bg-[#1B1B1B] text-[#EFEFEF] rounded-[0.625rem] text-sm"
              disabled={isLoading}
            >
              <option value="auto">🤖 Auto-Select</option>
              <option value="reasoning">🧠 O3 (Extended Thinking)</option>
              <option value="fast">⚡ O4-mini (Fast & Efficient)</option>
              <option value="standard">⚖️ GPT-4.1 (Balanced)</option>
            </select>
          )}
          {aiProvider === "openai" && modelType === "reasoning" && (
            <select
              value={computeLevel}
              onChange={(e) => setComputeLevel(e.target.value as "low" | "medium" | "high")}
              className="px-3 py-1 border border-[#080808] bg-[#1B1B1B] text-[#EFEFEF] rounded-[0.625rem] text-sm"
              disabled={isLoading}
            >
              <option value="low">Low Compute</option>
              <option value="medium">Medium Compute</option>
              <option value="high">High Compute</option>
            </select>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useStructuredOutput}
              onChange={(e) => setUseStructuredOutput(e.target.checked)}
              className="accent-[#FFAA6E]"
              disabled={isLoading}
            />
            <span className="text-[#C0C0C0]">Structured Output</span>
          </label>
          <motion.button
            onClick={handleClose}
            className="px-4 py-2 hover:bg-[#1B1B1B] text-[#C0C0C0] hover:text-[#EFEFEF] transition-colors rounded-md font-ppsupply flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Close
            {!isMobile && (
              <kbd className="px-2 py-1 text-xs bg-[#1B1B1B] text-[#C0C0C0] rounded-md">ESC</kbd>
            )}
          </motion.button>
        </div>
      </motion.nav>

      <main className="flex-1 flex flex-col items-center p-6">
        <motion.div
          className="w-full max-w-[1280px] bg-[#141414] border border-[#080808] shadow-sm rounded-[0.625rem] overflow-hidden"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="w-full h-12 bg-[#141414] border-b border-[#080808] flex items-center px-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FFAA6E]" />
              <div className="w-3 h-3 rounded-full bg-[#4ECDC4]" />
              <div className="w-3 h-3 rounded-full bg-[#45B7D1]" />
            </div>
            <div className="ml-auto text-xs text-[#C0C0C0]">
              Opulentia • Enhanced with Act SDK
            </div>
          </div>

          <div className="flex flex-col md:flex-row">
            {uiState.sessionUrl && (
              <div className="flex-1 p-6 border-b md:border-b-0 md:border-l border-[#080808] order-first md:order-last">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="w-full aspect-video"
                >
                  {uiState.isFinished ? (
                    <div className="w-full h-full border border-[#080808] rounded-[0.625rem] flex items-center justify-center bg-[#141414]">
                      <div className="text-center">
                        <div className="text-4xl mb-4">✅</div>
                        <p className="text-[#EFEFEF] text-center">
                          Act SDK agent completed the task
                          <br />
                          <strong>"{initialMessage}"</strong>
                        </p>
                        <p className="text-sm text-[#C0C0C0] mt-2">
                          Instance: {uiState.instanceType} • Steps: {uiState.result?.steps.length || 0}
                          {uiState.result?.usage && (
                            <>
                              <br />
                              Tokens: {uiState.result.usage.input_tokens + uiState.result.usage.output_tokens}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <iframe
                      src={uiState.sessionUrl}
                      className="w-full h-full rounded-[0.625rem] border border-[#080808]"
                      sandbox="allow-same-origin allow-scripts allow-forms"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      title="Scrapybara Instance Stream"
                    />
                  )}
                </motion.div>
              </div>
            )}

            <div className="md:w-[400px] p-6 min-w-0 md:h-[calc(56.25vw-3rem)] md:max-h-[calc(100vh-12rem)]">
              <div
                ref={chatContainerRef}
                className="h-full overflow-y-auto space-y-4"
              >
                {initialMessage && (
                  <motion.div
                    variants={messageVariants}
                    className="p-4 bg-[#1B1B1B] rounded-[0.625rem] font-ppsupply border-l-4 border-[#FFAA6E]"
                  >
                    <p className="font-semibold flex items-center gap-2 text-[#EFEFEF]">
                      🎯 Goal:
                    </p>
                    <p className="text-[#C0C0C0]">{initialMessage}</p>
                  </motion.div>
                )}

                {/* Show agent result */}
                {uiState.result && (
                  <motion.div
                    variants={messageVariants}
                    className="p-4 bg-[#1B1B1B] border border-[#080808] rounded-[0.625rem] font-ppsupply space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#C0C0C0] font-medium">
                        Agent Result
                      </span>
                      <span className="px-2 py-1 bg-[#141414] text-[#4ECDC4] rounded text-xs font-mono">
                        ACT SDK
                      </span>
                    </div>
                    
                    <p className="font-medium text-[#EFEFEF]">{uiState.result.text}</p>
                    
                    {/* Show structured output if available */}
                    {uiState.result.output && (
                      <details className="mt-2">
                        <summary className="cursor-pointer font-semibold text-[#FFAA6E] hover:text-[#FF6B6B]">
                          📋 Structured Data
                        </summary>
                        <pre className="mt-2 p-3 bg-[#141414] text-[#EFEFEF] rounded text-xs overflow-auto max-h-32">
                          {JSON.stringify(uiState.result.output, null, 2)}
                        </pre>
                      </details>
                    )}

                    {/* Show steps */}
                    {uiState.result.steps.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer font-semibold text-[#45B7D1] hover:text-[#4ECDC4]">
                          🔄 Execution Steps ({uiState.result.steps.length})
                        </summary>
                        <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                          {uiState.result.steps.map((step, index) => (
                            <div key={index} className="p-2 bg-[#141414] rounded text-xs">
                              <div className="text-[#C0C0C0]">Step {index + 1}:</div>
                              <div className="text-[#EFEFEF]">{step.text}</div>
                              {step.tool_calls && step.tool_calls.length > 0 && (
                                <div className="text-[#FFAA6E] mt-1">
                                  Tools: {step.tool_calls.map(tc => tc.function?.name || tc.type).join(", ")}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    {/* Show usage stats */}
                    {uiState.result.usage && (
                      <div className="text-xs text-[#C0C0C0] mt-2">
                        Usage: {uiState.result.usage.input_tokens} in + {uiState.result.usage.output_tokens} out = {uiState.result.usage.input_tokens + uiState.result.usage.output_tokens} tokens
                      </div>
                    )}
                  </motion.div>
                )}
                
                {isLoading && (
                  <motion.div
                    variants={messageVariants}
                    className="p-4 bg-[#1B1B1B] rounded-[0.625rem] font-ppsupply animate-pulse border-l-4 border-[#FFAA6E]"
                  >
                    <div className="flex items-center gap-2 text-[#EFEFEF]">
                      <div className="animate-spin">⚙️</div>
                      <span>Act SDK agent processing...</span>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </motion.div>
  );
}