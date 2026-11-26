import { useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart } from "ai";
import { Trash2, Bot } from "lucide-react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Tool, ToolContent, ToolHeader, ToolOutput } from "@/components/ai-elements/tool";

const SUGGESTIONS = [
  ["🏏 Top Run Scorer", "Who has scored the most runs?"],
  ["🎯 Top Wicket Taker", "Who has taken the most wickets?"],
  ["📊 Compare Players", "Compare the top two run scorers."],
  ["🔥 Best Recent Form", "Which player has the best recent form?"],
  ["💥 Most Sixes", "Who has hit the most sixes?"],
  ["⚡ Best Strike Rate", "Who has the highest strike rate with at least 50 balls?"],
  ["🎳 Best Economy", "Who has the best bowling economy?"],
  ["🏆 Latest Match", "What was the result of the latest match?"],
  ["📈 Player Performance", "Show the top 5 run scorers with their averages and strike rates."],
  ["8️⃣ Best 8-Over Player", "Who performs best in 8-over matches?"],
];

const CricketAnalyst = () => {
  const [input, setInput] = useState("");
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cricket-analyst`,
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      }),
    [],
  );
  const { messages, sendMessage, status, stop, error, setMessages, clearError } = useChat({ transport });

  const ask = (text: string) => {
    if (!text.trim() || status === "submitted" || status === "streaming") return;
    clearError();
    sendMessage({ text });
    setInput("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="container max-w-3xl flex-1 flex flex-col px-3 py-3 md:py-6 h-[calc(100dvh-3rem)] md:h-[calc(100dvh-4rem)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-lg">🏏</div>
            <div>
              <h1 className="text-lg md:text-2xl font-bold">AI Cricket Analyst</h1>
              <p className="text-xs text-muted-foreground">Answers from real CricketIQ stats only</p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { stop(); setMessages([]); clearError(); }}>
              <Trash2 className="w-4 h-4 mr-1" /> Clear
            </Button>
          )}
        </div>

        <Conversation className="flex-1 rounded-lg border bg-card/40">
          <ConversationContent className="gap-5">
            {messages.length === 0 ? (
              <ConversationEmptyState icon={<Bot className="w-8 h-8" />} title="Ask about players, teams and matches" description="Pick a suggestion or type your own question.">
                <div className="flex flex-col items-center gap-3">
                  <Bot className="w-8 h-8 text-primary" />
                  <p className="text-sm text-muted-foreground">Pick a suggestion or ask your own question.</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-2">
                    {SUGGESTIONS.map(([label, q]) => (
                      <Button key={label} variant="outline" size="sm" className="text-xs" onClick={() => ask(q)}>{label}</Button>
                    ))}
                  </div>
                </div>
              </ConversationEmptyState>
            ) : (
              messages.map((m) => (
                <Message key={m.id} from={m.role}>
                  <MessageContent>
                    {m.parts.map((p, i) => {
                      if (p.type === "text") return m.role === "user" ? <span key={i}>{p.text}</span> : <MessageResponse key={i}>{p.text}</MessageResponse>;
                      if (isToolUIPart(p)) return (
                        <Tool key={i} defaultOpen={false}>
                          <ToolHeader {...(p.type === "dynamic-tool" ? { type: "dynamic-tool" as const, state: p.state, toolName: p.toolName } : { type: p.type as `tool-${string}`, state: p.state })} title="Looked up stats" />
                          <ToolContent><ToolOutput output={p.output} errorText={p.errorText} /></ToolContent>
                        </Tool>
                      );
                      return null;
                    })}
                  </MessageContent>
                </Message>
              ))
            )}
            {status === "submitted" && <p className="text-sm text-muted-foreground animate-pulse">Checking the stats…</p>}
            {error && <p className="text-sm text-destructive">The analyst couldn't answer right now. Please try again shortly.</p>}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput className="mt-2" onSubmit={(msg) => ask(msg.text ?? input)}>
          <PromptInputTextarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. How many runs has Ravi scored?" />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} disabled={!input.trim() && status === "ready"} />
          </PromptInputFooter>
        </PromptInput>
      </main>
    </div>
  );
};

export default CricketAnalyst;
