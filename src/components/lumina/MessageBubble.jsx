import ReactMarkdown from "react-markdown";
import LuminaOrb from "./LuminaOrb";
import { format } from "date-fns";

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const time = message.timestamp ? format(new Date(message.timestamp), "HH:mm") : "";

  if (isUser) {
    return (
      <div className="flex justify-end gap-3 message-fade-in">
        <div className="max-w-[75%]">
          <div
            className="px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed"
            style={{
              background: "linear-gradient(135deg, hsla(196,80%,65%,0.18) 0%, hsla(270,60%,65%,0.12) 100%)",
              border: "1px solid hsla(196,80%,65%,0.2)",
              color: "hsl(210,20%,90%)",
            }}
          >
            {message.content}
          </div>
          {time && <p className="text-right text-xs mt-1 text-muted-foreground">{time}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 message-fade-in">
      <LuminaOrb size="sm" />
      <div className="max-w-[80%] flex-1">
        <div
          className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed"
          style={{
            background: "hsl(220,18%,11%)",
            border: "1px solid hsl(220,15%,18%)",
            color: "hsl(210,20%,85%)",
          }}
        >
          <ReactMarkdown
            className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            components={{
              p: ({ children }) => <p className="my-1 leading-relaxed text-foreground/85">{children}</p>,
              strong: ({ children }) => <strong className="text-primary font-semibold">{children}</strong>,
              ul: ({ children }) => <ul className="my-2 ml-4 space-y-1 list-disc">{children}</ul>,
              ol: ({ children }) => <ol className="my-2 ml-4 space-y-1 list-decimal">{children}</ol>,
              li: ({ children }) => <li className="text-foreground/80">{children}</li>,
              h3: ({ children }) => <h3 className="font-semibold text-foreground mt-3 mb-1">{children}</h3>,
              code: ({ children }) => (
                <code className="px-1.5 py-0.5 rounded bg-muted text-primary text-xs font-mono">{children}</code>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-primary/40 pl-3 my-2 text-muted-foreground italic">{children}</blockquote>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        {time && <p className="text-xs mt-1 text-muted-foreground">{time}</p>}
      </div>
    </div>
  );
}