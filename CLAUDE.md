# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DevFest Libreville 2025 Badge Generator - A client-side web application for generating personalized event badges. The application loads a badge template image and participant data from CSV, then overlays participant information (name, function, organization) and a QR code with vCard contact data onto the template.

## Architecture

Single-page application architecture:
- **index.html**: Self-contained HTML file with embedded CSS and JavaScript
- **logo-qr.png**: Logo displayed at the center of QR codes
- No build process or dependencies - runs directly in browser
- External dependencies loaded via CDN:
  - PapaParse 5.3.2 (CSV parsing with UTF-8 encoding)
  - QRCode.js 1.0.0 (QR code generation)
  - jsPDF 2.5.1 (PDF generation for batch export)

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
3. Select participant from dropdown
4. Badge renders with dynamic text layout and QR code
5. Download options:
   - Individual badge as PNG
   - All badges as PDF (2 badges per A4 portrait page, stacked vertically)

## Files in Project

- `index.html` - Main application
- `logo-qr.png` - Logo for QR code center (183 KB)
- `Liste des badges - Feuille 1.csv` - Participant data
- `CLAUDE.md` - This documentation file

## Common Issues and Solutions

**QR code not displaying**: Usually caused by vCard data exceeding capacity. The app automatically falls back to lower error correction levels or default URL.

**Text overflowing badge**: Automatic text wrapping handles long names up to reasonable lengths. Adjust `maxTextWidth` (currently 45%) if needed.

**Accented characters in QR codes**: Accents are automatically removed from QR code data while preserved in visible text to prevent encoding issues.
