// Template Editor - Visual editor for badge template configuration
// Drag & drop zones, configuration panel, and preset management

// Editor state (templateEditorActive and selectedZone are in app.js)
let textZones = [];
let qrZone = null;
let editorCanvas = null;
let editorCtx = null;
let zonesOverlay = null;

// QR code cache to avoid regeneration during drag
let qrSampleImg = null;
let qrSampleSize = null;

// === Text Rendering Helpers (copied from badge-renderer.js) ===

function capitalize(str) {
    if (!str) return "";
    return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

function splitTextToFit(text, maxWidth, maxChars = null) {
    const cleanText = text.trim().replace(/\s+/g, ' ');
    const words = cleanText.split(' ').filter(word => word.length > 0);

    if (words.length === 0) return [];

    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + ' ' + words[i];
        const metrics = editorCtx.measureText(testLine);

        const exceedsWidth = metrics.width > maxWidth;
        const exceedsChars = maxChars && testLine.length > maxChars;

        if (exceedsWidth || exceedsChars) {
            lines.push(currentLine);
            currentLine = words[i];
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine);
    return lines;
}

function drawMultilineTextOnEditor(text, x, startY, lineHeight, maxWidth, maxChars = null) {
    const lines = splitTextToFit(text, maxWidth, maxChars);
    let currentY = startY;

    lines.forEach((line) => {
        editorCtx.fillText(line, x, currentY);
        currentY += lineHeight;
    });

    return currentY;
}

// Drag state
let isDragging = false;
let isResizing = false;
let dragStartX = 0;
let dragStartY = 0;
let resizeHandle = null;

// === Editor Initialization ===

function initializeTemplateEditor() {
    editorCanvas = document.getElementById('templateEditorCanvas');
    editorCtx = editorCanvas.getContext('2d');
    zonesOverlay = document.getElementById('textZonesOverlay');

    if (!editorCanvas || !editorCtx || !zonesOverlay) {
        console.error('Template editor elements not found');
        return;
    }

    // Reset selection state and QR cache
    selectedZone = null;
    qrSampleImg = null;
    qrSampleSize = null;

    // Load default configuration or from current project
    if (currentProject && currentProject.textZones && currentProject.textZones.length > 0) {
        // Convert decimals to percentages for editor (0.05 → 5)
        textZones = currentProject.textZones.map(zone => ({
            ...zone,
            x: zone.x * 100,
            y: zone.y * 100,
            width: zone.width * 100,
            height: zone.height ? zone.height * 100 : 10,
            fontSize: zone.fontSize * 100
        }));

        if (currentProject.qrZone) {
            qrZone = {
                ...currentProject.qrZone,
                x: currentProject.qrZone.x * 100,
                y: currentProject.qrZone.y * 100,
                size: currentProject.qrZone.size * 100
            };
        } else {
            qrZone = getDefaultQRZone();
        }

        console.log('Loaded zones from project:', textZones);
        console.log('Loaded QR zone from project:', qrZone);
    } else {
        loadDefaultConfiguration();
        console.log('Loaded default configuration');
    }

    // Draw template on canvas
    if (templateImg.complete && templateImg.naturalHeight !== 0) {
        editorCanvas.width = templateImg.width;
        editorCanvas.height = templateImg.height;
        editorCtx.drawImage(templateImg, 0, 0);

        // Set overlay size
        zonesOverlay.style.width = templateImg.width + 'px';
        zonesOverlay.style.height = templateImg.height + 'px';
    }

    // Hide configuration panels by default
    hideZoneConfigPanel();
    hideQRConfigPanel();

    // Load custom QR logo if exists in project and wait for it to load
    if (currentProject && currentProject.qrZone && currentProject.qrZone.logoBlob) {
        blobToDataURL(currentProject.qrZone.logoBlob).then(dataURL => {
            // Clear QR cache to force regeneration with potentially new logo
            qrSampleImg = null;
            qrSampleSize = null;

            const needsLoad = qrLogoImg.src !== dataURL;
            qrLogoImg.src = dataURL;

            const renderWhenReady = () => {
                renderAllZones();
            };

            if (needsLoad) {
                qrLogoImg.onload = renderWhenReady;
            } else if (qrLogoImg.complete) {
                // Image already loaded, render immediately
                renderWhenReady();
            } else {
                qrLogoImg.onload = renderWhenReady;
            }

            const qrLogoName = document.getElementById('qrLogoName');
            if (qrLogoName && currentProject.qrZone.logoPath) {
                qrLogoName.textContent = currentProject.qrZone.logoPath;
            }
        });
    } else {
        // Reset to default logo
        const needsLoad = qrLogoImg.src !== "logo-qr.png";
        qrLogoImg.src = "logo-qr.png";

        const renderWhenReady = () => {
            renderAllZones();
        };

        if (needsLoad) {
            qrLogoImg.onload = renderWhenReady;
        } else if (qrLogoImg.complete) {
            // Image already loaded, render immediately
            renderWhenReady();
        } else {
            qrLogoImg.onload = renderWhenReady;
        }

        const qrLogoName = document.getElementById('qrLogoName');
        if (qrLogoName) {
            qrLogoName.textContent = "logo-qr.png";
        }
    }

    // Setup event listeners
    setupEditorEventListeners();
}

function showTemplateEditor() {
    console.log('showTemplateEditor called');
    const modal = document.getElementById('templateEditorModal');
    console.log('templateEditorModal element:', modal);
    if (modal) {
        modal.classList.remove('hidden');
        templateEditorActive = true;
        console.log('Template editor modal shown, initializing...');
        initializeTemplateEditor();
    } else {
        console.error('templateEditorModal not found in DOM!');
    }
}

function hideTemplateEditor() {
    const modal = document.getElementById('templateEditorModal');
    if (modal) {
        modal.classList.add('hidden');
        templateEditorActive = false;
        selectedZone = null;
    }
}

// === Default Configuration ===

function loadDefaultConfiguration() {
    textZones = [
        {
            id: "prenom",
            label: "Prénom",
            field: "prenom",
            x: 5,
            y: 44,
            width: 45,
            height: 10,
            fontSize: 5,
            fontFamily: "Roboto",
            fontWeight: "bold",
            color: "#000000",
            textTransform: "capitalize",
            maxCharsPerLine: 16,
            lineHeight: 1.2,
            sampleText: "Jean"
        },
        {
            id: "nom",
            label: "Nom",
            field: "nom",
            x: 5,
            y: 56,
            width: 45,
            height: 10,
            fontSize: 5,
            fontFamily: "Roboto",
            fontWeight: "bold",
            color: "#000000",
            textTransform: "uppercase",
            maxCharsPerLine: 12,
            lineHeight: 1.2,
            sampleText: "Dupont"
        },
        {
            id: "role",
            label: "Rôle",
            field: "role",
            x: 5,
            y: 68,
            width: 45,
            height: 8,
            fontSize: 3,
            fontFamily: "Roboto",
            fontWeight: "normal",
            color: "#3c4043",
            textTransform: "none",
            maxCharsPerLine: null,
            lineHeight: 1.3,
            sampleText: "Développeur"
        },
        {
            id: "pole",
            label: "Pôle/Organisation",
            field: "pole",
            x: 5,
            y: 78,
            width: 45,
            height: 8,
            fontSize: 3,
            fontFamily: "Roboto",
            fontWeight: "normal",
            color: "#3c4043",
            textTransform: "none",
            maxCharsPerLine: null,
            lineHeight: 1.3,
            sampleText: "GDG Libreville"
        }
    ];

    qrZone = getDefaultQRZone();
}

function getDefaultQRZone() {
    return {
        enabled: true,
        x: 75,
        y: 32,
        size: 28,
        logoSize: 0.30,
        logoPath: "logo-qr.png",
        correctLevel: "M"
    };
}

// === Zone Management ===

function createTextZone() {
    const newZone = {
        id: "zone_" + Date.now(),
        label: "Nouvelle zone",
        field: "prenom",
        x: 10,
        y: 10,
        width: 30,
        height: 10,
        fontSize: 5,
        fontFamily: "Roboto",
        fontWeight: "bold",
        color: "#000000",
        textTransform: "none",
        maxCharsPerLine: null,
        lineHeight: 1.2,
        sampleText: "Exemple"
    };

    textZones.push(newZone);
    renderAllZones();
    selectZone(newZone.id);
}

function deleteTextZone(zoneId) {
    if (confirm('Supprimer cette zone de texte ?')) {
        textZones = textZones.filter(z => z.id !== zoneId);
        selectedZone = null;
        renderAllZones();
        hideZoneConfigPanel();
    }
}

function selectZone(zoneId) {
    selectedZone = zoneId;
    renderAllZones();

    const zone = textZones.find(z => z.id === zoneId);
    if (zone) {
        showZoneConfigPanel(zone);
    }
}

function getZoneById(zoneId) {
    return textZones.find(z => z.id === zoneId);
}

// === Zone Rendering ===

function renderAllZones() {
    if (!zonesOverlay) return;

    // Step 1: Redraw canvas with template image
    redrawCanvas();

    // Step 2: Draw sample text for all zones on canvas
    textZones.forEach(zone => {
        drawZoneSampleText(zone);
    });

    // Step 3: Draw QR code sample on canvas
    if (qrZone && qrZone.enabled) {
        drawQRSample();
    }

    // Step 4: Create HTML overlay elements for interaction
    zonesOverlay.innerHTML = '';

    // Render text zones overlays
    textZones.forEach(zone => {
        renderZoneOverlay(zone);
    });

    // Render QR zone overlay
    if (qrZone && qrZone.enabled) {
        renderQRZone();
    }
}

function redrawCanvas() {
    if (!editorCanvas || !editorCtx || !templateImg) return;

    // Clear canvas
    editorCtx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);

    // Redraw template image
    if (templateImg.complete && templateImg.naturalHeight !== 0) {
        editorCtx.drawImage(templateImg, 0, 0);
    }
}

function drawZoneSampleText(zone) {
    if (!editorCanvas || !editorCtx) return;

    const canvasWidth = editorCanvas.width;
    const canvasHeight = editorCanvas.height;

    // Get sample text from zone configuration or default
    let exampleText = zone.sampleText || zone.label;

    // Apply text transformation
    let transformedText = exampleText;
    switch(zone.textTransform) {
        case 'uppercase':
            transformedText = exampleText.toUpperCase();
            break;
        case 'lowercase':
            transformedText = exampleText.toLowerCase();
            break;
        case 'capitalize':
            transformedText = capitalize(exampleText);
            break;
    }

    // Calculate pixel positions from percentages (same as badge-renderer.js)
    const x = canvasWidth * (zone.x / 100);
    const y = canvasHeight * (zone.y / 100);
    const maxWidth = canvasWidth * (zone.width / 100);
    const fontSize = canvasHeight * (zone.fontSize / 100);
    const lineHeight = fontSize * zone.lineHeight;

    // Set font properties (same as badge-renderer.js)
    editorCtx.font = `${zone.fontWeight} ${fontSize}px ${zone.fontFamily}`;
    editorCtx.fillStyle = zone.color;
    editorCtx.textAlign = "left";
    editorCtx.textBaseline = "top"; // Make Y position the TOP of the text

    // Draw multiline text with same logic as badge-renderer.js
    drawMultilineTextOnEditor(transformedText, x, y, lineHeight, maxWidth, zone.maxCharsPerLine);
}

function drawQRSample() {
    if (!editorCanvas || !editorCtx || !qrZone) return;

    const canvasWidth = editorCanvas.width;
    const canvasHeight = editorCanvas.height;

    // Calculate QR code size and position (same as badge-renderer.js)
    const qrSize = canvasWidth * (qrZone.size / 100);
    const xPos = (canvasWidth * (qrZone.x / 100)) - (qrSize / 2);
    const yPos = canvasHeight * (qrZone.y / 100);

    // If QR code is already generated and size hasn't changed, just redraw it
    if (qrSampleImg && qrSampleSize === qrSize) {
        // Draw cached QR code on canvas
        editorCtx.drawImage(qrSampleImg, xPos, yPos, qrSize, qrSize);

        // Draw logo overlay at center
        const logoSize = qrSize * (qrZone.logoSize || 0.30);
        const logoX = xPos + (qrSize / 2) - (logoSize / 2);
        const logoY = yPos + (qrSize / 2) - (logoSize / 2);

        if (qrLogoImg && qrLogoImg.complete && qrLogoImg.naturalHeight !== 0) {
            editorCtx.imageSmoothingEnabled = true;
            editorCtx.imageSmoothingQuality = 'high';
            editorCtx.drawImage(qrLogoImg, logoX, logoY, logoSize, logoSize);
        }
        return;
    }

    // Generate new QR code only if size changed or first time
    const qrContainer = document.createElement('div');
    qrContainer.id = 'qr-editor-temp';
    qrContainer.style.display = 'none';
    document.body.appendChild(qrContainer);

    // Generate QR code with sample data
    try {
        new QRCode(qrContainer, {
            text: "https://devfest.gdglibreville.com",
            width: qrSize,
            height: qrSize,
            colorDark: "#000000",
            colorLight: "rgba(255,255,255,0)",
            correctLevel: QRCode.CorrectLevel.M
        });
    } catch (error) {
        console.error('Error generating QR code:', error);
        document.body.removeChild(qrContainer);
        return;
    }

    // Wait for QR code generation and draw it on canvas
    setTimeout(() => {
        const qrImg = qrContainer.querySelector('img');

        if (!qrImg) {
            document.body.removeChild(qrContainer);
            return;
        }

        // Cache the generated QR code image
        qrSampleImg = qrImg;
        qrSampleSize = qrSize;

        // Draw QR code on canvas
        editorCtx.drawImage(qrImg, xPos, yPos, qrSize, qrSize);

        // Draw logo overlay at center
        const logoSize = qrSize * (qrZone.logoSize || 0.30);
        const logoX = xPos + (qrSize / 2) - (logoSize / 2);
        const logoY = yPos + (qrSize / 2) - (logoSize / 2);

        if (qrLogoImg && qrLogoImg.complete && qrLogoImg.naturalHeight !== 0) {
            editorCtx.imageSmoothingEnabled = true;
            editorCtx.imageSmoothingQuality = 'high';
            editorCtx.drawImage(qrLogoImg, logoX, logoY, logoSize, logoSize);
        }

        // Clean up temporary container
        document.body.removeChild(qrContainer);
    }, 100);
}

function renderZoneOverlay(zone) {
    const canvasWidth = editorCanvas.width;
    const canvasHeight = editorCanvas.height;

    const pixelX = (zone.x / 100) * canvasWidth;
    const pixelY = (zone.y / 100) * canvasHeight;
    const pixelWidth = (zone.width / 100) * canvasWidth;
    const pixelHeight = (zone.height / 100) * canvasHeight;

    const zoneEl = document.createElement('div');
    zoneEl.className = 'text-zone';
    zoneEl.dataset.zoneId = zone.id;

    if (selectedZone === zone.id) {
        zoneEl.classList.add('selected');
    }

    zoneEl.style.left = pixelX + 'px';
    zoneEl.style.top = pixelY + 'px';
    zoneEl.style.width = pixelWidth + 'px';
    zoneEl.style.height = pixelHeight + 'px';

    // Add label
    const label = document.createElement('div');
    label.className = 'text-zone-label';
    label.textContent = zone.label;
    zoneEl.appendChild(label);

    // Add resize handles if selected
    if (selectedZone === zone.id) {
        ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].forEach(position => {
            const handle = document.createElement('div');
            handle.className = 'resize-handle ' + position;
            handle.dataset.handle = position;
            zoneEl.appendChild(handle);
        });
    }

    zonesOverlay.appendChild(zoneEl);
}

function renderQRZone() {
    if (!qrZone) return;

    const canvasWidth = editorCanvas.width;
    const canvasHeight = editorCanvas.height;

    const qrSize = (qrZone.size / 100) * canvasWidth;
    const pixelX = (qrZone.x / 100) * canvasWidth - qrSize / 2;
    const pixelY = (qrZone.y / 100) * canvasHeight;

    const zoneEl = document.createElement('div');
    zoneEl.className = 'qr-zone';
    zoneEl.dataset.zoneId = 'qr';

    if (selectedZone === 'qr') {
        zoneEl.classList.add('selected');
    }

    zoneEl.style.left = pixelX + 'px';
    zoneEl.style.top = pixelY + 'px';
    zoneEl.style.width = qrSize + 'px';
    zoneEl.style.height = qrSize + 'px';

    // Add label
    const label = document.createElement('div');
    label.className = 'qr-zone-label';
    label.textContent = 'QR Code';
    zoneEl.appendChild(label);

    zonesOverlay.appendChild(zoneEl);
}

// === Configuration Panel ===

function showZoneConfigPanel(zone) {
    const panel = document.getElementById('zoneConfigSection');
    const qrPanel = document.getElementById('qrConfigSection');

    if (!panel) return;

    // Show text zone panel, hide QR panel
    panel.classList.remove('hidden');
    if (qrPanel) {
        qrPanel.classList.add('hidden');
    }

    // Update title
    const title = document.getElementById('zoneConfigTitle');
    if (title) {
        title.textContent = `Zone : ${zone.label}`;
    }

    // Populate form fields
    const fieldMap = {
        'zoneLabel': zone.label,
        'zoneFieldSelect': zone.field,
        'zoneSampleText': zone.sampleText || '',
        'zonePosX': zone.x,
        'zonePosY': zone.y,
        'zoneWidth': zone.width,
        'zoneHeight': zone.height || 10,
        'zoneFontSize': zone.fontSize,
        'zoneFontFamily': zone.fontFamily,
        'zoneFontWeight': zone.fontWeight,
        'zoneColorText': zone.color,
        'zoneTextTransform': zone.textTransform,
        'zoneMaxChars': zone.maxCharsPerLine || '',
        'zoneLineHeight': zone.lineHeight
    };

    Object.entries(fieldMap).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = value;
        }
    });

    // Update color preview
    const colorPreview = document.getElementById('zoneColorPreview');
    if (colorPreview) {
        colorPreview.style.backgroundColor = zone.color;
    }
}

function hideZoneConfigPanel() {
    const panel = document.getElementById('zoneConfigSection');
    if (panel) {
        panel.classList.add('hidden');
    }
}

function applyZoneConfig() {
    if (!selectedZone) return;

    const zone = getZoneById(selectedZone);
    if (!zone) return;

    // Get values from form
    zone.label = document.getElementById('zoneLabel')?.value || zone.label;
    zone.field = document.getElementById('zoneFieldSelect')?.value || zone.field;
    zone.sampleText = document.getElementById('zoneSampleText')?.value || zone.label;
    zone.x = parseFloat(document.getElementById('zonePosX')?.value || zone.x);
    zone.y = parseFloat(document.getElementById('zonePosY')?.value || zone.y);
    zone.width = parseFloat(document.getElementById('zoneWidth')?.value || zone.width);
    zone.height = parseFloat(document.getElementById('zoneHeight')?.value || zone.height);
    zone.fontSize = parseFloat(document.getElementById('zoneFontSize')?.value || zone.fontSize);
    zone.fontFamily = document.getElementById('zoneFontFamily')?.value || zone.fontFamily;
    zone.fontWeight = document.getElementById('zoneFontWeight')?.value || zone.fontWeight;
    zone.color = document.getElementById('zoneColorText')?.value || zone.color;
    zone.textTransform = document.getElementById('zoneTextTransform')?.value || zone.textTransform;

    const maxChars = document.getElementById('zoneMaxChars')?.value;
    zone.maxCharsPerLine = maxChars ? parseInt(maxChars) : null;

    zone.lineHeight = parseFloat(document.getElementById('zoneLineHeight')?.value || zone.lineHeight);

    renderAllZones();
    showStatus('templateStatus', '✓ Configuration appliquée', 'success');
}

// === QR Configuration ===

function showQRConfigPanel() {
    selectedZone = 'qr';

    const panel = document.getElementById('qrConfigSection');
    const zonePanel = document.getElementById('zoneConfigSection');

    // Show QR panel, hide text zone panel
    if (panel) {
        panel.classList.remove('hidden');
    }
    if (zonePanel) {
        zonePanel.classList.add('hidden');
    }

    renderAllZones();

    // Populate QR config
    document.getElementById('qrEnabled').checked = qrZone.enabled;
    document.getElementById('qrPosX').value = qrZone.x;
    document.getElementById('qrPosY').value = qrZone.y;
    document.getElementById('qrSize').value = qrZone.size;
}

function hideQRConfigPanel() {
    const panel = document.getElementById('qrConfigSection');
    if (panel) {
        panel.classList.add('hidden');
    }
}

function applyQRConfig() {
    qrZone.enabled = document.getElementById('qrEnabled')?.checked || false;
    qrZone.x = parseFloat(document.getElementById('qrPosX')?.value || qrZone.x);
    qrZone.y = parseFloat(document.getElementById('qrPosY')?.value || qrZone.y);
    qrZone.size = parseFloat(document.getElementById('qrSize')?.value || qrZone.size);

    renderAllZones();
    showStatus('templateStatus', '✓ Configuration QR appliquée', 'success');
}

// === Drag & Drop Handlers ===

function setupEditorEventListeners() {
    if (!zonesOverlay) return;

    zonesOverlay.addEventListener('mousedown', handleMouseDown);

    // Also listen on canvas area to detect clicks outside zones
    const canvasArea = document.querySelector('.template-canvas-area');
    if (canvasArea) {
        canvasArea.addEventListener('mousedown', (e) => {
            // Only handle if clicking directly on canvas area (not on overlay elements)
            if (e.target === canvasArea || e.target === editorCanvas || e.target.classList.contains('template-canvas-wrapper')) {
                selectedZone = null;
                hideZoneConfigPanel();
                hideQRConfigPanel();
                renderAllZones();
            }
        });
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);
}

function handleMouseDown(e) {
    const target = e.target;

    // Check if clicking on a resize handle
    if (target.classList.contains('resize-handle')) {
        isResizing = true;
        resizeHandle = target.dataset.handle;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        e.preventDefault();
        return;
    }

    // Check if clicking on a zone
    const zoneEl = target.closest('.text-zone, .qr-zone');
    if (zoneEl) {
        const zoneId = zoneEl.dataset.zoneId;

        if (zoneId === 'qr') {
            selectedZone = 'qr';
            showQRConfigPanel();
        } else {
            selectZone(zoneId);
        }

        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        e.preventDefault();
    } else {
        // Clicked on empty space, deselect
        selectedZone = null;
        hideZoneConfigPanel();
        hideQRConfigPanel();
        renderAllZones();
    }
}

function handleMouseMove(e) {
    if (!isDragging && !isResizing) return;

    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;

    if (isResizing && selectedZone && selectedZone !== 'qr') {
        handleResize(selectedZone, deltaX, deltaY);
    } else if (isDragging) {
        handleDrag(selectedZone, deltaX, deltaY);
    }

    dragStartX = e.clientX;
    dragStartY = e.clientY;

    e.preventDefault();
}

function handleMouseUp() {
    isDragging = false;
    isResizing = false;
    resizeHandle = null;
}

function handleKeyDown(e) {
    // Only handle arrow keys when template editor is active and a zone is selected
    if (!templateEditorActive || !selectedZone) return;

    // Ignore if user is typing in an input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
    }

    const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (!arrowKeys.includes(e.key)) return;

    e.preventDefault(); // Prevent page scrolling

    // Movement increment: 1px normal, 10px with Shift
    const increment = e.shiftKey ? 10 : 1;

    let deltaX = 0;
    let deltaY = 0;

    switch(e.key) {
        case 'ArrowLeft':
            deltaX = -increment;
            break;
        case 'ArrowRight':
            deltaX = increment;
            break;
        case 'ArrowUp':
            deltaY = -increment;
            break;
        case 'ArrowDown':
            deltaY = increment;
            break;
    }

    handleDrag(selectedZone, deltaX, deltaY);
}

function handleDrag(zoneId, deltaX, deltaY) {
    if (!zoneId) return;

    const canvasWidth = editorCanvas.width;
    const canvasHeight = editorCanvas.height;

    const deltaXPercent = (deltaX / canvasWidth) * 100;
    const deltaYPercent = (deltaY / canvasHeight) * 100;

    if (zoneId === 'qr') {
        qrZone.x = Math.max(0, Math.min(100, qrZone.x + deltaXPercent));
        qrZone.y = Math.max(0, Math.min(100, qrZone.y + deltaYPercent));

        document.getElementById('qrPosX').value = qrZone.x.toFixed(1);
        document.getElementById('qrPosY').value = qrZone.y.toFixed(1);
    } else {
        const zone = getZoneById(zoneId);
        if (zone) {
            zone.x = Math.max(0, Math.min(100 - zone.width, zone.x + deltaXPercent));
            zone.y = Math.max(0, Math.min(100 - zone.height, zone.y + deltaYPercent));

            document.getElementById('zonePosX').value = zone.x.toFixed(1);
            document.getElementById('zonePosY').value = zone.y.toFixed(1);
        }
    }

    renderAllZones();
}

function handleResize(zoneId, deltaX, deltaY) {
    const zone = getZoneById(zoneId);
    if (!zone) return;

    const canvasWidth = editorCanvas.width;
    const canvasHeight = editorCanvas.height;

    const deltaXPercent = (deltaX / canvasWidth) * 100;
    const deltaYPercent = (deltaY / canvasHeight) * 100;

    switch (resizeHandle) {
        case 'se':
            zone.width = Math.max(5, zone.width + deltaXPercent);
            zone.height = Math.max(5, zone.height + deltaYPercent);
            break;
        case 'sw':
            zone.x = zone.x + deltaXPercent;
            zone.width = Math.max(5, zone.width - deltaXPercent);
            zone.height = Math.max(5, zone.height + deltaYPercent);
            break;
        case 'ne':
            zone.width = Math.max(5, zone.width + deltaXPercent);
            zone.y = zone.y + deltaYPercent;
            zone.height = Math.max(5, zone.height - deltaYPercent);
            break;
        case 'nw':
            zone.x = zone.x + deltaXPercent;
            zone.width = Math.max(5, zone.width - deltaXPercent);
            zone.y = zone.y + deltaYPercent;
            zone.height = Math.max(5, zone.height - deltaYPercent);
            break;
        case 'e':
            zone.width = Math.max(5, zone.width + deltaXPercent);
            break;
        case 'w':
            zone.x = zone.x + deltaXPercent;
            zone.width = Math.max(5, zone.width - deltaXPercent);
            break;
        case 's':
            zone.height = Math.max(5, zone.height + deltaYPercent);
            break;
        case 'n':
            zone.y = zone.y + deltaYPercent;
            zone.height = Math.max(5, zone.height - deltaYPercent);
            break;
    }

    // Update form fields
    document.getElementById('zonePosX').value = zone.x.toFixed(1);
    document.getElementById('zonePosY').value = zone.y.toFixed(1);
    document.getElementById('zoneWidth').value = zone.width.toFixed(1);
    document.getElementById('zoneHeight').value = zone.height.toFixed(1);

    renderAllZones();
}

// === Template Change ===

async function handleTemplateChange(file) {
    if (!file.type.match('image.*')) {
        showStatus('templateStatus', '⚠ Veuillez sélectionner une image', 'warning');
        return;
    }

    try {
        // Load the new image
        const reader = new FileReader();

        const imageLoaded = new Promise((resolve, reject) => {
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
        });

        reader.readAsDataURL(file);
        const newImg = await imageLoaded;

        // Update template image in app.js
        templateImg.src = newImg.src;
        await new Promise(resolve => {
            templateImg.onload = resolve;
        });

        // Update canvas size to match new template
        editorCanvas.width = newImg.width;
        editorCanvas.height = newImg.height;

        // Save new template to current project
        if (currentProject) {
            const blob = await fileToBlob(file);
            currentProject.template = {
                imageBlob: blob,
                width: newImg.width,
                height: newImg.height
            };
            await saveProjectToDB(currentProject);
        }

        // Re-render all zones on new template
        renderAllZones();

        showStatus('templateStatus', '✓ Template mis à jour', 'success');
    } catch (error) {
        console.error('Error changing template:', error);
        showStatus('templateStatus', '⚠ Erreur lors du changement de template', 'error');
    }
}

// === Save/Load Configuration ===

async function saveConfigurationToProject() {
    if (!currentProject) {
        showStatus('templateStatus', '⚠ Aucun projet actif', 'warning');
        return;
    }

    // Convert percentages to decimals for storage
    const configToSave = textZones.map(zone => ({
        ...zone,
        x: zone.x / 100,
        y: zone.y / 100,
        width: zone.width / 100,
        height: zone.height / 100,
        fontSize: zone.fontSize / 100
    }));

    const qrConfigToSave = {
        ...qrZone,
        x: qrZone.x / 100,
        y: qrZone.y / 100,
        size: qrZone.size / 100
    };

    // Preserve logo data if it exists
    if (currentProject.qrZone && currentProject.qrZone.logoBlob) {
        qrConfigToSave.logoBlob = currentProject.qrZone.logoBlob;
        qrConfigToSave.logoPath = currentProject.qrZone.logoPath;
    }

    currentProject.textZones = configToSave;
    currentProject.qrZone = qrConfigToSave;

    await saveProjectToDB(currentProject);

    hideTemplateEditor();

    // Check if we're editing from preview (previewCard is visible)
    const previewCard = document.getElementById('previewCard');
    const isEditingFromPreview = previewCard && !previewCard.classList.contains('hidden');

    if (isEditingFromPreview) {
        // Re-render current badge with new configuration
        console.log('Re-rendering badge with updated configuration');
        const currentIndex = parseInt(participantSelect.value);
        if (!isNaN(currentIndex) && participants[currentIndex]) {
            participantSelect.dispatchEvent(new Event('change'));
        }
        showStatus('templateStatus', `✓ Configuration mise à jour et badge regénéré`, 'success');
    } else {
        // First time setup - continue to next step
        updateStep(2, 0);
        showStatus('templateStatus', `✓ Configuration du template sauvegardée dans "${currentProject.name}"`, 'success');
    }
}

// === Event Listeners ===

document.addEventListener('DOMContentLoaded', () => {
    // Close template editor
    const closeBtn = document.getElementById('closeTemplateEditorBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (confirm('Fermer sans sauvegarder ?')) {
                hideTemplateEditor();
            }
        });
    }

    // Add text zone
    const addTextZoneBtn = document.getElementById('addTextZoneBtn');
    if (addTextZoneBtn) {
        addTextZoneBtn.addEventListener('click', createTextZone);
    }

    // Change template
    const changeTemplateBtn = document.getElementById('changeTemplateBtn');
    const changeTemplateInput = document.getElementById('changeTemplateInput');
    if (changeTemplateBtn && changeTemplateInput) {
        changeTemplateBtn.addEventListener('click', () => {
            changeTemplateInput.click();
        });

        changeTemplateInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await handleTemplateChange(file);
                e.target.value = ''; // Reset input
            }
        });
    }

    // Load default config
    const loadDefaultBtn = document.getElementById('loadDefaultConfigBtn');
    if (loadDefaultBtn) {
        loadDefaultBtn.addEventListener('click', () => {
            if (confirm('Charger la configuration par défaut ? Les modifications actuelles seront perdues.')) {
                loadDefaultConfiguration();
                renderAllZones();
                selectedZone = null;
                hideZoneConfigPanel();
                showStatus('templateStatus', '✓ Configuration par défaut chargée', 'success');
            }
        });
    }

    // Save and continue
    const saveConfigBtn = document.getElementById('saveTemplateConfigBtn');
    if (saveConfigBtn) {
        saveConfigBtn.addEventListener('click', saveConfigurationToProject);
    }

    // Apply zone config
    const applyZoneBtn = document.getElementById('applyZoneConfigBtn');
    if (applyZoneBtn) {
        applyZoneBtn.addEventListener('click', applyZoneConfig);
    }

    // Delete zone
    const deleteZoneBtn = document.getElementById('deleteZoneBtn');
    if (deleteZoneBtn) {
        deleteZoneBtn.addEventListener('click', () => {
            if (selectedZone && selectedZone !== 'qr') {
                deleteTextZone(selectedZone);
            }
        });
    }

    // Zone label input
    const zoneLabelInput = document.getElementById('zoneLabel');
    if (zoneLabelInput) {
        zoneLabelInput.addEventListener('input', (e) => {
            if (selectedZone && selectedZone !== 'qr') {
                const zone = getZoneById(selectedZone);
                if (zone) {
                    zone.label = e.target.value;
                    renderAllZones();
                }
            }
        });
    }

    // Zone sample text input
    const zoneSampleTextInput = document.getElementById('zoneSampleText');
    if (zoneSampleTextInput) {
        zoneSampleTextInput.addEventListener('input', (e) => {
            if (selectedZone && selectedZone !== 'qr') {
                const zone = getZoneById(selectedZone);
                if (zone) {
                    zone.sampleText = e.target.value;
                    renderAllZones();
                }
            }
        });
    }

    // Color picker
    const colorPreview = document.getElementById('zoneColorPreview');
    const colorPicker = document.getElementById('zoneColorPicker');
    const colorText = document.getElementById('zoneColorText');

    if (colorPreview && colorPicker && colorText) {
        colorPreview.addEventListener('click', () => colorPicker.click());

        colorPicker.addEventListener('input', (e) => {
            const color = e.target.value;
            colorText.value = color;
            colorPreview.style.backgroundColor = color;

            if (selectedZone && selectedZone !== 'qr') {
                const zone = getZoneById(selectedZone);
                if (zone) {
                    zone.color = color;
                    renderAllZones();
                }
            }
        });

        colorText.addEventListener('input', (e) => {
            const color = e.target.value;
            if (/^#[0-9A-F]{6}$/i.test(color)) {
                colorPicker.value = color;
                colorPreview.style.backgroundColor = color;

                if (selectedZone && selectedZone !== 'qr') {
                    const zone = getZoneById(selectedZone);
                    if (zone) {
                        zone.color = color;
                        renderAllZones();
                    }
                }
            }
        });
    }

    // QR config toggle
    const qrEnabled = document.getElementById('qrEnabled');
    if (qrEnabled) {
        qrEnabled.addEventListener('change', applyQRConfig);
    }

    // QR position and size inputs
    const qrPosX = document.getElementById('qrPosX');
    const qrPosY = document.getElementById('qrPosY');
    const qrSize = document.getElementById('qrSize');

    if (qrPosX) {
        qrPosX.addEventListener('input', () => {
            applyQRConfig();
            renderAllZones();
        });
    }

    if (qrPosY) {
        qrPosY.addEventListener('input', () => {
            applyQRConfig();
            renderAllZones();
        });
    }

    if (qrSize) {
        qrSize.addEventListener('input', () => {
            applyQRConfig();
            renderAllZones();
        });
    }

    // QR Logo selection
    const selectQrLogoBtn = document.getElementById('selectQrLogoBtn');
    const qrLogoInput = document.getElementById('qrLogoInput');
    const qrLogoName = document.getElementById('qrLogoName');

    if (selectQrLogoBtn && qrLogoInput) {
        selectQrLogoBtn.addEventListener('click', () => {
            qrLogoInput.click();
        });

        qrLogoInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Update logo name display
            if (qrLogoName) {
                qrLogoName.textContent = file.name;
            }

            // Load new logo image
            const reader = new FileReader();
            reader.onload = async (event) => {
                qrLogoImg.src = event.target.result;
                qrLogoImg.onload = async () => {
                    // Save logo to project as Blob
                    if (currentProject && projectMode) {
                        const blob = await fileToBlob(file);
                        if (!currentProject.qrZone) {
                            currentProject.qrZone = getDefaultQRConfig();
                        }
                        currentProject.qrZone.logoBlob = blob;
                        currentProject.qrZone.logoPath = file.name;
                        await saveProjectToDB(currentProject);
                    }

                    // Clear QR cache to force regeneration with new logo
                    qrSampleImg = null;
                    qrSampleSize = null;

                    // Re-render with new logo
                    renderAllZones();

                    showStatus('templateStatus', `✓ Logo du QR Code mis à jour : ${file.name}`, 'success');
                };
            };
            reader.readAsDataURL(file);
        });
    }
});
