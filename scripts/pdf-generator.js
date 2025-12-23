// PDF Generator - Batch export to PDF
// Uses jsPDF for PDF creation

// Generate badge for a single participant
async function generateBadgeForParticipant(p) {
    return new Promise((resolve) => {
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

        const fixedRoleY = canvas.height * 0.44 + (3 * prenomFontSize * 1.2) + canvas.height * 0.02;

        const detailsFontSize = canvas.height * 0.03;
        ctx.font = detailsFontSize + "px Roboto, sans-serif";

        ctx.fillStyle = totalLines >= 4 ? "#ffffff" : "#3c4043";

        const role = smartGetField(p, 'role');
        let roleY = drawMultilineText(role, xPos, fixedRoleY, detailsFontSize * 1.3, maxTextWidth);

        ctx.fillStyle = "#3c4043";
        const pole = smartGetField(p, 'pole');
        drawMultilineText(pole, xPos, roleY, detailsFontSize * 1.3, maxTextWidth);

        // --- RIGHT SIDE: QR CODE ---
        const qrContainer = document.getElementById('qr-hidden');
        qrContainer.innerHTML = "";

        const qrSize = canvas.width * 0.28;

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
});
