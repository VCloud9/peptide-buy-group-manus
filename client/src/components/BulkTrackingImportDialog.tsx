import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { FileDown, Upload, CheckCircle2, XCircle } from "lucide-react";

interface Row {
  email: string;
  trackingNumber: string;
  carrier?: string;
}

interface Props {
  groupBuyId: number;
  onSuccess?: () => void;
}

export default function BulkTrackingImportDialog({ groupBuyId, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const mutation = trpc.orders.bulkUpdateTracking.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Updated ${data.matched} order${data.matched !== 1 ? "s" : ""}.${
          data.unmatched.length > 0
            ? ` ${data.unmatched.length} email(s) not matched.`
            : ""
        }`
      );
      setOpen(false);
      setRows([]);
      setFileName("");
      onSuccess?.();
    },
    onError: (e) => toast.error(e.message),
  });

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["email", "trackingNumber", "carrier"],
      ["member@example.com", "1Z999AA10123456784", "UPS"],
      ["another@example.com", "9400111899223397658538", "USPS"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tracking");
    XLSX.writeFile(wb, "tracking-import-template.xlsx");
  }

  function parseFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (raw.length < 2) {
          setErrors(["File appears to be empty."]);
          setRows([]);
          return;
        }

        // Normalize headers
        const headers = (raw[0] as string[]).map((h) =>
          String(h).toLowerCase().trim()
        );
        const emailIdx = headers.findIndex((h) =>
          ["email", "e-mail", "member email"].includes(h)
        );
        const trackingIdx = headers.findIndex((h) =>
          ["trackingnumber", "tracking number", "tracking", "tracking_number"].includes(h)
        );
        const carrierIdx = headers.findIndex((h) =>
          ["carrier", "shipping carrier", "ship via"].includes(h)
        );

        if (emailIdx === -1 || trackingIdx === -1) {
          setErrors([
            `Could not find required columns. Expected "email" and "trackingNumber". Found: ${headers.join(", ")}`,
          ]);
          setRows([]);
          return;
        }

        const parsed: Row[] = [];
        const errs: string[] = [];

        for (let i = 1; i < raw.length; i++) {
          const r = raw[i] as any[];
          const email = String(r[emailIdx] ?? "").trim();
          const tracking = String(r[trackingIdx] ?? "").trim();
          if (!email && !tracking) continue; // skip blank rows
          if (!email) { errs.push(`Row ${i + 1}: missing email`); continue; }
          if (!tracking) { errs.push(`Row ${i + 1}: missing tracking number`); continue; }
          parsed.push({
            email,
            trackingNumber: tracking,
            carrier: carrierIdx !== -1 ? String(r[carrierIdx] ?? "").trim() || undefined : undefined,
          });
        }

        setRows(parsed);
        setErrors(errs);
      } catch (err) {
        setErrors(["Failed to parse file. Please use the provided template."]);
        setRows([]);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setRows([]); setErrors([]); setFileName(""); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <Upload size={13} /> Import Tracking
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Tracking Numbers</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions */}
          <p className="text-sm text-muted-foreground">
            Upload a CSV or XLSX file with columns: <code className="bg-muted px-1 rounded text-xs">email</code>,{" "}
            <code className="bg-muted px-1 rounded text-xs">trackingNumber</code>,{" "}
            <code className="bg-muted px-1 rounded text-xs">carrier</code> (optional). Each matched order will be marked as <strong>Shipped</strong>.
          </p>

          {/* Template download */}
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={downloadTemplate}>
            <FileDown size={13} /> Download Template
          </Button>

          {/* File upload */}
          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={20} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {fileName ? (
                <span className="text-foreground font-medium">{fileName}</span>
              ) : (
                "Click to upload CSV or XLSX"
              )}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setFileName(f.name); parseFile(f); }
                e.target.value = "";
              }}
            />
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="space-y-1">
              {errors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-destructive">
                  <XCircle size={13} className="mt-0.5 shrink-0" />
                  {err}
                </div>
              ))}
            </div>
          )}

          {/* Preview */}
          {rows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 size={15} className="text-accent" />
                {rows.length} row{rows.length !== 1 ? "s" : ""} ready to import
              </div>
              <div className="max-h-52 overflow-y-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Email</th>
                      <th className="text-left px-3 py-2 font-medium">Tracking #</th>
                      <th className="text-left px-3 py-2 font-medium">Carrier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="px-3 py-1.5 text-muted-foreground">{r.email}</td>
                        <td className="px-3 py-1.5 font-mono">{r.trackingNumber}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{r.carrier ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={rows.length === 0 || mutation.isPending}
              onClick={() => mutation.mutate({ groupBuyId, rows })}
            >
              {mutation.isPending ? "Importing…" : `Import ${rows.length} Row${rows.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
