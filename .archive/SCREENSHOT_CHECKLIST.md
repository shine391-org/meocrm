# Screenshot Checklist for Frontend Development

> **Quick reference:** What screenshots Claude needs and when

---

## 🔴 URGENT - Need TODAY

### Frontend Products (Batch 2E) - 8 Screenshots

**Why urgent:** API ready ✅, can implement immediately

**Option 1: Take screenshots from reference systems**
- KiotViet: https://www.kiotviet.vn/
- Sapo: https://www.sapo.vn/
- Square POS: https://squareup.com/
- Shopify Admin: https://www.shopify.com/

**Option 2: Figma/Design files**
- Share Figma link (view-only access)

**Option 3: Wireframes + specs**
- Hand-drawn or Balsamiq
- Add notes for: colors, spacing, interactions

---

### Screenshots Needed:

#### 1. Products List Page (Desktop 1920x1080)
```
What to show:
├─ Table/Grid layout of products
├─ Columns: Image, Name, SKU, Price, Stock, Category, Actions
├─ Pagination component (bottom)
├─ Filters sidebar (left) or top bar
├─ Search bar position
└─ Add Product button (top-right usually)
```

#### 2. Product Create Form - Section 1
```
What to show:
├─ Form layout (single column? two columns? tabs?)
├─ Basic info fields:
│  ├─ Product Name
│  ├─ SKU (with auto-generate button?)
│  ├─ Category (dropdown/select)
│  └─ Description (textarea/rich editor?)
└─ Image upload area (drag-drop? multiple images?)
```

#### 3. Product Create Form - Section 2
```
What to show:
├─ Pricing fields:
│  ├─ Selling Price
│  ├─ Cost Price
│  ├─ Compare at Price (for discounts)
│  └─ Tax options
└─ Inventory fields:
   ├─ Stock quantity
   ├─ SKU
   ├─ Barcode
   └─ Track quantity checkbox
```

#### 4. Product Create Form - Variants Section
```
What to show:
├─ Enable variants toggle/checkbox
├─ Variant options:
│  ├─ Add option button (Size, Color, Material, etc.)
│  └─ Option values (e.g., Size: S, M, L, XL)
└─ Variant table:
   ├─ Columns: Size, Color, SKU, Price, Stock, Image
   ├─ Bulk edit button
   └─ Add/remove variant rows
```

#### 5. Products List - Filters Sidebar
```
What to show:
├─ Category filter (tree/nested checkboxes)
├─ Price range (slider/min-max inputs)
├─ Stock status (In stock, Low stock, Out of stock)
├─ Status (Active/Inactive)
└─ Clear all filters button
```

#### 6. Products List - Search & Bulk Actions
```
What to show:
├─ Search bar (magnifying glass icon)
│  └─ Placeholder: "Search by name, SKU, barcode..."
├─ Search results/autocomplete dropdown
├─ Bulk select checkboxes
└─ Bulk actions dropdown (Delete, Export, Change status)
```

#### 7. Product Edit Page
```
What to show:
├─ Same layout as create form
├─ Status badge (Active/Inactive)
├─ Created/Updated timestamps
├─ Delete button (with confirmation)
└─ Save changes button (highlight if unsaved changes)
```

#### 8. Products List - Mobile Responsive (Optional but nice)
```
What to show:
├─ Card layout (instead of table)
├─ Hamburger menu for filters
└─ Search bar at top
```

---

## 🟠 HIGH PRIORITY - Need Day 3-4

### POS Frontend (Batch 4C) - 5 Screenshots

**Why Day 3-4:** Orders Backend will be complete by then

**Same options:** Reference systems / Figma / Wireframes

---

### Screenshots Needed:

#### 1. POS Main Layout
```
What to show:
├─ Overall layout:
│  ├─ Left side: Product grid/list
│  └─ Right side: Shopping cart
├─ Top header:
│  ├─ Logo/branding
│  ├─ Store/branch selector
│  └─ User profile/logout
└─ Color scheme, spacing

Alternative layouts:
- Single screen with modal cart?
- Tabs (Products → Cart → Payment)?
- Full screen on mobile?
```

#### 2. POS - Product Grid Section
```
What to show:
├─ Product cards/tiles:
│  ├─ Product image
│  ├─ Name
│  ├─ Price
│  └─ Stock indicator
├─ Category filter buttons/sidebar
├─ Search bar (with barcode scanner icon?)
├─ Grid size (4 cols? 6 cols?)
└─ "Add to cart" interaction (click card? + button?)
```

#### 3. POS - Cart Component
```
What to show:
├─ Cart header ("Order #123" or "Cart")
├─ Cart items list:
│  ├─ Product name
│  ├─ Quantity controls (- | 2 | +)
│  ├─ Unit price
│  ├─ Subtotal
│  └─ Remove item (X icon)
├─ Customer info section:
│  ├─ Search/select customer
│  └─ "Guest" option
├─ Summary:
│  ├─ Subtotal
│  ├─ Discount
│  ├─ Shipping fee
│  ├─ Tax
│  └─ Total (emphasized)
└─ Buttons:
   ├─ Clear cart
   ├─ Save draft
   └─ Checkout (primary action)
```

#### 4. POS - Payment Modal/Screen
```
What to show:
├─ Order summary (collapsed or expanded)
├─ Payment method selection:
│  ├─ Cash (radio/button)
│  ├─ Bank Transfer
│  ├─ Credit Card
│  └─ E-wallet (Momo, ZaloPay)
├─ Cash calculator section:
│  ├─ Total amount
│  ├─ Tendered amount input
│  └─ Change amount (calculated)
├─ Partial payment toggle?
│  ├─ Amount to pay now
│  └─ Amount owed
├─ Shipping section:
│  ├─ Shipping partner (GHN, GHTK, Self)
│  └─ Shipping address
└─ Buttons:
   ├─ Back to cart
   └─ Complete order (primary)
```

#### 5. POS - Order Complete Screen
```
What to show:
├─ Success animation/icon (checkmark)
├─ Order number (large, emphasized)
├─ Order summary (collapsed)
├─ Actions:
│  ├─ Print receipt (printer icon)
│  ├─ Send email/SMS
│  ├─ View order details
│  └─ New order (primary button)
└─ Optional: QR code for customer tracking
```

---

## 🎨 Design Specifications (If no screenshots)

If you can't provide screenshots, answer these questions:

### Color Scheme:
- [ ] Primary color: _______ (e.g., #3B82F6 blue)
- [ ] Secondary color: _______
- [ ] Success: _______ (default: green)
- [ ] Danger: _______ (default: red)
- [ ] Background: _______ (default: white/light gray)

### Component Library Preference:
- [ ] Ant Design (antd.com) - Enterprise, feature-rich
- [ ] Material UI (mui.com) - Google style
- [ ] Shadcn UI (ui.shadcn.com) - Modern, customizable
- [ ] Tailwind CSS only (utility-first, minimal JS)
- [ ] Custom design (Claude will use Tailwind defaults)

### Layout Preferences:
- [ ] Sidebar navigation or Top navigation?
- [ ] Fixed header or Scrollable?
- [ ] Compact spacing or Spacious?
- [ ] Rounded corners or Square?

### Typography:
- [ ] Font family: _______ (default: Inter/system font)
- [ ] Font size: _______ (default: 16px base)

---

## 📤 How to Submit Screenshots

### Option 1: Cloud Storage (Easiest)
```
1. Upload to Google Drive / Dropbox / OneDrive
2. Share link (view access)
3. Paste link in chat
```

### Option 2: GitHub (Best for versioning)
```
1. Create folder: docs/design/
2. Add screenshots: products-list.png, pos-layout.png, etc.
3. Commit and push
4. Notify Claude
```

### Option 3: Direct Upload (If supported)
```
1. Drag and drop images in chat
2. Claude will analyze and implement
```

---

## ✅ Quick Checklist

**Before starting Frontend Products:**
- [ ] 8 Products screenshots provided OR
- [ ] Figma link shared OR
- [ ] Design specs answered (color, component library, layout)

**Before starting POS Frontend:**
- [ ] 5 POS screenshots provided OR
- [ ] POS layout reference (e.g., "make it like Square POS") OR
- [ ] Wireframes with annotations

**If stuck:**
- [ ] Use this prompt: "Make it look like [KiotViet/Sapo/Square POS] but with these colors: ____"

---

## 🚀 Fast Track Option

**Don't have time for screenshots?**

Option: "Use modern defaults"
- Claude will use: Shadcn UI + Tailwind CSS
- Color: Blue primary (#3B82F6)
- Layout: Standard dashboard (sidebar + content)
- You can refine design later after seeing first version

Just say: **"Use modern defaults, I'll refine later"**

---

**Ready to start?** Provide screenshots and Claude will auto-code! 🎨
