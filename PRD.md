# Product Requirements Document — Peptide Buy Group Platform

**Version:** 1.0  
**Date:** June 25, 2026  
**Status:** Active Development  
**Live Domain:** [peptide-buy.com](https://peptide-buy.com)

---

## 1. Overview

Peptide Buy Group (PBG) is a private, invite-only web platform that enables a closed community of research peptide buyers to pool their purchasing power, share third-party testing costs, and receive independently verified product — all tracked in one place. The platform manages the full lifecycle of a group buy: from opening a buy and collecting commitments, through payment collection and supplier ordering, to third-party HPLC/LC-MS testing, COA publication, and final shipment tracking.

The platform is deeply integrated with GoHighLevel (GHL) CRM to maintain a real-time record of every member's activity, automate email/SMS workflows triggered by status changes, and keep the pipeline current without manual data entry.

---

## 2. Problem Statement

Peptide research communities historically coordinate group buys through Discord, Skool, or spreadsheets. This creates several friction points:

- **No single source of truth.** Order status, payment confirmation, and tracking numbers live in DMs, spreadsheets, and manual CRM entries that quickly fall out of sync.
- **No automated CRM sync.** Admins manually update GHL contacts after each status change, which is error-prone and time-consuming at scale.
- **No member self-service.** Members cannot check their own order status, view COA results, or update their shipping address without asking an admin.
- **No audit trail.** There is no record of who paid, when, or what notes were exchanged between member and admin.

PBG solves all of these by providing a purpose-built platform where every action — order placement, payment confirmation, shipment, COA publication — automatically updates both the member-facing UI and the GHL CRM.

---

## 3. Users and Roles

The platform has three distinct roles, each with different access levels.

| Role | Description | Access |
|---|---|---|
| **Owner** | The platform operator (single account) | Full admin access + role management |
| **Admin** | Trusted operators managing buys | All admin pages, GHL sync, reporting |
| **Member** | Verified community members | Browse buys, place orders, view own orders and COAs |

Access is gated at two levels. First, all users must authenticate via Manus OAuth (the login portal). Second, members must redeem a valid invite code before they can place orders. Unauthenticated visitors see only the public landing page.

---

## 4. Core Concepts

**Group Buy.** A single purchasing event for one or more peptide products. A buy progresses through a defined lifecycle: `Draft → Gathering → Funded → Ordered → Testing → Distributing → Complete`. Each stage transition triggers GHL pipeline movement and optionally fires a Skool community webhook.

**Product.** A specific peptide SKU within a group buy (e.g., "BPC-157 5mg"). Each product has a per-unit price, optional MOQ per user, and an in-stock toggle. Out-of-stock products are hidden from the member order form.

**Order.** A member's commitment to purchase specific products within a buy. An order progresses through its own status sequence: `Committed → Payment Pending → Paid → Shipped`. Each transition syncs to GHL.

**Test Result.** An HPLC/LC-MS COA record linked to a buy and optionally a specific product. Test results are managed by admins (Freedom Diagnostics lab) and published to members once verified. Published COAs are downloadable PDFs.

**Invite Code.** A single-use or multi-use alphanumeric code that grants a new member access to the platform. Admins create, revoke, and monitor usage of invite codes.

---

## 5. Feature Specifications

### 5.1 Authentication and Access Control

Authentication is handled by Manus OAuth. On first login, a user record is created. The owner account is identified by `OWNER_OPEN_ID` environment variable and is automatically assigned the `owner` role. Admins are promoted via direct database update or the admin Members page. All protected procedures check `ctx.user.role` server-side; the frontend conditionally renders admin navigation based on the same role field.

### 5.2 Invite Code Gate

New members must enter a valid invite code after their first login before they can access buy detail pages or place orders. The invite code system supports:

- Admin-created codes with optional maximum use count and expiry date.
- Single-use and multi-use codes.
- Revocation by admins at any time.
- Usage log showing which member redeemed each code and when.

On redemption, the platform fires a GHL event that applies the `pbg-verified` tag and logs the invite code used to the `pbg_invite_code_used` custom field.

### 5.3 Group Buy Management (Admin)

Admins create and manage group buys through the admin Buy Detail page, which is organized into five tabs: Overview, Products, Tiers, Orders, and Testing.

**Overview tab** allows editing buy metadata (title, description, vendor, country, MOQ target, participant cap, end date) and advancing the buy status via a dropdown. Status changes to `Gathering`, `Funded`, `Ordered`, `Testing`, `Distributing`, and `Complete` each trigger corresponding GHL pipeline stage movements and optional Skool webhook fires.

**Products tab** supports adding, editing, and removing products. Products can be imported in bulk via CSV or XLSX file upload using a column-mapping dialog. An in-stock toggle per product controls visibility on the member order form.

**Tiers tab** allows configuring participation tiers (e.g., "Founding Member," "Standard") with minimum spend thresholds and descriptions.

**Orders tab** shows all member orders for the buy. Each row displays member name, email, order total, item summary, and current status. Admins can change order status via an inline dropdown, set tracking numbers via a dialog, and import tracking numbers in bulk via CSV (email → tracking number mapping). Each order row also shows the member's note (read-only) and has an admin note button (message icon) that opens an inline textarea for private notes.

**Testing tab** manages COA records. Admins create a test record when samples ship to the lab, update the status through `Pending → Samples Sent → In Testing → Results Ready → Published → Failed`, and upload the COA PDF when results are ready. Publishing a COA automatically notifies all members of that buy via GHL.

### 5.4 Member-Facing Features

**Landing page.** Public page with platform overview, "How It Works" section, and login/browse CTAs. Displays the PBG logo lockup.

**Browse Buys.** Grid of active group buys with status badges, MOQ progress bars, product count, and vendor information. Members can click through to buy detail pages.

**Buy Detail.** Full buy information including products, tiers, test results, and published COAs. If the buy is in `Gathering` status and the member has not yet ordered, an order form is displayed with quantity selectors per product, tier selection, and an optional note field for special instructions. The form pre-fills shipping details from the member's profile.

**My Orders.** Expandable card list of all the member's orders across all buys. Each card shows order items, total, shipping address, tracking information (when available), a payment status progression indicator, and the member's note (editable while status is `Committed` or `Payment Pending`).

**Buy History.** A dedicated page showing all buys the member has participated in, with order summaries, status, and links to published COAs.

**Profile.** Members can update their display name, Skool username, and full shipping address. The shipping address is pre-filled into new order forms.

### 5.5 GoHighLevel CRM Integration

The platform maintains a bidirectional sync with the Certapep GHL sub-account (Location ID: `t9b6FAsOCqtsJ57Zl5il`). All outbound sync events are non-blocking (fire-and-forget with error logging) to avoid slowing down user-facing mutations.

**Outbound sync events** and their effects are summarized below.

| Event | GHL Action |
|---|---|
| Member signup / login | Upsert contact, apply `pbg-member` tag, open opportunity at "Member Registered" stage |
| Invite code redeemed | Apply `pbg-verified` tag, set `pbg_invite_code_used` field |
| Order placed | Apply `pbg-ordered` tag, update order fields, move pipeline to "Order Committed" |
| Order → Payment Pending | Apply `pbg-payment-pending` tag, update status field, move pipeline to "Payment Pending" |
| Order → Paid | Apply `pbg-paid` tag, update total spent, move pipeline to "Payment Received" |
| Order → Shipped | Apply `pbg-shipped` tag, update tracking fields, move pipeline to "Shipped" |
| COA published | Apply `pbg-coa-available` tag, set COA field, move pipeline to "Ready to Ship" |
| Buy complete | Apply `pbg-complete` tag, move pipeline to "Completed", mark opportunity won |
| Member note saved | Append "Member Note: {text}" to GHL contact Notes |
| Admin note saved | Append "Admin Note: {text}" to GHL contact Notes |
| Resync (single or bulk) | Full contact + tags + opportunity re-push for one or all members |

**Custom fields** maintained on each GHL contact:

| Field Key | Description |
|---|---|
| `contact.pbg_member_since` | ISO date of first login |
| `contact.pbg_invite_code_used` | Invite code redeemed |
| `contact.pbg_total_orders` | Lifetime order count |
| `contact.pbg_total_spent` | Lifetime spend (USD) |
| `contact.pbg_last_buy_name` | Most recent buy title |
| `contact.pbg_last_order_date` | Most recent order date |
| `contact.pbg_last_order_status` | Most recent order status |
| `contact.pbg_last_order_amount` | Most recent order total |
| `contact.pbg_last_tracking_number` | Most recent tracking number |
| `contact.pbg_last_carrier` | Most recent shipping carrier |
| `contact.pbg_coa_available` | Whether a COA has been published for any of their orders |

**Inbound webhook.** GHL can POST contact update events to `/api/ghl/webhook`. The platform processes `ContactUpdated` events to sync the member's name back to the platform user record. All inbound events are logged to the `ghl_sync_logs` table for visibility.

**GHL Sync Logs panel** in admin Settings shows the last 20 outbound/inbound events with direction badge, event type, email, success/fail indicator, and timestamp.

**Bulk Resync** button in admin Settings re-pushes all members to GHL in a single batch operation, useful after pipeline reconfiguration or field schema changes.

### 5.6 Skool Community Webhook

Admins can configure a Skool-compatible webhook URL (e.g., Zapier/Make.com) that fires on four platform events: new buy live, MOQ reached, test results posted, and orders shipped. The webhook log in admin Settings shows recent sends with HTTP status and timestamp.

### 5.7 Admin Reporting

The Reporting page provides buy-level and platform-level financial summaries:

- Per-buy: total committed, total paid, outstanding balance, payment collection progress bar, per-member order table.
- Platform-wide: all buys summary with participant counts, revenue, and status.
- CSV export of all orders per buy (includes member name, email, status, items, tracking, shipping address).

### 5.8 Order Notes

**Member notes** can be added at order placement (optional textarea on the buy detail order form) and edited on the My Orders page while the order status is `Committed` or `Payment Pending`. Once the order moves to `Paid`, the note becomes read-only. Notes are visible to admins in the Orders tab and sync to GHL contact Notes as "Member Note: {text}".

**Admin notes** are accessible via a message icon button on each order row in the admin Orders tab. They are never visible to members. Admin notes sync to GHL contact Notes as "Admin Note: {text}".

---

## 6. Data Model

The platform uses a MySQL/TiDB database managed via Drizzle ORM. The schema consists of the following tables.

| Table | Purpose |
|---|---|
| `users` | Member accounts with role, profile, shipping address, Skool username |
| `group_buys` | Buy events with lifecycle status, vendor info, MOQ, cap, dates |
| `products` | SKUs within a buy with pricing, MOQ per user, in-stock flag |
| `participation_tiers` | Optional spend tiers per buy |
| `orders` | Member commitments with status, totals, shipping, tracking, notes |
| `order_items` | Line items linking orders to products with quantity and pricing |
| `test_results` | COA records per buy/product with lab info, status, S3 file reference |
| `skool_webhook_config` | Webhook URL and active flag per group buy event type |
| `skool_webhook_log` | Log of all outbound Skool webhook fires |
| `invite_codes` | Invite codes with max uses, expiry, revocation status |
| `invite_code_uses` | Redemption log linking codes to users |
| `ghl_sync_logs` | Log of all GHL outbound/inbound sync events |

---

## 7. Technical Architecture

The platform is a monorepo with a React 19 frontend and an Express 4 backend, communicating exclusively via tRPC 11 procedures. There are no REST endpoints except for OAuth callbacks, GHL webhook ingestion, and S3 storage proxying.

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, shadcn/ui, Wouter (routing) |
| Backend | Node.js, Express 4, tRPC 11, Drizzle ORM |
| Database | MySQL / TiDB (managed, serverless) |
| Auth | Manus OAuth (JWT session cookie) |
| File Storage | S3-compatible object storage (COA PDFs) |
| CRM | GoHighLevel REST API v2 |
| Hosting | Manus Autoscale (Cloud Run, serverless) |
| Domain | peptide-buy.com, www.peptide-buy.com |

**Type safety** flows end-to-end: Drizzle infers TypeScript types from the schema, tRPC procedures expose typed inputs and outputs, and the React frontend consumes them via `trpc.*.useQuery/useMutation` hooks with no manual type declarations needed.

**File uploads** (COA PDFs) are stored in S3 via the `storagePut` helper. The database stores only the S3 key and public URL. Files are never stored in the project directory to avoid deployment timeouts.

---

## 8. GHL Workflow Recommendations

The following GHL Workflows are recommended to complement the platform's automatic tag triggers.

| Trigger Tag | Recommended Workflow |
|---|---|
| `pbg-payment-pending` | Send payment instructions email/SMS with Venmo/Zelle/bank details and order total |
| `pbg-shipped` | Send shipment notification with tracking number and carrier |
| `pbg-coa-available` | Notify member that COA results are posted and link to platform |
| `pbg-complete` | Send thank-you message and invite to next buy |

---

## 9. Planned Next Features

The following features are scoped for future development rounds.

| Feature | Description |
|---|---|
| Payment instructions page | Member-facing page/modal showing payment details once order is in "Payment Pending" |
| Admin note in Members list | Surface latest admin note as tooltip/expandable row in admin Members table |
| Admin bulk status update with GHL sync | Extend bulk status change to also fire GHL events for each affected order |
| Member email notifications (direct) | Optional transactional email (SendGrid/Resend) as a fallback alongside GHL workflows |
| Order cancellation | Allow members to cancel a Committed order before Payment Pending |
| Waitlist / overflow management | Cap buy participation and manage a waitlist when cap is reached |

---

## 10. Environment Variables

All secrets are managed via the Manus project secrets system and are never committed to source control.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL/TiDB connection string |
| `JWT_SECRET` | Session cookie signing key |
| `VITE_APP_ID` | Manus OAuth application ID |
| `OAUTH_SERVER_URL` | Manus OAuth backend base URL |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL (frontend) |
| `OWNER_OPEN_ID` | Owner's Manus open ID for auto-role assignment |
| `GHL_API_KEY` | GoHighLevel private integration API key |
| `BUILT_IN_FORGE_API_KEY` | Manus built-in APIs bearer token (server-side) |
| `BUILT_IN_FORGE_API_URL` | Manus built-in APIs base URL |

---

*Document maintained in the project repository at `PRD.md`.*
