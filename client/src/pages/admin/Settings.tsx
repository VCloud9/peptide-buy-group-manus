import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Send, XCircle, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const WEBHOOK_EVENTS = [
  { key: "buy_live", label: "New Buy Live", desc: "Fires when a buy transitions to Gathering status" },
  { key: "moq_reached", label: "MOQ Reached", desc: "Fires when a buy transitions to Funded status" },
  { key: "test_results_posted", label: "Test Results Posted", desc: "Fires when a COA is published" },
  { key: "orders_shipped", label: "Orders Shipped", desc: "Fires when a buy transitions to Distributing status" },
] as const;

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
      </div>
    </AppLayout>
  );
}
