// Template Editor - Visual editor for badge template configuration
// Drag & drop zones, configuration panel, and preset management

// Editor state (templateEditorActive and selectedZone are in app.js)
let textZones = [];
let qrZone = null;
let editorCanvas = null;
let editorCtx = null;
let zonesOverlay = null;

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

    // Render zones
    renderAllZones();

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
            lineHeight: 1.2
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
            lineHeight: 1.2
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
            lineHeight: 1.3
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
            lineHeight: 1.3
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
        lineHeight: 1.2
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

    zonesOverlay.innerHTML = '';

    // Render text zones
    textZones.forEach(zone => {
        renderZoneOverlay(zone);
    });

    // Render QR zone
    if (qrZone && qrZone.enabled) {
        renderQRZone();
    }
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
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
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
});
