document.addEventListener('DOMContentLoaded', async () => {
    // Authenticate user
    if (!await auth.checkAuth()) {
        window.location.href = 'login.html';
        return;
    } 

    // Set up profile link and sign out button
    const profileLink = document.querySelector('.profile-link');
    if (auth.user) { 
        profileLink.textContent = auth.user.name || auth.user.email;
    }
    const signoutBtn = document.querySelector('.signout-btn');
    if (signoutBtn) {
        signoutBtn.addEventListener('click', () => {
            auth.logout();
            alert('Signed out!'); 
        });
    }

    // Get DOM elements for the Notes page
    const addNoteBtn = document.querySelector('.add-note-btn');
    const noteTitleInput = document.getElementById('note-title-input');
    const notesContainer = document.getElementById('notes-container');
    const searchBar = document.getElementById('note-search-bar');

    // New file upload elements
    const fileUploadInput = document.getElementById('file-upload');
    const attachedFilesDisplay = document.getElementById('attached-files-display');
    let currentAttachedFiles = []; // To store file objects/names for the current note being created/edited

    let quill;

    // Custom image handler for Quill
    function imageHandler() {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/png, image/gif, image/jpeg, image/bmp, image/x-icon');
        input.click();

        input.onchange = () => {
            const file = input.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const range = quill.getSelection();
                    quill.insertEmbed(range.index, 'image', e.target.result);
                };
                reader.readAsDataURL(file);
            }
        };
    }

    // Rich text editor configuration
    const quillOptions = {
        theme: 'snow',
        placeholder: 'Start writing your note here...',
        modules: {
            toolbar: {
                container: [
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'header': [1, 2, 3, false] }],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    ['link', 'image', 'blockquote', 'code-block'], // 'image' button is here
                    ['clean']
                ],
                handlers: {
                    image: imageHandler // Use custom handler for images
                }
            }
        }
    };

    // Initialize Quill Editor
    quill = new Quill('#editor', quillOptions);

    // Notes state
    let allNotes = JSON.parse(localStorage.getItem('notes') || '[]');

    async function apiRequest(url, method = 'GET', body = null) {
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
        };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(url, opts);
        if (!res.ok) throw new Error((await res.json()).error || 'API error');
        return await res.json();
    }

    async function loadNotes() {
        try {
            allNotes = await apiRequest('/api/notes');
        } catch (e) {
            allNotes = [];
            alert('Failed to load notes: ' + e.message);
        }
    }

    async function saveNote(note) {
        try {
            const newNote = await apiRequest('/api/notes', 'POST', note);
            allNotes.unshift(newNote);
            displayNotes();
        } catch (e) {
            alert('Failed to add note: ' + e.message);
        }
    }

    async function updateNote(noteId, updates) {
        try {
            await apiRequest(`/api/notes/${noteId}`, 'PUT', updates);
            await loadNotes();
            displayNotes();
        } catch (e) {
            alert('Failed to update note: ' + e.message);
        }
    }

    async function deleteNote(noteId) {
        try {
            await apiRequest(`/api/notes/${noteId}`, 'DELETE');
            await loadNotes();
            displayNotes();
        } catch (e) {
            alert('Failed to delete note: ' + e.message);
        }
    }

    async function deleteAllNotes() {
        try {
            await apiRequest('/api/notes', 'DELETE');
            await loadNotes();
            displayNotes();
        } catch (e) {
            alert('Failed to delete all notes: ' + e.message);
        }
    }

    // Function to display attached files for a note
    function displayAttachedFiles(files) {
        attachedFilesDisplay.innerHTML = '';
        if (!files || files.length === 0) {
            attachedFilesDisplay.innerHTML = '<li style="color: var(--text-muted);">No files attached.</li>';
            return;
        }
        files.forEach(file => {
            const li = document.createElement('li');
            li.innerHTML = `<a href="${file.dataUrl}" download="${file.name}" class="attachment-link"><i class="fas fa-paperclip"></i> ${file.name}</a>`;
            attachedFilesDisplay.appendChild(li);
        });
    }

    function displayNotes(notesToDisplay = allNotes) {
        notesContainer.innerHTML = '';
        notesToDisplay.forEach((note, index) => {
            const noteElement = document.createElement('div');
            noteElement.className = 'note';
            noteElement.innerHTML = `
                <div class="note-header">
                    <h3 class="note-title">${note.title}</h3>
                    <div class="note-actions">
                        <button class="edit-note" data-index="${index}"><i class="fas fa-edit"></i></button>
                        <button class="delete-note" data-index="${index}"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
                <div class="note-content ql-editor">${note.content}</div>
                ${note.attachments && note.attachments.length > 0 ? `
                    <div class="note-attachments">
                        <h4>Attachments:</h4>
                        <ul>
                            ${note.attachments.map(file => `<li><a href="${file.dataUrl}" download="${file.name}" class="attachment-link"><i class="fas fa-paperclip"></i> ${file.name}</a></li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            `;
            notesContainer.appendChild(noteElement);
        });
    }

    // Update file upload logic to store file data as Data URLs
    fileUploadInput.addEventListener('change', (e) => {
        currentAttachedFiles = []; // Reset for new selection
        const files = Array.from(e.target.files);
        let filesProcessed = 0;
        if (files.length === 0) {
            displayAttachedFiles(currentAttachedFiles);
            return;
        }
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                currentAttachedFiles.push({
                    name: file.name,
                    type: file.type,
                    dataUrl: event.target.result // Store Data URL
                });
                filesProcessed++;
                if (filesProcessed === files.length) {
                    displayAttachedFiles(currentAttachedFiles);
                }
            };
            reader.readAsDataURL(file);
        });
    });

    // Add Note
    addNoteBtn.addEventListener('click', () => {
        const title = noteTitleInput.value.trim();
        const content = quill.root.innerHTML.trim(); // Get Quill content including images (as base64)

        if (!title && content === '<p><br></p>' && currentAttachedFiles.length === 0) {
            alert('Please provide a title, some content, or attach a file for your note.');
            return;
        }

        saveNote({
            title,
            content,
            attachments: currentAttachedFiles // Store attached file metadata
        });

        // Clear inputs after adding note
        noteTitleInput.value = '';
        quill.setText('');
        currentAttachedFiles = []; // Clear attachments for new note
        displayAttachedFiles(currentAttachedFiles); // Clear display
        fileUploadInput.value = ''; // Reset file input
    });

    // Edit and Delete Note (Event Delegation)
    notesContainer.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const index = parseInt(target.dataset.index, 10);

        if (target.classList.contains('delete-note')) {
            if (confirm('Are you sure you want to delete this note?')) {
                deleteNote(allNotes[index].id);
            }
        } else if (target.classList.contains('edit-note')) {
            const noteToEdit = allNotes[index];
            noteTitleInput.value = noteToEdit.title;
            quill.root.innerHTML = noteToEdit.content;
            currentAttachedFiles = noteToEdit.attachments || []; // Load existing attachments
            displayAttachedFiles(currentAttachedFiles); // Display them

            // Remove the note so that 'Add Note' effectively saves the edited version
            allNotes.splice(index, 1);
            updateNote(noteToEdit.id, {
                title: noteToEdit.title,
                content: noteToEdit.content,
                attachments: noteToEdit.attachments
            });

            noteTitleInput.focus();
        }
    });

    // Search Notes
    searchBar.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredNotes = allNotes.filter(note =>
            note.title.toLowerCase().includes(searchTerm) ||
            note.content.toLowerCase().includes(searchTerm) ||
            (note.attachments && note.attachments.some(att => att.name.toLowerCase().includes(searchTerm)))
        );
        displayNotes(filteredNotes);
    });

    // Initial display of notes
    displayNotes();
});
