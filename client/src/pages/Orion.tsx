import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Send, User, Bot, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Orion() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello, I am ORION. Your elite portfolio intelligence assistant. How can I assist your investment strategy today?"
    }
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const mutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/orion/chat", {
        message,
        history: messages.slice(-10) // Only send last 10 messages for context
      });
      return res.json() as Promise<{ response: string }>;
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    }
  });

  const handleSend = () => {
    if (!input.trim() || mutation.isPending) return;
    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    mutation.mutate(userMessage);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] pt-20 max-w-5xl mx-auto px-4 sm:px-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20">
          <Brain className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ORION</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-primary" />
            Portfolio Intelligence AI
          </p>
        </div>
      </div>

      <Card className="flex-1 min-h-0 flex flex-col bg-card/50 backdrop-blur-md border-border/50 shadow-xl rounded-3xl overflow-hidden mb-6">
        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          <div className="space-y-6">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`flex flex-col gap-2 max-w-[80%] ${msg.role === "user" ? "items-end" : ""}`}>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === "user" 
                      ? "bg-primary text-primary-foreground rounded-tr-none" 
                      : "bg-white dark:bg-zinc-900 border border-border/50 rounded-tl-none"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            {mutation.isPending && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-border/50 px-4 py-2.5 rounded-2xl rounded-tl-none flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border/50 bg-background/50">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Orion about your portfolio..."
              className="bg-white dark:bg-zinc-900 border-border/50 rounded-2xl h-12 px-6 focus-visible:ring-primary/20"
              disabled={mutation.isPending}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="h-12 w-12 rounded-2xl shadow-lg shadow-primary/20"
              disabled={mutation.isPending || !input.trim()}
            >
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
