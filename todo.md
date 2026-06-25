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

## Round 2 Features
- [x] Add hero logo lockup to landing page (larger centered logo above headline)
- [x] Build member invite/access-code gate — DB table, server procedures, UI at registration
- [x] Admin: manage invite codes (create, revoke, view usage)
- [x] Add CSV export button to admin Buy Detail Orders tab

## Round 3 Features
- [x] Bulk tracking number import: CSV upload (email → tracking number) in admin Orders tab
- [x] Duplicate buy: clone an existing buy (products + tiers) as a new draft

## Round 4 Features
- [x] Product stock toggle: on/off switch per product to mark as out of stock (hides from member order form)

## GHL Integration
- [x] GHL config constants file (location ID, pipeline ID, stage IDs, field keys)
- [x] GHL service layer: upsertContact, addTags, removeTags, updateCustomFields, upsertOpportunity
- [x] Wire GHL on member signup (create/update contact, tag pbg-member, stage: Member Registered)
- [x] Wire GHL on invite code redemption (tag pbg-verified, update PBG Invite Code Used field)
- [x] Wire GHL on order placed (tag pbg-ordered, update order fields, stage: Order Committed)
- [x] Wire GHL on payment marked Paid (tag pbg-paid, update amount fields, stage: Payment Received)
- [x] Wire GHL on order marked Shipped (tag pbg-shipped, update tracking fields, stage: Shipped)
- [x] Wire GHL on buy marked Complete (buy-level event fans out to all members, tag pbg-complete, stage: Completed, opportunity status: won)
- [x] Wire GHL on COA published (update pbg_coa_available field, stage: Ready to Ship — COA means product is verified and ready to distribute)
- [x] Inbound GHL webhook handler: ContactUpdated syncs name back to platform; other events (tag changes, opportunity stage changes) are logged for V1 visibility
- [x] GHL status panel in admin Settings page

## Round 5 Features
- [x] GHL sync log panel in admin Settings: DB table, server procedure, last-10-events UI panel
- [x] Resync to GHL button in admin Members page: re-push contact, tags, and opportunity to GHL
- [x] Member-facing buy history page: past completed buys, order summary, COA links, tracking

## Round 6 Features
- [x] Schema: add memberNote and adminNote columns to orders table
- [x] GHL: add pbg-payment-pending tag when order status moves to Payment Pending
- [x] GHL: confirm pbg-shipped tag fires on Shipped (already wired, verify)
- [x] GHL: sync member note and admin note to GHL contact Notes field (prepend "Member Note:" / "Admin Note:")
- [x] Server: updateOrderNote procedure (member can set their own note, editable while not yet Paid)
- [x] Server: updateAdminNote procedure (admin-only, any time)
- [x] Server: bulkResyncAllMembers procedure (admin-only, fans out resync to all users)
- [x] Frontend: member note input on order placement form
- [x] Frontend: member note display/edit on My Orders page (editable while Committed/Payment Pending)
- [x] Frontend: admin note field in admin Orders tab per order row
- [x] Frontend: bulk resync all members button in admin Settings page

## Round 7 Features
- [x] Schema: membershipRequests table (name, email, skoolUsername, status, inviteCode, createdAt)
- [x] Server: submitAccessRequest public procedure
- [x] Server: GHL webhook handler for pbg-approved tag → generate invite code, update GHL pbg_invite_code field, apply pbg-invite-sent tag
- [x] Server: admin createMember procedure (manual user + invite code creation)
- [x] GHL config: add Membership Requested pipeline stage, pbg-access-requested, pbg-approved, pbg-invite-sent tags, pbg_invite_code custom field
- [x] Frontend: How to Join public page (/join) with benefits, safety/testing, transparency, FAQ, Request Access form
- [x] Frontend: Admin create member dialog in Members page
- [x] Frontend: GHL setup guide panel in admin Settings
- [x] Frontend: Add /join to nav and landing page CTAs

## Round 8 Features
- [x] Payment instructions modal: shown on My Orders page when order status is Payment Pending, displays Zelle (ray@vcloud9.com) and Venmo (@ray-collazo) with copy buttons and order amount

## Round 9 Features
- [x] GHL config: add PAYMENT_CONFIRMED tag constant
- [x] GHL service: ghlOnPaymentConfirmed function — apply pbg-payment-confirmed tag, update GHL custom fields (buy name, amount paid)
- [x] Server: wire ghlOnPaymentConfirmed into updateStatus mutation when status moves to Paid
- [x] Admin Settings: update GHL Setup Guide with full workflow table and all custom fields reference
