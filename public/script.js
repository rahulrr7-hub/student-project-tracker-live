```javascript
document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('#project-form');
    const nameInput = document.querySelector('#name');
    const statusInput = document.querySelector('#status');
    const list = document.querySelector('#project-list');
    const emptyState = document.querySelector('#empty-state');
    const message = document.querySelector('#message');
    const saveButton = document.querySelector('#save-button');
    const cancelButton = document.querySelector('#cancel-button');

    // The API remains the source of truth for project records.
    let projects = [];
    let editingId = null;
    let loading = true;
    let saving = false;
    let loadState = 'loading';
    let mutationType = null;

    const addLabel = saveButton.textContent;

    cancelButton.type = 'button';
    cancelButton.hidden = true;

    function showMessage(text, type = 'info') {
        message.textContent = text;
        message.dataset.type = type;
    }

    function updateButtonState() {
        const disabled = loading || saving;

        nameInput.disabled = disabled;
        statusInput.disabled = disabled;
        saveButton.disabled = disabled;
        cancelButton.disabled = disabled;

        list.querySelectorAll('button').forEach((button) => {
            button.disabled = disabled;
        });

        if (saving && mutationType === 'delete') {
            saveButton.textContent = 'Deleting...';
        } else if (saving) {
            saveButton.textContent =
                editingId === null ? 'Adding...' : 'Saving...';
        } else {
            saveButton.textContent =
                editingId === null ? addLabel : 'Save changes';
        }
    }

    async function readResponse(response) {
        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(
                data?.error ||
                data?.message ||
                `Request failed (HTTP ${response.status}).`
            );
        }

        return data;
    }

    function setAddMode({ resetForm = true } = {}) {
        editingId = null;

        if (resetForm) {
            form.reset();
        }

        nameInput.setCustomValidity('');
        cancelButton.hidden = true;
        updateButtonState();
    }

    function startEdit(id) {
        const project = projects.find(
            (item) => String(item.id) === String(id)
        );

        if (!project || loading || saving) {
            return;
        }

        editingId = project.id;
        nameInput.value = project.name;
        statusInput.value = project.status;

        nameInput.setCustomValidity('');
        cancelButton.hidden = false;

        showMessage(`Editing "${project.name}".`, 'info');
        updateButtonState();
        nameInput.focus();
    }

    function render() {
        list.textContent = '';

        projects.forEach((project) => {
            const item = document.createElement('li');
            item.dataset.id = String(project.id);

            const nameElement = document.createElement('strong');
            // Entered project names are rendered as text, never HTML.
            nameElement.textContent = project.name;

            const statusElement = document.createElement('span');
            statusElement.textContent = ` - ${project.status} `;

            const editButton = document.createElement('button');
            editButton.type = 'button';
            editButton.textContent = 'Edit';
            editButton.addEventListener('click', () => {
                startEdit(project.id);
            });

            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', () => {
                deleteProject(project.id);
            });

            item.append(
                nameElement,
                statusElement,
                editButton,
                deleteButton
            );

            list.appendChild(item);
        });

        // Show the empty state only after a successful load.
        emptyState.hidden = !(
            loadState === 'loaded' && projects.length === 0
        );

        updateButtonState();
    }

    async function loadProjects({ showLoading = false } = {}) {
        loading = true;

        if (showLoading) {
            loadState = 'loading';
            showMessage('Loading projects...', 'loading');
        }

        updateButtonState();

        try {
            const response = await fetch('/api/projects');
            const data = await readResponse(response);

            if (!Array.isArray(data)) {
                throw new Error(
                    'The server returned an invalid project list.'
                );
            }

            projects = data;
            loadState = 'loaded';

            if (
                editingId !== null &&
                !projects.some(
                    (project) =>
                        String(project.id) === String(editingId)
                )
            ) {
                setAddMode();
                showMessage(
                    'The project being edited no longer exists. ' +
                    'The list has been refreshed.',
                    'info'
                );
            }

            render();
            return true;
        } catch (error) {
            loadState = 'error';

            showMessage(
                `Could not load projects: ${
                    error.message ||
                    'Network error. Check that the server is running.'
                }`,
                'error'
            );

            // Do not claim the collection is empty after a failed load.
            render();
            return false;
        } finally {
            loading = false;
            updateButtonState();
        }
    }

    async function saveProject(event) {
        event.preventDefault();

        if (loading || saving) {
            return;
        }

        const name = nameInput.value.trim();
        const status = statusInput.value;

        if (name === '') {
            nameInput.setCustomValidity(
                'Please enter a project name.'
            );
            nameInput.reportValidity();
            nameInput.focus();
            return;
        }

        if (name.length > 80) {
            nameInput.setCustomValidity(
                'Project names must be 80 characters or fewer.'
            );
            nameInput.reportValidity();
            nameInput.focus();
            return;
        }

        nameInput.setCustomValidity('');

        const isEditing = editingId !== null;
        const targetId = editingId;

        if (
            isEditing &&
            !projects.some(
                (project) =>
                    String(project.id) === String(targetId)
            )
        ) {
            setAddMode({ resetForm: false });
            showMessage(
                'This project is no longer in the list. ' +
                'Reload the projects and try again.',
                'error'
            );
            return;
        }

        const url = isEditing
            ? `/api/projects/${encodeURIComponent(targetId)}`
            : '/api/projects';

        const method = isEditing ? 'PUT' : 'POST';

        saving = true;
        mutationType = isEditing ? 'update' : 'create';

        showMessage(
            isEditing ? 'Saving changes...' : 'Adding project...',
            'loading'
        );

        updateButtonState();

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, status })
            });

            await readResponse(response);

            // Refresh the server's authoritative project collection.
            const loaded = await loadProjects();

            if (!loaded) {
                showMessage(
                    'The change was accepted by the server, but the ' +
                    'project list could not be refreshed. Reload the ' +
                    'list before trying again.',
                    'error'
                );
                return;
            }

            setAddMode();

            showMessage(
                isEditing
                    ? 'Project updated successfully.'
                    : 'Project added successfully.',
                'success'
            );

            nameInput.focus();
        } catch (error) {
            // Preserve the name, status and edit mode for retry.
            showMessage(
                `Could not ${isEditing ? 'save changes' : 'add project'}: ${
                    error.message ||
                    'Network error. Check that the server is running.'
                }`,
                'error'
            );
        } finally {
            saving = false;
            mutationType = null;
            updateButtonState();
        }
    }

    async function deleteProject(id) {
        if (loading || saving) {
            return;
        }

        const project = projects.find(
            (item) => String(item.id) === String(id)
        );

        if (!project) {
            showMessage(
                'That project is no longer available.',
                'error'
            );
            await loadProjects();
            return;
        }

        // Lock controls before opening confirmation to prevent
        // multiple confirmation dialogs from repeated clicks.
        saving = true;
        mutationType = 'delete';
        updateButtonState();

        let confirmed;

        try {
            confirmed = window.confirm(
                `Delete "${project.name}"?`
            );
        } catch (error) {
            saving = false;
            mutationType = null;
            updateButtonState();

            showMessage(
                'Could not open the delete confirmation.',
                'error'
            );
            return;
        }

        if (!confirmed) {
            saving = false;
            mutationType = null;
            updateButtonState();
            showMessage('Deletion cancelled. No changes were made.', 'info');
            return;
        }

        showMessage('Deleting project...', 'loading');

        try {
            const response = await fetch(
                `/api/projects/${encodeURIComponent(id)}`,
                { method: 'DELETE' }
            );

            await readResponse(response);

            if (String(editingId) === String(id) && editingId !== null) {
                setAddMode();
            }

            const loaded = await loadProjects();

            if (!loaded) {
                showMessage(
                    'The delete request succeeded, but the project ' +
                    'list could not be refreshed. Reload the list ' +
                    'before trying again.',
                    'error'
                );
                return;
            }

            showMessage('Project deleted successfully.', 'success');
        } catch (error) {
            showMessage(
                `Could not delete project: ${
                    error.message ||
                    'Network error. Check that the server is running.'
                }`,
                'error'
            );
        } finally {
            saving = false;
            mutationType = null;
            updateButtonState();
        }
    }

    form.addEventListener('submit', saveProject);

    cancelButton.addEventListener('click', () => {
        if (loading || saving) {
            return;
        }

        setAddMode();
        showMessage('Edit cancelled. No changes were saved.', 'info');
    });

    nameInput.addEventListener('input', () => {
        nameInput.setCustomValidity('');
    });

    // Start with loading feedback, not a false empty state.
    render();
    loadProjects({ showLoading: true });
});
