# GoodPick Go MVP - Design Guidelines

## Design Approach

**Reference-Based Design**: Drawing inspiration from successful e-commerce and social commerce platforms popular in the Thai/Asian market (LINE Shopping, Shopee, Instagram Shopping) while maintaining a modern, trustworthy aesthetic suitable for deals and coupons.

**Core Design Principles**:
1. **Mobile-First Excellence**: Optimized for LINE LIFF environment and mobile browsing
2. **Visual Trust Signals**: Professional presentation that builds confidence in deals
3. **Scan-Friendly Layouts**: Quick comprehension of offers and value propositions
4. **Action-Oriented Design**: Clear CTAs that drive coupon claiming behavior

---

## Typography System

**Font Families**:
- **Primary**: Inter or Noto Sans for clean, modern readability across languages
- **Display**: Poppins for headlines and emphasis (friendly, approachable feel)
- **Thai Script**: Noto Sans Thai or Sarabun for native language support

**Hierarchy**:
- **Hero Headlines**: 32-40px (mobile), 48-64px (desktop), bold weight
- **Section Titles**: 24-28px, semi-bold
- **Card Titles**: 18-20px, medium weight
- **Body Text**: 14-16px, regular weight
- **Captions/Meta**: 12-14px, regular or medium
- **Price/Value**: 28-36px for primary price, bold, use tabular numbers

---

## Layout System

**Spacing Units**: Use Tailwind units of **2, 4, 6, 8, 12, 16, 20, 24** (p-2, gap-4, mb-8, etc.)

**Container Strategy**:
- Full-width sections with inner `max-w-7xl` for content
- Mobile: 16px horizontal padding
- Desktop: Natural max-width containment with breathing room

**Grid Patterns**:
- **Coupon Cards**: 1 column (mobile), 2 columns (tablet), 3 columns (desktop)
- **Store Listings**: Full-width cards on mobile, 2-column on desktop
- **Admin Tables**: Responsive horizontal scroll on mobile, full table on desktop

---

## Component Library

### Navigation
**User-Facing Header**:
- Fixed position on scroll for mobile (LINE-style)
- Logo left, navigation/profile right
- Transparent overlay on hero sections with blur background
- Clean white background for content pages

**Admin Dashboard**:
- Sidebar navigation (collapsible on mobile)
- Top bar with user profile and notifications
- Breadcrumb navigation for context

### Coupon/Campaign Cards

**Featured Campaign Card**:
- Large aspect ratio image (16:9 or 4:3)
- Gradient overlay on images to ensure text readability
- Badge overlay for discount percentage (top-right corner)
- Title overlay at bottom with blur backdrop
- Sharp, prominent CTA button with high contrast

**List View Cards**:
- Horizontal layout on mobile (image left, content right)
- Compact vertical cards in grid on desktop
- Clear visual hierarchy: Image → Title → Value Proposition → CTA
- Status indicators (available, claimed, expired) with color coding

**Card Elements**:
- Rounded corners (8-12px radius)
- Subtle shadow for elevation
- Clear separation between cards (16-24px gap)

### Buttons & CTAs

**Primary Action (Claim Coupon)**:
- Large, full-width on mobile
- Bold, high-contrast color
- Minimum 48px height (touch-friendly)
- Clear text: "Claim Now" / "立即领取" / "รับคูปอง"
- Disabled states clearly communicated

**Secondary Actions**:
- Outlined style or ghost buttons
- Consistent sizing with primary
- Navigation, share, details buttons

**Button States**:
- Default: Solid color, sharp edges or slight rounding (4-6px)
- Active/Pressed: Slightly darker shade
- Disabled: Reduced opacity, clear visual feedback

### Forms & Inputs

**Admin Forms**:
- Clear label above input
- Sufficient padding inside inputs (12-16px vertical)
- Focus states with border highlight
- Inline validation messages
- Multi-language input fields grouped clearly

**Search & Filters**:
- Prominent search bar with icon
- Filter chips/tags for quick selection
- Clear active filter indicators

### Data Display

**Store Information**:
- Store image thumbnail (circular or rounded square)
- Name, address, distance clearly separated
- Phone number as clickable link
- Navigation button prominently placed
- Map integration for location context

**QR Code Display** (UserCouponDetail):
- Centered, large enough to scan easily (200-250px)
- Clean white background around code
- Redemption code clearly visible below
- Countdown timer with visual urgency (changing colors as expiry approaches)

**Price & Value Display**:
- Original price: Strikethrough, muted color, smaller size
- Discounted price: Large, bold, primary accent color
- Savings amount: Highlighted badge or tag
- Currency symbol consistent and localized

### Lists & Tables

**Admin Tables**:
- Alternating row colors for readability
- Fixed header on scroll
- Action buttons aligned right
- Responsive: Card view on mobile, table on desktop
- Clear status indicators with color coding

**Coupon Lists** (User):
- Tab navigation for status filters (All, Available, Used, Expired)
- Card-based layout
- Quick actions accessible
- Empty states with helpful illustrations and CTAs

### Overlays & Modals

**Admin Modals**:
- Clear title and close button
- Content area with proper padding
- Footer with action buttons (Cancel left, Confirm right)
- Backdrop blur for focus

**User Modals**:
- Login prompts for LINE integration
- Success/error confirmations
- Share dialogs with platform options

---

## Page-Specific Layouts

### Landing/Campaign Detail Page (CouponDetail.vue)

**Hero Section**:
- Full-width image carousel (if multiple images/videos)
- Overlay gradient for text readability
- Discount badge positioned prominently
- Title and key offer details on overlay

**Content Sections** (flowing naturally, not forced viewport heights):
- **Offer Details**: Price comparison, value proposition, validity (py-12 to py-16)
- **Nearby Stores**: Horizontal scroll on mobile, 3-column grid on desktop (py-16)
- **Usage Rules**: Collapsible accordion, clear typography (py-12)
- **CTA Section**: Fixed bottom bar on mobile, prominent in-flow on desktop

**Multi-Column Usage**:
- Store cards: 3 columns on desktop, horizontal scroll on mobile
- Features/benefits: 2 columns on tablet, single column on mobile

### User Coupon Detail (UserCouponDetail.vue)

**QR Display Section**:
- Centered, prominent placement (py-20)
- Countdown timer directly above/below QR
- Manual code as fallback

**Store Navigation**:
- 2-3 nearest stores displayed
- Distance clearly shown
- One-tap navigation to maps

### My Coupons List

**Layout**:
- Tab-based filtering at top
- Coupon cards in single column (mobile) or 2-column grid (tablet+)
- Empty state with illustration and "Explore Deals" CTA

### Admin Dashboard

**Overview Cards** (py-8):
- 4-column grid on desktop (Total Campaigns, Active Stores, Users, Redemptions)
- Stacked on mobile
- Icon + Number + Label layout

**Data Tables**:
- Proper spacing (py-20 between sections)
- Pagination at bottom
- Bulk actions toolbar when items selected

---

## Images

**Hero Images**: 
- **Campaign Detail Page**: Large hero image (16:9 aspect ratio, min 1200px width)
  - Position: Top of page, full-width
  - Treatment: Subtle gradient overlay (dark bottom) for text readability
  - Content: Product/service/lifestyle shot showing the value proposition

**Coupon Card Images**:
- Aspect ratio: 16:9 or 4:3
- Quality: High-res, vibrant, lifestyle-focused
- Position: Top or left of card
- Treatment: Sharp edges with card border radius

**Store Images**:
- Circular avatars (64-80px) or rounded squares
- Fallback: Store initials on colored background

**Empty States**:
- Friendly illustrations (no coupons, no results)
- Centered, with supportive text and CTA

**Admin Upload Previews**:
- Thumbnail grid for media uploader
- Video thumbnails with play icon overlay

---

## Visual Treatments

**Color Strategy** (to be defined in theme, not in guidelines):
- Hierarchy through size and weight, not color references
- Status indicators: semantic meanings (success, warning, danger, info)
- Consistent contrast ratios for accessibility

**Shadows & Elevation**:
- Cards: Subtle shadow (equivalent to shadow-sm or shadow-md)
- Modals: Stronger shadow (shadow-lg)
- Fixed elements (bottom CTA bar): shadow-xl for prominence

**Border Radius**:
- Small elements (buttons, tags): 6-8px
- Cards: 12px
- Modals: 16px
- Images: Match card radius or 8px

**Animations**: Use sparingly
- Smooth transitions on state changes (0.2-0.3s)
- Subtle hover effects on interactive elements
- Loading states with simple spinners
- Avoid distracting scroll animations

---

## Critical UX Guidelines

**Mobile Optimization**:
- Touch targets minimum 44px
- Thumb-friendly button placement (bottom of screen for primary actions)
- Swipe gestures for carousels
- Easy one-handed navigation

**Accessibility**:
- Sufficient color contrast (WCAG AA minimum)
- Text alternatives for images
- Keyboard navigation for admin dashboard
- Focus states clearly visible

**Performance**:
- Lazy load images
- Optimize for LINE LIFF SDK constraints
- Fast initial page load (critical for conversion)

**Localization**:
- Sufficient space for Thai/Chinese text expansion
- RTL-ready layout structure (future-proofing)
- Cultural appropriateness in imagery and colors

---

**Quality Standard**: This design should feel polished, trustworthy, and conversion-optimized from the first deployment. Every section must serve a clear purpose in driving user engagement and coupon claims.