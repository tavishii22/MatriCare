import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Heart, AlertCircle, Bot, CornerDownLeft, Mic, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: Date;
}

const CHATBOT_API_URL = import.meta.env.VITE_CHATBOT_API_URL || "http://localhost:5000";

const SUGGESTIONS = [
  "What are warning signs in the 3rd trimester?",
  "What should I eat for gestational diabetes?",
  "Am I in active labor? What are the signs?",
  "Can you give me a basic pregnancy yoga guide?",
];

// Helper to format simple markdown-like text to HTML structures
const formatMessageText = (text: string) => {
  if (!text) return "";
  
  // Format bold text **word**
  let formatted = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  
  // Handle new lines for paragraphs and lists
  const lines = formatted.split("\n");
  return (
    <div className="space-y-1.5 text-xs sm:text-sm">
      {lines.map((line, idx) => {
        // If line is a list item starting with * or -
        if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
          return (
            <li key={idx} className="ml-4 list-disc leading-relaxed">
              <span dangerouslySetInnerHTML={{ __html: line.trim().substring(2) }} />
            </li>
          );
        }
        // Normal paragraph line
        return line.trim() ? (
          <p key={idx} className="leading-relaxed" dangerouslySetInnerHTML={{ __html: line }} />
        ) : (
          <div key={idx} className="h-1" />
        );
      })}
    </div>
  );
};

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Hello mama! 🌸 I am MomBuddy, your friendly expert pregnancy assistant. How are you feeling today? Ask me any questions about symptoms, diet, exercises, or labor warning signs, and I will be glad to support you.",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showFloatingHint, setShowFloatingHint] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Audio and Speech Synthesis State
  const [activeSpeakingId, setActiveSpeakingId] = useState<string | null>(null);

  // Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => (prev ? prev + " " + transcript : transcript));
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleToggleListen = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please try Chrome or Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleToggleSpeak = (msgId: string, text: string) => {
    if (activeSpeakingId === msgId) {
      window.speechSynthesis.cancel();
      setActiveSpeakingId(null);
    } else {
      window.speechSynthesis.cancel();
      // Remove Markdown bold markers and lists for cleaner speech
      const cleanText = text.replace(/\*\*/g, "").replace(/- /g, "").replace(/\* /g, "");
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.onend = () => {
        setActiveSpeakingId(null);
      };
      utterance.onerror = () => {
        setActiveSpeakingId(null);
      };
      window.speechSynthesis.speak(utterance);
      setActiveSpeakingId(msgId);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      window.speechSynthesis.cancel();
      setActiveSpeakingId(null);
    }
  }, [isOpen]);

  // Auto-scroll messages list
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  // Show floating hint after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFloatingHint(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      sender: "user",
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);
    setShowFloatingHint(false);

    const botMsgId = `msg-${Date.now()}-${Math.random()}`;

    try {
      const response = await fetch(`${CHATBOT_API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: text.trim() }),
      });

      if (!response.ok) {
        throw new Error("Unable to connect to your companion. Make sure chatbot server is active.");
      }

      // The chatbot streams plain text — read it chunk by chunk
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response body");

      // Add an empty bot message that we'll fill in as chunks arrive
      setMessages((prev) => [
        ...prev,
        { id: botMsgId, sender: "bot", text: "", timestamp: new Date() },
      ]);
      setIsTyping(false);

      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        // Update the bot message in-place for a live streaming effect
        setMessages((prev) =>
          prev.map((m) => (m.id === botMsgId ? { ...m, text: fullText } : m))
        );
      }

      // Final flush
      const tail = decoder.decode();
      if (tail) {
        fullText += tail;
        setMessages((prev) =>
          prev.map((m) => (m.id === botMsgId ? { ...m, text: fullText } : m))
        );
      }

      if (!fullText.trim()) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId
              ? { ...m, text: "I'm sorry, I couldn't formulate an answer. Please try asking in a different way, mama." }
              : m
          )
        );
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          sender: "bot",
          text: "I am having trouble connecting to my knowledge base right now. Please check if the companion service is running, mama. 🌸",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage(inputText);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2.5">
        <AnimatePresence>
          {showFloatingHint && !isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-rose-100 shadow-card px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-700 flex items-center gap-2 max-w-xs relative pointer-events-none select-none"
            >
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse shrink-0" />
              <span>Ask me any pregnancy question!</span>
              <div className="absolute right-6 -bottom-1.5 w-3 h-3 bg-white border-r border-b border-rose-100 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => {
            setIsOpen(!isOpen);
            setShowFloatingHint(false);
          }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-hero text-white relative overflow-hidden transition-colors ${
            isOpen ? "bg-slate-900" : "bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
          }`}
        >
          {isOpen ? (
            <X className="w-6 h-6 animate-spin-slow" />
          ) : (
            <MessageCircle className="w-6 h-6 animate-pulse-ring" />
          )}
        </motion.button>
      </div>

      {/* Chat Window Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-2rem)] h-[540px] max-h-[80vh] rounded-3xl bg-white/95 backdrop-blur-md border border-rose-100 shadow-card flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-sm tracking-wide">MomBuddy</h3>
                  <span className="text-[10px] opacity-90 font-medium">Expert Obstetrics Assistant</span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-white/90 transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className="flex flex-col items-start gap-1 max-w-[85%]">
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                        msg.sender === "user"
                          ? "bg-rose-500 text-white rounded-tr-none"
                          : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                      }`}
                    >
                      {msg.sender === "bot" ? formatMessageText(msg.text) : msg.text}
                    </div>
                    {msg.sender === "bot" && (
                      <button
                        onClick={() => handleToggleSpeak(msg.id, msg.text)}
                        className={`text-slate-400 hover:text-rose-500 p-1 rounded-lg transition-colors flex items-center gap-1 self-start mt-0.5 ml-1 ${
                          activeSpeakingId === msg.id ? "text-rose-500 animate-pulse bg-rose-50" : ""
                        }`}
                        title="Read aloud"
                      >
                        {activeSpeakingId === msg.id ? (
                          <VolumeX className="w-3.5 h-3.5" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5" />
                        )}
                        <span className="text-[9px] font-semibold">
                          {activeSpeakingId === msg.id ? "Stop" : "Listen"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Suggestions list (Only show at the start/after initial message) */}
              {messages.length === 1 && !isTyping && (
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Common Questions</span>
                  <div className="flex flex-col gap-2">
                    {SUGGESTIONS.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(s)}
                        className="p-3 text-left bg-white hover:bg-rose-50/40 text-xs font-semibold text-rose-600 border border-rose-100/50 rounded-2xl transition-all shadow-sm hover:scale-[1.01]"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-3 flex gap-1 items-center shadow-sm">
                    <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-3 bg-white border-t border-rose-50 flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask me a pregnancy question..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1.5 focus:ring-rose-200 focus:border-rose-300 font-medium text-slate-700"
              />
              <button
                type="button"
                onClick={handleToggleListen}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors shrink-0 shadow-sm border ${
                  isListening
                    ? "bg-red-500 text-white border-red-400 animate-pulse"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200"
                }`}
                title={isListening ? "Listening... click to stop" : "Speak to text"}
              >
                <Mic className="w-4.5 h-4.5" />
              </button>
              <button
                onClick={() => handleSendMessage(inputText)}
                disabled={!inputText.trim() || isTyping}
                className="w-10 h-10 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:hover:bg-rose-500 shrink-0 shadow-sm"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </div>
            
            {/* Warning footer */}
            <div className="px-4 py-1.5 bg-slate-50 border-t border-slate-100 text-center flex items-center justify-center gap-1">
              <AlertCircle className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="text-[9px] text-slate-400 font-semibold leading-none">Consult a doctor for clinical guidance.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
