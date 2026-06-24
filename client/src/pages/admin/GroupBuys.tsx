import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { MoqProgress } from "@/components/MoqProgress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Plus, Pencil, Trash2, Settings2, Copy } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

const EMPTY_FORM = {
  title: "",
  description: "",
  moqTarget: "",
  participantCap: "",
  endDate: "",
  vendorName: "",
  vendorCountry: "",
  notes: "",
};

type FormState = typeof EMPTY_FORM;

function BuyFormFields({ form, set }: { form: FormState; set: (f: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void }) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label>Title *</Label>
        <Input value={form.title} onChange={set("title")} placeholder="Q3 2025 Peptide Buy" />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea value={form.description} onChange={set("description")} placeholder="Details about this buy..." rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>MOQ Target ($) *</Label>
          <Input type="number" value={form.moqTarget} onChange={set("moqTarget")} placeholder="5000" />
        </div>
        <div className="space-y-1.5">
          <Label>Participant Cap</Label>
          <Input type="number" value={form.participantCap} onChange={set("participantCap")} placeholder="100" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Vendor Name</Label>
          <Input value={form.vendorName} onChange={set("vendorName")} placeholder="Supplier Co." />
        </div>
        <div className="space-y-1.5">
          <Label>Vendor Country</Label>
          <Input value={form.vendorCountry} onChange={set("vendorCountry")} placeholder="China" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Close Date</Label>
        <Input type="date" value={form.endDate} onChange={set("endDate")} />
      </div>
      <div className="space-y-1.5">
        <Label>Internal Notes</Label>
        <Textarea value={form.notes} onChange={set("notes")} placeholder="Admin-only notes..." rows={2} />
      </div>
    </div>
  );
}

export default function AdminGroupBuys() {
  const utils = trpc.useUtils();
  const { data: summary, isLoading } = trpc.reporting.allBuysSummary.useQuery();

  const createBuy = trpc.groupBuys.create.useMutation({
    onSuccess: () => {
      toast.success("Group buy created.");
      utils.reporting.allBuysSummary.invalidate();
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateBuy = trpc.groupBuys.update.useMutation({
    onSuccess: () => {
      toast.success("Group buy updated.");
      utils.reporting.allBuysSummary.invalidate();
      setEditOpen(false);
      setEditId(null);
      setForm(EMPTY_FORM);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteBuy = trpc.groupBuys.delete.useMutation({
    onSuccess: () => { toast.success("Deleted."); utils.reporting.allBuysSummary.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const duplicateBuy = trpc.groupBuys.duplicate.useMutation({
    onSuccess: (data) => {
      toast.success("Buy duplicated as a new Draft.");
      utils.reporting.allBuysSummary.invalidate();
      setDuplicateOpen(false);
      setDuplicateId(null);
      setDuplicateTitle("");
    },
    onError: (e) => toast.error(e.message),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateId, setDuplicateId] = useState<number | null>(null);
  const [duplicateTitle, setDuplicateTitle] = useState("");

  const set = (f: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const handleCreate = () => {
    if (!form.title || !form.moqTarget) { toast.error("Title and MOQ Target are required."); return; }
    createBuy.mutate({
      title: form.title,
      description: form.description || undefined,
      moqTarget: form.moqTarget,
      participantCap: form.participantCap ? parseInt(form.participantCap) : undefined,
      endDate: form.endDate || undefined,
      vendorName: form.vendorName || undefined,
      vendorCountry: form.vendorCountry || undefined,
      notes: form.notes || undefined,
    });
  };

  const openEdit = (buy: any) => {
    setEditId(buy.id);
    setForm({
      title: buy.title ?? "",
      description: buy.description ?? "",
      moqTarget: String(parseFloat(buy.moqTarget as string) || ""),
      participantCap: buy.participantCap ? String(buy.participantCap) : "",
      endDate: buy.endDate ? new Date(buy.endDate).toISOString().split("T")[0] : "",
      vendorName: buy.vendorName ?? "",
      vendorCountry: buy.vendorCountry ?? "",
      notes: buy.notes ?? "",
    });
    setEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editId) return;
    if (!form.title || !form.moqTarget) { toast.error("Title and MOQ Target are required."); return; }
    updateBuy.mutate({
      id: editId,
      title: form.title,
      description: form.description || undefined,
      moqTarget: form.moqTarget,
      participantCap: form.participantCap ? parseInt(form.participantCap) : null,
      endDate: form.endDate || null,
      vendorName: form.vendorName || undefined,
      vendorCountry: form.vendorCountry || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <AppLayout showAdmin>
      <div className="container py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Group Buys</h1>
            <p className="text-muted-foreground text-sm mt-1">Create and manage all group buys</p>
          </div>
          <Button size="sm" className="gap-2" onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}>
            <Plus size={14} /> New Buy
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted/30 rounded-xl animate-pulse" />)}
          </div>
        ) : !summary || summary.length === 0 ? (
          <div className="glass-card p-12 text-center space-y-3">
            <p className="text-muted-foreground">No group buys yet.</p>
            <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true); }}>Create First Buy</Button>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="divide-y divide-border">
              {summary.map(({ buy, stats }) => (
                <div key={buy.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/10 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link href={`/admin/group-buys/${buy.id}`}>
                        <span className="font-medium text-sm hover:text-primary transition-colors cursor-pointer">{buy.title}</span>
                      </Link>
                      <StatusBadge status={buy.status} type="buy" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stats.participantCount} participants &middot; ${stats.totalCommitted.toFixed(0)} committed &middot; {stats.paidCount} paid
                      {buy.vendorName && ` · ${buy.vendorName}`}
                      {buy.vendorCountry && `, ${buy.vendorCountry}`}
                    </p>
                    <div className="mt-2 max-w-xs">
                      <MoqProgress
                        current={stats.totalCommitted}
                        target={parseFloat(buy.moqTarget as string)}
                        showLabel={false}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => openEdit(buy)}
                      title="Edit buy details"
                    >
                      <Settings2 size={14} />
                    </Button>
                    <Button asChild variant="ghost" size="sm" title="Manage buy">
                      <Link href={`/admin/group-buys/${buy.id}`}><Pencil size={14} /></Link>
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      title="Duplicate buy"
                      onClick={() => {
                        setDuplicateId(buy.id);
                        setDuplicateTitle(`${buy.title} (Copy)`);
                        setDuplicateOpen(true);
                      }}
                    >
                      <Copy size={14} />
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Delete "${buy.title}"? This cannot be undone.`)) {
                          deleteBuy.mutate({ id: buy.id });
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Group Buy</DialogTitle>
          </DialogHeader>
          <BuyFormFields form={form} set={set} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createBuy.isPending}>
              {createBuy.isPending ? "Creating..." : "Create Buy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Group Buy</DialogTitle>
          </DialogHeader>
          <BuyFormFields form={form} set={set} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateBuy.isPending}>
              {updateBuy.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Duplicate Dialog */}
      <Dialog open={duplicateOpen} onOpenChange={(v) => { setDuplicateOpen(v); if (!v) { setDuplicateId(null); setDuplicateTitle(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Duplicate Group Buy</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Creates a new <strong>Draft</strong> buy with the same products and participation tiers. Orders and test results are not copied.
            </p>
            <div className="space-y-1.5">
              <Label>New Buy Title *</Label>
              <Input
                value={duplicateTitle}
                onChange={(e) => setDuplicateTitle(e.target.value)}
                placeholder="Q4 2025 Peptide Buy"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!duplicateId || !duplicateTitle.trim()) { toast.error("Title is required."); return; }
                duplicateBuy.mutate({ id: duplicateId, newTitle: duplicateTitle.trim() });
              }}
              disabled={duplicateBuy.isPending}
            >
              {duplicateBuy.isPending ? "Duplicating…" : "Duplicate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
