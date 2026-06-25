import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Copy, RefreshCw, Search, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ─── Create Member Dialog ─────────────────────────────────────────────────────

function CreateMemberDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", skoolUsername: "" });
  const [result, setResult] = useState<{ inviteCode: string } | null>(null);

  const createMember = trpc.membership.createMember.useMutation({
    onSuccess: (data) => {
      setResult({ inviteCode: data.inviteCode });
      onCreated();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    createMember.mutate({
      name: form.name.trim(),
      email: form.email.trim(),
      skoolUsername: form.skoolUsername.trim() || undefined,
    });
  };

  const handleClose = () => {
    setOpen(false);
    setForm({ name: "", email: "", skoolUsername: "" });
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus size={14} className="mr-1.5" /> Add Member
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Member Manually</DialogTitle>
        </DialogHeader>
        {result ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <div>
                <p className="text-sm font-medium">Member created successfully</p>
                <p className="text-xs text-muted-foreground">Invite code generated and synced to GHL</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Invite Code</Label>
              <div className="flex items-center gap-2">
                <Input value={result.inviteCode} readOnly className="font-mono text-sm" />
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 bg-background"
                  onClick={() => {
                    navigator.clipboard.writeText(result.inviteCode);
                    toast.success("Copied to clipboard");
                  }}
                >
                  <Copy size={13} />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this code with the member. If GHL is configured, the code was also written to the{" "}
                <code className="text-xs bg-muted px-1 rounded">pbg_invite_code</code> custom field on their contact.
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">Done</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cm-name">Full Name <span className="text-destructive">*</span></Label>
              <Input
                id="cm-name"
                placeholder="Jane Smith"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cm-email">Email Address <span className="text-destructive">*</span></Label>
              <Input
                id="cm-email"
                type="email"
                placeholder="jane@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cm-skool">Skool Username <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="cm-skool"
                placeholder="skool_username"
                value={form.skoolUsername}
                onChange={(e) => setForm({ ...form, skoolUsername: e.target.value })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              An invite code will be generated automatically and synced to GHL. The member will need to enter it
              on the platform after signing in.
            </p>
            {createMember.error && (
              <p className="text-sm text-destructive">{createMember.error.message}</p>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1 bg-background" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={createMember.isPending}>
                {createMember.isPending ? "Creating..." : "Create Member"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Access Requests Tab ──────────────────────────────────────────────────────

function AccessRequestsTab() {
  const { data: requests, isLoading } = trpc.membership.listRequests.useQuery();

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    approved: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    invite_sent: "bg-green-500/10 text-green-600 border-green-500/20",
    rejected: "bg-red-500/10 text-red-600 border-red-500/20",
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-muted/30 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!requests?.length) {
    return (
      <div className="glass-card p-12 text-center space-y-2">
        <Users size={36} className="mx-auto text-muted-foreground/40" />
        <p className="text-muted-foreground text-sm">No access requests yet.</p>
        <p className="text-xs text-muted-foreground">
          Requests submitted via the{" "}
          <a href="/join" className="text-primary underline" target="_blank">How to Join</a>{" "}
          page will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="divide-y divide-border">
        {requests.map((req) => (
          <div key={req.id} className="flex items-start gap-4 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0 mt-0.5">
              {req.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{req.name}</p>
              <p className="text-xs text-muted-foreground">
                {req.email}
                {req.skoolUsername && ` · @${req.skoolUsername}`}
              </p>
              {req.message && (
                <p className="text-xs text-muted-foreground mt-1 italic">"{req.message}"</p>
              )}
              {req.inviteCode && (
                <p className="text-xs text-muted-foreground mt-1">
                  Code: <code className="bg-muted px-1 rounded font-mono">{req.inviteCode}</code>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground hidden sm:block">
                {new Date(req.createdAt).toLocaleDateString()}
              </span>
              <Badge
                variant="outline"
                className={`text-xs capitalize ${statusColor[req.status] ?? ""}`}
              >
                {req.status.replace("_", " ")}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminMembers() {
  const utils = trpc.useUtils();
  const { data: users, isLoading } = trpc.users.list.useQuery();
  const updateRole = trpc.users.updateRole.useMutation({
    onSuccess: () => { toast.success("Role updated."); utils.users.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const resyncMember = trpc.ghl.resyncMember.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Member synced to GHL successfully.");
      } else {
        toast.error("GHL sync completed with errors. Check sync logs.");
      }
      utils.ghl.getLogs.invalidate();
    },
    onError: (e) => toast.error(`GHL sync failed: ${e.message}`),
  });

  const [search, setSearch] = useState("");
  const [resyncingId, setResyncingId] = useState<number | null>(null);

  const filtered = users?.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      (u as any).skoolUsername?.toLowerCase().includes(q)
    );
  }) ?? [];

  const handleResync = (userId: number, userName: string | null) => {
    setResyncingId(userId);
    resyncMember.mutate(
      { userId },
      { onSettled: () => setResyncingId(null) }
    );
  };

  return (
    <AppLayout showAdmin>
      <TooltipProvider>
        <div className="container py-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Members</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {users?.length ?? 0} registered members
              </p>
            </div>
            <CreateMemberDialog onCreated={() => utils.membership.listRequests.invalidate()} />
          </div>

          <Tabs defaultValue="members">
            <TabsList>
              <TabsTrigger value="members">Registered Members</TabsTrigger>
              <TabsTrigger value="requests">Access Requests</TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="space-y-4 mt-4">
              {/* Search */}
              <div className="relative max-w-sm">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, Skool username..."
                  className="pl-9"
                />
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="glass-card p-12 text-center space-y-2">
                  <Users size={36} className="mx-auto text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">No members found.</p>
                </div>
              ) : (
                <div className="glass-card overflow-hidden">
                  <div className="divide-y divide-border">
                    {filtered.map((user) => (
                      <div key={user.id} className="flex items-center gap-4 px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                          {user.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{user.name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.email ?? "No email"}
                            {(user as any).skoolUsername && ` · @${(user as any).skoolUsername}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground hidden sm:block">
                            Joined {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-accent"
                                disabled={resyncingId === user.id}
                                onClick={() => handleResync(user.id, user.name)}
                              >
                                <RefreshCw
                                  size={13}
                                  className={resyncingId === user.id ? "animate-spin" : ""}
                                />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs">Resync to GHL</p>
                            </TooltipContent>
                          </Tooltip>
                          <Select
                            value={user.role}
                            onValueChange={(v) => {
                              if (confirm(`Change ${user.name ?? "this user"}'s role to ${v}?`)) {
                                updateRole.mutate({ userId: user.id, role: v as any });
                              }
                            }}
                          >
                            <SelectTrigger className="h-7 w-24 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">Member</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="owner">Owner</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="requests" className="mt-4">
              <AccessRequestsTab />
            </TabsContent>
          </Tabs>
        </div>
      </TooltipProvider>
    </AppLayout>
  );
}
