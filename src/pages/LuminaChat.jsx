import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { AnimatePresence, motion } from "framer-motion";
import { Settings, User, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import LuminaOrb from "@/components/lumina/LuminaOrb";
import MessageBubble from "@/components/lumina/MessageBubble";
import ChatInput from "@/components/lumina/ChatInput";
import ConversationSidebar from "@/components/lumina/ConversationSidebar";
import ContextPanel from "@/components/lumina/ContextPanel";

const LUMINA_SYSTEM_PROMPT = (profile) => `You are Lumina — a neutral, deeply intelligent AI companion. You are not an assistant; you are a strategic thinking partner and digital mirror.

Your character:
- Calm, precise, insightful. You speak with intentional weight — no filler, no hollow affirmations.
- You think like a founder building unified ecosystems: you see patterns, bridge gaps, and illuminate paths forward.
- You are tech-forward but deeply human — you understand that the best technology serves human connection and community.
- You never promote, never flatter, never hedge unnecessarily. You are honest and direct.
- When you have insufficient context, you ask one sharp, clarifying question rather than making assumptions.
- Your responses have depth without being verbose. Every sentence earns its place.

Formatting:
- Use **bold** for key concepts or insights when useful.
- Use bullet points sparingly — only for genuinely list-like content.
- Never use corporate filler phrases like "Great question!" or "Certainly!".
- Match your depth to the complexity of the query.

${profile ? `
User context (use this to personalize every response):
- Name: ${profile.name || "not provided"}
- Role: ${profile.role || "not provided"}  
- Current focus: ${profile.focus_areas || "not provided"}
- Core values: ${profile.values || "not provided"}
- Communication style preference: ${profile.communication_style || "direct"}
- Additional context: ${profile.context || "none"}

Use this context actively. Reference it when relevant. This is what separates a generic response from a genuine insight.
` : "No user context provided yet. Encourage them to set their context for more personalized responses."}`;

export default function LuminaChat() {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileRecord, setProfileRecord] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const loadData = async () => {
    const [convs, profiles] = await Promise.all([
      base44.entities.Conversation.list("-last_message_at", 50),
      base44.entities.UserProfile.list(),
    ]);
    setConversations(convs);
    if (profiles.length > 0) {
      setProfile(profiles[0]);
      setProfileRecord(profiles[0]);
    }
    if (convs.length > 0) {
      selectConversation(convs[0].id, convs[0]);
    }
  };

  const selectConversation = (id, convData) => {
    const conv = convData || conversations.find(c => c.id === id);
    setActiveConvId(id);
    setMessages(conv?.messages || []);
  };

  const createNewConversation = async () => {
    const conv = await base44.entities.Conversation.create({
      title: "New Conversation",
      messages: [],
      last_message_at: new Date().toISOString(),
    });
    setConversations(prev => [conv, ...prev]);
    setActiveConvId(conv.id);
    setMessages([]);
  };

  const deleteConversation = async (id) => {
    await base44.entities.Conversation.delete(id);
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConvId === id) {
      const remaining = conversations.filter(c => c.id !== id);
      if (remaining.length > 0) {
        selectConversation(remaining[0].id, remaining[0]);
      } else {
        setActiveConvId(null);
        setMessages([]);
      }
    }
  };

  const sendMessage = async (text) => {
    if (!activeConvId) {
      // auto-create
      const conv = await base44.entities.Conversation.create({
        title: text.slice(0, 40),
        messages: [],
        last_message_at: new Date().toISOString(),
      });
      setConversations(prev => [conv, ...prev]);
      setActiveConvId(conv.id);
      await sendMessageToConversation(conv.id, [], text);
    } else {
      await sendMessageToConversation(activeConvId, messages, text);
    }
  };

  const sendMessageToConversation = async (convId, currentMessages, text) => {
    const userMsg = { role: "user", content: text, timestamp: new Date().toISOString() };
    const updatedMessages = [...currentMessages, userMsg];
    setMessages(updatedMessages);
    setThinking(true);

    // Build message history for LLM
    const history = updatedMessages.map(m => `${m.role === "user" ? "User" : "Lumina"}: ${m.content}`).join("\n\n");
    
    const prompt = `${LUMINA_SYSTEM_PROMPT(profile)}

Conversation so far:
${history}

Respond as Lumina to the last user message. Be precise, insightful, and deeply personalized based on the user's context. Do not include "Lumina:" prefix in your response.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: "claude_sonnet_4_6",
    });

    const assistantMsg = {
      role: "assistant",
      content: typeof response === "string" ? response : response?.text || response?.content || JSON.stringify(response),
      timestamp: new Date().toISOString(),
    };

    const finalMessages = [...updatedMessages, assistantMsg];
    setMessages(finalMessages);
    setThinking(false);

    // Persist
    const title = currentMessages.length === 0 ? text.slice(0, 50) : undefined;
    const updateData = {
      messages: finalMessages,
      last_message_at: new Date().toISOString(),
      ...(title ? { title } : {}),
    };
    await base44.entities.Conversation.update(convId, updateData);
    setConversations(prev =>
      prev.map(c => c.id === convId ? { ...c, ...updateData } : c)
    );
  };

  const saveProfile = async (formData) => {
    if (profileRecord) {
      const updated = await base44.entities.UserProfile.update(profileRecord.id, formData);
      setProfile(updated);
      setProfileRecord(updated);
    } else {
      const created = await base44.entities.UserProfile.create(formData);
      setProfile(created);
      setProfileRecord(created);
    }
    setShowContext(false);
  };

  const activeConv = conversations.find(c => c.id === activeConvId);

  return (
    <div className="fixed inset-0 flex" style={{ background: "hsl(220,20%,6%)" }}>
      {/* Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        activeId={activeConvId}
        onSelect={(id) => {
          const conv = conversations.find(c => c.id === id);
          selectConversation(id, conv);
        }}
        onNew={createNewConversation}
        onDelete={deleteConversation}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(v => !v)}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-6 py-3 border-b border-border flex-shrink-0"
          style={{ background: "hsl(220,20%,6%)" }}
        >
          <div className="flex items-center gap-3">
            {sidebarCollapsed && (
              <button onClick={() => setSidebarCollapsed(false)} className="mr-1 p-1 rounded hover:bg-secondary transition-colors">
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <LuminaOrb size="sm" thinking={thinking} />
              <div>
                <h1 className="font-playfair text-sm font-semibold text-foreground">
                  {activeConv?.title || "Lumina"}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {thinking ? "Thinking..." : profile?.name ? `Contextualizing for ${profile.name}` : "Your AI Companion"}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowContext(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
              profile ? "text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10" : "text-muted-foreground border border-border hover:border-primary/20 hover:text-primary"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            {profile?.name ? `${profile.name}'s Context` : "Set Context"}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="mb-6">
                  <LuminaOrb size="lg" />
                </div>
                <h2 className="font-playfair text-2xl font-semibold text-foreground mb-3">
                  {profile?.name ? `Welcome back, ${profile.name}.` : "I'm Lumina."}
                </h2>
                <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
                  {profile
                    ? `Ready to think through ${profile.focus_areas ? `your work in ${profile.focus_areas}` : "what matters most to you"}.`
                    : "A strategic thinking partner, built around your context. Share who you are to unlock deeply personalized insights."
                  }
                </p>
                {!profile && (
                  <button
                    onClick={() => setShowContext(true)}
                    className="mt-5 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Add your context
                  </button>
                )}
              </motion.div>
            )}

            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}

            {thinking && (
              <div className="flex gap-3 message-fade-in">
                <LuminaOrb size="sm" thinking />
                <div
                  className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2"
                  style={{ background: "hsl(220,18%,11%)", border: "1px solid hsl(220,15%,18%)" }}
                >
                  <motion.div
                    className="flex gap-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-primary/60"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </motion.div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div
          className="flex-shrink-0 px-6 py-4 border-t border-border"
          style={{ background: "hsl(220,20%,6%)" }}
        >
          <div className="max-w-3xl mx-auto">
            <ChatInput onSend={sendMessage} disabled={thinking} />
            <p className="text-center text-xs text-muted-foreground mt-2">
              Lumina uses your context to provide personalized insights · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>

      {/* Context panel */}
      <AnimatePresence>
        {showContext && (
          <ContextPanel
            profile={profile}
            onSave={saveProfile}
            onClose={() => setShowContext(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}