import { useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Upload, Download, AlertCircle, CheckCircle2, X } from "lucide-react";

// ─── Column mapping ────────────────────────────────────────────────────────────
// Accepted header aliases (case-insensitive, trimmed)
const ALIASES: Record<string, string> = {
  name: "name",
  "product name": "name",
  "peptide name": "name",
  compound: "name",
  description: "description",
  desc: "description",
  details: "description",
  price: "pricePerUnit",
  "price per unit": "pricePerUnit",
  "unit price": "pricePerUnit",
  "price (usd)": "pricePerUnit",
  unit: "unit",
  "unit type": "unit",
  "min qty": "minQuantity",
  "min quantity": "minQuantity",
  minimum: "minQuantity",
  "max qty": "maxQuantity",
  "max quantity": "maxQuantity",
  maximum: "maxQuantity",
};

interface ParsedRow {
  name: string;
  description?: string;
  pricePerUnit: string;
  unit: string;
  minQuantity: number;
  maxQuantity?: number;
  _error?: string;
}

function normalizeHeader(h: string): string {
  return ALIASES[h.toLowerCase().trim()] ?? h.toLowerCase().trim();
}

function parseRows(rawRows: Record<string, string>[]): ParsedRow[] {
  return rawRows
    .filter((r) => Object.values(r).some((v) => v?.trim()))
    .map((r) => {
      const mapped: Record<string, string> = {};
      for (const [k, v] of Object.entries(r)) {
        mapped[normalizeHeader(k)] = v?.toString().trim() ?? "";
      }

      const name = mapped["name"] ?? "";
      const priceRaw = mapped["pricePerUnit"] ?? "";
      const price = parseFloat(priceRaw.replace(/[^0-9.]/g, ""));

      const errors: string[] = [];
      if (!name) errors.push("Name required");
      if (isNaN(price) || price <= 0) errors.push("Valid price required");

      return {
        name,
        description: mapped["description"] || undefined,
        pricePerUnit: isNaN(price) ? "0" : price.toFixed(2),
        unit: mapped["unit"] || "vial",
        minQuantity: parseInt(mapped["minQuantity"] || "1") || 1,
        maxQuantity: mapped["maxQuantity"] ? parseInt(mapped["maxQuantity"]) || undefined : undefined,
        _error: errors.length > 0 ? errors.join("; ") : undefined,
      };
    });
}

function downloadTemplate() {
  const headers = ["Name", "Description", "Price (USD)", "Unit", "Min Qty", "Max Qty"];
  const example = [
    ["BPC-157 5mg", "Pentadecapeptide, research grade", "18.00", "vial", "1", "50"],
    ["TB-500 5mg", "Thymosin Beta-4 fragment", "22.00", "vial", "1", ""],
    ["Semaglutide 2mg", "GLP-1 receptor agonist", "45.00", "vial", "1", "20"],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");
  XLSX.writeFile(wb, "peptide-buy-products-template.xlsx");
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  groupBuyId: number;
  onImported: () => void;
}

export function ImportProductsDialog({ open, onOpenChange, groupBuyId, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [step, setStep] = useState<"upload" | "preview">("upload");

  const utils = trpc.useUtils();
  const bulkCreate = trpc.products.bulkCreate.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} product${data.count !== 1 ? "s" : ""} imported successfully.`);
      utils.products.listByBuy.invalidate({ groupBuyId });
      onImported();
      handleClose();
    },
    onError: (e) => toast.error(`Import failed: ${e.message}`),
  });

  const handleClose = () => {
    setRows([]);
    setFileName("");
    setStep("upload");
    onOpenChange(false);
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          setRows(parseRows(result.data));
          setStep("preview");
        },
        error: (err) => toast.error(`CSV parse error: ${err.message}`),
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: "binary" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
          setRows(parseRows(data));
          setStep("preview");
        } catch (err: any) {
          toast.error(`XLSX parse error: ${err.message}`);
        }
      };
      reader.readAsBinaryString(file);
    } else {
      toast.error("Unsupported file type. Please upload a .csv or .xlsx file.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const validRows = rows.filter((r) => !r._error);
  const errorRows = rows.filter((r) => r._error);

  const handleConfirmImport = () => {
    if (validRows.length === 0) { toast.error("No valid rows to import."); return; }
    bulkCreate.mutate({
      groupBuyId,
      products: validRows.map((r) => ({
        name: r.name,
        description: r.description,
        pricePerUnit: r.pricePerUnit,
        unit: r.unit,
        minQuantity: r.minQuantity,
        maxQuantity: r.maxQuantity,
      })),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Products from File</DialogTitle>
          <DialogDescription>
            Upload a CSV or XLSX file to bulk-add products to this buy.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" ? (
          <div className="flex flex-col gap-4 py-2">
            {/* Drop zone */}
            <div
              className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/60 hover:bg-muted/10 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mx-auto mb-3 text-muted-foreground" size={32} />
              <p className="font-medium text-sm">Drop your file here, or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">Supports .csv and .xlsx files</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>

            {/* Column guide */}
            <div className="glass-card p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expected Columns</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { col: "Name", req: true, note: "Product name" },
                  { col: "Price (USD)", req: true, note: "e.g. 18.00" },
                  { col: "Unit", req: false, note: 'Default: "vial"' },
                  { col: "Description", req: false, note: "Optional details" },
                  { col: "Min Qty", req: false, note: "Default: 1" },
                  { col: "Max Qty", req: false, note: "Leave blank for unlimited" },
                ].map(({ col, req, note }) => (
                  <div key={col} className="flex items-start gap-1.5">
                    <span className="font-mono text-primary">{col}</span>
                    {req && <Badge variant="secondary" className="text-[10px] px-1 py-0">required</Badge>}
                    <span className="text-muted-foreground">{note}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button variant="outline" size="sm" className="self-start gap-2" onClick={downloadTemplate}>
              <Download size={13} /> Download Template (.xlsx)
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 flex-1 overflow-hidden">
            {/* Summary bar */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-muted-foreground">File: <span className="text-foreground font-medium">{fileName}</span></span>
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 size={11} className="text-emerald-400" />
                {validRows.length} valid
              </Badge>
              {errorRows.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle size={11} />
                  {errorRows.length} with errors (will be skipped)
                </Badge>
              )}
              <Button variant="ghost" size="sm" className="ml-auto gap-1 text-xs" onClick={() => setStep("upload")}>
                <X size={12} /> Change file
              </Button>
            </div>

            {/* Preview table */}
            <div className="flex-1 overflow-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-6">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Min</TableHead>
                    <TableHead className="text-right">Max</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i} className={row._error ? "opacity-50" : ""}>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="font-medium text-sm">{row.name || <span className="text-destructive italic">—</span>}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{row.description || "—"}</TableCell>
                      <TableCell className="text-right font-mono text-sm">${row.pricePerUnit}</TableCell>
                      <TableCell className="text-sm">{row.unit}</TableCell>
                      <TableCell className="text-right text-sm">{row.minQuantity}</TableCell>
                      <TableCell className="text-right text-sm">{row.maxQuantity ?? "—"}</TableCell>
                      <TableCell>
                        {row._error ? (
                          <span className="text-destructive text-xs flex items-center gap-1">
                            <AlertCircle size={11} /> {row._error}
                          </span>
                        ) : (
                          <span className="text-emerald-400 text-xs flex items-center gap-1">
                            <CheckCircle2 size={11} /> OK
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          {step === "preview" && (
            <Button
              onClick={handleConfirmImport}
              disabled={validRows.length === 0 || bulkCreate.isPending}
            >
              {bulkCreate.isPending
                ? "Importing..."
                : `Import ${validRows.length} Product${validRows.length !== 1 ? "s" : ""}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
