import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { ArrowUpDown, CheckCircle2, ExternalLink, RefreshCw, Send, XCircle, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const WEBHOOK_EVENTS = [
  { key: "buy_live", label: "New Buy Live", desc: "Fires when a buy transitions to Gathering status" },
  { key: "moq_reached", label: "MOQ Reached", desc: "Fires when a buy transitions to Funded status" },
  { key: "test_results_posted", label: "Test Results Posted", desc: "Fires when a COA is published" },
  { key: "orders_shipped", label: "Orders Shipped", desc: "Fires when a buy transitions to Distributing status" },
] as const;

function GhlSyncLogsPanel() {
  const utils = trpc.useUtils();
  const { data: ghlLogs, isLoading } = trpc.ghl.getLogs.useQuery({ limit: 20 });

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowUpDown size={14} className="text-accent" />
          <h2 className="font-semibold text-sm">GHL Sync Logs</h2>
          <span className="text-xs text-muted-foreground">(last 20 events)</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={() => utils.ghl.getLogs.invalidate()}
        >
          <RefreshCw size={12} />
        </Button>
      </div>
      {isLoading ? (
        <div className="p-6 text-center text-xs text-muted-foreground">Loading...</div>
      ) : !ghlLogs || ghlLogs.length === 0 ? (
        <div className="p-6 text-center text-xs text-muted-foreground">No GHL sync events yet.</div>
      ) : (
        <div className="divide-y divide-border max-h-72 overflow-y-auto">
          {ghlLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 px-4 py-2.5">
              {log.success ? (
                <CheckCircle2 size={14} className="text-accent shrink-0 mt-0.5" />
              ) : (
                <XCircle size={14} className="text-destructive shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium">{log.eventType.replace(/_/g, " ")}</p>
                  <span className={`text-xs px-1.5 py-0 rounded-full font-medium ${
                    log.direction === "outbound" ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"
                  }`}>{log.direction}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{log.email ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminSettings() {
  const utils = trpc.useUtils();
  const { data: config, isLoading } = trpc.skool.getConfig.useQuery();
  const { data: logs } = trpc.skool.getLogs.useQuery();

  const saveConfig = trpc.skool.saveConfig.useMutation({
    onSuccess: () => { toast.success("Webhook config saved."); utils.skool.getConfig.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const testFire = trpc.skool.testFire.useMutation({
    onSuccess: () => { toast.success("Test webhook fired."); utils.skool.getLogs.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const [webhookUrl, setWebhookUrl] = useState("");
  const [groupSlug, setGroupSlug] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (config) {
      setWebhookUrl(config.webhookUrl ?? "");
      setGroupSlug(config.groupSlug ?? "");
      setIsActive(config.isActive ?? true);
    }
  }, [config]);

  return (
    <AppLayout showAdmin>
      <div className="container py-8 max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Platform configuration and integrations</p>
        </div>

        {/* Skool Webhook */}
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-primary" />
            <h2 className="font-semibold">Skool Community Webhook</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Configure a webhook URL to receive notifications in your Skool community when key events occur.
            Skool supports Zapier/Make.com webhooks — create a Zap that posts to your community when this webhook fires.
          </p>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Webhook URL</Label>
              <Input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                type="url"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Skool Group Slug (optional)</Label>
              <Input
                value={groupSlug}
                onChange={(e) => setGroupSlug(e.target.value)}
                placeholder="my-peptide-community"
              />
              <p className="text-xs text-muted-foreground">Used as metadata in the webhook payload.</p>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Webhook Active</Label>
            </div>
          </div>

          <Button
            onClick={() => saveConfig.mutate({ webhookUrl, groupSlug: groupSlug || undefined, isActive })}
            disabled={saveConfig.isPending || !webhookUrl}
          >
            {saveConfig.isPending ? "Saving..." : "Save Configuration"}
          </Button>
        </div>

        {/* Triggered Events */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="font-semibold text-sm">Webhook Events</h2>
          <p className="text-xs text-muted-foreground">
            These four events automatically trigger a webhook notification to your Skool community.
          </p>
          <div className="space-y-3">
            {WEBHOOK_EVENTS.map((ev) => (
              <div key={ev.key} className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/20">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{ev.label}</p>
                  <p className="text-xs text-muted-foreground">{ev.desc}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 gap-1.5 text-xs h-7"
                  onClick={() => testFire.mutate({ event: ev.key })}
                  disabled={testFire.isPending || !config?.webhookUrl}
                >
                  <Send size={11} /> Test
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* GHL Integration Status */}
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-accent" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h2 className="font-semibold">GoHighLevel (GHL) Integration</h2>
            <span className="ml-auto text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium">Active</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The platform automatically syncs member activity to your <strong>Certapep</strong> GHL sub-account.
            Contacts are upserted by email, tagged, and moved through the <strong>Peptide Buy Group</strong> pipeline.
          </p>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sync Events</p>
            {[
              { label: "Member Signup", desc: "Creates/updates contact, applies pbg-member tag, opens pipeline opportunity at \"Member Registered\"" },
              { label: "Invite Code Redeemed", desc: "Applies pbg-verified tag, logs invite code used" },
              { label: "Order Placed", desc: "Applies pbg-ordered tag, updates last buy name, order total, and total spent. Moves pipeline to \"Order Committed\"" },
              { label: "Payment Received", desc: "Applies pbg-paid tag, updates total spent. Moves pipeline to \"Payment Received\"" },
              { label: "Order Placed with Supplier", desc: "Moves pipeline to \"Order Placed with Supplier\"" },
              { label: "Testing Started", desc: "Moves pipeline to \"Testing in Progress\"" },
              { label: "COA Published", desc: "Applies pbg-coa-available tag, sets COA Available field. Moves pipeline to \"Ready to Ship\"" },
              { label: "Order Shipped", desc: "Applies pbg-shipped tag, logs tracking number and carrier. Moves pipeline to \"Shipped\"" },
              { label: "Order Complete", desc: "Applies pbg-complete tag. Moves pipeline to \"Completed\"" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                <CheckCircle2 size={14} className="text-accent mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Inbound Webhook (Two-Way Sync)</p>
            <p className="text-xs text-muted-foreground">Register this URL in GHL under <em>Settings → Webhooks</em> to receive contact updates back from GHL:</p>
            <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
              <code className="text-xs flex-1 break-all">{window.location.origin}/api/ghl/webhook</code>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 shrink-0"
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/api/ghl/webhook`); toast.success("Webhook URL copied"); }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Optionally set <code className="bg-muted/40 px-1 rounded">GHL_WEBHOOK_SECRET</code> in your environment to validate incoming requests.</p>
          </div>
        </div>

        {/* Webhook Logs */}
        {logs && logs.length > 0 && (
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold text-sm">Recent Webhook Logs</h2>
            </div>
            <div className="divide-y divide-border max-h-64 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-3 px-4 py-2.5">
                  {log.success ? (
                    <CheckCircle2 size={14} className="text-accent shrink-0" />
                  ) : (
                    <XCircle size={14} className="text-destructive shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{log.event.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.responseStatus ? `HTTP ${log.responseStatus}` : "No response"} &middot;{" "}
                      {new Date(log.sentAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GHL Sync Logs */}
        <GhlSyncLogsPanel />
      </div>
    </AppLayout>
  );
}
