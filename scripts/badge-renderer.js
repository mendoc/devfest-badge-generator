// Badge Renderer - Canvas badge generation
// Text formatting and QR code rendering

// Text formatting utilities
function capitalize(str) {
    if (!str) return "";
    return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

function removeAccents(str) {
    if (!str) return "";
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function splitTextToFit(text, maxWidth, maxChars = null) {
    const cleanText = text.trim().replace(/\s+/g, ' ');
    const words = cleanText.split(' ').filter(word => word.length > 0);

    if (words.length === 0) return [];

    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + ' ' + words[i];
        const metrics = ctx.measureText(testLine);

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

function drawMultilineText(text, x, startY, lineHeight, maxWidth, maxChars = null) {
    const lines = splitTextToFit(text, maxWidth, maxChars);
    let currentY = startY;

    lines.forEach((line) => {
        ctx.fillText(line, x, currentY);
        currentY += lineHeight;
    });

    return currentY;
}

// Get default text zones configuration
function getDefaultTextZones() {
    return [
        {
            id: "prenom",
            label: "Prénom",
            field: "prenom",
            x: 0.05,
            y: 0.44,
            width: 0.45,
            fontSize: 0.05,
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
            x: 0.05,
            y: 0.56,
            width: 0.45,
            fontSize: 0.05,
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
            x: 0.05,
            y: 0.68,
            width: 0.45,
            fontSize: 0.03,
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
            x: 0.05,
            y: 0.78,
            width: 0.45,
            fontSize: 0.03,
            fontFamily: "Roboto",
            fontWeight: "normal",
            color: "#3c4043",
            textTransform: "none",
            maxCharsPerLine: null,
            lineHeight: 1.3
        }
    ];
}

// Get default QR zone configuration
function getDefaultQRConfig() {
    return {
        enabled: true,
        x: 0.75,
        y: 0.32,
        size: 0.28,
        logoSize: 0.30,
        logoPath: "logo-qr.png",
        correctLevel: "M"
    };
}

// Render a text zone with configuration
function renderTextZone(participant, zone) {
    const value = smartGetField(participant, zone.field);

    console.log('renderTextZone called:', {
        field: zone.field,
        value: value,
        zone: zone,
        participant: participant
    });

    if (!value) {
        console.warn(`No value found for field: ${zone.field}`);
        return;
    }

    // Apply text transformation
    let text = value;
    switch (zone.textTransform) {
        case 'uppercase':
            text = text.toUpperCase();
            break;
        case 'lowercase':
            text = text.toLowerCase();
            break;
        case 'capitalize':
            text = capitalize(text);
            break;
    }

    // Calculate pixel values from decimals (0.05 = 5%)
    const x = canvas.width * zone.x;
    const y = canvas.height * zone.y;
    const maxWidth = canvas.width * zone.width;
    const fontSize = canvas.height * zone.fontSize;
    const lineHeight = fontSize * zone.lineHeight;

    console.log('Rendering text:', {
        text: text,
        x: x,
        y: y,
        fontSize: fontSize,
        font: `${zone.fontWeight} ${fontSize}px ${zone.fontFamily}`,
        color: zone.color
    });

    // Set font
    ctx.font = `${zone.fontWeight} ${fontSize}px ${zone.fontFamily}`;
    ctx.fillStyle = zone.color;
    ctx.textAlign = "left";
    ctx.textBaseline = "top"; // Make Y position the TOP of the text

    // Draw text
    drawMultilineText(text, x, y, lineHeight, maxWidth, zone.maxCharsPerLine);
}

// Template upload handler
document.addEventListener('DOMContentLoaded', () => {
    const bgInput = document.getElementById('bgInput');
    const templateUploadArea = document.getElementById('templateUploadArea');

    templateUploadArea.addEventListener('click', () => bgInput.click());

    templateUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        templateUploadArea.classList.add('active');
    });

    templateUploadArea.addEventListener('dragleave', () => {
        templateUploadArea.classList.remove('active');
    });

    templateUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        templateUploadArea.classList.remove('active');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            bgInput.files = e.dataTransfer.files;
            bgInput.dispatchEvent(new Event('change'));
        }
    });

    bgInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        showStatus('templateStatus', '⏳ Chargement du template...', 'warning');

        const reader = new FileReader();
        reader.onload = async (event) => {
            templateImg.src = event.target.result;
            templateImg.onload = async () => {
                canvas.width = templateImg.width;
                canvas.height = templateImg.height;
                ctx.drawImage(templateImg, 0, 0);

                // Save to project if active
                if (currentProject && projectMode) {
                    try {
                        const blob = await fileToBlob(file);
                        currentProject.template = {
                            imageBlob: blob,
                            width: templateImg.width,
                            height: templateImg.height
                        };
                        await saveProjectToDB(currentProject);
                        showStatus('templateStatus', `✓ Template sauvegardé dans "${currentProject.name}"`, 'success');
                    } catch (error) {
                        console.error('Error saving template to project:', error);
                    }
                }

                showStatus('templateStatus', `✓ Template chargé (${canvas.width}x${canvas.height}px)`, 'success');

                // Show template editor
                showTemplateEditor();
            };
        };
        reader.readAsDataURL(file);
    };

    // Participant selection handler
    participantSelect.onchange = function () {
        const p = participants[this.value];

        if (!p || !templateImg.src) {
            downloadBtn.disabled = true;
            return;
        }

        // Clear and draw background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(templateImg, 0, 0);

        // Get text zones from project config or defaults
        const textZones = currentProject?.textZones || getDefaultTextZones();

        // Render each text zone
        textZones.forEach(zone => {
            renderTextZone(p, zone);
        });

        // --- QR CODE ---
        const qrConfig = currentProject?.qrZone || getDefaultQRConfig();

        if (qrConfig.enabled === false) {
            downloadBtn.disabled = false;
            const downloadPdfBtn = document.getElementById('downloadPdfBtn');
            if (downloadPdfBtn) downloadPdfBtn.disabled = false;
            return;
        }

        const qrContainer = document.getElementById('qr-hidden');
        qrContainer.innerHTML = "";

        const qrSize = canvas.width * qrConfig.size;

        // Create vCard manually
        const nomComplet = removeAccents(smartGetField(p, 'nom').toUpperCase());
        const prenomComplet = removeAccents(capitalize(smartGetField(p, 'prenom')));
        const tel = smartGetField(p, 'tel').trim();
        const email = removeAccents(smartGetField(p, 'email').trim());

        let qrData = "BEGIN:VCARD\n";
        qrData += "VERSION:3.0\n";

        if (nomComplet || prenomComplet) {
            qrData += `N:${nomComplet};${prenomComplet}\n`;
            qrData += `FN:${prenomComplet} ${nomComplet}\n`;
        }

        if (tel) {
            qrData += `TEL;CELL:${tel}\n`;
        }

        if (email) {
            qrData += `EMAIL:${email}\n`;
        }

        qrData += "END:VCARD";

        if (qrData && typeof qrData === 'string') {
            qrData = qrData.normalize('NFC');
        }

        try {
            new QRCode(qrContainer, {
                text: qrData,
                width: qrSize,
                height: qrSize,
                colorDark: "#000000",
                colorLight: "rgba(255,255,255,0)",
                correctLevel: QRCode.CorrectLevel.M
            });
        } catch (error) {
            try {
                new QRCode(qrContainer, {
                    text: qrData,
                    width: qrSize,
                    height: qrSize,
                    colorDark: "#000000",
                    colorLight: "rgba(255,255,255,0)",
                    correctLevel: QRCode.CorrectLevel.L
                });
            } catch (e2) {
                new QRCode(qrContainer, {
                    text: "https://devfest.gdglibreville.com",
                    width: qrSize,
                    height: qrSize,
                    colorDark: "#000000",
                    colorLight: "rgba(255,255,255,0)",
                    correctLevel: QRCode.CorrectLevel.M
                });
            }
        }

        setTimeout(() => {
            const qrImg = qrContainer.querySelector('img');

            if (!qrImg) {
                downloadBtn.disabled = false;
                const downloadPdfBtn = document.getElementById('downloadPdfBtn');
                if (downloadPdfBtn) downloadPdfBtn.disabled = false;
                return;
            }

            const xPos = (canvas.width * qrConfig.x) - (qrSize / 2);
            const yPos = canvas.height * qrConfig.y;

            ctx.drawImage(qrImg, xPos, yPos, qrSize, qrSize);

            const logoSize = qrSize * qrConfig.logoSize;
            const logoX = xPos + (qrSize / 2) - (logoSize / 2);
            const logoY = yPos + (qrSize / 2) - (logoSize / 2);

            if (qrLogoImg.complete && qrLogoImg.naturalHeight !== 0) {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(qrLogoImg, logoX, logoY, logoSize, logoSize);
            }

            downloadBtn.disabled = false;
            const downloadPdfBtn = document.getElementById('downloadPdfBtn');
            if (downloadPdfBtn) downloadPdfBtn.disabled = false;
        }, 300);
    };

    // Download button handler
    downloadBtn.onclick = () => {
        const name = participantSelect.selectedOptions[0].textContent.replace(/\s+/g, '_');
        const link = document.createElement('a');
        link.download = `Badge_DevFest_${name}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    };
});
