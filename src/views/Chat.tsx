import { useMemo, useState } from 'react';
import {
  generateAiRecommendations,
  sendAiChatMessage,
  type AiChatMessage,
  type Recommendation,
} from '../services/api';

interface ChatProps {
  readonly token: string;
}

interface UiMessage extends AiChatMessage {
  readonly id: string;
}

const quickPrompts = [
  'Explica donde esta el mayor costo del periodo',
  'Detecta posibles oportunidades en el gasto',
  'Que acciones priorizarias para reducir costos?',
] as const;

export default function Chat({ token }: ChatProps) {
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Estoy conectado al motor IA y al resumen FOCUS cargado en Supabase. Preguntame por costos, oportunidades o acciones FinOps.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const history = useMemo<AiChatMessage[]>(
    () => messages
      .filter((message) => message.id !== 'welcome')
      .map(({ role, content }) => ({ role, content })),
    [messages],
  );

  const submitMessage = async (message: string) => {
    const trimmed = message.trim();

    if (trimmed === '' || isSending) {
      return;
    }

    const userMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setError(null);
    setIsSending(true);

    try {
      const response = await sendAiChatMessage(token, {
        message: trimmed,
        history,
      });

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.answer,
        },
      ]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo consultar la IA');
    } finally {
      setIsSending(false);
    }
  };

  const handleGenerateRecommendations = async (persist: boolean) => {
    if (isGenerating) {
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      const response = await generateAiRecommendations(token, persist);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: formatRecommendations(response.recommendations, response.persisted),
        },
      ]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudieron generar recomendaciones IA');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] lg:h-[calc(100vh-100px)] relative animate-in fade-in duration-500">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex flex-col gap-1 ${message.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="flex items-center gap-2 mb-1">
                <div className="size-6 bg-tak-yellow flex items-center justify-center rounded-sm">
                  <span className="material-symbols-outlined text-[14px] text-zinc-950 font-bold">smart_toy</span>
                </div>
                <span className="text-[10px] font-bold text-tak-yellow uppercase tracking-widest">Asistente FinOps</span>
              </div>
            )}
            <div
              className={
                message.role === 'user'
                  ? 'bg-zinc-800 text-zinc-100 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[85%] sm:max-w-[70%] text-sm whitespace-pre-wrap'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[95%] sm:max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap'
              }
            >
              {message.content}
            </div>
          </div>
        ))}
        {(isSending || isGenerating) && (
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">
            <span className="material-symbols-outlined text-[16px] animate-pulse text-tak-yellow">progress_activity</span>
            Procesando IA
          </div>
        )}
        {error !== null && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}
      </div>
      
      <div className="mt-4 pt-4 border-t border-zinc-800">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => void submitMessage(prompt)}
              disabled={isSending || isGenerating}
              className="whitespace-nowrap bg-zinc-900 border border-zinc-800 hover:border-tak-yellow disabled:opacity-50 text-xs font-bold text-zinc-400 hover:text-tak-yellow px-4 py-1.5 rounded-full transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">bolt</span> {prompt}
            </button>
          ))}
          <button
            onClick={() => void handleGenerateRecommendations(false)}
            disabled={isSending || isGenerating}
            className="whitespace-nowrap bg-zinc-900 border border-zinc-800 hover:border-tak-yellow disabled:opacity-50 text-xs font-bold text-zinc-400 hover:text-tak-yellow px-4 py-1.5 rounded-full transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">auto_awesome</span> Previsualizar recomendaciones IA
          </button>
          <button
            onClick={() => void handleGenerateRecommendations(true)}
            disabled={isSending || isGenerating}
            className="whitespace-nowrap bg-tak-yellow/10 border border-tak-yellow/30 hover:bg-tak-yellow disabled:opacity-50 text-xs font-bold text-tak-yellow hover:text-zinc-950 px-4 py-1.5 rounded-full transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">save</span> Guardar recomendaciones IA
          </button>
        </div>
        <form
          className="relative"
          onSubmit={(event) => {
            event.preventDefault();
            void submitMessage(input);
          }}
        >
          <input 
            type="text" 
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Escribe tu consulta a la IA (ej: Muéstrame el ROI actual)..." 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-tak-yellow transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={isSending || input.trim() === ''}
            className="absolute right-2 top-1/2 -translate-y-1/2 size-10 bg-tak-yellow text-zinc-950 rounded-xl flex items-center justify-center hover:bg-yellow-400 disabled:opacity-50 transition-colors shadow"
          >
            <span className="material-symbols-outlined font-bold">send</span>
          </button>
        </form>
      </div>
    </div>
  );
}

function formatRecommendations(
  recommendations: readonly Recommendation[],
  persisted: boolean,
): string {
  if (recommendations.length === 0) {
    return 'La IA no genero recomendaciones validas con el contexto actual.';
  }

  const header = persisted
    ? 'Recomendaciones IA guardadas en la base de datos:'
    : 'Previsualizacion de recomendaciones IA:';

  return [
    header,
    ...recommendations.map((recommendation, index) => {
      const savings = recommendation.estimatedMonthlySavings !== undefined
        ? ` Ahorro estimado: ${recommendation.currency} ${recommendation.estimatedMonthlySavings.toFixed(2)}.`
        : '';

      return `${index + 1}. [${recommendation.severity}] ${recommendation.title}\n${recommendation.description}${savings}`;
    }),
  ].join('\n\n');
}
