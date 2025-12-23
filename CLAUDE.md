# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Baba** - A professional badge generator for events. Client-side web application with modern UI for generating personalized event badges. The application loads a badge template image and participant data from CSV, then overlays participant information (name, function, organization) and a QR code with vCard contact data onto the template.

## Architecture

**Modular single-page application** with separated concerns:

### File Structure
```
devfest-badge-generator/
├── index.html                 (147 lines - HTML structure only)
├── styles/
│   ├── main.css              (Core styles and CSS variables)
│   ├── components.css        (Reusable UI components)
│   └── editor.css            (CSV editor specific styles)
├── scripts/
│   ├── app.js                (Global state and utilities)
│   ├── column-mapping.js     (CSV column detection)
│   ├── csv-parser.js         (CSV import/export with PapaParse)
│   ├── csv-editor.js         (Interactive data table editor)
│   ├── badge-renderer.js     (Canvas badge generation)
│   └── pdf-generator.js      (PDF batch export with jsPDF)
├── logo-qr.png               (QR code logo overlay)
└── CLAUDE.md                 (This file)
```

### Module Responsibilities

**app.js** - Application state management
- Global variables (participants, participantsOriginal, participantsEdited)
- Template and logo images
- Canvas and DOM element references
- Step management (`updateStep()`)
- Status messages (`showStatus()`)
- Editor state (editorActive, columnMappingOverrides, duplicates)

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

**badge-renderer.js** - Badge generation
- Text formatting utilities (capitalize, removeAccents, splitTextToFit)
- Canvas-based badge rendering
- QR code generation with vCard data
- Logo overlay with high-quality rendering
- Individual badge download (PNG)

**pdf-generator.js** - Batch export
- `generateBadgeForParticipant()` async function
- jsPDF configuration (A4 portrait)
- 2 badges per page layout (vertically stacked)
- Progress indicator during generation
- Batch download as single PDF

### External Dependencies (CDN)
- PapaParse 5.3.2 (CSV parsing with UTF-8 encoding)
- QRCode.js 1.0.0 (QR code generation)
- jsPDF 2.5.1 (PDF generation for batch export)

### Benefits of Modular Architecture
- **Maintainability**: Each module has a single responsibility
- **Readability**: index.html reduced from 1,035 to 147 lines (85% reduction)
- **Debugging**: Easier to locate and fix issues in specific modules
- **Collaboration**: Multiple developers can work on different modules
- **Extensibility**: New features can be added without touching existing modules
- **No build step**: Still runs directly in browser

## User Interface

**Professional dark theme** inspired by modern SaaS applications:
- Dark color scheme with indigo accents
- CSS custom properties for theming
- Card-based layout with step progression
- Responsive design with modern typography

**Progressive workflow**:
1. **Step 1/4**: Upload badge template (PNG/JPG) with drag & drop support
2. **Step 2/4**: Upload CSV file with participant data with drag & drop support
3. **Step 3/4**: Verify and edit CSV data (optional CSV editor)
   - Auto-detected column mapping with visual confirmation
   - Duplicate detection (emails and full names)
   - Inline cell editing with visual feedback
   - Search and filter participants
   - Add/delete rows
   - Export edited CSV for future use
   - Skip or Apply changes before proceeding
4. **Step 4/4**: Preview and generate badges (auto-loads first participant)

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

## Key Components

### Canvas-based rendering workflow
1. Template image loaded via FileReader API
2. CSV parsed with PapaParse (header: true, skipEmptyLines: true, encoding: "UTF-8")
3. Canvas dimensions set to match template image dimensions
4. Participant text rendered with dynamic positioning and multiline support
5. QR code generated with vCard data, then drawn onto canvas with centered logo overlay

### Text rendering system

**Dynamic positioning with text wrapping**:
- Text starts at `canvas.height * 0.44` (adjustable)
- Maximum width: 45% of canvas width
- Maximum characters per line: 16 for prénoms, 12 for noms
- Automatic line breaking by word boundaries
- Fixed positioning for role and pole (calculated as if name takes 3 lines)
- Role text hidden (white color) when name + prénom exceed 3 lines to prevent overlap

**Text formatting**:
- **Prénoms**: Capitalized (first letter uppercase, rest lowercase) - Bold, 5% canvas height
- **Noms**: ALL UPPERCASE - Bold, 5% canvas height
- **Rôle**: Original case - Normal weight, 3% canvas height
- **Pole**: Original case - Normal weight, 3% canvas height

**Helper functions**:
- `capitalize(str)`: Converts to title case (e.g., "félicien rocky" → "Félicien Rocky")
- `removeAccents(str)`: Strips accents for QR code data (e.g., "Lénaïc" → "Lenaic")
- `splitTextToFit(text, maxWidth, maxChars)`: Splits long text into multiple lines
- `drawMultilineText(text, x, y, lineHeight, maxWidth, maxChars)`: Renders multiline text with automatic positioning

### QR Code system

**Specifications**:
- Size: 28% of canvas width
- Position: Horizontally centered at 75% of canvas width, vertically at `canvas.height * 0.32`
- Error correction level: M (Medium - 15% recovery) with fallback to L (Low - 7%)
- Logo overlay: 30% of QR code size, centered, with high-quality rendering

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

**Workflow**:
1. Load badge template image (PNG recommended)
2. Load participant CSV file
3. **CSV Editor** (optional but recommended):
   - Review auto-detected column mappings
   - Check for and resolve duplicates
   - Edit participant data inline
   - Add or remove participants
   - Export edited CSV for future use
   - Skip or Apply changes
4. Select participant from dropdown (auto-loads first)
5. Badge renders with dynamic text layout and QR code
6. Download options:
   - Individual badge as PNG
   - All badges as PDF (2 badges per A4 portrait page, stacked vertically)

## Files in Project

### HTML
- `index.html` - Main application (147 lines - structure only)

### Styles
- `styles/main.css` - Core styles and CSS variables
- `styles/components.css` - Reusable UI components
- `styles/editor.css` - CSV editor specific styles

### Scripts
- `scripts/app.js` - Global state and utilities
- `scripts/column-mapping.js` - CSV column detection
- `scripts/csv-parser.js` - CSV import/export
- `scripts/csv-editor.js` - Interactive data table editor
- `scripts/badge-renderer.js` - Canvas badge generation
- `scripts/pdf-generator.js` - PDF batch export

### Assets
- `logo-qr.png` - Logo for QR code center (183 KB)

### Documentation
- `CLAUDE.md` - This documentation file
- `README.md` - Project overview (if present)

## Common Issues and Solutions

**QR code not displaying**: Usually caused by vCard data exceeding capacity. The app automatically falls back to lower error correction levels or default URL.

**Text overflowing badge**: Automatic text wrapping handles long names up to reasonable lengths. Adjust `maxTextWidth` (currently 45%) if needed.

**Accented characters in QR codes**: Accents are automatically removed from QR code data while preserved in visible text to prevent encoding issues.
