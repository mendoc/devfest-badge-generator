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

    bgInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        showStatus('templateStatus', '⏳ Chargement du template...', 'warning');

        const reader = new FileReader();
        reader.onload = (event) => {
            templateImg.src = event.target.result;
            templateImg.onload = () => {
                canvas.width = templateImg.width;
                canvas.height = templateImg.height;
                ctx.drawImage(templateImg, 0, 0);

                showStatus('templateStatus', `✓ Template chargé (${canvas.width}x${canvas.height}px)`, 'success');
                updateStep(2);
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

        // --- LEFT SIDE: TEXT ---
        ctx.fillStyle = "#000000";
        ctx.textAlign = "left";

        const maxTextWidth = canvas.width * 0.45;
        const xPos = canvas.width * 0.05;
        let currentY = canvas.height * 0.44;

        // First name (Bold, Capitalized) - Max 16 chars per line
        const prenom = capitalize(smartGetField(p, 'prenom'));
        const prenomFontSize = canvas.height * 0.05;
        ctx.font = "bold " + prenomFontSize + "px Roboto, sans-serif";

        const prenomLines = splitTextToFit(prenom, maxTextWidth, 16);
        currentY = drawMultilineText(prenom, xPos, currentY, prenomFontSize * 1.2, maxTextWidth, 16);

        // Last name (Bold, UPPERCASE) - Max 12 chars per line
        const nom = smartGetField(p, 'nom').toUpperCase();
        const nomFontSize = canvas.height * 0.05;
        ctx.font = "bold " + nomFontSize + "px Roboto, sans-serif";

        const nomLines = splitTextToFit(nom, maxTextWidth, 12);
        currentY = drawMultilineText(nom, xPos, currentY, nomFontSize * 1.2, maxTextWidth, 12);

        const totalLines = prenomLines.length + nomLines.length;

        // Fixed position for role and pole
        const fixedRoleY = canvas.height * 0.44 + (3 * prenomFontSize * 1.2) + canvas.height * 0.02;

        const detailsFontSize = canvas.height * 0.03;
        ctx.font = detailsFontSize + "px Roboto, sans-serif";

        // Change role color to white if 4+ lines
        ctx.fillStyle = totalLines >= 4 ? "#ffffff" : "#3c4043";

        const role = smartGetField(p, 'role');
        let roleY = drawMultilineText(role, xPos, fixedRoleY, detailsFontSize * 1.3, maxTextWidth);

        // Pole keeps normal color
        ctx.fillStyle = "#3c4043";
        const pole = smartGetField(p, 'pole');
        drawMultilineText(pole, xPos, roleY, detailsFontSize * 1.3, maxTextWidth);

        // --- RIGHT SIDE: QR CODE ---
        const qrContainer = document.getElementById('qr-hidden');
        qrContainer.innerHTML = "";

        const qrSize = canvas.width * 0.28;

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
                return;
            }

            const centerOfRightSide = (canvas.width * 0.75);
            const xPos = centerOfRightSide - (qrSize / 2);
            const yPos = canvas.height * 0.32;

            ctx.drawImage(qrImg, xPos, yPos, qrSize, qrSize);

            const logoSize = qrSize * 0.30;
            const logoX = xPos + (qrSize / 2) - (logoSize / 2);
            const logoY = yPos + (qrSize / 2) - (logoSize / 2);

            if (qrLogoImg.complete && qrLogoImg.naturalHeight !== 0) {
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(qrLogoImg, logoX, logoY, logoSize, logoSize);
            }

            downloadBtn.disabled = false;
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
