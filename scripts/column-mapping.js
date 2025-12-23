// Column Mapping System
// Intelligent CSV column detection and mapping

// Column mapping definitions (70+ variations)
const columnMappings = {
    prenom: ['Prénoms', 'Prénom', 'prenom', 'First Name', 'first_name', 'firstname', 'FirstName'],
    nom: ['Noms', 'Nom', 'nom', 'Last Name', 'last_name', 'lastname', 'LastName'],
    nomComplet: ['Nom complet', 'Full Name', 'fullname', 'Name', 'name'],
    email: ['Mail', 'Email', 'email', 'E-mail', 'e-mail', 'Quel est votre email ?', 'Adresse email'],
    tel: ['Tel', 'Téléphone', 'Telephone', 'Phone', 'phone', 'Quel est votre numéro de téléphone ?', 'phone_number', 'PhoneNumber'],
    role: ['Rôle', 'Role', 'role', 'Fonction', 'Function', 'fonction', 'Statut actuel', 'Title', 'Position', 'Job Title'],
    pole: ['Pole', 'Pôle', 'pole', 'Organisation', 'Organization', 'organisation', 'organization', 'What company or organization are you a part of, if any?', 'Domaine d\'activité / d\'étude', 'Company', 'Entreprise']
};

// Smart field getter with fallback logic
function smartGetField(participant, fieldType) {
    // Check if there's a manual override first
    if (columnMappingOverrides[fieldType]) {
        const overrideColumn = columnMappingOverrides[fieldType];
        if (participant[overrideColumn] !== undefined &&
            participant[overrideColumn] !== null &&
            participant[overrideColumn] !== '') {
            return participant[overrideColumn];
        }
    }

    const possibleColumns = columnMappings[fieldType] || [];

    // Try each possible column name
    for (let columnName of possibleColumns) {
        if (participant[columnName] !== undefined &&
            participant[columnName] !== null &&
            participant[columnName] !== '') {
            return participant[columnName];
        }
    }

    // Special case: split full name if first/last not available
    if (fieldType === 'prenom' || fieldType === 'nom') {
        let hasPrenomOrNom = false;
        for (let col of [...columnMappings.prenom, ...columnMappings.nom]) {
            if (participant[col]) {
                hasPrenomOrNom = true;
                break;
            }
        }

        if (!hasPrenomOrNom) {
            for (let col of columnMappings.nomComplet) {
                const fullName = participant[col];
                if (fullName && fullName.trim()) {
                    const parts = fullName.trim().split(/\s+/);
                    if (fieldType === 'prenom') {
                        return parts.slice(0, -1).join(' ');
                    } else if (fieldType === 'nom') {
                        return parts[parts.length - 1];
                    }
                }
            }
        }
    }

    return "";
}

// Detect column mappings from CSV data
function detectColumnMappings(csvData) {
    if (!csvData || csvData.length === 0) return {};

    const firstRow = csvData[0];
    const detectedMappings = {};

    // For each badge field, find the best matching CSV column
    Object.keys(columnMappings).forEach(fieldType => {
        const possibleColumns = columnMappings[fieldType];

        for (let csvColumn of Object.keys(firstRow)) {
            if (possibleColumns.includes(csvColumn)) {
                detectedMappings[fieldType] = csvColumn;
                break;
            }
        }
    });

    return detectedMappings;
}

// Render column mapping confirmation table
function renderColumnMappingTable(mappings) {
    const container = document.getElementById('columnMappingTable');
    container.innerHTML = '';

    const fieldLabels = {
        prenom: 'Prénom',
        nom: 'Nom',
        email: 'Email',
        tel: 'Téléphone',
        role: 'Rôle',
        pole: 'Pôle/Organisation'
    };

    Object.keys(fieldLabels).forEach(fieldType => {
        const csvColumn = columnMappingOverrides[fieldType] || mappings[fieldType] || 'Non détecté';

        const row = document.createElement('div');
        row.className = 'mapping-row';

        row.innerHTML = `
            <span class="mapping-field">${fieldLabels[fieldType]}</span>
            <span class="mapping-arrow">→</span>
            <span class="mapping-column">${csvColumn}</span>
            <button class="btn btn-secondary mapping-override" data-field="${fieldType}">
                Modifier
            </button>
        `;

        container.appendChild(row);
    });

    // Add event listeners to override buttons
    container.querySelectorAll('.mapping-override').forEach(btn => {
        btn.addEventListener('click', () => {
            const fieldType = btn.dataset.field;
            handleMappingOverride(fieldType, mappings);
        });
    });
}

// Handle manual column mapping override
function handleMappingOverride(fieldType, mappings) {
    if (!participantsOriginal || participantsOriginal.length === 0) return;

    const fieldLabels = {
        prenom: 'Prénom',
        nom: 'Nom',
        email: 'Email',
        tel: 'Téléphone',
        role: 'Rôle',
        pole: 'Pôle/Organisation'
    };

    // Show modal with column selection
    showMappingModal(fieldType, fieldLabels[fieldType], mappings);
}

// Show mapping modal
function showMappingModal(fieldType, fieldLabel, mappings) {
    const modal = document.getElementById('mappingModal');
    const modalTitle = document.getElementById('mappingModalTitle');
    const modalDescription = document.getElementById('mappingModalDescription');
    const columnList = document.getElementById('columnList');

    // Set modal title and description
    modalTitle.textContent = `Sélectionner la colonne pour "${fieldLabel}"`;
    modalDescription.textContent = 'Choisissez la colonne CSV correspondante :';

    // Get available columns and current mapping
    const availableColumns = Object.keys(participantsOriginal[0]);
    const currentMapping = columnMappingOverrides[fieldType] || mappings[fieldType] || '';

    // Populate column list
    columnList.innerHTML = '';
    availableColumns.forEach(columnName => {
        const item = document.createElement('div');
        item.className = 'column-item';
        if (columnName === currentMapping) {
            item.classList.add('selected');
        }

        item.innerHTML = `
            <span class="column-item-name">${columnName}</span>
            ${columnName === currentMapping ? '<span class="column-item-check">✓</span>' : ''}
        `;

        item.addEventListener('click', () => {
            // Update mapping
            columnMappingOverrides[fieldType] = columnName;

            // Close modal
            hideMappingModal();

            // Re-render the table
            renderColumnMappingTable(mappings);

            // Show success message
            showStatus('csvStatus', `✓ Colonne "${fieldLabel}" → "${columnName}"`, 'success');
        });

        columnList.appendChild(item);
    });

    // Show modal
    modal.classList.remove('hidden');

    // Setup event listeners
    setupModalEventListeners(fieldType, fieldLabel, mappings);
}

// Hide mapping modal
function hideMappingModal() {
    const modal = document.getElementById('mappingModal');
    modal.classList.add('hidden');
}

// Setup modal event listeners
function setupModalEventListeners(fieldType, fieldLabel, mappings) {
    const modal = document.getElementById('mappingModal');
    const closeBtn = document.getElementById('mappingModalClose');
    const cancelBtn = document.getElementById('cancelMappingBtn');
    const clearBtn = document.getElementById('clearMappingBtn');
    const overlay = modal.querySelector('.modal-overlay');

    // Remove old listeners to avoid duplicates
    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    const newClearBtn = clearBtn.cloneNode(true);
    clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);

    const newOverlay = overlay.cloneNode(true);
    overlay.parentNode.replaceChild(newOverlay, overlay);

    // Close button
    document.getElementById('mappingModalClose').addEventListener('click', hideMappingModal);

    // Cancel button
    document.getElementById('cancelMappingBtn').addEventListener('click', hideMappingModal);

    // Clear mapping button
    document.getElementById('clearMappingBtn').addEventListener('click', () => {
        columnMappingOverrides[fieldType] = null;
        hideMappingModal();
        renderColumnMappingTable(mappings);
        showStatus('csvStatus', `✓ Colonne "${fieldLabel}" désactivée`, 'warning');
    });

    // Click overlay to close
    modal.querySelector('.modal-overlay').addEventListener('click', hideMappingModal);

    // Escape key to close
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            hideMappingModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}
