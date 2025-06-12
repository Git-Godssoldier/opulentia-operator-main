"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import ChatFeed from "./components/ChatFeed";
import ScrapybaraChatFeed from "./components/ScrapybaraChatFeed";
import AnimatedButton from "./components/AnimatedButton";
import Image from "next/image";
import posthog from "posthog-js";

const Tooltip = ({ children, text }: { children: React.ReactNode; text: string }) => {
  return (
    <div className="relative group">
      {children}
      <span className="absolute hidden group-hover:block w-auto px-3 py-2 min-w-max left-1/2 -translate-x-1/2 translate-y-3 bg-gray-900 text-white text-xs rounded-md font-ppsupply">
        {text}
      </span>
    </div>
  );
};

export default function Home() {
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [initialMessage, setInitialMessage] = useState("");
  const [useScrapybara, setUseScrapybara] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle CMD+Enter to submit the form when chat is not visible
      if (!isChatVisible && (e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        const form = document.querySelector("form") as HTMLFormElement;
        if (form) {
          form.requestSubmit();
        }
      }

      // Handle CMD+K to focus input when chat is not visible
      if (!isChatVisible && (e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const input = document.querySelector(
          'input[name="message"]'
        ) as HTMLInputElement;
        if (input) {
          input.focus();
        }
      }

      // Handle ESC to close chat when visible
      if (isChatVisible && e.key === "Escape") {
        e.preventDefault();
        setIsChatVisible(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isChatVisible]);

  const startChat = useCallback(
    (finalMessage: string) => {
      setInitialMessage(finalMessage);
      setIsChatVisible(true);

      try {
        posthog.capture("submit_message", {
          message: finalMessage,
        });
      } catch (e) {
        console.error(e);
      }
    },
    [setInitialMessage, setIsChatVisible]
  );

  return (
    <AnimatePresence mode="wait">
      {!isChatVisible ? (
        <div className="min-h-screen bg-[#0F0F0F] flex flex-col">
          {/* Top Navigation */}
          <nav className="flex justify-between items-center px-8 py-4 bg-[#141414] border-b border-[#080808]">
            <div className="flex items-center gap-3">
              <Image
                src="/favicon.svg"
                alt="Opulentia Operator"
                className="w-8 h-8"
                width={32}
                height={32}
              />
              <span className="font-ppsupply text-[#EFEFEF]">Opulentia Operator</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="https://github.com/opulentia/operator"
                target="_blank" 
                rel="noopener noreferrer"
              >
                <button className="h-fit flex items-center justify-center px-4 py-2 rounded-md bg-[#1B1B1B] hover:bg-[#141414] gap-1 text-sm font-medium text-[#EFEFEF] border border-[#080808] transition-colors duration-200">
                  <Image
                    src="/github.svg"
                    alt="GitHub"
                    width={20}
                    height={20}
                    className="mr-2"
                  />
                  View GitHub
                </button>
              </a>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-[640px] bg-[#141414] border border-[#080808] shadow-sm rounded-[0.625rem]">
              <div className="w-full h-12 bg-[#141414] border-b border-[#080808] flex items-center px-4 rounded-t-[0.625rem]">
                <div className="flex items-center gap-2">
                  <Tooltip text="Opulentia powered">
                    <div className="w-3 h-3 rounded-full bg-[#FFAA6E]" />
                  </Tooltip>
                  <Tooltip text="Scrapybara enhanced">
                    <div className="w-3 h-3 rounded-full bg-[#4ECDC4]" />
                  </Tooltip>
                  <Tooltip text="Claude 4 Sonnet">
                    <div className="w-3 h-3 rounded-full bg-[#45B7D1]" />
                  </Tooltip>
                </div>
              </div>

              <div className="p-8 flex flex-col items-center gap-8">
                <div className="flex flex-col items-center gap-3">
                  <h1 className="text-2xl font-ppneue text-[#EFEFEF] text-center">
                    Opulentia Operator
                  </h1>
                  <p className="text-base font-ppsupply text-[#C0C0C0] text-center">
                    AI automation powered by Scrapybara cloud platform.
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="engine"
                        checked={!useScrapybara}
                        onChange={() => setUseScrapybara(false)}
                        className="accent-[#FFAA6E]"
                      />
                      <span className="text-[#C0C0C0]">Legacy Mode</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="engine"
                        checked={useScrapybara}
                        onChange={() => setUseScrapybara(true)}
                        className="accent-[#FFAA6E]"
                      />
                      <span className="font-medium text-[#FFAA6E]">Scrapybara Enhanced</span>
                    </label>
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const input = e.currentTarget.querySelector(
                      'input[name="message"]'
                    ) as HTMLInputElement;
                    const message = (formData.get("message") as string).trim();
                    const finalMessage = message || input.placeholder;
                    startChat(finalMessage);
                  }}
                  className="w-full max-w-[720px] flex flex-col items-center gap-3"
                >
                  <div className="relative w-full">
                    <input
                      name="message"
                      type="text"
                      placeholder="What's the price of NVIDIA stock?"
                      className="w-full px-4 py-3 pr-[100px] border border-[#080808] bg-[#1B1B1B] text-[#EFEFEF] placeholder:text-[#C0C0C0] focus:outline-none focus:ring-2 focus:ring-[#FFAA6E] focus:border-transparent font-ppsupply rounded-[0.625rem]"
                    />
                    <AnimatedButton type="submit">Run</AnimatedButton>
                  </div>
                </form>
                <div className="grid grid-cols-2 gap-3 w-full">
                  <button
                    onClick={() =>
                      startChat(
                        "Create a Python script to analyze stock data with visualizations"
                      )
                    }
                    className="p-3 text-sm text-[#C0C0C0] border border-[#080808] bg-[#1B1B1B] hover:border-[#FFAA6E] hover:text-[#FFAA6E] transition-colors font-ppsupply text-left rounded-[0.625rem]"
                  >
                    Create a Python script with data analysis
                  </button>
                  <button
                    onClick={() =>
                      startChat("How many wins do the 49ers have?")
                    }
                    className="p-3 text-sm text-[#C0C0C0] border border-[#080808] bg-[#1B1B1B] hover:border-[#FFAA6E] hover:text-[#FFAA6E] transition-colors font-ppsupply text-left rounded-[0.625rem]"
                  >
                    How many wins do the 49ers have?
                  </button>
                  <button
                    onClick={() => startChat("What is Stephen Curry's PPG?")}
                    className="p-3 text-sm text-[#C0C0C0] border border-[#080808] bg-[#1B1B1B] hover:border-[#FFAA6E] hover:text-[#FFAA6E] transition-colors font-ppsupply text-left rounded-[0.625rem]"
                  >
                    What is Stephen Curry&apos;s PPG?
                  </button>
                  <button
                    onClick={() => startChat("How much is NVIDIA stock?")}
                    className="p-3 text-sm text-[#C0C0C0] border border-[#080808] bg-[#1B1B1B] hover:border-[#FFAA6E] hover:text-[#FFAA6E] transition-colors font-ppsupply text-left rounded-[0.625rem]"
                  >
                    How much is NVIDIA stock?
                  </button>
                </div>
              </div>
            </div>
            <p className="text-base font-ppsupply text-center mt-8 text-[#C0C0C0]">
              Powered by{" "}
              <a
                href="https://scrapybara.com"
                className="text-[#FFAA6E] hover:underline font-semibold"
              >
                Scrapybara
              </a>{" "}
              cloud automation platform by{" "}
              <a
                href="#"
                className="text-[#FFAA6E] hover:underline font-semibold"
              >
                Opulentia
              </a>
              .
            </p>
          </main>
        </div>
      ) : (
        <>
          {useScrapybara ? (
            <ScrapybaraChatFeed
              initialMessage={initialMessage}
              onClose={() => setIsChatVisible(false)}
            />
          ) : (
            <ChatFeed
              initialMessage={initialMessage}
              onClose={() => setIsChatVisible(false)}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}
