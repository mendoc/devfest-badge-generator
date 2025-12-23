// CSV Editor - Interactive data table editor
// Duplicate detection, inline editing, search, and row operations

// Initialize the CSV editor
function initializeEditor() {
    editorActive = true;

    // Detect column mappings
    const detectedMappings = detectColumnMappings(participantsOriginal);
    renderColumnMappingTable(detectedMappings);

    // Detect duplicates
    detectDuplicates();
    renderDuplicateWarnings();

    // Render the editable table
    renderEditorTable();

    // Update visible row count
    updateVisibleRowCount();
}

// Detect duplicate emails and names
function detectDuplicates() {
    duplicates = { email: {}, name: {} };

    participantsEdited.forEach((p, index) => {
        // Check email duplicates
        const email = smartGetField(p, 'email').toLowerCase().trim();
        if (email) {
            if (!duplicates.email[email]) {
                duplicates.email[email] = [];
            }
            duplicates.email[email].push(index);
        }

        // Check name duplicates (first + last)
        const prenom = smartGetField(p, 'prenom').toLowerCase().trim();
        const nom = smartGetField(p, 'nom').toLowerCase().trim();
        const fullName = `${prenom} ${nom}`.trim();

        if (fullName) {
            if (!duplicates.name[fullName]) {
                duplicates.name[fullName] = [];
            }
            duplicates.name[fullName].push(index);
        }
    });

    // Filter out non-duplicates (only keep entries with 2+ occurrences)
    Object.keys(duplicates.email).forEach(key => {
        if (duplicates.email[key].length < 2) {
            delete duplicates.email[key];
        }
    });

    Object.keys(duplicates.name).forEach(key => {
        if (duplicates.name[key].length < 2) {
            delete duplicates.name[key];
        }
    });
}

// Render duplicate warnings
function renderDuplicateWarnings() {
    const duplicateSection = document.getElementById('duplicateSection');
    const duplicateSectionTitle = document.getElementById('duplicateSectionTitle');
    const duplicateWarnings = document.getElementById('duplicateWarnings');

    const emailDuplicates = Object.keys(duplicates.email);
    const nameDuplicates = Object.keys(duplicates.name);
    const totalDuplicates = emailDuplicates.length + nameDuplicates.length;

    if (totalDuplicates === 0) {
        duplicateSection.classList.add('hidden');
        return;
    }

    duplicateSection.classList.remove('hidden');
    duplicateWarnings.innerHTML = '';

    // Update title with count
    duplicateSectionTitle.textContent = `Doublons détectés (${totalDuplicates})`;

    // Render email duplicates
    emailDuplicates.forEach(email => {
        const rows = duplicates.email[email];
        const warning = document.createElement('div');
        warning.className = 'duplicate-warning';
        warning.innerHTML = `
            <span class="duplicate-icon">⚠️</span>
            <span class="duplicate-text">
                <strong>Email:</strong> ${email}
                <span class="duplicate-rows">Lignes: ${rows.map(r => r + 1).join(', ')}</span>
            </span>
        `;
        duplicateWarnings.appendChild(warning);
    });

    // Render name duplicates
    nameDuplicates.forEach(name => {
        const rows = duplicates.name[name];
        const warning = document.createElement('div');
        warning.className = 'duplicate-warning';
        warning.innerHTML = `
            <span class="duplicate-icon">⚠️</span>
            <span class="duplicate-text">
                <strong>Nom complet:</strong> ${name}
                <span class="duplicate-rows">Lignes: ${rows.map(r => r + 1).join(', ')}</span>
            </span>
        `;
        duplicateWarnings.appendChild(warning);
    });
}

// Check if a row is a duplicate
function isRowDuplicate(rowIndex) {
    // Check if this row appears in any duplicate list
    for (let email in duplicates.email) {
        if (duplicates.email[email].includes(rowIndex)) {
            return true;
        }
    }

    for (let name in duplicates.name) {
        if (duplicates.name[name].includes(rowIndex)) {
            return true;
        }
    }

    return false;
}

// Render the editable table
function renderEditorTable() {
    const table = document.getElementById('editorTable');
    const thead = document.getElementById('editorTableHead');
    const tbody = document.getElementById('editorTableBody');

    // Clear existing content
    thead.innerHTML = '';
    tbody.innerHTML = '';

    if (participantsEdited.length === 0) {
        return;
    }

    // Get all column names from first row
    const allColumns = Object.keys(participantsEdited[0]);

    // Define columns to display (can be customized)
    const displayColumns = ['prenom', 'nom', 'email', 'tel', 'role', 'pole'];

    // Create header
    const headerRow = document.createElement('tr');

    // Row number column
    const thNumber = document.createElement('th');
    thNumber.textContent = '#';
    thNumber.style.width = '50px';
    headerRow.appendChild(thNumber);

    // Field columns
    const fieldLabels = {
        prenom: 'Prénom',
        nom: 'Nom',
        email: 'Email',
        tel: 'Téléphone',
        role: 'Rôle',
        pole: 'Pôle/Organisation'
    };

    displayColumns.forEach(field => {
        const th = document.createElement('th');
        th.textContent = fieldLabels[field] || field;
        headerRow.appendChild(th);
    });

    // Actions column
    const thActions = document.createElement('th');
    thActions.textContent = 'Actions';
    thActions.style.width = '80px';
    headerRow.appendChild(thActions);

    thead.appendChild(headerRow);

    // Create rows
    participantsEdited.forEach((participant, index) => {
        const row = createTableRow(participant, index, displayColumns);
        tbody.appendChild(row);
    });
}

// Create a single table row
function createTableRow(participant, rowIndex, displayColumns) {
    const row = document.createElement('tr');
    row.dataset.rowIndex = rowIndex;

    // Add duplicate class if applicable
    if (isRowDuplicate(rowIndex)) {
        row.classList.add('duplicate-row');
    }

    // Row number
    const tdNumber = document.createElement('td');
    tdNumber.textContent = rowIndex + 1;
    tdNumber.className = 'row-number';
    row.appendChild(tdNumber);

    // Data columns
    displayColumns.forEach(field => {
        const td = document.createElement('td');
        const value = smartGetField(participant, field);

        // Create editable cell
        const cellDiv = document.createElement('div');
        cellDiv.className = 'editable-cell';
        cellDiv.contentEditable = 'true';
        cellDiv.textContent = value || '';
        cellDiv.dataset.field = field;
        cellDiv.dataset.rowIndex = rowIndex;
        cellDiv.dataset.originalValue = value || '';

        // Add event listeners
        cellDiv.addEventListener('blur', handleCellBlur);
        cellDiv.addEventListener('keydown', handleCellKeydown);

        td.appendChild(cellDiv);
        row.appendChild(td);
    });

    // Actions column
    const tdActions = document.createElement('td');
    tdActions.className = 'row-actions';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-icon btn-danger';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = 'Supprimer cette ligne';
    deleteBtn.onclick = () => handleDeleteRow(rowIndex);

    tdActions.appendChild(deleteBtn);
    row.appendChild(tdActions);

    return row;
}

// Handle cell blur (save changes)
function handleCellBlur(event) {
    const cell = event.target;
    const rowIndex = parseInt(cell.dataset.rowIndex);
    const field = cell.dataset.field;
    const originalValue = cell.dataset.originalValue;
    const newValue = cell.textContent.trim();

    if (newValue !== originalValue) {
        // Find the actual column name in the participant data
        const participant = participantsEdited[rowIndex];
        const possibleColumns = columnMappings[field] || [];

        let columnFound = false;
        for (let columnName of possibleColumns) {
            if (participant.hasOwnProperty(columnName)) {
                participant[columnName] = newValue;
                columnFound = true;
                break;
            }
        }

        // If no column found, create a new one with the field name
        if (!columnFound) {
            participant[field] = newValue;
        }

        // Mark cell as edited
        cell.classList.add('edited');
        cell.dataset.originalValue = newValue;

        // Re-detect duplicates
        detectDuplicates();
        renderDuplicateWarnings();

        // Update duplicate highlighting
        updateDuplicateHighlighting();
    }
}

// Handle Enter key in cell (move to next cell)
function handleCellKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        event.target.blur();

        // Focus next cell
        const nextCell = getNextEditableCell(event.target);
        if (nextCell) {
            nextCell.focus();
        }
    } else if (event.key === 'Escape') {
        // Cancel editing
        event.target.textContent = event.target.dataset.originalValue;
        event.target.blur();
    }
}

// Get next editable cell
function getNextEditableCell(currentCell) {
    const allCells = Array.from(document.querySelectorAll('.editable-cell'));
    const currentIndex = allCells.indexOf(currentCell);

    if (currentIndex >= 0 && currentIndex < allCells.length - 1) {
        return allCells[currentIndex + 1];
    }

    return null;
}

// Update duplicate row highlighting
function updateDuplicateHighlighting() {
    const rows = document.querySelectorAll('#editorTableBody tr');

    rows.forEach((row, index) => {
        if (isRowDuplicate(index)) {
            row.classList.add('duplicate-row');
        } else {
            row.classList.remove('duplicate-row');
        }
    });
}

// Handle row deletion
function handleDeleteRow(rowIndex) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la ligne ${rowIndex + 1} ?`)) {
        participantsEdited.splice(rowIndex, 1);

        // Re-detect duplicates
        detectDuplicates();

        // Re-render table and warnings
        renderDuplicateWarnings();
        renderEditorTable();
        updateVisibleRowCount();

        showStatus('csvStatus', `✓ Ligne ${rowIndex + 1} supprimée`, 'success');
    }
}

// Handle add new row
function handleAddRow() {
    // Create empty participant object with all columns from first row
    const newParticipant = {};

    if (participantsEdited.length > 0) {
        const firstRow = participantsEdited[0];
        Object.keys(firstRow).forEach(key => {
            newParticipant[key] = '';
        });
    } else {
        // Default columns if no data exists
        newParticipant['Prénoms'] = '';
        newParticipant['Noms'] = '';
        newParticipant['Mail'] = '';
        newParticipant['Tel'] = '';
        newParticipant['Rôle'] = '';
        newParticipant['Pole'] = '';
    }

    participantsEdited.push(newParticipant);

    // Re-render table
    renderEditorTable();
    updateVisibleRowCount();

    // Scroll to bottom
    const tableContainer = document.querySelector('.table-container');
    tableContainer.scrollTop = tableContainer.scrollHeight;

    showStatus('csvStatus', '✓ Nouvelle ligne ajoutée', 'success');
}

// Handle search/filter
function handleSearch(searchTerm) {
    const tbody = document.getElementById('editorTableBody');
    const rows = tbody.querySelectorAll('tr');

    const term = searchTerm.toLowerCase();
    let visibleCount = 0;

    rows.forEach(row => {
        const cells = row.querySelectorAll('.editable-cell');
        let rowMatches = false;

        cells.forEach(cell => {
            const text = cell.textContent.toLowerCase();
            if (text.includes(term)) {
                rowMatches = true;
            }
        });

        if (rowMatches || term === '') {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    updateVisibleRowCount(visibleCount);
}

// Update visible row count
function updateVisibleRowCount(visibleCount = null) {
    const countEl = document.getElementById('visibleRowCount');
    const total = participantsEdited.length;
    const visible = visibleCount !== null ? visibleCount : total;

    if (visible === total) {
        countEl.textContent = `${total} participant${total > 1 ? 's' : ''}`;
    } else {
        countEl.textContent = `${visible} / ${total} participants`;
    }
}

// Handle skip editor (use original data)
function handleSkipEditor() {
    participants = participantsOriginal;
    populateSelect();

    // Show preview card
    document.getElementById('previewCard').classList.remove('hidden');

    // Enable download all button
    document.getElementById('downloadAllBtn').disabled = false;

    // Trigger first participant load and update navigation
    if (participants.length > 0) {
        participantSelect.value = 0;
        participantSelect.dispatchEvent(new Event('change'));
    }

    updateStep(3, participants.length);
    showStatus('csvStatus', `✓ ${participants.length} participants chargés (données originales)`, 'success');
}

// Handle apply changes (use edited data)
function handleApplyChanges() {
    participants = participantsEdited;
    populateSelect();

    // Show preview card
    document.getElementById('previewCard').classList.remove('hidden');

    // Enable download all button
    document.getElementById('downloadAllBtn').disabled = false;

    // Trigger first participant load and update navigation
    if (participants.length > 0) {
        participantSelect.value = 0;
        participantSelect.dispatchEvent(new Event('change'));
    }

    updateStep(3, participants.length);
    showStatus('csvStatus', `✓ ${participants.length} participants prêts pour génération`, 'success');
}

// Event listeners setup
document.addEventListener('DOMContentLoaded', () => {
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            handleSearch(e.target.value);
        });
    }

    // Add row button
    const addRowBtn = document.getElementById('addRowBtn');
    if (addRowBtn) {
        addRowBtn.addEventListener('click', handleAddRow);
    }

    // Skip editor button
    const skipEditorBtn = document.getElementById('skipEditorBtn');
    if (skipEditorBtn) {
        skipEditorBtn.addEventListener('click', handleSkipEditor);
    }

    // Apply editor button
    const applyEditorBtn = document.getElementById('applyEditorBtn');
    if (applyEditorBtn) {
        applyEditorBtn.addEventListener('click', handleApplyChanges);
    }

    // Export CSV button
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', handleExportCsv);
    }
});
