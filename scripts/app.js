// Baba - Badge Generator Application
// Global state management and utility functions

// Global variables - Participants data
let participants = [];           // Active data for preview/generation
let participantsOriginal = [];   // Backup of original import
let participantsEdited = [];     // Working copy for editor

// Global variables - Images
let templateImg = new Image();
let qrLogoImg = new Image();

// Global variables - DOM elements
let canvas, ctx, participantSelect, downloadBtn;

// Editor state
let editorActive = false;
let columnMappingOverrides = {};
let duplicates = {
    email: {},
    name: {}
};

// Initialize application on DOM loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    canvas = document.getElementById('badgeCanvas');
    ctx = canvas.getContext('2d');
    participantSelect = document.getElementById('participantSelect');
    downloadBtn = document.getElementById('downloadBtn');

    // Load QR logo
    qrLogoImg.src = "logo-qr.png";

    // Initialize first step
    updateStep(1);
});

// Step management function
function updateStep(stepNumber, participantCount = 0) {
    const progressIndicator = document.getElementById('progressIndicator');
    const stepTexts = {
        1: 'Étape 1/4 : Charger le template',
        2: 'Étape 2/4 : Importer les données',
        2.5: 'Étape 3/4 : Vérifier et éditer',
        3: 'Étape 4/4 : Générer les badges'
    };

    let progressHTML = stepTexts[stepNumber] || '';

    // Add participant count badge if we have participants
    if ((stepNumber === 2.5 || stepNumber === 3) && participantCount > 0) {
        progressHTML += ` <span class="participant-count">${participantCount} participant${participantCount > 1 ? 's' : ''}</span>`;
    }

    progressIndicator.innerHTML = progressHTML;

    // Hide completed cards
    if (stepNumber > 1) {
        document.getElementById('templateCard').classList.add('hidden');
    }
    if (stepNumber > 2) {
        document.getElementById('csvCard').classList.add('hidden');
    }
    if (stepNumber > 2.5) {
        document.getElementById('editorCard').classList.add('hidden');
    }
}

// Status message display function
function showStatus(elementId, message, type = 'success') {
    const statusEl = document.getElementById(elementId);
    statusEl.innerHTML = `<div class="status ${type}">${message}</div>`;
}

// Populate participant select dropdown
function populateSelect() {
    participantSelect.innerHTML = '<option value="">Sélectionner un participant...</option>';
    participants.forEach((p, index) => {
        let option = document.createElement('option');
        option.value = index;

        // Use smart field detection
        const prenom = smartGetField(p, 'prenom');
        const nom = smartGetField(p, 'nom');
        const displayName = `${prenom} ${nom}`.trim();

        option.textContent = displayName || `Participant ${index + 1}`;
        participantSelect.appendChild(option);
    });
}
