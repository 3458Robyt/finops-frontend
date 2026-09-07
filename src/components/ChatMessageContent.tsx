import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageContentProps {
  readonly content: string;
}

const components: Components = {
  h1: ({ children }) => <h3 className="mb-2 text-sm font-bold text-zinc-100">{children}</h3>,
  h2: ({ children }) => <h3 className="mb-2 text-sm font-bold text-zinc-100">{children}</h3>,
  h3: ({ children }) => <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-tak-yellow">{children}</h4>,
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-tak-yellow/60 pl-3 text-zinc-400 last:mb-0">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => (
    <code className={`${className ?? ''} rounded bg-zinc-950/80 px-1 py-0.5 text-[0.9em] text-tak-yellow`}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-2 max-w-full overflow-x-auto rounded-lg bg-zinc-950 p-3 text-xs last:mb-0">{children}</pre>
  ),
  table: ({ children }) => (
    <div className="mb-2 max-w-full overflow-x-auto last:mb-0">
      <table className="min-w-full border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-zinc-700 bg-zinc-950 px-2 py-1 font-bold text-zinc-100">{children}</th>,
  td: ({ children }) => <td className="border border-zinc-800 px-2 py-1 align-top">{children}</td>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-tak-yellow underline decoration-tak-yellow/50 underline-offset-2 hover:decoration-tak-yellow"
    >
      {children}
    </a>
  ),
};

/** Renders assistant Markdown without injecting raw HTML or remote images. */
export function ChatMessageContent({ content }: ChatMessageContentProps) {
  return (
    <div data-testid="assistant-markdown" className="break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        disallowedElements={['img']}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
