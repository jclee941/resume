# Figma Import Guide

This guide shows you how to recreate the Neu-brutalism design system in Figma.

---

## Quick Start (5 minutes)

### Option 1: Tokens Studio Plugin (Recommended)

1. **Install Plugin**:
   - Open Figma
   - Go to Plugins → Browse plugins
   - Search "Tokens Studio for Figma"
   - Install and run the plugin

2. **Import Tokens**:
   - In Tokens Studio, click "Import" → "From File"
   - Select `docs/figma-tokens.json` from this repository
   - Click "Import" → All design tokens will be added

3. **Apply to Components**:
   - Design tokens are now available as variables
   - Use them when creating components (see Component Library below)

### Option 2: Manual Setup (15 minutes)

Follow the detailed steps in Section 2.

---

## 1. Color Styles

**Create these color styles in Figma**:

| Style Name | Hex Value | Usage |
|------------|-----------|-------|
| `Black` | `#000000` | Text, borders, shadows |
| `White` | `#ffffff` | Backgrounds, button text |
| `Cyan` | `#06b6d4` | Accents, links |
| `Cyan Dark` | `#0891b2` | Hover states |
| `Gray/50` | `#fafafa` | Subtle backgrounds |
| `Gray/100` | `#f5f5f5` | Light backgrounds |
| `Gray/500` | `#737373` | Secondary text |

**Steps**:
1. Select any shape in Figma
2. Click on the fill color
3. Click the 4-square icon (Color Styles)
4. Click "+" to create new style
5. Name it (e.g., "Black")
6. Enter hex value `#000000`
7. Repeat for all colors

---

## 2. Text Styles

**Install Inter Font First**:
- Go to [Google Fonts - Inter](https://fonts.google.com/specimen/Inter)
- Click "Get font" → "Install"
- Or use Figma's font menu: Text → Font → Search "Inter"

**Create these text styles**:

| Style Name | Font | Size | Weight | Line Height | Letter Spacing |
|------------|------|------|--------|-------------|----------------|
| `Display/XL` | Inter | 112px | Black (900) | 100% | -4% |
| `Display/LG` | Inter | 64px | Black (900) | 110% | -3% |
| `Heading/XL` | Inter | 64px | Black (900) | 100% | 0% |
| `Heading/LG` | Inter | 24px | Black (900) | Auto | -5% |
| `Heading/MD` | Inter | 20px | Regular (400) | Auto | 0% |
| `Body/LG` | Inter | 32px | Regular (400) | 140% | 0% |
| `Body/MD` | Inter | 18px | Bold (700) | Auto | 0% |
| `Body/SM` | Inter | 16px | Regular (400) | 160% | 0% |
| `Label/MD` | Inter | 14px | Bold (700) | Auto | 5% |

**Steps**:
1. Create a text box with "Sample Text"
2. Set font to Inter
3. Set size, weight, line height, letter spacing per table
4. Click "Text Styles" icon (4-square in properties)
5. Click "+" to create new style
6. Name it (e.g., "Display/XL")
7. Repeat for all text styles

---

## 3. Effect Styles (Shadows)

**Create these effect styles**:

### Shadow/Brutal
- **Type**: Drop Shadow
- **X**: `6px`
- **Y**: `6px`
- **Blur**: `0px`
- **Spread**: `0px`
- **Color**: Black (#000000), 100% opacity

### Shadow/Brutal LG
- **Type**: Drop Shadow
- **X**: `10px`
- **Y**: `10px`
- **Blur**: `0px`
- **Spread**: `0px`
- **Color**: Black (#000000), 100% opacity

**Steps**:
1. Select any shape
2. Go to Effects panel
3. Click "+" → Drop Shadow
4. Set X, Y, Blur, Spread per spec
5. Set color to Black, 100% opacity
6. Click the effect style icon (4-square)
7. Click "+" to create new style
8. Name it "Shadow/Brutal"
9. Repeat for "Shadow/Brutal LG"

---

## 4. Component Library

Now create reusable components using the styles above.

### 4.1 Primary Button

**Visual Reference**:
```
┌─────────────────────────────────┐
│                                 │
│    CONTACT ME                   │
│                                 │
└─────────────────────────────────┘
      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
       6px offset shadow
```

**Steps**:
1. Create rectangle (any size)
2. **Fill**: Black
3. **Stroke**: 3px, Inside, Black
4. **Effect**: Shadow/Brutal
5. **Corner Radius**: 0
6. Add text "CONTACT ME"
7. **Text Style**: Body/MD
8. **Text Color**: White
9. Select both (frame + text)
10. Right-click → "Frame Selection" (Cmd+Opt+G)
11. **Auto Layout**: Horizontal
12. **Padding**: 16px vertical, 32px horizontal
13. **Gap**: 8px (if icon present)
14. Right-click frame → "Create Component"
15. Name: "Button/Primary"

**Add Hover Variant**:
1. Select component
2. Click "+" in Properties panel → "Add variant"
3. Create property "State" with values "Default", "Hover"
4. On "Hover" variant:
   - Remove Shadow effect
   - No fill/stroke changes needed
5. Add prototype interaction:
   - Default → Hover: While hovering
   - Animation: Ease in-out, 150ms

### 4.2 Secondary Button

Same as Primary Button, but:
- **Fill**: White
- **Text Color**: Black
- On Hover: Change fill to Cyan (#06b6d4)

### 4.3 Project Card

**Visual Reference**:
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  PROJECT TITLE                                  │
│  ─────────────                                  │
│                                                 │
│  Description text goes here. This is a brief   │
│  overview of the project and its key features. │
│                                                 │
│  [Python] [Docker] [Kubernetes]                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Steps**:
1. Create rectangle (width: 400px, height: auto)
2. **Fill**: White
3. **Stroke**: 3px, Inside, Black
4. **Corner Radius**: 0
5. **Effect**: None (shadow added on hover)
6. Add text "PROJECT TITLE"
   - **Text Style**: Heading/LG
7. Add description text
   - **Text Style**: Body/SM
8. Add tech badges (see 4.4 below)
9. Select all → Frame Selection
10. **Auto Layout**: Vertical
11. **Padding**: 32px all sides
12. **Gap**: 16px between elements
13. Right-click → "Create Component"
14. Name: "Card/Project"

**Add Hover Variant**:
- On Hover variant: Add Shadow/Brutal LG effect

### 4.4 Tech Badge

**Visual Reference**:
```
┌──────────┐
│  PYTHON  │
└──────────┘
```

**Steps**:
1. Create text "PYTHON"
   - **Text Style**: Label/MD
   - **Text Transform**: Uppercase
2. Frame it with Auto Layout
3. **Padding**: 8px vertical, 16px horizontal
4. **Fill**: White
5. **Stroke**: 3px, Inside, Black
6. **Corner Radius**: 0
7. Right-click → "Create Component"
8. Name: "Badge/Tech"

**Make it Dynamic**:
1. Select text layer
2. Right-click → "Create Component Property" → "Text"
3. Name property "Label"
4. Default value: "TECH"

### 4.5 Nav Link

**Steps**:
1. Create text "Home"
   - **Text Style**: Heading/LG
   - **Color**: Black
2. Right-click → "Create Component"
3. Name: "Nav/Link"
4. Add hover variant:
   - **Text Color**: Cyan
   - Add slight transform (optional)

---

## 5. Layout Grid

**Desktop Grid (1400px)**:
1. Create frame (W: 1400px, H: auto)
2. Click "Layout Grid" icon (+)
3. **Type**: Columns
4. **Count**: 12
5. **Gutter**: 32px
6. **Margin**: 32px
7. **Color**: Red, 10% opacity

**Tablet Grid (768px)**:
- **Columns**: 8
- **Gutter**: 24px
- **Margin**: 24px

**Mobile Grid (375px)**:
- **Columns**: 4
- **Gutter**: 16px
- **Margin**: 16px

---

## 6. Pages Setup

Create these pages in your Figma file:

1. **Cover** - Title page with project info
2. **Design System** - Color styles, text styles, effects
3. **Components** - All components with variants
4. **Desktop** - Desktop layouts (1400px artboards)
5. **Tablet** - Tablet layouts (768px artboards)
6. **Mobile** - Mobile layouts (375px artboards)

---

## 7. Component Organization

**Recommended component hierarchy**:

```
Components
├── Button
│   ├── Primary
│   │   ├── Default
│   │   └── Hover
│   └── Secondary
│       ├── Default
│       └── Hover
├── Card
│   ├── Project
│   │   ├── Default
│   │   └── Hover
│   └── Stat
│       ├── Default
│       └── Hover
├── Badge
│   └── Tech
│       └── Default
└── Nav
    └── Link
        ├── Default
        └── Hover
```

**Steps**:
1. In Assets panel, click "+" next to "Local components"
2. Create folders: Button, Card, Badge, Nav
3. Drag components into appropriate folders
4. Rename components to follow hierarchy

---

## 8. Prototyping

**Add interactions for demo**:

1. **Button Hover**:
   - Select Primary Button (Default variant)
   - Click "Prototype" tab
   - Drag from Default to Hover
   - Trigger: While hovering
   - Animation: Ease in-out, 150ms

2. **Card Hover**:
   - Same as button
   - Add slight transform: `translate(-6px, -6px)`

3. **Nav Link Hover**:
   - Color change to Cyan
   - Animation: 150ms

**Present Mode**:
- Press "Play" button (top-right)
- Test all interactions
- Share link with "View only" access

---

## 9. Export Settings

**For typescript/portfolio-worker developers**:

1. Select component
2. **Export Settings**:
   - Format: PNG or SVG
   - Scale: 1x, 2x (retina)
3. Click "Export"

**For design handoff**:

Use Figma's built-in "Inspect" panel:
- Developers can copy CSS directly
- Shows spacing, colors, typography
- Generates code snippets

---

## 10. Figma Plugins to Install

1. **Tokens Studio** - Import design tokens (required for Option 1)
2. **Content Reel** - Generate realistic content for demos
3. **Stark** - Check accessibility (color contrast)
4. **Figma to Code** - Export to HTML/CSS (optional)
5. **Component Inspector** - Document components

---

## 11. Keyboard Shortcuts

Learn these for faster work:

| Shortcut | Action |
|----------|--------|
| `R` | Rectangle tool |
| `T` | Text tool |
| `F` | Frame tool |
| `Cmd+G` | Group selection |
| `Cmd+Opt+G` | Frame selection |
| `Cmd+D` | Duplicate |
| `Cmd+Opt+C` | Copy properties |
| `Cmd+Opt+V` | Paste properties |
| `Shift+A` | Add auto layout |
| `Opt+Cmd+K` | Create component |

---

## 12. Resources & Next Steps

**Official Figma Resources**:
- [Figma Tutorial Videos](https://www.figma.com/resources/learn-design/)
- [Component Best Practices](https://www.figma.com/best-practices/components-styles-and-shared-libraries/)
- [Auto Layout Guide](https://help.figma.com/hc/en-us/articles/360040451373)

**Community Resources**:
- [Figma Community - Neu-brutalism](https://www.figma.com/community/search?model_type=files&q=neubrutalism)
- [Design System Checklist](https://www.designsystemchecklist.com/)

**Need Help?**:
- Figma Community Forum: [forum.figma.com](https://forum.figma.com)
- Design System Slack: [design-systems.slack.com](https://design-systems.slack.com)

---

## 13. Visual Component Gallery

### Button Variations

```
PRIMARY (Default)          PRIMARY (Hover)
┌──────────────┐           ┌──────────────┐
│ CONTACT ME   │           │ CONTACT ME   │  (no shadow)
└──────────────┘           └──────────────┘
  ▓▓▓▓▓▓▓▓▓▓▓▓▓             (translated 6px, 6px)
  ▓▓▓▓▓▓▓▓▓▓▓▓▓

SECONDARY (Default)        SECONDARY (Hover - Cyan)
┌──────────────┐           ┌──────────────┐
│ VIEW WORK    │           │ VIEW WORK    │
└──────────────┘           └──────────────┘
  ▓▓▓▓▓▓▓▓▓▓▓▓▓               ▓▓▓▓▓▓▓▓▓▓▓▓▓
```

### Card Variations

```
PROJECT CARD (Default)
┌─────────────────────────────────────────┐
│                                         │
│  Blacklist Service                      │
│  ─────────────────                      │
│                                         │
│  실시간 악성 IP 차단 서비스           │
│                                         │
│  ┌────────┐ ┌────────┐ ┌────────┐     │
│  │ PYTHON │ │ REDIS  │ │ DOCKER │     │
│  └────────┘ └────────┘ └────────┘     │
│                                         │
└─────────────────────────────────────────┘

PROJECT CARD (Hover - moves up-left, shadow appears)
    ┌─────────────────────────────────────────┐
    │                                         │
    │  Blacklist Service                      │
    │  ─────────────────                      │
    │                                         │
    │  실시간 악성 IP 차단 서비스           │
    │                                         │
    │  ┌────────┐ ┌────────┐ ┌────────┐     │
    │  │ PYTHON │ │ REDIS  │ │ DOCKER │     │
    │  └────────┘ └────────┘ └────────┘     │
    │                                         │
    └─────────────────────────────────────────┘
      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
```

### Badge Variations

```
┌──────────┐  ┌──────────┐  ┌────────────┐  ┌──────────┐
│  PYTHON  │  │  DOCKER  │  │ KUBERNETES │  │   AWS    │
└──────────┘  └──────────┘  └────────────┘  └──────────┘
```

### Navigation

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  홈        프로젝트      경력        연락처          │
│  ──                                                  │
│  (Hover: cyan underline, translateY -2px)           │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 14. Checklist

Before finishing your Figma design system:

- [ ] All color styles created (10 colors)
- [ ] All text styles created (9 styles)
- [ ] Shadow effects created (2 effects)
- [ ] Button components with hover states
- [ ] Card components with hover states
- [ ] Badge component (dynamic text)
- [ ] Nav link component with hover
- [ ] Layout grids set up (desktop/tablet/mobile)
- [ ] Page structure organized
- [ ] Components organized in folders
- [ ] Prototype interactions added
- [ ] Accessibility checked (color contrast)
- [ ] Export settings configured
- [ ] Design tokens documented

---

**Estimated Time**: 1-2 hours for complete setup
**Skill Level**: Intermediate (basic Figma knowledge required)
**Last Updated**: 2025-10-16

For questions or help, refer to:
- `docs/DESIGN_SYSTEM.md` - Full design system documentation
- `docs/figma-tokens.json` - Design tokens for Tokens Studio plugin
