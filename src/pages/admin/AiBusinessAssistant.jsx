import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, RotateCcw, ShieldCheck } from "lucide-react";
import AdminPage from "../../components/admin/AdminPage";
import AdminPanel from "../../components/admin/AdminPanel";
import AiBusinessMessage from "../../components/aiAssistants/AiBusinessMessage";
import AiComposer from "../../components/aiAssistants/AiComposer";
import AiConversationLog, { AiUserBubble } from "../../components/aiAssistants/AiConversationLog";
import AiQuickPrompts from "../../components/aiAssistants/AiQuickPrompts";
import AiThinkingIndicator from "../../components/aiAssistants/AiThinkingIndicator";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { useOrder } from "../../context/OrderContext";
import { useInventory } from "../../context/InventoryContext";
import { useWorkforce } from "../../context/WorkforceContext";
import { AtelierButton } from "../../design-system";
import aiService, { AI_PROVIDER_LABEL, isMockAiProvider } from "../../services/ai/aiService";
import { AI_SESSION_SCOPES, clearAiSession, loadAiSession, saveAiSession } from "../../services/ai/aiSessionStore";
import { buildBusinessResponse } from "../../services/ai/shared/aiResponseBuilder";
import {
  AI_BUSINESS_BRAND,
  AI_BUSINESS_GREETING,
  AI_BUSINESS_QUICK_QUESTIONS,
} from "../../services/ai/business/aiBusinessMockData";
import { resolveBusinessTopic } from "../../services/ai/business/aiBusinessService";
import { ANALYTICS_PRESETS, ANALYTICS_PRESET_OPTIONS } from "../../services/analytics/dateRange";
import {
  ACTIVITY_ACTIONS,
  describeActor,
  loadActivity,
  recordActivity,
} from "../../services/employees/activityService";

const PRESET_OPTIONS = ANALYTICS_PRESET_OPTIONS.filter((option) => option.id !== ANALYTICS_PRESETS.CUSTOM);

const timeLabel = (iso) => {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

const greetingEnvelope = (name) =>
  buildBusinessResponse({
    type: "GREETING",
    headline: "The business, in conversation",
    text: AI_BUSINESS_GREETING(name),
    suggestions: ["Give me today's business summary.", "What should I focus on today?", "Which products are low in stock?"],
  });

export default function AiBusinessAssistant() {
  const { admin, isAuthenticated, isSuperAdmin } = useAdminAuth();
  const { allOrders } = useOrder();
  const inventory = useInventory();
  const { revision: workforceRevision } = useWorkforce();

  const adminName = admin?.name || admin?.firstName || null;
  const adminKey = admin?.adminId ?? "admin";

  const [messages, setMessages] = useState(() => loadAiSession(AI_SESSION_SCOPES.BUSINESS, adminKey));
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [preset, setPreset] = useState(ANALYTICS_PRESETS.LAST_30);
  const logRef = useRef(null);

  useEffect(() => {
    const previous = document.title;
    document.title = "AI Business Assistant — Admin Portal";
    return () => {
      document.title = previous;
    };
  }, []);

  useEffect(() => {
    saveAiSession(AI_SESSION_SCOPES.BUSINESS, adminKey, messages);
  }, [messages, adminKey]);

  useEffect(() => {
    setMessages((current) => (current.length ? current : [greetingEnvelope(adminName)]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminKey]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking]);

  const actor = useMemo(
    () => ({ adminId: admin?.adminId, name: adminName ?? undefined }),
    [admin?.adminId, adminName]
  );

  const send = useCallback(
    async (rawQuestion) => {
      const question = String(rawQuestion || "").trim();
      if (!question || thinking || !isSuperAdmin) return;
      setError("");
      setDraft("");
      setMessages((current) => [
        ...current,
        { id: `user-${Date.now().toString(36)}`, role: "user", assistant: "business", text: question, createdAt: new Date().toISOString() },
      ]);
      setThinking(true);
      setStage("Understanding your question");

      const topic = resolveBusinessTopic(question);
      recordActivity(loadActivity(), {
        ...describeActor(actor),
        action: ACTIVITY_ACTIONS.AI_BUSINESS_QUERY,
        summary: `Asked the AI Business Assistant about ${topic.toLowerCase().replace(/_/g, " ")}`,
      });

      try {
        const response = await aiService.askBusinessAssistant({
          question,
          orders: allOrders,
          periodInput: { preset },
          access: { isAuthenticated, isSuperAdmin },
          onStage: (progress) => setStage(progress?.message || ""),
        });

        recordActivity(loadActivity(), {
          ...describeActor(actor),
          action: ACTIVITY_ACTIONS.AI_BUSINESS_INSIGHT_VIEWED,
          summary: `Reviewed an AI business insight (${String(response?.type ?? "insight").toLowerCase().replace(/_/g, " ")})`,
        });

        setMessages((current) => [...current, response]);
      } catch (progress) {
        if (progress?.name === "AbortError") return;
        setError("The insight could not be prepared. Please ask again.");
      } finally {
        setThinking(false);
        setStage("");
      }
    },
    [thinking, isSuperAdmin, allOrders, preset, isAuthenticated, actor]
  );

  const startNewConversation = useCallback(() => {
    clearAiSession(AI_SESSION_SCOPES.BUSINESS, adminKey);
    setMessages([greetingEnvelope(adminName)]);
  }, [adminKey, adminName]);

  const onActionOpened = useCallback(
    (action) => {
      recordActivity(loadActivity(), {
        ...describeActor(actor),
        action: ACTIVITY_ACTIONS.AI_BUSINESS_ACTION_OPENED,
        summary: `Opened ${action?.label ?? "a surface"} from the AI Business Assistant`,
      });
    },
    [actor]
  );

  if (!isSuperAdmin) {
    return (
      <AdminPage eyebrow="Business intelligence" title="AI Business Assistant">
        <AdminPanel title="Access restricted">
          <p className="flex items-center gap-2 font-ui text-sm text-graphite">
            <ShieldCheck size={15} aria-hidden="true" className="text-accent" />
            The Business Assistant is available to authorised administration roles only.
          </p>
        </AdminPanel>
      </AdminPage>
    );
  }

  return (
    <AdminPage
      eyebrow="Business intelligence"
      title={
        <>
          AI Business <span className="italic text-accent">Assistant.</span>
        </>
      }
      description={`${AI_BUSINESS_BRAND.tagline}. Reads the live orders, inventory, returns, offers, customers and workforce registers — and never invents a number.`}
      actions={
        <>
          {isMockAiProvider() ? (
            <p className="border border-mist/80 bg-surface/40 px-3 py-2 font-ui text-[9px] uppercase tracking-[.16em] text-taupe">
              Demo assistant · deterministic
            </p>
          ) : null}
          <AtelierButton variant="outline" size="chip" onClick={startNewConversation}>
            <RotateCcw size={11} aria-hidden="true" /> New conversation
          </AtelierButton>
        </>
      }
    >
      <div className="space-y-6">
        <AdminPanel
          eyebrow="Analysis period"
          title="Ask about the business"
          action={
            <div className="flex items-center gap-2">
              <label htmlFor="ai-business-period" className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">
                Period
              </label>
              <select
                id="ai-business-period"
                value={preset}
                onChange={(event) => setPreset(event.target.value)}
                className="border border-mist bg-ivory px-3 py-2 font-ui text-xs text-ink focus:border-ink focus:outline-none"
              >
                {PRESET_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          }
        >
          <AiComposer
            value={draft}
            onChange={setDraft}
            onSubmit={send}
            busy={thinking}
            label="Ask the AI Business Assistant about sales, inventory, returns, offers, customers or the workforce"
            placeholder="Give me today's business summary…"
            submitLabel="Analyse"
            hint="Press Enter to send"
          />
          <div className="mt-4">
            <AiQuickPrompts
              prompts={AI_BUSINESS_QUICK_QUESTIONS}
              onPick={send}
              disabled={thinking}
              ariaLabel="Suggested business questions"
            />
          </div>
          <p className="mt-3 font-ui text-[10px] uppercase tracking-[.14em] text-taupe">
            {AI_PROVIDER_LABEL} · numbers come from the existing business repositories
          </p>
        </AdminPanel>

        <section aria-label="Business insights conversation" className="space-y-4">
          <AiConversationLog ref={logRef} ariaLabel="AI business conversation" className="max-h-[640px] min-h-[320px]">
            {messages.map((message) =>
              message.role === "user" ? (
                <AiUserBubble key={message.id} text={message.text} at={timeLabel(message.createdAt)} />
              ) : (
                <AiBusinessMessage
                  key={message.id}
                  message={message}
                  onSuggestion={send}
                  onActionOpened={onActionOpened}
                />
              )
            )}
            {thinking ? <AiThinkingIndicator stage={stage} label="PRATIKSHYA AI is analysing business records" /> : null}
            {error ? (
              <p role="alert" className="border border-accent/40 bg-accent/5 px-4 py-3 font-ui text-sm text-accent">
                {error}
              </p>
            ) : null}
          </AiConversationLog>

          <p className="flex items-center gap-2 font-ui text-[10px] uppercase tracking-[.16em] text-taupe">
            <BarChart3 size={12} aria-hidden="true" />
            Insights refresh with the registers — inventory revision {inventory.revision}, workforce revision {workforceRevision}.
          </p>
        </section>
      </div>
    </AdminPage>
  );
}
