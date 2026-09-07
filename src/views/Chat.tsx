import { useEffect, useMemo, useRef, useState } from 'react';
import { useAccessToken } from '../auth/authSession';
import { ChatMessageContent } from '../components/ChatMessageContent';
import {
  ApiRequestError,
  generateAiRecommendations,
  sendAiChatMessage,
  type AiChatMessage,
  type ApiRole,
  type Recommendation,
} from '../services/api';

interface UiMessage extends AiChatMessage {
  readonly id: string;
}

const quickPrompts = [
  'Explica dónde está el mayor costo del periodo',
  'Detecta posibles oportunidades en el gasto',
  '¿Qué acciones priorizarías para reducir costos?',
] as const;

interface ChatProps {
  readonly role: ApiRole;
}

const recommendationRoles: readonly ApiRole[] = [
  'ADMIN',
  'MASTER_ADMIN',
  'OPERATOR_ADMIN',
  'LEAD_TECHNICIAN',
  'FINOPS_TECHNICIAN',
];

export default function Chat({ role }: ChatProps) {
  const token = useAccessToken();
  const canGenerateRecommendations = recommendationRoles.includes(role);
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Puedo ayudarte a interpretar los costos, el consumo y las oportunidades FinOps disponibles para este tenant. Pregúntame por un periodo, servicio o recurso concreto.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const historyRef = useRef<HTMLDivElement | null>(null);
  const historyEndRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);

  const history = useMemo<AiChatMessage[]>(
    () => messages
      .filter((message) => message.id !== 'welcome')
      .map(({ role, content }) => ({ role, content })),
    [messages],
  );

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    historyEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, isSending, isGenerating, error]);

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
      setError(formatAiGenerationError(requestError));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div data-testid="chat-module" className="ui-page relative flex h-full min-h-0 flex-col overflow-hidden animate-in fade-in duration-500">
      <header className="ui-page-header shrink-0 pb-4">
        <div>
          <p className="ui-kicker">Asistente de operaciones</p>
          <h1 className="ui-page-title mt-2 text-3xl">Conversa con tus datos FinOps</h1>
          <p className="ui-page-lead">Consulta costos, consumo y oportunidades del tenant activo. Las respuestas se generan con contexto gobernado.</p>
        </div>
        <span className="ui-status ui-status-accent shrink-0">IA · español</span>
      </header>
      <div
        data-testid="chat-history"
        ref={historyRef}
        className="custom-scrollbar mt-4 min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-2"
        onScroll={() => {
          const historyElement = historyRef.current;
          if (historyElement === null) return;
          const distanceToBottom = historyElement.scrollHeight - historyElement.scrollTop - historyElement.clientHeight;
          stickToBottomRef.current = distanceToBottom < 48;
        }}
      >
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
                  ? 'ui-surface-raised max-w-[85%] rounded-xl rounded-tr-sm px-4 py-3 text-sm text-zinc-100 whitespace-pre-wrap sm:max-w-[70%]'
                  : 'ui-surface max-w-[95%] rounded-xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed text-zinc-300 sm:max-w-[80%]'
              }
            >
              {message.role === 'assistant'
                ? <ChatMessageContent content={message.content} />
                : message.content}
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
        <div ref={historyEndRef} aria-hidden="true" />
      </div>
      
      <div data-testid="chat-composer" className="mt-4 shrink-0 border-t border-zinc-800 pt-4">
        {canGenerateRecommendations && <div className="mb-4 flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => void submitMessage(prompt)}
              disabled={isSending || isGenerating}
              className="ui-button ui-button-secondary min-h-9 whitespace-nowrap rounded-full px-4 text-xs"
            >
              <span className="material-symbols-outlined text-[14px]">bolt</span> {prompt}
            </button>
          ))}
          <button
            onClick={() => void handleGenerateRecommendations(false)}
            disabled={isSending || isGenerating}
            className="ui-button ui-button-secondary min-h-9 whitespace-nowrap rounded-full px-4 text-xs"
          >
            <span className="material-symbols-outlined text-[14px]">auto_awesome</span> Previsualizar recomendaciones IA
          </button>
          <button
            onClick={() => void handleGenerateRecommendations(true)}
            disabled={isSending || isGenerating}
            className="ui-button ui-button-primary min-h-9 whitespace-nowrap rounded-full px-4 text-xs"
          >
            <span className="material-symbols-outlined text-[14px]">save</span> Guardar recomendaciones IA
          </button>
        </div>}
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
            className="ui-control w-full rounded-xl py-4 pl-4 pr-12 text-sm"
          />
          <button
            type="submit"
            disabled={isSending || input.trim() === ''}
            className="ui-button ui-button-primary absolute right-2 top-1/2 size-10 -translate-y-1/2 px-0 disabled:opacity-50"
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
    return 'La IA no generó recomendaciones válidas con el contexto actual.';
  }

  const header = persisted
    ? '### Recomendaciones IA guardadas\n'
    : '### Previsualización de recomendaciones IA\n';

  return [
    header,
    ...recommendations.map((recommendation, index) => {
      const savings = recommendation.estimatedMonthlySavings !== undefined
        ? ` Ahorro estimado: ${recommendation.currency} ${recommendation.estimatedMonthlySavings.toFixed(2)}.`
        : '';

      return `${index + 1}. **[${recommendation.severity}] ${recommendation.title}**\n\n   ${recommendation.description}${savings}`;
    }),
  ].join('\n\n');
}

function formatAiGenerationError(error: unknown): string {
  if (error instanceof ApiRequestError && error.code === 'AI_AUDIT_REJECTED') {
    const audit = isRecord(error.audit) ? error.audit : {};
    const blockingIssues = readStringList(audit['blockingIssues']);
    const requiredChanges = readStringList(audit['requiredChanges']);
    const score = typeof audit['score'] === 'number' ? ` Puntaje auditor: ${audit['score']}/100.` : '';
    const diagnostic = error.diagnosticId !== undefined ? ` Diagnostico: ${error.diagnosticId}.` : '';

    return [
      `El auditor IA rechazo las recomendaciones generadas.${score}${diagnostic}`,
      blockingIssues.length > 0 ? `Motivos: ${blockingIssues.join(' ')}` : '',
      requiredChanges.length > 0 ? `Correcciones requeridas: ${requiredChanges.join(' ')}` : '',
      'No se guardo ninguna recomendacion rechazada. Intenta de nuevo o revisa si falta evidencia tecnica suficiente.',
    ]
      .filter((item) => item !== '')
      .join('\n');
  }

  return error instanceof Error ? error.message : 'No se pudieron generar recomendaciones IA';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
}
