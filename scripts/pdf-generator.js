// PDF Generator - Batch export to PDF
// Uses jsPDF for PDF creation

// Generate badge for a single participant
async function generateBadgeForParticipant(p) {
    return new Promise((resolve) => {
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
            resolve();
            return;
        }

        const qrContainer = document.getElementById('qr-hidden');
        qrContainer.innerHTML = "";

        const qrSize = canvas.width * qrConfig.size;

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

            if (qrImg) {
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
            }

            resolve();
        }, 400);
    });
}

// Download all badges as PDF handler
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('downloadAllBtn').onclick = async () => {
        if (!templateImg.src || participants.length === 0) {
            return;
        }

        const btn = document.getElementById('downloadAllBtn');
        const originalContent = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="loading"></span> Génération en cours... (0/' + participants.length + ')';

        const { jsPDF } = window.jspdf;

        // A4 portrait format
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });

        const pageWidth = 595;
        const pageHeight = 842;

        // Calculate badge size for 2 badges per page (vertical)
        const margin = 20;
        const availableWidth = pageWidth - 2 * margin;
        const availableHeight = (pageHeight - 3 * margin) / 2;

        const badgeRatio = canvas.width / canvas.height;
        let badgeWidth, badgeHeight;

        if (availableWidth / availableHeight > badgeRatio) {
            badgeHeight = availableHeight;
            badgeWidth = badgeHeight * badgeRatio;
        } else {
            badgeWidth = availableWidth;
            badgeHeight = badgeWidth / badgeRatio;
        }

        let badgeCount = 0;

        for (let i = 0; i < participants.length; i++) {
            await generateBadgeForParticipant(participants[i]);

            const imgData = canvas.toDataURL('image/png');

            const position = badgeCount % 2;

            // Add new page every 2 badges
            if (position === 0 && badgeCount > 0) {
                pdf.addPage('a4', 'portrait');
            }

            // Center horizontally
            const xPos = margin + (availableWidth - badgeWidth) / 2;

            // Calculate Y position (top or bottom)
            let yPos;
            if (position === 0) {
                yPos = margin;
            } else {
                yPos = margin * 2 + badgeHeight;
            }

            pdf.addImage(imgData, 'PNG', xPos, yPos, badgeWidth, badgeHeight);

            badgeCount++;
            btn.innerHTML = `<span class="loading"></span> Génération en cours... (${i + 1}/${participants.length})`;
        }

        pdf.save('Badges_DevFest_2025.pdf');

        btn.disabled = false;
        btn.innerHTML = originalContent;

        const totalPages = Math.ceil(participants.length / 2);
        showStatus('csvStatus', `✓ ${participants.length} badges générés sur ${totalPages} pages A4`, 'success');
    };

    // Download current badge as PDF handler
    document.getElementById('downloadPdfBtn').onclick = async () => {
        const currentIndex = parseInt(participantSelect.value);

        if (isNaN(currentIndex) || !templateImg.src || !participants[currentIndex]) {
            return;
        }

        const btn = document.getElementById('downloadPdfBtn');
        const originalContent = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="loading"></span> Génération...';

        const { jsPDF } = window.jspdf;

        // A4 portrait format
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });

        const pageWidth = 595;
        const pageHeight = 842;

        // Calculate badge size for upper half of page
        const margin = 20;
        const availableWidth = pageWidth - 2 * margin;
        const availableHeight = (pageHeight - 3 * margin) / 2;

        const badgeRatio = canvas.width / canvas.height;
        let badgeWidth, badgeHeight;

        if (availableWidth / availableHeight > badgeRatio) {
            badgeHeight = availableHeight;
            badgeWidth = badgeHeight * badgeRatio;
        } else {
            badgeWidth = availableWidth;
            badgeHeight = badgeWidth / badgeRatio;
        }

        // Generate badge for current participant
        await generateBadgeForParticipant(participants[currentIndex]);

        const imgData = canvas.toDataURL('image/png');

        // Center horizontally, position at top
        const xPos = margin + (availableWidth - badgeWidth) / 2;
        const yPos = margin;

        pdf.addImage(imgData, 'PNG', xPos, yPos, badgeWidth, badgeHeight);

        // Get participant name for filename
        const prenom = smartGetField(participants[currentIndex], 'prenom');
        const nom = smartGetField(participants[currentIndex], 'nom');
        const name = `${prenom}_${nom}`.replace(/\s+/g, '_');

        pdf.save(`Badge_${name}.pdf`);

        btn.disabled = false;
        btn.innerHTML = originalContent;

        showStatus('csvStatus', `✓ Badge PDF généré pour ${prenom} ${nom}`, 'success');
    };
});
