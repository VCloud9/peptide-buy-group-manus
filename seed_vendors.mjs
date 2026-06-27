import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── DB connection ────────────────────────────────────────────────────────────
const db = await mysql.createConnection(process.env.DATABASE_URL);

// ─── Vendor definitions ───────────────────────────────────────────────────────
const VENDORS = [
  {
    name: "MKM Peptides",
    country: "CN",
    website: "https://mkmbiosciences.com",
    contactName: null,
    contactEmail: null,
    whatsappNumber: null,
    negotiatedDiscountPct: null,
    csvFile: "MKM_Peptides.csv",
  },
  {
    name: "Marvel Peptides",
    country: "CN",
    website: null,
    contactName: null,
    contactEmail: null,
    whatsappNumber: null,
    negotiatedDiscountPct: null,
    csvFile: "Marvel_Peptides.csv",
  },
  {
    name: "Mia (Kerui)",
    country: "CN",
    website: null,
    contactName: "Mia",
    contactEmail: null,
    whatsappNumber: null,
    negotiatedDiscountPct: "10.00",
    csvFile: "Mia_Kerui.csv",
  },
  {
    name: "WanShun",
    country: "CN",
    website: null,
    contactName: null,
    contactEmail: null,
    whatsappNumber: null,
    negotiatedDiscountPct: null,
    csvFile: "WanShun.csv",
  },
  {
    name: "Lilipeptide (Luna)",
    country: "CN",
    website: null,
    contactName: "Luna",
    contactEmail: null,
    whatsappNumber: null,
    negotiatedDiscountPct: null,
    csvFile: "Lilipeptide_Luna.csv",
  },
  {
    name: "Innopeptide",
    country: "CN",
    website: null,
    contactName: null,
    contactEmail: null,
    whatsappNumber: null,
    negotiatedDiscountPct: null,
    csvFile: "Innopeptide.csv",
  },
  {
    name: "Peptide Lab",
    country: "CN",
    website: null,
    contactName: null,
    contactEmail: null,
    whatsappNumber: null,
    negotiatedDiscountPct: null,
    csvFile: "PeptideLab.csv",
  },
];

const CSV_DIR = "/home/ubuntu/vendor_csvs_v3";

// ─── Helper: upsert vendor ────────────────────────────────────────────────────
async function upsertVendor(v) {
  // Check if vendor already exists by name
  const [rows] = await db.execute("SELECT id FROM vendors WHERE name = ?", [v.name]);
  if (rows.length > 0) {
    const id = rows[0].id;
    await db.execute(
      `UPDATE vendors SET country=?, website=?, contactName=?, contactEmail=?, whatsappNumber=?, negotiatedDiscountPct=?, isActive=1 WHERE id=?`,
      [v.country, v.website, v.contactName, v.contactEmail, v.whatsappNumber, v.negotiatedDiscountPct, id]
    );
    console.log(`  [UPDATE] Vendor "${v.name}" id=${id}`);
    return id;
  } else {
    const [result] = await db.execute(
      `INSERT INTO vendors (name, country, website, contactName, contactEmail, whatsappNumber, negotiatedDiscountPct, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [v.name, v.country, v.website, v.contactName, v.contactEmail, v.whatsappNumber, v.negotiatedDiscountPct]
    );
    console.log(`  [INSERT] Vendor "${v.name}" id=${result.insertId}`);
    return result.insertId;
  }
}

// ─── Helper: upsert SKU + tiers ───────────────────────────────────────────────
async function upsertSku(vendorId, row) {
  const skuCode = (row.skuCode || row.sku_code || row["SKU Code"] || "").trim();
  const name = (row.name || row.Name || "").trim();
  const unit = (row.unit || row.Unit || "vial").trim();
  const currentPrice = parseFloat(row.currentPrice || row.current_price || row["Current Price"] || 0);
  const minQuantity = parseInt(row.minQuantity || row.min_quantity || row["Min Quantity"] || 1, 10);
  const productLine = (row.productLine || row.product_line || row["Product Line"] || "").trim() || null;
  const description = (row.description || row.Description || "").trim() || null;

  if (!skuCode || !name || isNaN(currentPrice)) return null;

  // Upsert SKU
  const [existing] = await db.execute(
    "SELECT id, currentPrice FROM vendor_skus WHERE vendorId=? AND skuCode=?",
    [vendorId, skuCode]
  );

  let skuId;
  if (existing.length > 0) {
    skuId = existing[0].id;
    const oldPrice = parseFloat(existing[0].currentPrice);
    if (oldPrice !== currentPrice) {
      // Log price history before updating
      await db.execute(
        `INSERT INTO sku_price_history (vendorSkuId, price, effectiveAt, source, recordedBy) VALUES (?, ?, NOW(), 'import', 0)`,
        [skuId, oldPrice]
      );
    }
    await db.execute(
      `UPDATE vendor_skus SET name=?, productLine=?, description=?, unit=?, currentPrice=?, minQuantity=?, isActive=1, updatedAt=NOW() WHERE id=?`,
      [name, productLine, description, unit, currentPrice, minQuantity, skuId]
    );
  } else {
    const [result] = await db.execute(
      `INSERT INTO vendor_skus (vendorId, skuCode, name, productLine, description, unit, currentPrice, minQuantity, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [vendorId, skuCode, name, productLine, description, unit, currentPrice, minQuantity]
    );
    skuId = result.insertId;
    // First price history entry
    await db.execute(
      `INSERT INTO sku_price_history (vendorSkuId, price, effectiveAt, source, recordedBy) VALUES (?, ?, NOW(), 'import', 0)`,
      [skuId, currentPrice]
    );
  }

  // Upsert tiers
  const tierDefs = [];
  if (row.tier1_min_qty !== undefined && row.tier1_price !== undefined && row.tier1_price !== "") {
    tierDefs.push({ minQty: parseInt(row.tier1_min_qty, 10) || 1, price: parseFloat(row.tier1_price) });
  }
  if (row.tier2_min_qty !== undefined && row.tier2_price !== undefined && row.tier2_price !== "") {
    tierDefs.push({ minQty: parseInt(row.tier2_min_qty, 10), price: parseFloat(row.tier2_price) });
  }
  if (row.tier3_min_qty !== undefined && row.tier3_price !== undefined && row.tier3_price !== "") {
    tierDefs.push({ minQty: parseInt(row.tier3_min_qty, 10), price: parseFloat(row.tier3_price) });
  }

  if (tierDefs.length > 0) {
    // Delete existing tiers for this SKU and re-insert
    await db.execute("DELETE FROM vendor_sku_tiers WHERE vendorSkuId=?", [skuId]);
    for (const t of tierDefs) {
      if (!isNaN(t.minQty) && !isNaN(t.price) && t.price > 0) {
        await db.execute(
          `INSERT INTO vendor_sku_tiers (vendorSkuId, minQty, price, createdAt) VALUES (?, ?, ?, NOW())`,
          [skuId, t.minQty, t.price]
        );
      }
    }
  }

  return skuId;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
let totalSkus = 0;
let totalVendors = 0;

for (const v of VENDORS) {
  console.log(`\nProcessing vendor: ${v.name}`);
  const vendorId = await upsertVendor(v);
  totalVendors++;

  const csvPath = path.join(CSV_DIR, v.csvFile);
  if (!fs.existsSync(csvPath)) {
    console.log(`  [SKIP] CSV not found: ${csvPath}`);
    continue;
  }

  const content = fs.readFileSync(csvPath, "utf-8");
  const rows = parse(content, { columns: true, skip_empty_lines: true, trim: true });

  let skuCount = 0;
  for (const row of rows) {
    const skuId = await upsertSku(vendorId, row);
    if (skuId) skuCount++;
  }

  console.log(`  [DONE] ${skuCount} SKUs imported for ${v.name}`);
  totalSkus += skuCount;
}

console.log(`\n=== COMPLETE ===`);
console.log(`Vendors: ${totalVendors}`);
console.log(`Total SKUs: ${totalSkus}`);

await db.end();
