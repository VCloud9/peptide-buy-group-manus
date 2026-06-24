# Peptide Group Buy Platform — TODO

## Database & Schema
- [x] Extend schema: groupBuys table (title, description, status, moqTarget, capParticipants, endDate, vendorName, vendorCountry)
- [x] Extend schema: products table (groupBuyId, name, description, pricePerUnit, unit, moqPerUser)
- [x] Extend schema: participationTiers table (groupBuyId, name, minAmount, description)
- [x] Extend schema: orders table (userId, groupBuyId, status, totalAmount, trackingNumber, shippedAt)
- [x] Extend schema: orderItems table (orderId, productId, quantity, unitPrice)
- [x] Extend schema: testResults table (groupBuyId, productId, labName, status, coaFileKey, coaFileUrl, submittedAt, resultAt)
- [x] Extend schema: skoolWebhooks table (groupBuyId, event, url, sentAt, success)
- [x] Extend schema: users table with skoolUsername, shippingAddress fields
- [x] Generate and apply all migrations

## Server Routers
- [x] groupBuys router: list, get, create, update, updateStatus, delete
- [x] products router: list by buy, create, update, delete
- [x] tiers router: list by buy, create, update, delete
- [x] orders router: list (admin), list (member), create, updateStatus, updateTracking
- [x] orderItems router: create, update
- [x] testResults router: create, update, upload COA, list by buy
- [x] skoolWebhooks router: configure URL, list, trigger manually
- [x] admin reporting router: buy summary, member summary, financial overview
- [x] file upload router: COA PDF upload via S3

## Member-Facing UI
- [x] Landing page: elegant hero, platform overview, login CTA
- [x] Member dashboard: active buys summary, my orders, payment statuses
- [x] Browse active buys: card grid with status badges, MOQ progress bars
- [x] Buy detail page: product list, tier info, order form
- [x] Order placement form: select products, quantities, tier selection
- [x] My orders page: order history, payment status, tracking info
- [x] COA viewer: view/download HPLC/LC-MS PDFs per buy
- [x] Profile page: update name, email, Skool username, shipping address

## Admin UI
- [x] Admin dashboard: overview stats, recent activity
- [x] Group buy management: list, create, edit, status progression controls
- [x] Buy detail admin view: products, tiers, orders, testing, distribution tabs
- [x] Product management: add/edit/remove products per buy
- [x] Tier management: configure participation tiers per buy
- [x] Order management table: all orders per buy, mark payment received
- [x] Testing workflow: log sample shipment to Freedom Diagnostics, update status
- [x] COA upload: upload HPLC/LC-MS PDF per product, publish to members
- [x] Distribution panel: enter tracking numbers per member order
- [x] Member management: view all members, roles

## Admin Reporting
- [x] Buy-level financial overview: total committed, total paid, outstanding
- [x] Per-member order summaries table
- [x] Payment collection progress bar and stats
- [x] Export-ready data view

## Skool Webhook Integration
- [x] Webhook config UI: enter Skool webhook URL
- [x] Trigger: new buy goes live (status → Gathering)
- [x] Trigger: MOQ reached (status → Funded)
- [x] Trigger: test results posted (COA uploaded)
- [x] Trigger: orders shipped (status → Distributing)
- [x] Webhook log: show sent events and success/failure

## Design & Polish
- [x] Global theme: dark elegant palette, premium typography (Inter/Geist)
- [x] Status badges with color coding for buy lifecycle and payment status
- [x] MOQ progress bars on buy cards
- [x] Responsive layout for mobile and desktop
- [x] Loading skeletons and empty states throughout
- [x] Micro-interactions and transitions

## Tests
- [x] Auth unit tests (logout, me)
- [x] Buy lifecycle status sequence tests
- [x] Order payment status sequence tests
- [x] Skool webhook event tests
- [x] MOQ progress calculation tests
- [x] Role-based access control tests

## Product Import
- [x] Install xlsx/papaparse for CSV and XLSX parsing
- [x] Add bulkCreateProducts server procedure
- [x] Add ImportProductsDialog component with file upload, column preview, and confirm
- [x] Wire import button into Admin Buy Detail Products tab
- [x] Add downloadable template CSV
