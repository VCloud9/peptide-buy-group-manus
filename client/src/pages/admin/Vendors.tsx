import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Building2, Globe, ChevronRight, Search } from "lucide-react";

// ISO country code → flag emoji + name
const COUNTRY_MAP: Record<string, { name: string; flag: string }> = {
  US: { name: "United States", flag: "🇺🇸" },
  CN: { name: "China", flag: "🇨🇳" },
  VN: { name: "Vietnam", flag: "🇻🇳" },
  MY: { name: "Malaysia", flag: "🇲🇾" },
  IN: { name: "India", flag: "🇮🇳" },
  DE: { name: "Germany", flag: "🇩🇪" },
  GB: { name: "United Kingdom", flag: "🇬🇧" },
  CA: { name: "Canada", flag: "🇨🇦" },
  AU: { name: "Australia", flag: "🇦🇺" },
  KR: { name: "South Korea", flag: "🇰🇷" },
};

const LEAD_TIME: Record<string, string> = {
  US: "2–4 weeks (domestic)",
};

function getLeadTime(country: string) {
  return LEAD_TIME[country] ?? "4–8 weeks (international)";
}

function countryDisplay(code: string) {
  const c = COUNTRY_MAP[code];
  return c ? `${c.flag} ${c.name}` : code;
}

const COUNTRIES = [
  "US", "CN", "VN", "MY", "IN", "DE", "GB", "CA", "AU", "KR",
];

interface CreateVendorForm {
  name: string;
  country: string;
  website: string;
  contactName: string;
  contactEmail: string;
  notes: string;
}

const EMPTY_FORM: CreateVendorForm = {
  name: "", country: "CN", website: "", contactName: "", contactEmail: "", notes: "",
};

export default function AdminVendors() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateVendorForm>(EMPTY_FORM);

  const { data: vendors, isLoading, refetch } = trpc.vendors.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.vendors.create.useMutation({
    onSuccess: () => {
      toast.success("Vendor created.");
      utils.vendors.list.invalidate();
      setShowCreate(false);
      setForm(EMPTY_FORM);
    },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });

  const deactivateMutation = trpc.vendors.deactivate.useMutation({
    onSuccess: () => {
      toast.success("Vendor deactivated.");
      utils.vendors.list.invalidate();
    },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });

  const filtered = (vendors ?? []).filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.country.toLowerCase().includes(search.toLowerCase())
  );

  const active = filtered.filter((v) => v.isActive);
  const inactive = filtered.filter((v) => !v.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Vendors</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage supplier catalog — SKUs, pricing, and history.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus size={15} /> Add Vendor
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search vendors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Vendor table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : active.length === 0 && inactive.length === 0 ? (
        <div className="glass-card p-12 text-center text-muted-foreground">
          <Building2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No vendors yet</p>
          <p className="text-sm mt-1">Add your first vendor to start building a reusable product catalog.</p>
          <Button className="mt-4 gap-2" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Add Vendor
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div className="glass-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Lead Time</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {active.map((v) => (
                    <TableRow key={v.id} className="group">
                      <TableCell>
                        <div className="font-semibold text-sm">{v.name}</div>
                        {v.website && (
                          <a
                            href={v.website.startsWith("http") ? v.website : `https://${v.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5"
                          >
                            <Globe size={10} /> {v.website}
                          </a>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{countryDisplay(v.country)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={v.country === "US" ? "secondary" : "outline"} className="text-xs">
                          {getLeadTime(v.country)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {v.contactName && <div>{v.contactName}</div>}
                        {v.contactEmail && <div className="text-xs">{v.contactEmail}</div>}
                        {!v.contactName && !v.contactEmail && "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm(`Deactivate ${v.name}?`)) deactivateMutation.mutate({ id: v.id });
                            }}
                          >
                            Deactivate
                          </Button>
                          <Link href={`/admin/vendors/${v.id}`}>
                            <Button variant="outline" size="sm" className="gap-1">
                              View Catalog <ChevronRight size={13} />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {inactive.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Inactive</p>
              <div className="glass-card overflow-hidden opacity-60">
                <Table>
                  <TableBody>
                    {inactive.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium text-sm">{v.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{countryDisplay(v.country)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => trpc.vendors.update.useMutation()}
                          >
                            Reactivate
                          </Button>
                          <Link href={`/admin/vendors/${v.id}`}>
                            <Button variant="outline" size="sm" className="gap-1 ml-2">
                              View <ChevronRight size={13} />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Vendor Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Vendor</DialogTitle>
            <DialogDescription>Create a new supplier in the catalog.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vendor Name *</label>
              <Input
                className="mt-1"
                placeholder="e.g. Peptide Sciences"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Country *</label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {COUNTRY_MAP[c] ? `${COUNTRY_MAP[c].flag} ${COUNTRY_MAP[c].name}` : c}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Lead time: {getLeadTime(form.country)}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Website</label>
              <Input
                className="mt-1"
                placeholder="https://vendor.com"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Name</label>
                <Input
                  className="mt-1"
                  placeholder="John Smith"
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Email</label>
                <Input
                  className="mt-1"
                  placeholder="john@vendor.com"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</label>
              <textarea
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                rows={2}
                placeholder="Internal notes about this vendor..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              disabled={!form.name || !form.country || createMutation.isPending}
              onClick={() => createMutation.mutate({
                name: form.name,
                country: form.country,
                website: form.website || undefined,
                contactName: form.contactName || undefined,
                contactEmail: form.contactEmail || undefined,
                notes: form.notes || undefined,
              })}
            >
              {createMutation.isPending ? "Creating..." : "Create Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
