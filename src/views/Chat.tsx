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
import { chatSessionKey, clearChatSession, loadChatSession, saveChatSession, type StoredChatMessage } from '../services/chatSessionStorage';

interface UiMessage extends AiChatMessage {
  readonly id: string;
}

const welcomeMessage: UiMessage = {
  id: 'welcome',
  role: 'assistant',
  content: 'Puedo ayudarte a interpretar los costos, el consumo y las oportunidades FinOps disponibles para este tenant. Pregúntame por un periodo, servicio o recurso concreto.',
};

const quickPrompts = [
  'Explica dónde está el mayor costo del periodo',
  'Detecta posibles oportunidades en el gasto',
  '¿Qué acciones priorizarías para reducir costos?',
] as const;

interface ChatProps {
  readonly role: ApiRole;
  readonly userId: string;
  readonly tenantId: string;
}

const recommendationRoles: readonly ApiRole[] = [
  'ADMIN',
  'MASTER_ADMIN',
  'OPERATOR_ADMIN',
  'LEAD_TECHNICIAN',
  'FINOPS_TECHNICIAN',
];

export default function Chat({ role, userId, tenantId }: ChatProps) {
  const token = useAccessToken();
  const canGenerateRecommendations = recommendationRoles.includes(role);
  const storageKey = chatSessionKey(userId, tenantId);
  const [messages, setMessages] = useState<UiMessage[]>(() => loadChatSession(storageKey, welcomeMessage));
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedChatRequest, setFailedChatRequest] = useState<{
    readonly message: string;
    readonly history: readonly AiChatMessage[];
  } | null>(null);
  const historyRef = useRef<HTMLDivElement | null>(null);
  const historyEndRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const activeStorageKeyRef = useRef(storageKey);
  const skipPersistRef = useRef(false);

  useEffect(() => {
    if (activeStorageKeyRef.current === storageKey) return;
    activeStorageKeyRef.current = storageKey;
    skipPersistRef.current = true;
    setMessages(loadChatSession(storageKey, welcomeMessage));
    setInput('');
    setError(null);
    setFailedChatRequest(null);
  }, [storageKey]);

  useEffect(() => {
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    saveChatSession(storageKey, messages as readonly StoredChatMessage[]);
  }, [messages, storageKey]);

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

  const runChatRequest = async (message: string, requestHistory: readonly AiChatMessage[]) => {
    setIsSending(true);
    try {
      const response = await sendAiChatMessage(token, { message, history: requestHistory });
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: 'assistant', content: response.answer },
      ]);
      setFailedChatRequest(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo consultar la IA');
      setFailedChatRequest({ message, history: requestHistory });
    } finally {
      setIsSending(false);
    }
  };

  const submitMessage = async (message: string) => {
    const trimmed = message.trim();
    if (trimmed === '' || isSending) return;

    const requestHistory = history;
    setMessages((current) => [...current, {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
    }]);
    setInput('');
    setError(null);
    setFailedChatRequest(null);
    await runChatRequest(trimmed, requestHistory);
  };

  const retryFailedChatRequest = async (): Promise<void> => {
    const failedRequest = failedChatRequest;
    if (failedRequest === null || isSending) return;
    setError(null);
    setFailedChatRequest(null);
    await runChatRequest(failedRequest.message, failedRequest.history);
  };

  const handleGenerateRecommendations = async (persist: boolean) => {
    if (isGenerating) {
      return;
    }

    setError(null);
    setFailedChatRequest(null);
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

  const startNewConversation = (): void => {
    if (messages.length > 1 && !window.confirm('¿Quieres borrar la conversación de este tenant?')) return;
    clearChatSession(storageKey);
    saveChatSession(storageKey, [welcomeMessage]);
    setMessages([welcomeMessage]);
    setError(null);
    setFailedChatRequest(null);
  };

  return (
    <div data-testid="chat-module" className="ui-page relative flex h-full min-h-0 flex-col overflow-hidden animate-in fade-in duration-500">
      <header className="ui-page-header shrink-0 pb-4">
        <div>
          <p className="ui-kicker">Asistente de operaciones</p>
          <h1 className="ui-page-title mt-2 text-3xl">Conversa con tus datos FinOps</h1>
          <p className="ui-page-lead">Consulta costos, consumo y oportunidades del tenant activo. Las respuestas se generan con contexto gobernado.</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <button type="button" onClick={startNewConversation} disabled={isSending || isGenerating} className="ui-button ui-button-secondary min-h-9 text-xs disabled:opacity-50">Nueva conversación</button>
          <span className="ui-status ui-status-accent">IA · español</span>
        </div>
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
          <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl px-4 py-3 text-sm">
            <p>{error}</p>
            {failedChatRequest !== null && (
              <button
                type="button"
                onClick={() => void retryFailedChatRequest()}
                disabled={isSending}
                className="mt-2 underline underline-offset-2 disabled:opacity-50"
              >
                Reintentar consulta
              </button>
            )}
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
            onChange={(event) => {
              setInput(event.target.value);
              if (failedChatRequest !== null) {
                setFailedChatRequest(null);
                setError(null);
              }
            }}
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
    const diagnostic = error.diagnosticId !== undefined ? ` Diagnóstico: ${error.diagnosticId}.` : '';

    return [
      `El auditor de IA rechazó las recomendaciones generadas.${score}${diagnostic}`,
      blockingIssues.length > 0 ? `Motivos: ${blockingIssues.join(' ')}` : '',
      requiredChanges.length > 0 ? `Correcciones requeridas: ${requiredChanges.join(' ')}` : '',
      'No se guardó ninguna recomendación rechazada. Intenta de nuevo o revisa si falta evidencia técnica suficiente.',
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
