// Project Manager - IndexedDB project management
// CRUD operations, UI modals, and project persistence

// IndexedDB configuration
const DB_NAME = 'BabaDB';
const DB_VERSION = 1;
const PROJECTS_STORE = 'projects';

// Initialize IndexedDB
async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            console.log('IndexedDB initialized successfully');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Create projects object store
            if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
                const projectStore = db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
                projectStore.createIndex('name', 'name', { unique: false });
                projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                console.log('Projects object store created');
            }
        };
    });
}

// === IndexedDB CRUD Operations ===

// Save project to IndexedDB
async function saveProjectToDB(project) {
    if (!db) {
        throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PROJECTS_STORE], 'readwrite');
        const store = transaction.objectStore(PROJECTS_STORE);
        const request = store.put(project);

        request.onsuccess = () => {
            console.log(`Project "${project.name}" saved successfully`);
            resolve(request.result);
        };
        request.onerror = () => reject(request.error);
    });
}

// Load project from IndexedDB
async function loadProjectFromDB(projectId) {
    if (!db) {
        throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PROJECTS_STORE], 'readonly');
        const store = transaction.objectStore(PROJECTS_STORE);
        const request = store.get(projectId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Get all projects from IndexedDB
async function getAllProjects() {
    if (!db) {
        throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PROJECTS_STORE], 'readonly');
        const store = transaction.objectStore(PROJECTS_STORE);
        const request = store.getAll();

        request.onsuccess = () => {
            const projects = request.result;
            // Sort by updatedAt descending (most recent first)
            projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            resolve(projects);
        };
        request.onerror = () => reject(request.error);
    });
}

// Delete project from IndexedDB
async function deleteProjectFromDB(projectId) {
    if (!db) {
        throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([PROJECTS_STORE], 'readwrite');
        const store = transaction.objectStore(PROJECTS_STORE);
        const request = store.delete(projectId);

        request.onsuccess = () => {
            console.log(`Project "${projectId}" deleted successfully`);
            resolve();
        };
        request.onerror = () => reject(request.error);
    });
}

// === Project Operations ===

// Create new project
async function createNewProject(name) {
    if (!name || name.trim() === '') {
        throw new Error('Project name cannot be empty');
    }

    const projectId = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();

    const project = {
        id: projectId,
        name: name.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        template: null,
        textZones: [],
        qrZone: {
            enabled: true,
            x: 0.75,
            y: 0.32,
            size: 0.28,
            logoSize: 0.30,
            logoPath: "logo-qr.png",
            correctLevel: "M"
        },
        csvData: null,
        columnMappings: {}
    };

    await saveProjectToDB(project);
    return project;
}

// Update project
async function updateProject(projectId, updates) {
    const project = await loadProjectFromDB(projectId);
    if (!project) {
        throw new Error(`Project "${projectId}" not found`);
    }

    Object.assign(project, updates);
    project.updatedAt = new Date().toISOString();

    await saveProjectToDB(project);
    return project;
}

// Export project as JSON
async function exportProjectAsJSON(projectId) {
    const project = await loadProjectFromDB(projectId);
    if (!project) {
        throw new Error(`Project "${projectId}" not found`);
    }

    // Convert Blob to base64 for JSON export
    let exportData = { ...project };

    if (project.template && project.template.imageBlob) {
        const base64 = await blobToBase64(project.template.imageBlob);
        exportData.template = {
            imageData: base64,
            width: project.template.width,
            height: project.template.height
        };
    }

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();

    URL.revokeObjectURL(url);
}

// Import project from JSON
async function importProjectFromJSON(jsonString) {
    try {
        const projectData = JSON.parse(jsonString);

        // Generate new ID to avoid conflicts
        const projectId = projectData.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();

        // Convert base64 back to Blob if present
        if (projectData.template && projectData.template.imageData) {
            const blob = await base64ToBlob(projectData.template.imageData);
            projectData.template = {
                imageBlob: blob,
                width: projectData.template.width,
                height: projectData.template.height
            };
        }

        const project = {
            ...projectData,
            id: projectId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await saveProjectToDB(project);
        return project;
    } catch (error) {
        throw new Error(`Failed to import project: ${error.message}`);
    }
}

// === Blob Utilities ===

// Convert File to Blob
async function fileToBlob(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const blob = new Blob([reader.result], { type: file.type });
            resolve(blob);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// Convert Blob to Data URL
async function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Convert Blob to Base64
async function blobToBase64(blob) {
    const dataURL = await blobToDataURL(blob);
    return dataURL;
}

// Convert Base64 to Blob
async function base64ToBlob(base64) {
    const response = await fetch(base64);
    return await response.blob();
}

// === Storage Quota Management ===

// Check storage quota
async function checkStorageQuota() {
    if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const percentUsed = (estimate.usage / estimate.quota) * 100;
        console.log(`Storage: ${(estimate.usage / 1024 / 1024).toFixed(2)}MB / ${(estimate.quota / 1024 / 1024).toFixed(2)}MB (${percentUsed.toFixed(2)}%)`);

        if (percentUsed > 80) {
            showStatus('templateStatus', '⚠ Espace de stockage bientôt saturé (' + percentUsed.toFixed(0) + '%)', 'warning');
        }

        return { usage: estimate.usage, quota: estimate.quota, percentUsed };
    }

    return null;
}

// === UI Functions ===

// Show project modal
function showProjectModal() {
    const modal = document.getElementById('projectModal');
    if (modal) {
        modal.classList.remove('hidden');
        renderProjectList();
    }
}

// Hide project modal
function hideProjectModal() {
    const modal = document.getElementById('projectModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Render project list
async function renderProjectList() {
    const projectList = document.getElementById('projectList');
    if (!projectList) return;

    try {
        const projects = await getAllProjects();

        if (projects.length === 0) {
            projectList.innerHTML = '<div class="no-projects">Aucun projet. Créez-en un nouveau !</div>';
            return;
        }

        projectList.innerHTML = '';

        projects.forEach(project => {
            const projectItem = document.createElement('div');
            projectItem.className = 'project-item';

            const lastUpdate = new Date(project.updatedAt).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            projectItem.innerHTML = `
                <div class="project-info">
                    <div class="project-name">${project.name}</div>
                    <div class="project-meta">Mis à jour le ${lastUpdate}</div>
                </div>
                <div class="project-actions">
                    <button class="btn-icon" data-action="load" data-id="${project.id}" title="Charger ce projet">
                        📂
                    </button>
                    <button class="btn-icon" data-action="export" data-id="${project.id}" title="Exporter en JSON">
                        💾
                    </button>
                    <button class="btn-icon btn-danger" data-action="delete" data-id="${project.id}" title="Supprimer">
                        🗑️
                    </button>
                </div>
            `;

            projectList.appendChild(projectItem);
        });

        // Add event listeners
        projectList.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const action = e.currentTarget.dataset.action;
                const projectId = e.currentTarget.dataset.id;

                if (action === 'load') {
                    await handleProjectSelect(projectId);
                } else if (action === 'export') {
                    await handleProjectExport(projectId);
                } else if (action === 'delete') {
                    await handleProjectDelete(projectId);
                }
            });
        });
    } catch (error) {
        console.error('Error rendering project list:', error);
        projectList.innerHTML = '<div class="error-message">Erreur lors du chargement des projets</div>';
    }
}

// Handle project selection
async function handleProjectSelect(projectId) {
    try {
        await loadProject(projectId);
        hideProjectModal();
        showStatus('templateStatus', `✓ Projet "${currentProject.name}" chargé`, 'success');

        // Update UI based on what's in the project
        if (currentProject.template) {
            updateStep(1.5, 0);
        } else {
            updateStep(1, 0);
        }
    } catch (error) {
        console.error('Error loading project:', error);
        showStatus('templateStatus', `✗ Erreur lors du chargement: ${error.message}`, 'error');
    }
}

// Handle project deletion
async function handleProjectDelete(projectId) {
    const project = await loadProjectFromDB(projectId);
    if (!project) return;

    if (confirm(`Êtes-vous sûr de vouloir supprimer le projet "${project.name}" ?\n\nCette action est irréversible.`)) {
        try {
            await deleteProjectFromDB(projectId);
            await renderProjectList();
            showStatus('templateStatus', `✓ Projet "${project.name}" supprimé`, 'success');

            // If deleting current project, reset
            if (currentProject && currentProject.id === projectId) {
                currentProject = null;
            }
        } catch (error) {
            console.error('Error deleting project:', error);
            showStatus('templateStatus', `✗ Erreur lors de la suppression: ${error.message}`, 'error');
        }
    }
}

// Handle project export
async function handleProjectExport(projectId) {
    try {
        await exportProjectAsJSON(projectId);
        const project = await loadProjectFromDB(projectId);
        showStatus('templateStatus', `✓ Projet "${project.name}" exporté`, 'success');
    } catch (error) {
        console.error('Error exporting project:', error);
        showStatus('templateStatus', `✗ Erreur lors de l'export: ${error.message}`, 'error');
    }
}

// === Event Listeners ===

document.addEventListener('DOMContentLoaded', () => {
    // Create new project button
    const createProjectBtn = document.getElementById('createProjectBtn');
    if (createProjectBtn) {
        createProjectBtn.addEventListener('click', async () => {
            const nameInput = document.getElementById('newProjectName');
            const projectName = nameInput.value.trim();

            if (!projectName) {
                showStatus('templateStatus', '⚠ Veuillez entrer un nom de projet', 'warning');
                return;
            }

            try {
                const project = await createNewProject(projectName);
                currentProject = project;
                projectMode = true;

                nameInput.value = '';
                hideProjectModal();

                showStatus('templateStatus', `✓ Projet "${project.name}" créé`, 'success');
                updateStep(1, 0);
            } catch (error) {
                console.error('Error creating project:', error);
                showStatus('templateStatus', `✗ Erreur: ${error.message}`, 'error');
            }
        });
    }

    // Continue without project button
    const continueWithoutProjectBtn = document.getElementById('continueWithoutProjectBtn');
    if (continueWithoutProjectBtn) {
        continueWithoutProjectBtn.addEventListener('click', () => {
            currentProject = null;
            projectMode = false;
            hideProjectModal();
            updateStep(1, 0);
            showStatus('templateStatus', 'Mode session (les données ne seront pas sauvegardées)', 'warning');
        });
    }

    // Close project modal
    const projectModalClose = document.getElementById('projectModalClose');
    if (projectModalClose) {
        projectModalClose.addEventListener('click', () => {
            // Only allow closing if there's a current project or user chose session mode
            if (currentProject || !projectMode) {
                hideProjectModal();
            } else {
                showStatus('templateStatus', '⚠ Veuillez sélectionner un projet ou continuer sans projet', 'warning');
            }
        });
    }

    // Import project button (future feature)
    const importProjectBtn = document.getElementById('importProjectBtn');
    if (importProjectBtn) {
        importProjectBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const project = await importProjectFromJSON(event.target.result);
                        await renderProjectList();
                        showStatus('templateStatus', `✓ Projet "${project.name}" importé`, 'success');
                    } catch (error) {
                        console.error('Error importing project:', error);
                        showStatus('templateStatus', `✗ Erreur lors de l'import: ${error.message}`, 'error');
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        });
    }
});
