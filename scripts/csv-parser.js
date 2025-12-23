// CSV Parser - Import and Export
// Uses PapaParse for CSV handling

// CSV Import Handler
document.addEventListener('DOMContentLoaded', () => {
    const csvInput = document.getElementById('csvInput');
    const csvUploadArea = document.getElementById('csvUploadArea');

    // Click to upload
    csvUploadArea.addEventListener('click', () => csvInput.click());

    // Drag and drop
    csvUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        csvUploadArea.classList.add('active');
    });

    csvUploadArea.addEventListener('dragleave', () => {
        csvUploadArea.classList.remove('active');
    });

    csvUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        csvUploadArea.classList.remove('active');
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.csv')) {
            csvInput.files = e.dataTransfer.files;
            csvInput.dispatchEvent(new Event('change'));
        }
    });

    // CSV file change handler
    csvInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        showStatus('csvStatus', '⏳ Analyse du fichier CSV...', 'warning');

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            encoding: "UTF-8",
            transformHeader: h => h.trim().replace(/^\ufeff/, ""),
            complete: function (results) {
                participantsOriginal = results.data;
                participantsEdited = JSON.parse(JSON.stringify(participantsOriginal)); // Deep clone
                participants = participantsOriginal;

                if (participantsOriginal.length === 0) {
                    showStatus('csvStatus', '⚠ Aucune donnée trouvée dans le CSV', 'error');
                    return;
                }

                showStatus('csvStatus', `✓ ${participantsOriginal.length} participant(s) chargé(s)`, 'success');

                // Initialize CSV Editor
                initializeEditor();

                // Show editor card
                document.getElementById('editorCard').classList.remove('hidden');
                updateStep(2.5, participantsOriginal.length);
            },
            error: function (error) {
                showStatus('csvStatus', `✗ Erreur: ${error.message}`, 'error');
            }
        });
    };
});

// CSV Export function
function handleExportCsv() {
    // Use PapaParse to convert back to CSV
    const csv = Papa.unparse(participantsEdited, {
        quotes: true,
        header: true
    });

    // Create download
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for UTF-8
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `participants_edited_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    showStatus('csvStatus', '✓ CSV exporté avec succès', 'success');
}
