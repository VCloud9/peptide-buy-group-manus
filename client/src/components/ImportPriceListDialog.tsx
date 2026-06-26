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
import { Upload, Download, AlertCircle, CheckCircle2, X, RefreshCw } from "lucide-react";

// ─── Column mapping ────────────────────────────────────────────────────────────
const ALIASES: Record<string, string> = {
  "sku": "skuCode",
  "sku code": "skuCode",
  "item code": "skuCode",
  "item #": "skuCode",
  "code": "skuCode",
  "id": "skuCode",
  "name": "name",
  "product name": "name",
  "item name": "name",
  "peptide": "name",
  "compound": "name",
  "product line": "productLine",
  "line": "productLine",
  "category": "productLine",
  "brand": "productLine",
  "description": "description",
  "desc": "description",
  "details": "description",
  "price": "currentPrice",
  "price (usd)": "currentPrice",
  "unit price": "currentPrice",
  "cost": "currentPrice",
  "unit": "unit",
  "unit type": "unit",
  "min qty": "minQuantity",
  "min quantity": "minQuantity",
  "minimum": "minQuantity",
};

interface ParsedRow {
  skuCode: string;
  name: string;
  currentPrice: string;
  productLine?: string;
  description?: string;
  unit: string;
  minQuantity: number;
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

      const skuCode = mapped["skuCode"] ?? "";
      const name = mapped["name"] ?? "";
      const priceRaw = mapped["currentPrice"] ?? "";
      const price = parseFloat(priceRaw.replace(/[^0-9.]/g, ""));

      const errors: string[] = [];
      if (!skuCode) errors.push("SKU code required");
      if (!name) errors.push("Name required");
      if (isNaN(price) || price <= 0) errors.push("Valid price required");

      return {
        skuCode,
        name,
        currentPrice: isNaN(price) ? "0" : price.toFixed(2),
        productLine: mapped["productLine"] || undefined,
        description: mapped["description"] || undefined,
        unit: mapped["unit"] || "vial",
        minQuantity: parseInt(mapped["minQuantity"] || "1") || 1,
        _error: errors.length > 0 ? errors.join("; ") : undefined,
      };
    });
}

function downloadTemplate() {
  const headers = ["SKU Code", "Name", "Price (USD)", "Product Line", "Unit", "Min Qty", "Description"];
  const example = [
    ["BPC157-5MG", "BPC-157 5mg", "18.00", "Peptides", "vial", "1", "Pentadecapeptide, research grade"],
    ["TB500-5MG", "TB-500 5mg", "22.00", "Peptides", "vial", "1", "Thymosin Beta-4 fragment"],
    ["SEMA-2MG", "Semaglutide 2mg", "45.00", "GLP-1", "vial", "1", "GLP-1 receptor agonist"],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Price List");
  XLSX.writeFile(wb, "vendor-price-list-template.xlsx");
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vendorId: number;
  vendorName: string;
  onImported: () => void;
}

export function ImportPriceListDialog({ open, onOpenChange, vendorId, vendorName, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [step, setStep] = useState<"upload" | "preview">("upload");

  const utils = trpc.useUtils();
  const importMutation = trpc.vendors.importPriceList.useMutation({
    onSuccess: (data) => {
      const parts = [];
      if (data.added > 0) parts.push(`${data.added} new SKU${data.added !== 1 ? "s" : ""} added`);
      if (data.updated > 0) parts.push(`${data.updated} updated`);
      if (data.priceChanges > 0) parts.push(`${data.priceChanges} price change${data.priceChanges !== 1 ? "s" : ""} recorded`);
      toast.success(parts.length > 0 ? parts.join(", ") + "." : `${data.total} SKUs processed.`);
      utils.vendors.listSkus.invalidate({ vendorId });
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
    importMutation.mutate({
      vendorId,
      rows: validRows.map((r) => ({
        skuCode: r.skuCode,
        name: r.name,
        currentPrice: r.currentPrice,
        productLine: r.productLine,
        description: r.description,
        unit: r.unit,
        minQuantity: r.minQuantity,
      })),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw size={16} className="text-primary" />
            Import Price List — {vendorName}
          </DialogTitle>
          <DialogDescription>
            Upload a CSV or XLSX file to add or update SKUs. Existing SKUs are matched by SKU code and upserted — price changes are recorded in history automatically.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" ? (
          <div className="flex flex-col gap-4 py-2">
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

            <div className="glass-card p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expected Columns</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { col: "SKU Code", req: true, note: "Upsert key" },
                  { col: "Name", req: true, note: "Product name" },
                  { col: "Price (USD)", req: true, note: "e.g. 18.00" },
                  { col: "Product Line", req: false, note: "Category/brand" },
                  { col: "Unit", req: false, note: 'Default: "vial"' },
                  { col: "Min Qty", req: false, note: "Default: 1" },
                  { col: "Description", req: false, note: "Optional" },
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
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-muted-foreground">File: <span className="text-foreground font-medium">{fileName}</span></span>
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 size={11} className="text-accent" />
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

            <div className="flex-1 overflow-auto rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-6">#</TableHead>
                    <TableHead>SKU Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Line</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Min</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i} className={row._error ? "opacity-50" : ""}>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{row.skuCode || <span className="text-destructive italic">—</span>}</TableCell>
                      <TableCell className="font-medium text-sm">{row.name || <span className="text-destructive italic">—</span>}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.productLine || "—"}</TableCell>
                      <TableCell className="text-right font-mono text-sm">${row.currentPrice}</TableCell>
                      <TableCell className="text-sm">{row.unit}</TableCell>
                      <TableCell className="text-right text-sm">{row.minQuantity}</TableCell>
                      <TableCell>
                        {row._error ? (
                          <span className="text-destructive text-xs flex items-center gap-1">
                            <AlertCircle size={11} /> {row._error}
                          </span>
                        ) : (
                          <span className="text-accent text-xs flex items-center gap-1">
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
              disabled={validRows.length === 0 || importMutation.isPending}
            >
              {importMutation.isPending
                ? "Importing..."
                : `Import ${validRows.length} SKU${validRows.length !== 1 ? "s" : ""}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
