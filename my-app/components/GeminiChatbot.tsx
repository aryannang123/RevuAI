"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, MessageCircle, RotateCcw } from 'lucide-react';

// ✅ Properly typed props interface
interface SentimentData {
  file?: string;
  ai_summary?: {
    paragraph_summary: string;
    model_used: string;
    generated_at: string;
  };
  summary?: Record<string, number>;
  overall_sentiment?: string;
  total_analyzed?: number;
  dominant_emotion?: Record<string, number>;
  confidence_breakdown?: Record<string, number>;
  top_comments?: {
    most_very_positive?: {
      text: string;
      confidence: number;
    };
    most_very_negative?: {
      text: string;
      confidence: number;
    };
  };
}

interface GeminiChatbotProps {
  sentimentData: SentimentData;
  searchQuery: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ✅ Properly exported component with typed props
const GeminiChatbot: React.FC<GeminiChatbotProps> = ({ sentimentData, searchQuery }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [apiKeyIndex, setApiKeyIndex] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // 🔄 Reset session and clear chat
  const resetChat = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:5000'}/api/gemini/reset-session`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        }
      );
      
      if (response.ok) {
        setMessages([]);
        console.log('✅ Chat session reset');
      }
    } catch (error) {
      console.error('❌ Error resetting session:', error);
    }
  };

  // ✅ Optimized sendMessage function
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // 📦 Only send dataset path on FIRST message, then rely on session cache
      const isFirstMessage = messages.length === 0;
      const datasetPath = isFirstMessage ? sentimentData?.file : null;

      console.log(`💬 Sending message (Session: ${sessionId})`);
      console.log(`   First message: ${isFirstMessage}`);
      console.log(`   Dataset: ${datasetPath || 'Using cached session data'}`);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'http://localhost:5000'}/api/gemini/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userMessage.content,
            sessionId: sessionId,  // Session ID for caching
            dataset: datasetPath,   // Only on first message
            conversationHistory: messages.slice(-6).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        console.error('Gemini backend error:', response.status, text);
        throw new Error(`Gemini backend returned ${response.status}`);
      }

      const data = await response.json();

      // Update API key rotation indicator
      if (data.apiKeyUsed !== undefined) {
        setApiKeyIndex(data.apiKeyUsed);
        console.log(`🔄 API Key used: Account ${data.apiKeyUsed + 1}`);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || '⚠️ Gemini returned an empty response.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('❌ Error sending message to Gemini:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content:
          "⚠️ Could not reach the Gemini backend. Please ensure Flask is running and reachable.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-8 right-8 z-50 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-full p-4 shadow-2xl transition-all duration-300 hover:scale-110 group"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            AI Chat
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-8 right-8 z-50 w-96 h-[600px] backdrop-blur-2xl bg-gray-900/95 border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Gemini AI</h3>
                <p className="text-white/80 text-xs flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  API Key {apiKeyIndex + 1} • Session Active
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={resetChat}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                aria-label="Reset chat"
                title="Clear conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                aria-label="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-white/60 mt-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm mb-2">Ask me anything about the sentiment analysis!</p>
                <p className="text-xs text-white/40 mb-4">
                  💡 Dataset loaded once • Efficient caching • 4 API keys
                </p>
                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => setInput("What's the overall sentiment?")}
                    className="block w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors"
                  >
                    What's the overall sentiment?
                  </button>
                  <button
                    onClick={() => setInput("What are the main positive themes?")}
                    className="block w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors"
                  >
                    What are the main positive themes?
                  </button>
                  <button
                    onClick={() => setInput("What are users complaining about?")}
                    className="block w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors"
                  >
                    What are users complaining about?
                  </button>
                  <button
                    onClick={() => setInput("Give me a detailed breakdown")}
                    className="block w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors"
                  >
                    Give me a detailed breakdown
                  </button>
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-60 mt-1">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}

            {/* 💭 Gemini typing animation */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.4s' }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about the analysis..."
                className="flex-1 bg-white/10 text-white placeholder-white/50 border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg p-2 transition-all duration-300"
                aria-label="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            
            {/* Session Info */}
            <div className="mt-2 text-xs text-white/40 flex items-center justify-between">
              <span>Session: {sessionId.slice(0, 12)}...</span>
              <span>{messages.length} messages</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ✅ Default export
export default GeminiChatbot;