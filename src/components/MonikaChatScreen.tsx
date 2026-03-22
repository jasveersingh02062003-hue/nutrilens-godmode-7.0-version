import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Sparkles, Loader2, Mic, MicOff, Camera, Check, XCircle, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { parseActions, executeAction, buildMonikaContext, generateReportHTML, type MonikaAction, type ReportAction } from '@/lib/monika-actions';
import { supabase } from '@/integrations/supabase/client';
import type { MealSource } from '@/lib/store';
import ContextPickerSheet from '@/components/ContextPickerSheet';
import { getDefaultCategory } from '@/lib/context-learning';
import { canSendMonicaMessage, incrementMonicaMessage, getRemainingMonicaMessages } from '@/lib/subscription-service';
import UpgradePrompt from '@/components/UpgradePrompt';

const quickQuestions = [
  { label: 'Log a meal', icon: '🍽️' },
  { label: 'Suggest a snack', icon: '💡' },
  { label: "How's my progress?", icon: '📊' },
  { label: "What did I eat yesterday?", icon: '📅' },
  { label: 'Weekly report', icon: '📄' },
  { label: 'Nutrition tip', icon: '🧠' },
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: MonikaAction[];
  actionsConfirmed?: boolean;
  imagePreview?: string;
  reportUrl?: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/monika-chat`;
const CHAT_HISTORY_KEY = 'monika-chat-history';

const saveChatHistory = (messages: ChatMessage[]) => {
  try {
    // Keep last 100 messages to avoid localStorage bloat
    const toSave = messages.slice(-100).map(({ imagePreview, reportUrl, ...rest }) => rest);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(toSave));
  } catch {}
};

const loadChatHistory = (): ChatMessage[] => {
  try {
    const saved = localStorage.getItem(CHAT_HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
};

interface Props {
  open: boolean;
  onClose: () => void;
  onDashboardRefresh?: () => void;
}

export default function MonikaChatScreen({ open, onClose, onDashboardRefresh }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChatHistory());
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const [contextPickerOpen, setContextPickerOpen] = useState(false);
  const [pendingActionsMsg, setPendingActionsMsg] = useState<string | null>(null);
  const [pendingMealType, setPendingMealType] = useState<string>('breakfast');
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Persist chat history whenever messages change
  useEffect(() => {
    if (messages.length > 0) saveChatHistory(messages);
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(CHAT_HISTORY_KEY);
    toast.success('Chat history cleared');
  }, []);

  // ─── Voice Input ───
  const toggleVoice = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error('Voice input not supported'); return; }
    const recognition = new SR();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setInput(prev => prev ? `${prev} ${text}` : text);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  // ─── Image capture/upload ───
  const handleImageUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const base64 = dataUrl.split(',')[1];
      const preview = dataUrl;

      // First analyze via analyze-food edge function
      const { data, error } = await supabase.functions.invoke('analyze-food', {
        body: { imageBase64: base64 },
      });

      if (error) throw error;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: '📸 I took a photo of my meal',
        imagePreview: preview,
      };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);

      // Send to Monica with image analysis results
      await streamChat(newMessages, { imageAnalysis: data });
    } catch (e: any) {
      toast.error('Failed to analyze image');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  // ─── Stream chat ───
  const streamChat = async (allMessages: ChatMessage[], extra?: { imageAnalysis?: any }) => {
    const userContext = buildMonikaContext();

    try {
      const apiMessages = allMessages.map(m => {
        const msg: any = { role: m.role, content: m.content };
        if (extra?.imageAnalysis && m === allMessages[allMessages.length - 1] && m.role === 'user') {
          msg.imageAnalysis = extra.imageAnalysis;
        }
        return msg;
      });

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: apiMessages, userContext }),
      });

      if (resp.status === 429) { toast.error('Rate limited. Try again shortly.'); return; }
      if (resp.status === 402) { toast.error('AI credits exhausted.'); return; }
      if (!resp.ok || !resp.body) throw new Error("Failed to start stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullResponse = "";
      const assistantId = crypto.randomUUID();

      const upsert = (soFar: string) => {
        const { cleanText, actions } = parseActions(soFar);
        setMessages(prev => {
          const existing = prev.find(m => m.id === assistantId);
          if (existing) {
            return prev.map(m => m.id === assistantId
              ? { ...m, content: cleanText, actions: actions.length > 0 ? actions : undefined }
              : m
            );
          }
          return [...prev, {
            id: assistantId,
            role: 'assistant' as const,
            content: cleanText,
            actions: actions.length > 0 ? actions : undefined,
          }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullResponse += content;
              upsert(fullResponse);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      console.error('Monika chat error:', e);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment! 🙏",
      }]);
    }
  };

  // ─── Handle send ───
  const handleSend = async (text?: string) => {
    const q = text || input;
    if (!q.trim() || isLoading) return;

    if (!canSendMonicaMessage()) {
      setShowUpgradePrompt(true);
      return;
    }

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: q };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    await streamChat(newMessages);
    incrementMonicaMessage();
    setIsLoading(false);
  };

  // ─── Confirm/Reject actions ───
  const handleConfirmActions = useCallback((msgId: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg?.actions) return;

    // Check if any action is a report
    const reportAction = msg.actions.find(a => a.type === 'generate_report') as ReportAction | undefined;

    if (reportAction) {
      try {
        const html = generateReportHTML(reportAction.startDate, reportAction.endDate);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, actionsConfirmed: true } : m
        ));

        const reportMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `📄 Your report for **${reportAction.startDate}** to **${reportAction.endDate}** is ready!`,
          reportUrl: url,
        };
        setMessages(prev => [...prev, reportMsg]);
        toast.success('Report generated!');
      } catch (e) {
        toast.error('Failed to generate report');
      }
      return;
    }

    // Check if any action is a meal log — show context picker
    const hasMealAction = msg.actions.some(a => a.type === 'log_meal');
    if (hasMealAction) {
      const mealAction = msg.actions.find(a => a.type === 'log_meal') as any;
      setPendingMealType(mealAction?.mealType || 'breakfast');
      setPendingActionsMsg(msgId);
      setContextPickerOpen(true);
      return;
    }

    // Non-meal actions: execute directly
    const results: string[] = [];
    for (const action of msg.actions) {
      results.push(executeAction(action));
    }

    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, actionsConfirmed: true } : m
    ));

    const confirmMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: results.join('\n') + '\n\nDashboard updated! 🎉',
    };
    setMessages(prev => [...prev, confirmMsg]);
    onDashboardRefresh?.();
    toast.success('Logged successfully!');
  }, [messages, onDashboardRefresh]);

  const handleContextForChat = useCallback((source?: MealSource | null) => {
    if (!pendingActionsMsg) return;
    const msg = messages.find(m => m.id === pendingActionsMsg);
    if (!msg?.actions) return;

    const results: string[] = [];
    for (const action of msg.actions) {
      // Inject source into meal actions before executing
      if (action.type === 'log_meal' && source) {
        (action as any).source = source;
      }
      results.push(executeAction(action));
    }

    setMessages(prev => prev.map(m =>
      m.id === pendingActionsMsg ? { ...m, actionsConfirmed: true } : m
    ));

    const confirmMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: results.join('\n') + '\n\nDashboard updated! 🎉',
    };
    setMessages(prev => [...prev, confirmMsg]);
    onDashboardRefresh?.();
    toast.success('Logged successfully!');
    setContextPickerOpen(false);
    setPendingActionsMsg(null);
  }, [messages, pendingActionsMsg, onDashboardRefresh]);

  const handleRejectActions = useCallback((msgId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, actionsConfirmed: false, actions: undefined } : m
    ));
    const rejectMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: "No problem! Let me know if you'd like to adjust anything. 😊",
    };
    setMessages(prev => [...prev, rejectMsg]);
  }, []);

  if (!open) return null;

  const chatContent = (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-background" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-violet" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">Monika</h3>
            <p className="text-[10px] text-primary font-medium">AI Nutrition Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button onClick={clearHistory} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors" title="Clear chat">
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex justify-start">
            <div className="max-w-[85%] px-4 py-3 text-[13px] leading-relaxed bg-muted text-foreground rounded-2xl rounded-bl-md">
              <p>Hi! I'm Monika, your AI nutrition assistant 💚</p>
              <p className="mt-1.5">I can help you:</p>
              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                <li>🍽️ Log meals by describing what you ate</li>
                <li>📸 Analyze food from photos</li>
                <li>🏃 Track activities and exercise</li>
                <li>📊 Review your nutrition history</li>
                <li>💡 Get personalized nutrition advice</li>
              </ul>
              <p className="text-[10px] text-muted-foreground mt-2 italic">I'm an AI assistant, not a doctor. For medical advice, consult a professional.</p>
            </div>
          </div>
        )}

        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${m.role === 'user'
              ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md'
              : 'bg-muted text-foreground rounded-2xl rounded-bl-md'
            }`}>
              {/* Image preview */}
              {m.imagePreview && (
                <img src={m.imagePreview} alt="Food" className="w-full max-h-40 object-cover rounded-t-2xl" />
              )}

              <div className="px-4 py-2.5 text-[13px] leading-relaxed">
                {m.role === 'assistant' ? (
                  <div className="prose prose-sm prose-green max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  <span className="whitespace-pre-wrap">{m.content}</span>
                )}
              </div>

              {/* Action confirmation buttons */}
              {m.actions && m.actions.length > 0 && m.actionsConfirmed === undefined && (
                <div className="px-4 pb-3 flex gap-2">
                  <button
                    onClick={() => handleConfirmActions(m.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    <Check className="w-3.5 h-3.5" /> Yes, log it
                  </button>
                  <button
                    onClick={() => handleRejectActions(m.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" /> No
                  </button>
                </div>
              )}
              {m.actionsConfirmed === true && !m.reportUrl && (
                <div className="px-4 pb-2 text-[10px] text-primary font-medium">✅ Logged</div>
              )}
              {/* Report download button */}
              {m.reportUrl && (
                <div className="px-4 pb-3">
                  <a
                    href={m.reportUrl}
                    download={`nutrilens-report.html`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity inline-flex"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Report
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="px-4 py-2.5 bg-muted rounded-2xl rounded-bl-md">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick questions */}
      {messages.length === 0 && (
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {quickQuestions.map(q => (
              <button
                key={q.label}
                onClick={() => handleSend(q.label)}
                disabled={isLoading}
                className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-muted text-xs font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50 shrink-0"
              >
                {q.icon} {q.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upgrade prompt */}
      {showUpgradePrompt && (
        <div className="px-4 pb-2">
          <UpgradePrompt feature="monica" remaining={getRemainingMonicaMessages()} onUpgraded={() => setShowUpgradePrompt(false)} />
        </div>
      )}

      {/* Input area */}
      <div className="px-4 pb-4 pt-2 border-t border-border bg-card">
        <div className="flex items-center gap-2">
          {/* Image upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file);
              e.target.value = '';
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-primary/10 transition-colors disabled:opacity-50 shrink-0"
          >
            <Camera className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Text input */}
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Describe your meal, ask anything..."
            disabled={isLoading}
            className="flex-1 px-3 py-2.5 rounded-xl bg-muted text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-shadow disabled:opacity-50 min-w-0"
          />

          {/* Voice input */}
          <button
            onClick={toggleVoice}
            disabled={isLoading}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 shrink-0 ${
              isListening ? 'bg-destructive text-destructive-foreground' : 'bg-muted hover:bg-primary/10'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-muted-foreground" />}
          </button>

          {/* Send */}
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50 shrink-0"
          >
            <Send className="w-3.5 h-3.5 text-primary-foreground" />
          </button>
        </div>
      </div>
      {/* Context Picker for meal actions */}
      <ContextPickerSheet
        open={contextPickerOpen}
        defaultCategory={getDefaultCategory(pendingMealType)}
        onSave={(source, cookingMethod) => handleContextForChat(source)}
        onSkip={() => handleContextForChat(null)}
      />
    </div>
  );

  return createPortal(chatContent, document.body);
}
