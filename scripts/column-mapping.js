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
}
