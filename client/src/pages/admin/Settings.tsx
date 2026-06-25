import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { ArrowUpDown, BookOpen, CheckCircle2, ChevronDown, ChevronRight, ExternalLink, RefreshCw, Send, XCircle, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const WEBHOOK_EVENTS = [
  { key: "buy_live", label: "New Buy Live", desc: "Fires when a buy transitions to Gathering status" },
  { key: "moq_reached", label: "MOQ Reached", desc: "Fires when a buy transitions to Funded status" },
  { key: "test_results_posted", label: "Test Results Posted", desc: "Fires when a COA is published" },
  { key: "orders_shipped", label: "Orders Shipped", desc: "Fires when a buy transitions to Distributing status" },
] as const;

// ─── GHL Setup Guide ─────────────────────────────────────────────────────────

function GhlSetupGuide() {
  const [open, setOpen] = useState(false);
  const webhookUrl = `${window.location.origin}/api/trpc/membership.approveFromGhl`;

  return (
    <div className="glass-card p-6 space-y-4">
      <button
        className="flex items-center justify-between w-full text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <BookOpen size={16} className="text-primary" />
          <div>
            <h3 className="font-semibold text-sm">GHL Membership Automation Setup Guide</h3>
            <p className="text-xs text-muted-foreground">Step-by-step instructions to wire up the approval workflow in GoHighLevel</p>
          </div>
        </div>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>

      {open && (
        <div className="space-y-6 pt-2 border-t border-border">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              When someone submits the Request Access form on the How to Join page, the platform creates a GHL contact
              and applies the <code className="bg-muted px-1 rounded">pbg-access-requested</code> tag. You then approve
              them in GHL by applying <code className="bg-muted px-1 rounded">pbg-approved</code>, which triggers a
              webhook back to this platform. The platform generates an invite code, writes it to the GHL contact's
              custom field, and applies <code className="bg-muted px-1 rounded">pbg-invite-sent</code> — which your
              GHL email workflow uses to send the welcome email automatically.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Step 1 — Create the Custom Field in GHL</h4>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>In GHL, go to <strong>Settings → Custom Fields → Contacts</strong></li>
              <li>Click <strong>Add Field</strong></li>
              <li>Field Label: <code className="bg-muted px-1 rounded">Invite Code</code></li>
              <li>Field Key: <code className="bg-muted px-1 rounded">pbg_invite_code</code> (must match exactly)</li>
              <li>Field Type: <strong>Text</strong></li>
              <li>Save the field</li>
            </ol>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Step 2 — Add the Pipeline Stage</h4>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Go to your <strong>Peptide Buy Group</strong> pipeline in GHL</li>
              <li>Add a new stage called <strong>Membership Requested</strong></li>
              <li>Copy the stage ID from the URL or pipeline settings</li>
              <li>Update <code className="bg-muted px-1 rounded">GHL_STAGES.MEMBERSHIP_REQUESTED</code> in <code className="bg-muted px-1 rounded">server/ghl/config.ts</code> with the real ID</li>
            </ol>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Step 3 — Create the Approval Workflow in GHL</h4>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Go to <strong>Automation → Workflows → Create Workflow</strong></li>
              <li>Name it: <strong>PBG — Approve Membership</strong></li>
              <li>Trigger: <strong>Contact Tag</strong> → Tag Added → <code className="bg-muted px-1 rounded">pbg-approved</code></li>
              <li>Action 1: <strong>Webhook</strong> → POST to the URL below</li>
              <li>Action 2: <strong>Send Email</strong> using the template below (fires after webhook completes)</li>
            </ol>
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Webhook URL (POST)</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1.5 rounded flex-1 break-all">{webhookUrl}</code>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 bg-background"
                  onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("Copied"); }}
                >
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Webhook body (JSON): <code className="bg-muted px-1 rounded">{'{"email": "{{contact.email}}", "name": "{{contact.name}}"}' }</code>
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Step 4 — Create the Welcome Email Template</h4>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>In GHL, go to <strong>Marketing → Emails → Templates</strong></li>
              <li>Create a new template named <strong>PBG Welcome + Invite Code</strong></li>
              <li>In the email body, use <code className="bg-muted px-1 rounded">{'{{'+'contact.pbg_invite_code'+'}}' }</code> to insert the invite code</li>
              <li>Include a link to the platform: <code className="bg-muted px-1 rounded">{window.location.origin}</code></li>
              <li>In your workflow (Step 3), set the Send Email action to use this template</li>
              <li>Set the trigger for the email action to: tag <code className="bg-muted px-1 rounded">pbg-invite-sent</code> is added</li>
            </ol>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Step 5 — All GHL Workflows to Build</h4>
            <p className="text-xs text-muted-foreground">Build these in GHL Automation → Workflows in the recommended order:</p>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1.5 pr-3 font-medium">#</th>
                    <th className="text-left py-1.5 pr-3 font-medium">Workflow Name</th>
                    <th className="text-left py-1.5 pr-3 font-medium">Trigger (Tag Added)</th>
                    <th className="text-left py-1.5 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground divide-y divide-border">
                  {[
                    ["1", "PBG — Approve Membership", "pbg-approved", "Webhook POST (see Step 3) → sends invite code to pbg_invite_code field"],
                    ["2", "PBG — Welcome Email", "pbg-invite-sent", "Send email using {{contact.pbg_invite_code}} — include platform URL + Skool link"],
                    ["3", "PBG — Payment Instructions", "pbg-payment-pending", "Send email with Zelle (ray@vcloud9.com) and Venmo (@ray-collazo) — ask member to include name + buy name in note"],
                    ["4", "PBG — Payment Confirmed", "pbg-payment-confirmed", "Send email confirming payment received — include {{contact.pbg_last_buy_name}} and {{contact.pbg_last_order_amount}}"],
                    ["5", "PBG — Shipping Notification", "pbg-shipped", "Send email with tracking info — include {{contact.pbg_last_tracking_number}} and {{contact.pbg_last_carrier}}"],
                    ["6", "PBG — New Access Request Alert", "pbg-access-requested", "Internal notification to you (email/SMS) — new membership request came in"],
                  ].map(([num, name, tag, action]) => (
                    <tr key={num}>
                      <td className="py-2 pr-3 text-muted-foreground/50">{num}</td>
                      <td className="py-2 pr-3 font-medium text-foreground">{name}</td>
                      <td className="py-2 pr-3"><code className="bg-muted px-1 rounded">{tag}</code></td>
                      <td className="py-2">{action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Step 6 — Tags Reference</h4>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1.5 pr-4 font-medium">Tag</th>
                    <th className="text-left py-1.5 font-medium">When it's applied</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground divide-y divide-border">
                  {[
                    ["pbg-access-requested", "Visitor submits the Request Access form"],
                    ["pbg-approved", "You apply this manually in GHL to approve the member"],
                    ["pbg-invite-sent", "Platform generates invite code — trigger for Welcome email"],
                    ["pbg-member", "Member redeems invite code and joins the platform"],
                    ["pbg-ordered", "Member places their first order"],
                    ["pbg-payment-pending", "Order moves to Payment Pending — trigger for payment instructions email"],
                    ["pbg-paid", "Payment confirmed internally (pipeline stage update)"],
                    ["pbg-payment-confirmed", "Admin clicks Mark Paid — trigger for payment confirmation email"],
                    ["pbg-shipped", "Order is shipped — trigger for shipping notification email"],
                    ["pbg-complete", "Order is marked Complete"],
                  ].map(([tag, desc]) => (
                    <tr key={tag}>
                      <td className="py-1.5 pr-4"><code className="bg-muted px-1 rounded">{tag}</code></td>
                      <td className="py-1.5">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Step 7 — Custom Fields to Create in GHL</h4>
            <p className="text-xs text-muted-foreground">Go to GHL Settings → Custom Fields → Contacts and create each field below (all Text type unless noted):</p>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1.5 pr-4 font-medium">Field Label</th>
                    <th className="text-left py-1.5 pr-4 font-medium">Field Key (must match exactly)</th>
                    <th className="text-left py-1.5 font-medium">Used in</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground divide-y divide-border">
                  {[
                    ["Invite Code", "pbg_invite_code", "Welcome email template"],
                    ["Last Buy Name", "pbg_last_buy_name", "Payment confirmed + shipping emails"],
                    ["Last Order Amount", "pbg_last_order_amount", "Payment confirmed email"],
                    ["Last Order Status", "pbg_last_order_status", "CRM reference"],
                    ["Last Tracking Number", "pbg_last_tracking_number", "Shipping notification email"],
                    ["Last Carrier", "pbg_last_carrier", "Shipping notification email"],
                    ["Total Orders", "pbg_total_orders", "CRM reference (Number type)"],
                    ["Total Spent", "pbg_total_spent", "CRM reference (Number type)"],
                    ["Member Since", "pbg_member_since", "CRM reference"],
                    ["Invite Code Used", "pbg_invite_code_used", "CRM reference — which code was redeemed"],
                    ["Last Order Date", "pbg_last_order_date", "CRM reference — date of most recent order"],
                    ["COA Available", "pbg_coa_available", "CRM reference — yes/no when COA is published"],
                  ].map(([label, key, usage]) => (
                    <tr key={key}>
                      <td className="py-1.5 pr-4 font-medium text-foreground">{label}</td>
                      <td className="py-1.5 pr-4"><code className="bg-muted px-1 rounded">{key}</code></td>
                      <td className="py-1.5">{usage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const bulkResync = trpc.ghl.bulkResyncAllMembers.useMutation({
    onSuccess: (r) => {
      toast.success(`Bulk resync complete: ${r.succeeded}/${r.total} succeeded${r.failed > 0 ? `, ${r.failed} failed` : "."}`);
      utils.ghl.getLogs.invalidate();
    },
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

        {/* GHL Bulk Resync */}
        <div className="glass-card p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">Resync All Members to GHL</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Re-pushes every member's contact, tags, and opportunity to GHL in one batch. Use after pipeline changes or field updates.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => bulkResync.mutate()}
            disabled={bulkResync.isPending}
          >
            <RefreshCw size={13} className={bulkResync.isPending ? "animate-spin" : ""} />
            {bulkResync.isPending ? "Syncing…" : "Resync All"}
          </Button>
        </div>

        {/* GHL Sync Logs */}
        <GhlSyncLogsPanel />

        {/* GHL Setup Guide */}
        <GhlSetupGuide />
      </div>
    </AppLayout>
  );
}
