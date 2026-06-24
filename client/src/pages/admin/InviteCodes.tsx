import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, KeyRound, Plus, ShieldOff, Users } from "lucide-react";
import { format } from "date-fns";

export default function InviteCodesPage() {
  const utils = trpc.useUtils();
  const { data: codes = [], isLoading } = trpc.inviteCodes.list.useQuery();

  const [createOpen, setCreateOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const createMutation = trpc.inviteCodes.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Invite code created: ${data.code}`);
      utils.inviteCodes.list.invalidate();
      setCreateOpen(false);
      setLabel("");
      setMaxUses("");
      setExpiresAt("");
    },
    onError: (err) => toast.error(err.message),
  });

  const revokeMutation = trpc.inviteCodes.revoke.useMutation({
    onSuccess: () => {
      toast.success("Invite code revoked");
      utils.inviteCodes.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard");
  };

  const activeCodes = codes.filter((c) => c.isActive);
  const revokedCodes = codes.filter((c) => !c.isActive);

  return (
    <AppLayout>
      <div className="container py-8 max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <KeyRound size={22} className="text-primary" />
              Invite Codes
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Generate and manage access codes for new members
            </p>
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus size={15} />
                New Code
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Generate Invite Code</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Label (optional)</Label>
                  <Input
                    placeholder="e.g. Skool batch June 2026"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Max Uses (leave blank for unlimited)</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="e.g. 50"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Expires At (optional)</Label>
                  <Input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() =>
                    createMutation.mutate({
                      label: label || undefined,
                      maxUses: maxUses ? parseInt(maxUses) : undefined,
                      expiresAt: expiresAt || undefined,
                    })
                  }
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Generating…" : "Generate Code"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-card/60">
            <CardContent className="pt-5 pb-4">
              <div className="text-2xl font-bold text-primary">{activeCodes.length}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Active Codes</div>
            </CardContent>
          </Card>
          <Card className="bg-card/60">
            <CardContent className="pt-5 pb-4">
              <div className="text-2xl font-bold">
                {codes.reduce((sum, c) => sum + c.usedCount, 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Total Redemptions</div>
            </CardContent>
          </Card>
          <Card className="bg-card/60">
            <CardContent className="pt-5 pb-4">
              <div className="text-2xl font-bold text-muted-foreground">{revokedCodes.length}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Revoked Codes</div>
            </CardContent>
          </Card>
        </div>

        {/* Active codes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Codes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground py-4 text-center">Loading…</div>
            ) : activeCodes.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                No active invite codes. Generate one above.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {activeCodes.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between py-3 gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <code className="font-mono text-sm font-semibold tracking-widest text-foreground bg-muted px-2 py-1 rounded">
                        {c.code}
                      </code>
                      <div className="min-w-0">
                        {c.label && (
                          <div className="text-sm font-medium truncate">{c.label}</div>
                        )}
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                          <Users size={11} />
                          {c.usedCount}
                          {c.maxUses !== null ? ` / ${c.maxUses}` : " uses"}
                          {c.expiresAt && (
                            <span>· Expires {format(new Date(c.expiresAt), "MMM d, yyyy")}</span>
                          )}
                          <span>· Created {format(new Date(c.createdAt), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1"
                        onClick={() => copyCode(c.code)}
                      >
                        <Copy size={12} />
                        Copy
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Revoke code ${c.code}? This cannot be undone.`)) {
                            revokeMutation.mutate({ id: c.id });
                          }
                        }}
                      >
                        <ShieldOff size={12} />
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revoked codes */}
        {revokedCodes.length > 0 && (
          <Card className="opacity-60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-muted-foreground">Revoked Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {revokedCodes.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-3 gap-4">
                    <div className="flex items-center gap-3">
                      <code className="font-mono text-sm tracking-widest text-muted-foreground line-through bg-muted px-2 py-1 rounded">
                        {c.code}
                      </code>
                      {c.label && (
                        <span className="text-sm text-muted-foreground">{c.label}</span>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs">Revoked</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
