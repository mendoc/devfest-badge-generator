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

// Global variables - Project management
let currentProject = null;       // Active project
let projectMode = true;          // Enable project mode by default
let db = null;                   // IndexedDB instance

// Global variables - Template editor
let templateEditorActive = false;
let selectedZone = null;

// Editor state
let editorActive = false;
let columnMappingOverrides = {};
let duplicates = {
    email: {},
    name: {}
};

// Initialize application on DOM loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Get DOM elements
    canvas = document.getElementById('badgeCanvas');
    ctx = canvas.getContext('2d');
    participantSelect = document.getElementById('participantSelect');
    downloadBtn = document.getElementById('downloadBtn');

    // Load QR logo
    qrLogoImg.src = "logo-qr.png";

    // Setup badge navigation
    setupBadgeNavigation();

    // Setup edit buttons
    const editTemplateBtn = document.getElementById('editTemplateBtn');
    if (editTemplateBtn) {
        editTemplateBtn.addEventListener('click', () => {
            console.log('Edit template button clicked');
            showTemplateEditor();
        });
    }

    const editCsvBtn = document.getElementById('editCsvBtn');
    if (editCsvBtn) {
        editCsvBtn.addEventListener('click', () => {
            console.log('Edit CSV button clicked');
            // Show editor card and initialize editor
            const editorCard = document.getElementById('editorCard');
            if (editorCard) {
                editorCard.classList.remove('hidden');
                // Re-initialize editor with current participants
                if (typeof initializeEditor === 'function') {
                    participantsEdited = JSON.parse(JSON.stringify(participants));
                    initializeEditor();
                }
            }
        });
    }

    // Initialize IndexedDB
    try {
        db = await initDB();
        console.log('IndexedDB initialized successfully');
    } catch (error) {
        console.error('Failed to initialize IndexedDB:', error);
        showStatus('templateStatus', '⚠ Erreur d\'initialisation de la base de données', 'error');
        projectMode = false;
    }

    // Show project modal on startup
    if (projectMode) {
        showProjectModal();
    } else {
        updateStep(1);
    }
});

// Step management function
function updateStep(stepNumber, participantCount = 0) {
    const progressIndicator = document.getElementById('progressIndicator');
    const stepTexts = {
        1: 'Étape 1/5 : Charger le template',
        1.5: 'Étape 2/5 : Configurer les zones',
        2: 'Étape 3/5 : Importer les données',
        2.5: 'Étape 4/5 : Vérifier et éditer',
        3: 'Étape 5/5 : Générer les badges'
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
    if (stepNumber > 1.5) {
        // Template editor is a modal, no card to hide
    }
    if (stepNumber > 2) {
        document.getElementById('csvCard').classList.add('hidden');
    }
    if (stepNumber > 2.5) {
        document.getElementById('editorCard').classList.add('hidden');
    }
}

// === Project Management Functions ===

// Load project
async function loadProject(projectId) {
    try {
        currentProject = await loadProjectFromDB(projectId);

        if (!currentProject) {
            throw new Error('Projet introuvable');
        }

        // Load template from Blob
        if (currentProject.template && currentProject.template.imageBlob) {
            const imageURL = await blobToDataURL(currentProject.template.imageBlob);
            templateImg.src = imageURL;
            templateImg.onload = () => {
                canvas.width = currentProject.template.width;
                canvas.height = currentProject.template.height;
                ctx.drawImage(templateImg, 0, 0);

                showStatus('templateStatus', `✓ Template chargé depuis "${currentProject.name}"`, 'success');
            };
        }

        // Load CSV data
        if (currentProject.csvData && currentProject.csvData.length > 0) {
            participantsOriginal = currentProject.csvData;
            participantsEdited = JSON.parse(JSON.stringify(participantsOriginal));
            participants = participantsOriginal;
        }

        // Load column mappings
        if (currentProject.columnMappings) {
            columnMappingOverrides = currentProject.columnMappings;
        }

        return currentProject;
    } catch (error) {
        console.error('Error loading project:', error);
        throw error;
    }
}

// Save current project
async function saveCurrentProject() {
    if (!currentProject) {
        console.warn('No current project to save');
        return;
    }

    try {
        currentProject.updatedAt = new Date().toISOString();
        await saveProjectToDB(currentProject);
        console.log(`Project "${currentProject.name}" saved successfully`);
    } catch (error) {
        console.error('Error saving project:', error);
        showStatus('templateStatus', `✗ Erreur de sauvegarde: ${error.message}`, 'error');
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

// Update badge counter and navigation buttons
function updateBadgeNavigation() {
    const currentIndex = parseInt(participantSelect.value);
    const total = participants.length;

    // Update counter display
    const counterEl = document.getElementById('badgeCounter');
    if (counterEl && !isNaN(currentIndex)) {
        counterEl.textContent = `${currentIndex + 1} / ${total}`;
    }

    // Update button states
    const prevBtn = document.getElementById('prevBadgeBtn');
    const nextBtn = document.getElementById('nextBadgeBtn');

    if (prevBtn) {
        prevBtn.disabled = isNaN(currentIndex) || currentIndex <= 0;
    }

    if (nextBtn) {
        nextBtn.disabled = isNaN(currentIndex) || currentIndex >= total - 1;
    }
}

// Navigate to previous badge
function navigatePrevBadge() {
    const currentIndex = parseInt(participantSelect.value);
    if (!isNaN(currentIndex) && currentIndex > 0) {
        participantSelect.value = currentIndex - 1;
        participantSelect.dispatchEvent(new Event('change'));
    }
}

// Navigate to next badge
function navigateNextBadge() {
    const currentIndex = parseInt(participantSelect.value);
    const total = participants.length;
    if (!isNaN(currentIndex) && currentIndex < total - 1) {
        participantSelect.value = currentIndex + 1;
        participantSelect.dispatchEvent(new Event('change'));
    }
}

// Setup navigation event listeners
function setupBadgeNavigation() {
    // Previous button
    const prevBtn = document.getElementById('prevBadgeBtn');
    if (prevBtn) {
        prevBtn.addEventListener('click', navigatePrevBadge);
    }

    // Next button
    const nextBtn = document.getElementById('nextBadgeBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', navigateNextBadge);
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        // Only navigate if preview card is visible
        const previewCard = document.getElementById('previewCard');
        if (previewCard && !previewCard.classList.contains('hidden')) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                navigatePrevBadge();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                navigateNextBadge();
            }
        }
    });

    // Update navigation when participant changes
    if (participantSelect) {
        participantSelect.addEventListener('change', updateBadgeNavigation);
    }
}
