# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Baba** - A professional multi-project badge generator for events. Client-side web application with modern UI for generating personalized event badges. Features a complete project management system with IndexedDB persistence, visual template editor with drag & drop configuration, and CSV data management. The application loads a badge template image and participant data from CSV, then overlays participant information (name, function, organization) and a QR code with vCard contact data onto the template.

**Key Features**:
- **Project Management**: Create, save, load, and delete projects with all configurations
- **Visual Template Editor**: Drag & drop interface to configure text zones without coding
- **IndexedDB Persistence**: Store templates (as Blobs), configurations, and CSV data locally
- **Dynamic Configuration**: All badge positioning and styling configurable per project
- **CSV Editor**: Review and edit participant data with duplicate detection
- **Batch PDF Export**: Generate all badges as a single PDF file

## Architecture

**Modular single-page application** with separated concerns:

### File Structure
```
devfest-badge-generator/
├── index.html                     (393 lines - HTML structure with modals)
├── styles/
│   ├── main.css                  (Core styles and CSS variables)
│   ├── components.css            (Reusable UI components)
│   ├── editor.css                (CSV editor specific styles)
│   └── template-editor.css       (Template editor and project modal styles)
├── scripts/
│   ├── app.js                    (Global state, utilities, async project loading)
│   ├── project-manager.js        (IndexedDB CRUD, project UI)
│   ├── template-editor.js        (Visual template editor with drag & drop)
│   ├── column-mapping.js         (CSV column detection)
│   ├── csv-parser.js             (CSV import/export with PapaParse)
│   ├── csv-editor.js             (Interactive data table editor)
│   ├── badge-renderer.js         (Canvas badge generation with dynamic config)
│   └── pdf-generator.js          (PDF batch export with dynamic config)
├── logo-qr.png                   (QR code logo overlay)
└── CLAUDE.md                     (This file)
```

### Module Responsibilities

**app.js** - Application state management and project integration
- Global variables (participants, participantsOriginal, participantsEdited)
- Project state (currentProject, projectMode, db)
- Template and logo images
- Canvas and DOM element references
- Step management (`updateStep()` - now includes step 1.5 for template config)
- Status messages (`showStatus()`)
- Editor state (editorActive, columnMappingOverrides, duplicates, templateEditorActive, selectedZone)
- Async project loading (`loadProject()`, `saveCurrentProject()`)
- IndexedDB initialization on app startup

**project-manager.js** - Project persistence and management (~500 lines)
- IndexedDB initialization (`initDB()`) - Creates 'BabaDB' database with 'projects' store
- CRUD operations (all async):
  - `saveProjectToDB(project)` - Save/update project
  - `loadProjectFromDB(projectId)` - Load project by ID
  - `getAllProjects()` - Get all projects sorted by updatedAt
  - `deleteProjectFromDB(projectId)` - Delete project
- Project operations:
  - `createNewProject(name)` - Create new empty project
  - `exportProjectAsJSON(projectId)` - Export project as JSON file
  - `importProjectFromJSON(jsonString)` - Import project from JSON
- Blob utilities:
  - `fileToBlob(file)` - Convert File to Blob
  - `blobToDataURL(blob)` - Convert Blob to data URL for display
  - `blobToBase64(blob)` - Convert Blob to base64 string
  - `base64ToBlob(base64)` - Convert base64 to Blob
- UI rendering:
  - `showProjectModal()` / `hideProjectModal()` - Modal visibility
  - `renderProjectList()` - Display projects with actions (load, export, delete)
  - Event handlers for project selection, creation, deletion, export

**template-editor.js** - Visual template configuration (~900 lines)
- Template editor initialization and modal management
- Text zone management:
  - `createTextZone(x, y, width, height)` - Create new text zone
  - `deleteTextZone(zoneId)` - Remove text zone
  - `selectTextZone(zoneId)` - Select zone for editing
  - `getAllTextZones()` - Get all configured zones
- **Canvas-based sample text rendering**:
  - `redrawCanvas()` - Clear and redraw template image on canvas
  - `drawZoneSampleText(zone)` - Draw sample text with **identical rendering** to badge preview
  - Uses same functions as badge-renderer.js: `capitalize()`, `splitTextToFit()`, `drawMultilineTextOnEditor()`
  - `textBaseline = "top"` for consistent positioning (Y = top of text)
  - Real-time preview of text transformations and styling
- Drag & drop implementation:
  - `handleMouseDown(e)` - Start drag or resize operation
  - `handleMouseMove(e)` - Update position/size during drag
  - `handleMouseUp()` - End drag/resize operation
  - `handleDrag(zoneId, deltaX, deltaY)` - Move zone
  - `handleResize(zoneId, deltaX, deltaY)` - Resize zone with 8 handles (nw, ne, sw, se, n, s, e, w)
- Zone rendering:
  - `renderAllZones()` - Three-step process: (1) redraw canvas, (2) draw sample text, (3) create overlay elements
  - `renderZoneOverlay(zone)` - Create draggable/resizable HTML overlay rectangles
  - Transparent overlays (5% opacity) to not obscure canvas-rendered text
- Configuration UI:
  - `showZoneConfigPanel(zone)` - Display zone properties form
  - `updateZoneConfig(zoneId, config)` - Update zone configuration
  - `applyConfigToZone(zoneId)` - Apply form changes to zone
  - Real-time updates for label, sample text, and color changes
- QR code configuration:
  - `showQRConfigPanel()` - Display QR config form
  - `updateQRConfig(config)` - Update QR settings
  - Conditional sidebar display (only show relevant properties)
- Preset configurations:
  - `loadDefaultConfiguration()` - Load hardcoded default config
  - `applyConfiguration(config)` - Apply saved config to editor
- Save/Load:
  - `saveConfigurationToProject()` - Save zones to currentProject and IndexedDB
  - `loadConfigurationFromProject()` - Load zones from currentProject
  - Detects if editing from preview and re-renders badge

**column-mapping.js** - Intelligent column detection
- Column mapping definitions (70+ variations for French/English)
- `smartGetField()` function with fallback logic
- `detectColumnMappings()` for auto-detection
- `renderColumnMappingTable()` for visual confirmation
- Full name splitting when first/last names unavailable

**csv-parser.js** - CSV data handling
- CSV import with PapaParse (UTF-8, BOM handling)
- Deep cloning for participantsOriginal/participantsEdited
- CSV export with UTF-8 BOM for Excel compatibility
- Integration with editor initialization
- Drag & drop support

**csv-editor.js** - Data validation and editing (~400 lines)
- `initializeEditor()` - Entry point and coordination
- `detectDuplicates()` - Find duplicate emails and names (O(n) with Maps)
- `renderDuplicateWarnings()` - Visual duplicate alerts
- `renderEditorTable()` - Build editable data table
- `createTableRow()` - Individual row with contenteditable cells
- Cell editing with visual feedback (green for edited, orange for duplicates)
- Search/filter functionality
- Row add/delete operations
- Three workflow actions: Skip (original), Apply (edited), Export CSV

**badge-renderer.js** - Badge generation with dynamic configuration
- Text formatting utilities (capitalize, removeAccents, splitTextToFit)
- Dynamic zone rendering (`renderTextZone(participant, zone)`)
- Configuration fallbacks:
  - `getDefaultTextZones()` - Default hardcoded text zone config
  - `getDefaultQRConfig()` - Default hardcoded QR zone config
- Uses `currentProject?.textZones` or defaults
- Canvas-based badge rendering with percentage-to-pixel conversion
- QR code generation with vCard data
- Logo overlay with high-quality rendering
- Individual badge download (PNG)
- Template upload handler with Blob storage to project

**pdf-generator.js** - Batch export with dynamic configuration
- `generateBadgeForParticipant()` async function (uses dynamic config)
- Uses `currentProject?.textZones` and `currentProject?.qrZone` or defaults
- jsPDF configuration (A4 portrait)
- 2 badges per page layout (vertically stacked)
- Progress indicator during generation
- Batch download as single PDF
- Single badge PDF download handler

### External Dependencies (CDN)
- PapaParse 5.3.2 (CSV parsing with UTF-8 encoding)
- QRCode.js 1.0.0 (QR code generation)
- jsPDF 2.5.1 (PDF generation for batch export)

### Benefits of Modular Architecture
- **Maintainability**: Each module has a single responsibility
- **Readability**: index.html structure-focused (HTML only)
- **Debugging**: Easier to locate and fix issues in specific modules
- **Collaboration**: Multiple developers can work on different modules
- **Extensibility**: New features can be added without touching existing modules
- **No build step**: Still runs directly in browser

## Project System

**Baba uses IndexedDB for persistent project management**, allowing users to save multiple event configurations and reuse them across sessions.

### Why IndexedDB?

- **Large storage capacity**: Hundreds of MB vs 5-10MB for localStorage
- **Native Blob storage**: Store images as binary Blobs without base64 conversion (~33% size overhead)
- **Asynchronous operations**: Non-blocking UI during database operations
- **Structured queries**: Indexes on 'name' and 'updatedAt' for efficient retrieval
- **ACID transactions**: Data consistency guaranteed

### Project Structure

Each project is stored as an object with the following schema:

```javascript
{
  id: "unique-timestamp-id",      // Primary key (e.g., "1705315800000")
  name: "DevFest Libreville 2025", // User-defined project name
  createdAt: "2025-01-15T10:30:00Z", // ISO 8601 timestamp
  updatedAt: "2025-01-15T14:25:00Z", // Updated on each save

  // Template image stored as Blob (NOT base64!)
  template: {
    imageBlob: Blob,              // Binary image data
    width: 1200,                  // Canvas width in pixels
    height: 800                   // Canvas height in pixels
  },

  // Text zone configurations (all percentages stored as decimals 0-1)
  textZones: [
    {
      id: "prenom",               // Unique zone identifier
      label: "Prénom",            // Display label
      field: "prenom",            // CSV field to map to
      sampleText: "Jean",         // Custom sample text for editor preview
      x: 0.05,                    // Position X (5% of canvas width)
      y: 0.44,                    // Position Y (44% of canvas height)
      width: 0.45,                // Max width (45% of canvas width)
      height: 0.10,               // Zone height (for editor display)
      fontSize: 0.05,             // Font size (5% of canvas height)
      fontFamily: "Roboto",       // Font family
      fontWeight: "bold",         // "normal" | "bold" | "900"
      color: "#000000",           // Text color (hex)
      textTransform: "capitalize", // "none" | "uppercase" | "lowercase" | "capitalize"
      maxCharsPerLine: 16,        // Max characters before wrapping (null = unlimited)
      lineHeight: 1.2             // Line height multiplier
    },
    // ... more zones (nom, role, pole)
  ],

  // QR code configuration
  qrZone: {
    enabled: true,                // QR code enabled/disabled
    x: 0.75,                      // Center X (75% of canvas width)
    y: 0.32,                      // Position Y (32% of canvas height)
    size: 0.28,                   // QR size (28% of canvas width)
    logoSize: 0.30,               // Logo size (30% of QR size)
    logoPath: "logo-qr.png",      // Logo image path (default)
    logoBlob: Blob,               // Custom logo as Blob (optional)
    correctLevel: "M"             // "L" | "M" | "Q" | "H"
  },

  // CSV data and mappings (optional - only if CSV uploaded)
  csvData: [...],                 // Parsed CSV participant array
  columnMappings: {               // Manual column mapping overrides
    prenom: "First Name",
    nom: "Last Name",
    // ...
  }
}
```

### IndexedDB Schema

**Database**: `BabaDB` (version 1)

**Object Store**: `projects`
- **keyPath**: `id` (primary key)
- **Indexes**:
  - `name` (non-unique) - For searching by project name
  - `updatedAt` (non-unique) - For sorting by last modified

### Project Operations

All operations are **asynchronous** (async/await):

```javascript
// Create new project
const project = await createNewProject("DevFest 2025");

// Save/update project (upsert)
await saveProjectToDB(project);

// Load project by ID
const project = await loadProjectFromDB(projectId);

// Get all projects (sorted by updatedAt DESC)
const projects = await getAllProjects();

// Delete project
await deleteProjectFromDB(projectId);

// Export as JSON file
await exportProjectAsJSON(projectId);

// Import from JSON file
await importProjectFromJSON(jsonString);
```

### Blob Storage Utilities

Images are stored as **native Blobs** for efficiency:

```javascript
// Convert File to Blob
const blob = await fileToBlob(file);

// Convert Blob to data URL (for img.src)
const dataURL = await blobToDataURL(blob);

// Convert Blob to base64 (for JSON export)
const base64 = await blobToBase64(blob);

// Convert base64 back to Blob (for JSON import)
const blob = await base64ToBlob(base64);
```

### Configuration Format

**Important**: Configuration values are stored differently in different contexts:

1. **In IndexedDB** (project.textZones): Percentages as **decimals** (0.05 = 5%)
2. **In template-editor.js**: Percentages as **integers** (5 = 5%) for UI display
3. **In rendering** (badge-renderer.js, pdf-generator.js): Converted to **pixels**

**Conversion examples**:
```javascript
// Save to project (editor → storage): divide by 100
const configToSave = textZones.map(zone => ({
  ...zone,
  x: zone.x / 100,        // 5 → 0.05
  y: zone.y / 100,        // 44 → 0.44
  fontSize: zone.fontSize / 100  // 5 → 0.05
}));

// Load from project (storage → editor): multiply by 100
const configForEditor = project.textZones.map(zone => ({
  ...zone,
  x: zone.x * 100,        // 0.05 → 5
  y: zone.y * 100,        // 0.44 → 44
  fontSize: zone.fontSize * 100  // 0.05 → 5
}));

// Render to canvas (storage → pixels): multiply by canvas dimensions
const x = canvas.width * zone.x;          // 0.05 * 1200 = 60px
const y = canvas.height * zone.y;         // 0.44 * 800 = 352px
const fontSize = canvas.height * zone.fontSize; // 0.05 * 800 = 40px
```

### Default Configuration

When no project is loaded or a new project is created, **default hardcoded configuration** is used:

```javascript
function getDefaultTextZones() {
  return [
    {
      id: "prenom",
      label: "Prénom",
      field: "prenom",
      x: 0.05, y: 0.44, width: 0.45, height: 0.10,
      fontSize: 0.05,
      fontFamily: "Roboto",
      fontWeight: "bold",
      color: "#000000",
      textTransform: "capitalize",
      maxCharsPerLine: 16,
      lineHeight: 1.2
    },
    // ... nom, role, pole
  ];
}
```

This default config represents the **original hardcoded layout** before the project system was added.

## User Interface

**Professional dark theme** inspired by modern SaaS applications:
- Dark color scheme with indigo accents
- CSS custom properties for theming
- Card-based layout with step progression
- Responsive design with modern typography

**Progressive workflow**:
1. **Step 0/5**: Project selection (on startup)
   - Create new project or load existing
   - Option to continue without project (session-only mode)
   - Project list with last modified date
   - Export/delete project actions
2. **Step 1/5**: Upload badge template (PNG/JPG) with drag & drop support
   - Template automatically saved to current project as Blob
3. **Step 2/5**: Configure template zones (visual editor modal)
   - Drag & drop text zones on template overlay
   - Resize zones with 8-point handles (nw, ne, sw, se, n, s, e, w)
   - Configure zone properties (field, position, size, font, color, transform)
   - Configure QR code position and size
   - Load default configuration preset
   - Configuration saved to project on "Save and Continue"
4. **Step 3/5**: Upload CSV file with participant data with drag & drop support
   - CSV data automatically saved to project
5. **Step 4/5**: Verify and edit CSV data (optional CSV editor)
   - Auto-detected column mapping with visual confirmation
   - Duplicate detection (emails and full names)
   - Inline cell editing with visual feedback
   - Search and filter participants
   - Add/delete rows
   - Export edited CSV for future use
   - Skip or Apply changes before proceeding
   - Column mappings saved to project
6. **Step 5/5**: Preview and generate badges (auto-loads first participant)
   - Badge rendered with dynamic configuration from project
   - Keyboard navigation (← → arrows) between participants
   - Badge counter display (e.g., "3 / 25")

**Key UX features**:
- Header displays current step and participant count
- Completed steps automatically hide their cards
- Drag & drop file upload with visual feedback
- Real-time status messages (success, warning, error)
- Loading states with spinner animations
- Disabled button states until data is ready
- Auto-selection of first participant on CSV load

**Smart CSV column detection**:
- Automatically detects and maps CSV columns to badge fields
- Supports multiple column name variations (French/English)
- Fallback to full name splitting if separate first/last names not available
- No manual configuration required

## Template Editor

**Visual drag & drop editor** for configuring badge layout without coding:

### Editor Interface

The template editor opens as a **full-screen modal** after template upload:

```
+----------------------------------------------------------+
|  Éditeur de Template                                [X]  |
+----------------------------------------------------------+
|                                                          |
|  +--------------------- CANVAS ---------------------+    |
|  |                                                   |    |
|  |  [Template image displayed with overlay]         |    |
|  |                                                   |    |
|  |  +---------------+  <- Draggable text zone       |    |
|  |  | Prénom        |     (green border)            |    |
|  |  +-------●-------+                               |    |
|  |          ↑                                        |    |
|  |    Resize handle                                 |    |
|  |                                                   |    |
|  |                           [ QR ]  <- QR zone     |    |
|  |                                     (orange)     |    |
|  |                                                   |    |
|  +---------------------------------------------------+    |
|                                                          |
|  [Add Text Zone] [Load Default Config] [Save & Continue]|
+----------------------------------------------------------+

SIDEBAR: Configuration Panel
┌────────────────────────────────────┐
│ Général                            │
│ [Charger config par défaut]        │
│                                    │
│ Zone: Prénom (when selected)      │
│ CSV Field: [prenom        ▼]      │
│ Position X: [5%  ]  Y: [44% ]     │
│ Width: [45% ]  Height: [10% ]     │
│ Font Size: [5%  ]                 │
│ Font: [Roboto ▼]  Weight: [Bold ▼]│
│ Color: [#000000] [picker]         │
│ Transform: [Capitalize ▼]         │
│ Max chars/line: [16]              │
│ Line height: [1.2]                │
│ [Delete Zone]  [Apply]             │
│                                    │
│ QR Code                            │
│ ☑ Activer le QR Code              │
│ Position X: [75% ] Y: [32% ]      │
│ Taille: [28% ]                    │
│ [🖼️ Changer le logo]              │
└────────────────────────────────────┘
```

### Drag & Drop Features

**Text Zones**:
- **Drag to move**: Click and drag zone to reposition
- **Resize**: 8 resize handles on corners and edges (nw, ne, sw, se, n, s, e, w)
- **Select**: Click zone to show configuration panel
- **Add**: "Add Text Zone" button creates new zone at center
- **Delete**: "Delete Zone" button removes selected zone

**QR Code Zone**:
- **Drag to move**: Reposition QR code on badge
- **Resize**: Single size slider (maintains square aspect ratio)
- **Enable/disable**: Checkbox to show/hide QR code
- **Logo customization**: "Changer le logo" button in QR Code properties section to upload custom logo
- **Logo size**: Adjust logo overlay size within QR code

### Configuration Properties

Each text zone has configurable properties:

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| **label** | string | Display name | "Prénom" |
| **field** | string | CSV column to map | "prenom" |
| **sampleText** | string | Custom sample text for preview | "Jean" |
| **x** | percentage | Horizontal position | 5% (left edge) |
| **y** | percentage | Vertical position | 44% (from top) |
| **width** | percentage | Maximum text width | 45% (of canvas) |
| **height** | percentage | Zone height (editor only) | 10% |
| **fontSize** | percentage | Font size | 5% (of canvas height) |
| **fontFamily** | string | Font family | "Roboto", "Arial" |
| **fontWeight** | string | Font weight | "normal", "bold", "900" |
| **color** | hex | Text color | "#000000" |
| **textTransform** | string | Text case | "none", "uppercase", "lowercase", "capitalize" |
| **maxCharsPerLine** | number/null | Max characters before wrap | 16 (null = unlimited) |
| **lineHeight** | number | Line spacing multiplier | 1.2 |

### Identical Rendering Between Editor and Preview

The template editor now uses **canvas-based text rendering** with the same functions as badge-renderer.js:

- **Same rendering logic**: `drawZoneSampleText()` uses `capitalize()`, `splitTextToFit()`, and `drawMultilineTextOnEditor()` - identical to badge generation
- **Text positioning**: Both use `textBaseline = "top"` so Y position = top of text (consistent across editor and preview)
- **Text transformations**: Applied identically (uppercase, lowercase, capitalize)
- **Word wrapping**: Same `maxCharsPerLine` and width-based wrapping behavior
- **Font rendering**: Same font family, weight, size, and color
- **Custom sample text**: `sampleText` property allows realistic preview with personalized examples

**How it works**:
1. `renderAllZones()` redraws template image on canvas
2. Sample text drawn directly on canvas for each zone
3. **QR code sample** generated and drawn with logo overlay (cached for performance)
4. Transparent HTML overlays created for drag/drop interaction (don't obscure text)
5. Changes to properties instantly update canvas rendering

**QR Code Preview**:
- Sample QR code displayed in editor with logo overlay at center
- Uses same rendering logic as badge generation (identical appearance)
- **Performance optimization**: QR code cached and only regenerated when size changes
- Prevents flickering during drag operations by reusing cached image

### Clean Visual Interface

The editor provides a **distraction-free preview** by hiding zone indicators by default:

- **Default state**: Zones completely invisible (no borders, no labels) for clean badge preview
- **Hover state**: Light dashed border appears on mouseover to indicate clickable areas
- **Selected state**: Solid border, label, resize handles, and configuration panel appear
- **Deselection**: Click anywhere on canvas outside zones to hide all indicators
- **Seamless editing**: Switch between clean preview and editing mode with single click

This allows users to **appreciate the final badge appearance** while configuring, without visual clutter from editing overlays.

### Default Configuration

The "Load Default Config" button loads the **original hardcoded layout**:

- **Prenom**: 5% x, 44% y, 45% width, 5% fontSize, bold, capitalize, 16 chars/line
- **Nom**: 5% x, 56% y, 45% width, 5% fontSize, bold, uppercase, 12 chars/line
- **Role**: 5% x, 68% y, 45% width, 3% fontSize, normal, none, unlimited
- **Pole**: 5% x, 78% y, 45% width, 3% fontSize, normal, none, unlimited
- **QR Code**: 75% x (center), 32% y, 28% size, logo 30%

This config can be used as a starting point and customized as needed.

### Saving Configuration

When "Save & Continue" is clicked:
1. All zones converted from percentages (5) to decimals (0.05)
2. Configuration saved to `currentProject.textZones` and `currentProject.qrZone`
3. Project saved to IndexedDB
4. Editor modal closes
5. Application proceeds to step 3 (CSV upload)

## Key Components

### Canvas-based rendering workflow
1. Template image loaded via FileReader API
2. CSV parsed with PapaParse (header: true, skipEmptyLines: true, encoding: "UTF-8")
3. Canvas dimensions set to match template image dimensions
4. Participant text rendered with dynamic positioning and multiline support
5. QR code generated with vCard data, then drawn onto canvas with centered logo overlay

### Text rendering system

**Dynamic configuration-based rendering**:

The text rendering system now uses **dynamic configuration** from `currentProject.textZones` (or defaults):

```javascript
// Get configuration (from project or defaults)
const textZones = currentProject?.textZones || getDefaultTextZones();

// Render each zone
textZones.forEach(zone => {
  renderTextZone(participant, zone);
});
```

Each zone is rendered with:
- **Position conversion**: Decimal percentage → pixels (e.g., 0.05 * canvas.width)
- **Font setup**: `${zone.fontWeight} ${fontSize}px ${zone.fontFamily}`
- **Text transform**: Applied before rendering (uppercase, lowercase, capitalize, none)
- **Text wrapping**: `splitTextToFit()` with zone.maxCharsPerLine
- **Multiline rendering**: `drawMultilineText()` with zone.lineHeight

**Default configuration** (when no project loaded):
- **Prénoms**: 5% x, 44% y, 45% width - Capitalized, Bold, 5% fontSize, 16 chars/line
- **Noms**: 5% x, 56% y, 45% width - UPPERCASE, Bold, 5% fontSize, 12 chars/line
- **Rôle**: 5% x, 68% y, 45% width - Original case, Normal, 3% fontSize, unlimited
- **Pole**: 5% x, 78% y, 45% width - Original case, Normal, 3% fontSize, unlimited

**Helper functions**:
- `renderTextZone(participant, zone)`: Renders a single configured text zone
- `getDefaultTextZones()`: Returns original hardcoded layout as fallback
- `capitalize(str)`: Converts to title case (e.g., "félicien rocky" → "Félicien Rocky")
- `removeAccents(str)`: Strips accents for QR code data (e.g., "Lénaïc" → "Lenaic")
- `splitTextToFit(text, maxWidth, maxChars)`: Splits long text into multiple lines
- `drawMultilineText(text, x, y, lineHeight, maxWidth, maxChars)`: Renders multiline text with automatic positioning

### QR Code system

**Dynamic configuration**:

QR code rendering uses configuration from `currentProject.qrZone` (or defaults):

```javascript
const qrConfig = currentProject?.qrZone || getDefaultQRConfig();

if (qrConfig.enabled === false) {
  // Skip QR code rendering
  return;
}

const qrSize = canvas.width * qrConfig.size;          // e.g., 0.28 * 1200 = 336px
const xPos = (canvas.width * qrConfig.x) - (qrSize / 2);  // Center at qrConfig.x
const yPos = canvas.height * qrConfig.y;
```

**Default specifications**:
- **Size**: 28% of canvas width
- **Position**: Horizontally centered at 75% of canvas width, vertically at 32% of canvas height
- **Error correction level**: M (Medium - 15% recovery) with fallback to L (Low - 7%)
- **Logo overlay**: 30% of QR code size, centered, with high-quality rendering
- **Enabled**: true (can be disabled in template editor)

**vCard generation**:
- vCards are generated **dynamically** from CSV data (not from CSV vCard column)
- All text data has accents removed to reduce byte size and avoid QR code overflow
- Minimal format to maximize compatibility:
  ```
  BEGIN:VCARD
  VERSION:3.0
  N:LastName;FirstName
  FN:FirstName LastName
  TEL;CELL:PhoneNumber
  EMAIL:EmailAddress
  END:VCARD
  ```

**Error handling**:
- Primary attempt: Correction level M
- Fallback 1: Correction level L (for longer vCards)
- Fallback 2: Default URL (https://devfest.gdglibreville.com)

## CSV Data Format

**Required columns**:
- `Noms` (last name - plural form)
- `Prénoms` (first name - plural form)
- `Rôle` (role/function)
- `Pole` (team/organization)
- `Tel` (phone number)
- `Mail` (email address)

**Note**: The CSV may contain a `vCard` column, but it is NOT used. vCards are generated dynamically from individual fields to ensure optimal size and compatibility.

## Important Technical Details

### Character encoding
- CSV must be UTF-8 encoded
- BOM (Byte Order Mark) is automatically stripped
- Accents are preserved in displayed text but removed in QR code data to prevent overflow

### Text wrapping
- Prénoms wrap when exceeding 16 characters per line
- Noms wrap when exceeding 12 characters per line
- Role and pole have fixed positions (as if name takes exactly 3 lines)
- When total name lines exceed 3, role text becomes white (invisible) to prevent overlap with pole

### QR Code capacity limits
QRCode.js has maximum data capacity limits:
- Level M: ~1232 characters
- Level L: ~1248 characters
- Solution: Remove accents from vCard data to stay within limits

## Testing the Application

Open `index.html` directly in a modern browser (Chrome, Firefox, Edge). No local server required.

### Complete Workflow

**1. Project Selection (on startup)**
- Application shows project selection modal on startup
- Options:
  - **Create new project**: Enter name and click "Créer"
  - **Load existing project**: Click project name to load saved configuration
  - **Continue without project**: Session-only mode (no persistence)
- Projects display last modified date and have Export/Delete actions

**2. Load Badge Template**
- Upload PNG/JPG template via file input or drag & drop
- Template automatically saved to current project as Blob (if project mode active)
- Canvas sized to match template dimensions
- Template editor modal opens automatically

**3. Configure Template (Visual Editor)**
- **Template editor modal** displays template with draggable overlay zones
- Default configuration loads automatically (original hardcoded layout)
- Customize layout:
  - **Drag zones** to reposition text areas
  - **Resize zones** using 8-point handles (corners and edges)
  - **Select zone** to show configuration panel
  - **Configure properties**: CSV field, position, size, font, color, text transform
  - **Add new zones** with "Add Text Zone" button
  - **Delete zones** with "Delete Zone" button
  - **Configure QR code**: Position, size, enable/disable
- Options:
  - **Load Default Config**: Reset to original hardcoded layout
  - **Save & Continue**: Save configuration to project and proceed
- Configuration saved to IndexedDB automatically

**4. Load Participant CSV**
- Upload CSV file via file input or drag & drop
- PapaParse parses with UTF-8 encoding
- CSV data automatically saved to current project (if project mode active)
- CSV editor opens automatically

**5. Review and Edit CSV Data (Optional)**
- **Column mapping**: Auto-detected with visual confirmation table
  - Click column name to manually select CSV column
  - Supports 70+ variations (French/English)
  - Fallback to full name splitting
- **Duplicate detection**: Highlights duplicate emails and names (orange background)
- **Data editing**:
  - Click cells to edit inline (green background for edited cells)
  - Search/filter participants
  - Add/delete rows
- **Export edited CSV**: Download modified data as CSV file
- **Actions**:
  - **Skip**: Use original CSV data
  - **Apply**: Use edited data and save to project
- Column mappings saved to project

**6. Preview and Generate Badges**
- Select participant from dropdown (first participant auto-loaded)
- Badge renders with dynamic configuration from project
- **Navigation**:
  - Dropdown selector
  - Previous/Next buttons (← →)
  - Keyboard arrows (← →)
  - Badge counter (e.g., "3 / 25")
- **Download options**:
  - **PNG**: Individual badge as PNG image
  - **PDF (single)**: Current badge as PDF (A4 portrait, top half)
  - **PDF (batch)**: All badges as single PDF file
    - 2 badges per A4 portrait page (stacked vertically)
    - Progress indicator during generation
    - Centered on page with margins

## Files in Project

### HTML
- `index.html` - Main application (393 lines - structure with modals)
  - Project selection modal (lines 28-58)
  - Template editor modal (lines 60-232)
  - Column mapping modal (lines 363-380)
  - Main workflow cards (template, CSV, editor, preview)

### Styles
- `styles/main.css` - Core styles and CSS variables
- `styles/components.css` - Reusable UI components (buttons, cards, modals)
- `styles/editor.css` - CSV editor specific styles (table, duplicates, mapping)
- `styles/template-editor.css` - Template editor and project modal styles (~450 lines)
  - Project modal styles
  - Template editor full-screen modal
  - Canvas overlay and zones
  - Resize handles and interactions
  - Configuration sidebar panel

### Scripts
- `scripts/app.js` - Global state, utilities, and async project loading (~260 lines)
  - Global variables (participants, project state, IndexedDB)
  - Step management with project integration
  - Async project loading/saving functions
  - Badge navigation setup
- `scripts/project-manager.js` - IndexedDB CRUD and project UI (~500 lines)
  - IndexedDB initialization and schema
  - CRUD operations (all async)
  - Project import/export (JSON)
  - Blob conversion utilities
  - Project modal UI and event handlers
- `scripts/template-editor.js` - Visual template editor (~650 lines)
  - Template editor initialization and modal management
  - Text zone management (create, delete, select)
  - Drag & drop implementation (move and resize)
  - Zone rendering with overlay
  - Configuration UI (zone properties, QR settings)
  - Default configuration preset
  - Save/load configuration to project
- `scripts/column-mapping.js` - CSV column detection (~200 lines)
  - 70+ column name variations (French/English)
  - Auto-detection with fuzzy matching
  - Manual column selection modal
  - Full name splitting fallback
- `scripts/csv-parser.js` - CSV import/export with PapaParse (~100 lines)
  - UTF-8 encoding with BOM handling
  - Drag & drop support
  - Integration with editor initialization
- `scripts/csv-editor.js` - Interactive data table editor (~400 lines)
  - Duplicate detection (emails and names)
  - Inline cell editing with visual feedback
  - Search/filter functionality
  - Row add/delete operations
  - CSV export with UTF-8 BOM
  - Three workflow actions (Skip, Apply, Export)
- `scripts/badge-renderer.js` - Canvas badge generation with dynamic config (~370 lines)
  - Dynamic zone rendering from configuration
  - Default configuration fallbacks
  - Text formatting utilities
  - QR code generation with vCard
  - Template upload with Blob storage
  - Participant selection handler
  - Individual PNG download
- `scripts/pdf-generator.js` - PDF batch export with dynamic config (~260 lines)
  - Single badge PDF download
  - Batch PDF generation (2 badges per A4 page)
  - Progress indicator
  - Dynamic configuration integration

### Assets
- `logo-qr.png` - Logo for QR code center (183 KB)

### Documentation
- `CLAUDE.md` - This comprehensive documentation file
- `README.md` - Project overview (if present)

### Database
- **IndexedDB**: `BabaDB` (browser storage)
  - Object store: `projects`
  - Persistent storage for templates, configurations, and CSV data

## Common Issues and Solutions

### Badge Rendering

**QR code not displaying**: Usually caused by vCard data exceeding capacity. The app automatically falls back to lower error correction levels or default URL.

**Text overflowing badge**: Use the template editor to adjust zone width, font size, or maxCharsPerLine. Default config handles most names well.

**Accented characters in QR codes**: Accents are automatically removed from QR code data while preserved in visible text to prevent encoding issues.

**Badge looks different from template editor**: The editor shows zone rectangles as guides. Actual text rendering uses multiline wrapping and may look different. Preview badges in step 5 to see final output.

### Project Management

**Project not saving**: Check browser console for IndexedDB errors. Some browsers in private/incognito mode restrict IndexedDB. Use "Continue without project" mode as fallback.

**Template not loading from project**: Ensure template was uploaded while project was active. Re-upload template if needed.

**Configuration lost after reload**: Configuration is only saved when "Save & Continue" is clicked in template editor. Always save before closing editor.

**Storage quota exceeded**: IndexedDB has limits (typically 50% of available disk space). Delete old projects or export them as JSON files for backup.

### Template Editor

**Can't drag zones**: Ensure zone is selected (green border). Click zone first, then drag.

**Resize handles not working**: Click and drag from handle circles (corners/edges). Each zone has 8 handles: nw, ne, sw, se, n, s, e, w.

**Zone configuration not applying**: Click "Apply" button after changing zone properties. Changes are not saved automatically.

**QR code not visible in editor**: QR zone is shown as orange rectangle. Actual QR rendering happens during badge generation (step 5).

### CSV and Data

**Column mapping not detecting fields**: Click column name in mapping table to manually select CSV column. The app supports 70+ variations but may need manual selection for unusual column names.

**Duplicates not showing**: Duplicate detection only runs on Apply. Click "Apply and Continue" to see duplicates.

**Edited data lost**: Edited data is only in `participantsEdited` array until "Apply" is clicked. Always apply changes before proceeding.
