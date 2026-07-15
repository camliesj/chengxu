# Android Mobile UI Design

Date: 2026-07-15  
Status: Approved

## 1. Design Brief

### Users

- Front-desk and repair employees who create work orders, update repair progress, and look up customer or vehicle records.
- Administrators who perform all employee operations plus settlement, reverse settlement, receipt management, and business overview.

### Product Goal

Provide a focused Android client for high-frequency shop-floor work without shrinking the complete desktop application into a phone layout.

### Success Criteria

- A new repair order can be completed in four clear steps without horizontal scrolling.
- An employee can find and update a current work order within three interactions from the workbench.
- Settlement and reverse-settlement actions are visible only to administrators and require explicit confirmation.
- Settled work orders leave the current queue and appear in repair history immediately.
- Every major screen has loading, empty, error, and offline behavior.
- Long Chinese labels, customer names, vehicle models, and work descriptions do not overlap controls.

### Constraints

- Android is the first mobile platform.
- Navigation scheme A is fixed: Workbench, Work Orders, Add, Records, Profile.
- The future client will share cloud APIs, authentication, permissions, order rules, and COS receipts with the web and Windows clients.
- Version 1 supports offline read-only cache. Mutating operations require a network connection.
- Account management, dictionaries, operation logs, and data export remain in the web and Windows clients.

## 2. Visual Direction

The approved direction is a light operational workspace with prominent status communication. It combines the clear status focus seen in mobility applications with the whitespace, form clarity, and restrained navigation found in productivity applications.

The interface is operational rather than promotional:

- Large values are reserved for urgent status and daily summaries.
- Lists and forms remain compact enough for repeated business use.
- The first viewport prioritizes current work, settlement reminders, and insurance reminders.
- Decorative gradients, oversized illustrations, nested cards, and ornamental effects are excluded.

## 3. Design Tokens

### Color

| Purpose | Value |
| --- | --- |
| App background | `#F5F7FA` |
| Surface | `#FFFFFF` |
| Primary | `#1677FF` |
| Primary pressed | `#0958D9` |
| Primary soft | `#EAF3FF` |
| Main text | `#172033` |
| Secondary text | `#667085` |
| Muted text | `#98A2B3` |
| Border | `#E4EAF2` |
| In repair | `#1677FF` |
| Completed | `#13A8A8` |
| Awaiting settlement | `#F79009` |
| Settled | `#12B76A` |
| Insurance warning / destructive | `#F04438` |

Status is never communicated by color alone. Every status includes a text label and, where useful, an icon.

### Typography

| Role | Size | Weight |
| --- | --- | --- |
| Page title | 24 px | 700 |
| Section title | 18 px | 650 |
| Card title / important value | 16-20 px | 600-700 |
| Body | 15 px | 400-500 |
| Supporting text | 13 px | 400 |
| Caption | 12 px | 400-500 |

Chinese system fonts are used. Text uses zero letter spacing and natural line wrapping. Critical numbers use tabular figures when supported.

### Spacing and Shape

- Screen horizontal padding: 16 px.
- Section gap: 16 px.
- In-group gap: 8 or 12 px.
- Minimum touch target: 44 x 44 px.
- Cards and input containers: 8 px radius.
- Bottom sheets: 8 px top radius.
- Buttons: 8 px radius.
- Borders are preferred over strong shadows. Elevated overlays use a soft environment-colored shadow.

## 4. Information Architecture

### Global Navigation

The bottom navigation is fixed and identical for employees and administrators:

1. Workbench
2. Work Orders
3. Add
4. Records
5. Profile

The Add item is the visually emphasized center action. Permission differences change content and actions, not navigation position.

### Screen Responsibilities

#### Workbench

- Current company, date, role, and sync state.
- Repair, completed, awaiting settlement, and insurance-expiry status.
- Today's arrivals and production value.
- Prioritized tasks: awaiting settlement, expiring insurance, and stale work orders.
- Administrator-only business summary.

Every metric is actionable and opens a pre-filtered list. No decorative or non-interactive statistic is included.

#### Work Orders

- Current unsettled orders only.
- Segments: All, In Repair, Completed, Awaiting Settlement.
- Search by plate, customer, phone, or order number.
- Bottom-sheet filters for staff, insurer, date, vehicle type, and repair status.
- Order detail with status timeline, costs, repair content, notes, and role-appropriate actions.

#### Add

- Opens a four-step full-screen work-order flow.
- Supports creation and editing through the same form shell.
- Can save a draft when the user exits before submission.

#### Records

- Customer Vehicles.
- Insurance Records.
- Repair History containing settled work orders only.
- Search and filters use bottom sheets rather than permanent multi-row toolbars.

#### Profile

- Current account, role, and company.
- Network and cloud synchronization state.
- App version and update check.
- Privacy information, cache management, and sign out.

## 5. Role Permissions

| Capability | Employee | Administrator |
| --- | --- | --- |
| View workbench and records | Yes | Yes |
| Create and edit work order | Yes | Yes |
| Change status to In Repair | Yes | Yes |
| Change status to Completed | Yes | Yes |
| Change status to Awaiting Settlement | Yes | Yes |
| Settle work order | No | Yes |
| Reverse settlement | No | Yes |
| Void work order | No | Yes |
| View settlement receipt | Yes when order is visible | Yes |
| Upload or delete settlement receipt | No | Yes |
| View administrator business summary | No | Yes |
| Export data | No | Not provided in mobile v1 |

Unauthorized actions are omitted from the UI and are also rejected by the server.

## 6. Core Flows

### Authentication and Company Selection

1. Select Tongda Auto Service Center or Xinqiheng Auto Service Center.
2. Enter account and password.
3. Authenticate against the cloud service.
4. Administrators may enter either company. Employees see only authorized companies.
5. The selected company becomes the active data scope and is always visible on the workbench.

Full company names:

- 鄂尔多斯市通达汽车服务有限公司
- 鄂尔多斯市鑫齐恒汽车服务有限公司

### Create Work Order

1. Customer and vehicle: name, phone, plate, model, VIN.
2. Insurance and accident: insurer, required insurance expiry date, claim number, vehicle type, accident type.
3. Repair and fees: repair content, labor fee, material fee, payment method, responsible staff.
4. Review and submit: show all entered information grouped by section.

Entry date is locked to the current date. Entry time remains editable. Submission creates or updates the customer vehicle record and synchronizes insurance expiry information into the insurance record.

Accident types:

- 喷漆维修（无换件）
- 钣喷维修（有换件）
- 机电维修保养
- 数据修复

### Status Lifecycle

`In Repair -> Completed -> Awaiting Settlement -> Settled`

- Employees can perform the first three status selections.
- Administrators can perform all transitions and reverse settlement.
- Every transition opens a confirmation dialog describing the result.
- Successful transitions update the current screen and related counters immediately.

### Settlement

1. Review labor, material, total, payment method, and settlement note.
2. Upload a required payment receipt to COS.
3. Preview, replace, or remove the image before confirmation.
4. Confirm settlement.
5. Lock the settled business fields and move the order to repair history.

Receipt upload failure blocks settlement and preserves all entered settlement data.

### Reverse Settlement

1. Administrator opens a settled order in repair history.
2. Select Reverse Settlement.
3. Confirm the consequence in a destructive confirmation dialog.
4. The order returns to Awaiting Settlement and reappears in current work orders.
5. The event is written as one user-level audit operation rather than several low-level log rows.

## 7. Overlay and Navigation Rules

### Overlay Levels

- Bottom sheet: filters, option sets, date ranges, status selection, and secondary actions.
- Full-screen modal: create, edit, details, settlement, and receipt workflow.
- Center dialog: destructive confirmation, status confirmation, and important errors.
- Immersive viewer: settlement receipt image.

Only one primary overlay is open at a time. A confirmation dialog may appear above a full-screen modal.

### Lifecycle Rules

- Opening an overlay always requires an explicit current user action.
- Closing an overlay clears its open state.
- Leaving a route clears all route-owned overlay state.
- Returning to a route never reopens a previously closed overlay.
- Android back closes the top overlay first, then returns to the previous screen.
- Unsaved form data triggers a discard or save-draft confirmation.

## 8. Component Inventory

- App top bar with company and sync state.
- Five-item bottom navigation with emphasized Add action.
- Four-state operational summary.
- Priority task list.
- Metric card with explicit destination.
- Segmented status control.
- Search field with clear action.
- Work-order card.
- Status timeline.
- Customer and vehicle summary block.
- Cost summary.
- Four-step form progress indicator.
- Labeled input, select, date, time, money, and multiline controls.
- Bottom-sheet filter and option picker.
- Confirmation dialog.
- Receipt upload, preview, and image viewer.
- Empty, loading, retry, offline, and permission-denied states.
- Toast feedback for non-blocking success messages.

## 9. Screen and State Atlas

The visual design deliverable will cover at least these 22 states:

1. Login and company selection.
2. Employee workbench.
3. Administrator workbench.
4. Current work-order list.
5. Work-order filter bottom sheet.
6. Employee work-order detail.
7. Administrator work-order detail.
8. Create order step 1: customer and vehicle.
9. Create order step 2: insurance and accident.
10. Create order step 3: repair and fees.
11. Create order step 4: review and submit.
12. Edit work order.
13. Status confirmation dialog.
14. Settlement full-screen modal.
15. Receipt upload and preview.
16. Reverse-settlement confirmation.
17. Customer vehicle records.
18. Insurance records.
19. Repair history.
20. Profile and sync state.
21. Offline read-only state.
22. Empty, loading, error, and permission states.

## 10. Data and Error Behavior

- Cloud data is the source of truth.
- Cached data is company-scoped and read-only while offline.
- Mutation buttons are unavailable offline and explain why when tapped.
- Failed submissions retain local form state and expose Retry.
- Duplicate submissions are prevented while a request is pending.
- Successful mutations refresh the affected order, counters, records, and history scope.
- Dates and audit times are displayed in Asia/Shanghai.

## 11. Accessibility and Content Rules

- Minimum body-text contrast is 4.5:1.
- Focus, pressed, loading, disabled, error, and success states are visually distinct.
- Controls use explicit labels; placeholders are examples or requirements, not stored-looking demo values.
- Important actions use icon plus text. Familiar navigation icons may use icon and label in the bottom bar.
- Long work descriptions wrap to multiple lines and are clamped only in list previews.
- Error messages identify the field and corrective action.
- Reduced-motion mode removes nonessential transitions.

## 12. Validation Plan

- Verify each role against the permission matrix.
- Verify the complete create-order, status-change, settlement, and reverse-settlement flows.
- Verify settled orders move to history and reversed orders return to the current queue.
- Verify modal state never reopens after close or route changes.
- Verify no horizontal scrolling on supported Android phone widths.
- Verify long Chinese content, large currency values, and empty values do not overlap.
- Verify receipt upload retry and settlement blocking behavior.
- Verify offline cache is readable and all mutations remain blocked.
- Verify screenshots at small phone, large phone, and tablet widths.

## 13. Out of Scope for Mobile Version 1

- Account and password administration.
- Permission assignment.
- Insurance company and staff dictionaries.
- Operation-log administration.
- Excel export.
- Background push notifications.
- Offline create, edit, status change, settlement, or conflict resolution.

