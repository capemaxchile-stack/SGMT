import { useState, useRef, useEffect } from 'react';
import { useCopilotChat, useCopilotSuggestions } from '../../api/copilot';
import { CopilotMessage } from '../../types/copilot';
import { useAuthStore } from '../../stores/auth.store';
import { CopilotActionCardRenderer } from './CopilotActionCardRenderer';
import {
  Sparkles,
  X,
  Send,
  Trash2,
  Bot,
  User as UserIcon,
  ChevronRight,
  Maximize2,
  Minimize2,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function CopilotDrawer({ isOpen, onClose }: Props) {
  const user = useAuthStore((state) => state.user);
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `### ¡Hola ${user?.name || 'Colega'}! 🚜🤖\nSoy tu **Copiloto Agéntico SGMT**.\n\nPuedo consultar el estado de la flota, alertas del radar de mantenimiento, insumos en stock crítico, órdenes de compra por autorizar o los costos consolidados de faenas.\n\n¿En qué te puedo ayudar hoy?`,
      timestamp: new Date().toISOString(),
      suggestedQuestions: [
        '🚨 ¿Qué equipos tienen mantención vencida o próxima?',
        '📦 ¿Cuáles ítems están bajo stock mínimo?',
        '📝 ¿Hay órdenes de compra pendientes de aprobación?',
        '🚜 ¿Cuál es la disponibilidad actual de la flota?',
        '💰 ¿Cuánto se ha gastado en combustible y faenas?',
      ],
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatMutation = useCopilotChat();
  const { data: suggestions } = useCopilotSuggestions();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        scrollToBottom();
      }, 150);
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || chatMutation.isPending) return;

    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');

    try {
      const history = messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const res = await chatMutation.mutateAsync({
        message: text,
        history,
      });

      const botMsg: CopilotMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: res.answer,
        cards: res.cards,
        suggestedQuestions: res.suggestedQuestions,
        toolsExecuted: res.toolsExecuted,
        timestamp: res.timestamp,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const errorMsg: CopilotMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'Lo siento, ocurrió un error al consultar los datos del sistema. Por favor reintenta en unos instantes.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `### Sesión reiniciada 🚜\n¿Qué consulta operativa o financiera querés realizar?`,
        timestamp: new Date().toISOString(),
        suggestedQuestions: [
          '🚨 Flota con mantención vencida',
          '📦 Stock crítico en bodega',
          '📝 Órdenes de compra por aprobar',
        ],
      },
    ]);
  };

  // Simple Markdown text renderer
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Heading 3
      if (line.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-sm font-bold text-blue-400 mt-2 mb-1 flex items-center gap-1.5">
            {line.replace('### ', '')}
          </h3>
        );
      }
      // Blockquote
      if (line.startsWith('> ')) {
        return (
          <div
            key={idx}
            className="my-1.5 p-2 rounded-lg bg-blue-950/40 border-l-2 border-blue-500 text-xs text-blue-200 italic"
          >
            {line.replace('> ', '')}
          </div>
        );
      }
      // Bullet list
      if (line.trim().startsWith('- ')) {
        const rawContent = line.trim().substring(2);
        return (
          <div key={idx} className="text-xs text-slate-200 my-0.5 flex items-start gap-1.5 pl-1">
            <span className="text-blue-400 mt-0.5">•</span>
            <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(rawContent) }} />
          </div>
        );
      }
      // Empty line
      if (!line.trim()) {
        return <div key={idx} className="h-1" />;
      }
      // Regular paragraph
      return (
        <p
          key={idx}
          className="text-xs text-slate-200 leading-relaxed mb-1"
          dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }}
        />
      );
    });
  };

  const formatInlineMarkdown = (str: string) => {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-slate-300">$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-slate-800 text-amber-300 text-[11px] font-mono">$1</code>');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer Container */}
      <aside
        className={`relative z-50 flex flex-col h-full bg-slate-900 border-l border-slate-700/80 shadow-2xl transition-all duration-300 ease-in-out ${
          isExpanded ? 'w-full md:w-[700px]' : 'w-full md:w-[460px]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-amber-500 shadow-md shadow-blue-500/20 text-white">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm text-white">SGMT Copilot</h3>
                <span className="px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Agéntico
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Asistente Operativo & Financiero en Vivo</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isExpanded ? 'Reducir tamaño' : 'Expandir ventana'}
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              onClick={clearHistory}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
              title="Limpiar conversación"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Cerrar (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Proactive Live Alert Strip */}
        {suggestions && suggestions.length > 0 && (
          <div className="px-4 py-2 bg-blue-950/30 border-b border-blue-900/30 flex items-center gap-2 overflow-x-auto text-[11px] no-scrollbar">
            <span className="flex items-center gap-1 text-amber-400 font-semibold shrink-0">
              <Layers size={13} />
              <span>Sugerencias:</span>
            </span>
            {suggestions.slice(0, 3).map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(s.text)}
                className="shrink-0 px-2.5 py-1 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700/60 hover:border-blue-500/50 transition-colors"
              >
                {s.text}
              </button>
            ))}
          </div>
        )}

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={16} />
                </div>
              )}

              <div
                className={`max-w-[88%] rounded-2xl p-3.5 shadow-md ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-slate-800/95 border border-slate-700/70 text-slate-200 rounded-tl-sm'
                }`}
              >
                {/* Message Body */}
                {renderFormattedText(msg.content)}

                {/* Executed Tools Badge */}
                {msg.toolsExecuted && msg.toolsExecuted.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-700/50 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-medium">Herramientas ejecutadas:</span>
                    {msg.toolsExecuted.map((t, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-emerald-400 border border-slate-700"
                      >
                        <CheckCircle2 size={10} />
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Render Interactive Action Cards */}
                {msg.cards && msg.cards.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {msg.cards.map((card, idx) => (
                      <CopilotActionCardRenderer key={idx} card={card} onNavigate={onClose} />
                    ))}
                  </div>
                )}

                {/* Suggested Questions */}
                {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-700/60 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Preguntas sugeridas:
                    </span>
                    <div className="flex flex-col gap-1">
                      {msg.suggestedQuestions.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(q)}
                          className="flex items-center justify-between text-left text-[11px] p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-700/80 text-blue-300 hover:text-white border border-slate-700/40 transition-all group"
                        >
                          <span>{q}</span>
                          <ChevronRight
                            size={13}
                            className="text-slate-500 group-hover:text-blue-400 transition-colors"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-xl bg-slate-700 text-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                  <UserIcon size={15} />
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator */}
          {chatMutation.isPending && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-7 h-7 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0 animate-pulse">
                <Bot size={16} />
              </div>
              <div className="bg-slate-800/90 border border-slate-700 p-3 rounded-2xl rounded-tl-sm flex items-center gap-2 text-xs text-slate-300">
                <Sparkles size={14} className="text-amber-400 animate-spin" />
                <span>Analizando datos en tiempo real...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/90 backdrop-blur-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Preguntá sobre flota, compras, mantención, stock..."
                disabled={chatMutation.isPending}
                className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={!inputValue.trim() || chatMutation.isPending}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white shadow-md shadow-blue-600/30 transition-all active:scale-95 shrink-0"
              title="Enviar mensaje (Enter)"
            >
              <Send size={16} />
            </button>
          </form>

          <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-400">
            <span>Presioná <kbd className="px-1 rounded bg-slate-800 border border-slate-700 text-slate-300">Enter</kbd> para enviar</span>
            <span>Atajo global: <kbd className="px-1 rounded bg-slate-800 border border-slate-700 text-slate-300">Ctrl + K</kbd></span>
          </div>
        </div>
      </aside>
    </div>
  );
}
