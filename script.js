let peer = null;
let connections = [];
let notes = {};

function initPeer() {
    peer = new Peer(Math.random().toString(36).substr(2, 9));
    peer.on('open', (id) => {
        document.getElementById('peer-id').value = id;
        document.getElementById('connection-status').textContent = 'Your ID: ' + id;
    });

    peer.on('connection', handleConnection);
}

function handleConnection(conn) {
    connections.push(conn);
    setupConnectionListeners(conn);
    
    conn.on('open', () => {
        const notes = document.getElementsByClassName('sticky-note');
        Array.from(notes).forEach(note => {
            conn.send({
                type: 'newNote',
                note: {
                    id: note.id,
                    content: note.querySelector('.note-content').value,
                    position: {
                        x: parseInt(note.style.left),
                        y: parseInt(note.style.top)
                    },
                    colorClass: Array.from(note.classList)
                        .find(cls => cls.startsWith('note-color-'))
                }
            });
        });
    });
}

function setupConnectionListeners(conn) {
    conn.on('open', () => {
        showToast('Connected to peer!');
        document.getElementById('online-status').innerHTML = `
            <span class="animate-pulse w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            <span class="text-sm text-gray-600">Connected to: ${conn.peer}</span>
        `;
        
        conn.on('data', (data) => {
            handlePeerData(data);
        });
    });

    conn.on('error', (err) => {
        console.error('Connection error:', err);
        showToast('Connection error!');
    });

    conn.on('close', () => {
        connections = connections.filter(c => c !== conn);
        if (connections.length === 0) {
            document.getElementById('online-status').innerHTML = `
                <span class="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                <span class="text-sm text-gray-600">Disconnected</span>
            `;
        }
    });
}

function handlePeerData(data) {
    if (!data || !data.type) return;
    
    switch(data.type) {
        case 'newNote':
            if (data.note) {
                createNote({
                    ...data.note,
                    colorClass: data.note.colorClass
                }, false);
            }
            break;
        case 'updateNote':
            if (data.note) updateNote(data.note, false);
            break;
        case 'deleteNote':
            if (data.id) deleteNote(data.id, false);
            break;
        case 'moveNote':
            if (data.id && data.position) moveNote(data.id, data.position, false);
            break;
    }
}

function createNote(noteData, broadcast = true) {
    if (!noteData) noteData = {};
    
    const note = document.createElement('div');
    const colorClass = noteData.colorClass || `note-color-${Math.floor(Math.random() * 3) + 1}`;
    note.className = `sticky-note fade-in ${colorClass}`;
    note.id = noteData.id || 'note-' + Date.now();
    note.innerHTML = `
        <div class="note-header">
            <span class="note-drag-handle">✥</span>
            <button class="delete-note">×</button>
        </div>
        <textarea class="note-content">${noteData.content || ''}</textarea>
    `;

    if (noteData.position && typeof noteData.position.x === 'number' && typeof noteData.position.y === 'number') {
        note.style.left = noteData.position.x + 'px';
        note.style.top = noteData.position.y + 'px';
    } else {
        note.style.left = (Math.random() * (window.innerWidth - 220)) + 'px';
        note.style.top = (Math.random() * (window.innerHeight - 220)) + 'px';
    }

    document.getElementById('notes-container').appendChild(note);
    makeDraggable(note);
    setupNoteListeners(note);
    saveNotesToLocalStorage();

    if (broadcast) {
        broadcastEvent('newNote', {
            id: note.id,
            content: note.querySelector('.note-content').value,
            position: { 
                x: parseInt(note.style.left), 
                y: parseInt(note.style.top) 
            },
            colorClass: colorClass
        });
    }

    return note;
}

function makeDraggable(note) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const dragHandle = note.querySelector('.note-drag-handle');
    dragHandle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        if (e.target !== dragHandle) return;
        e.preventDefault();
        e.stopPropagation();
        
        note.style.transition = 'none';
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        note.style.zIndex = getHighestZIndex() + 1;
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        const newTop = note.offsetTop - pos2;
        const newLeft = note.offsetLeft - pos1;
        
        note.style.top = newTop + "px";
        note.style.left = newLeft + "px";
        
        broadcastEvent('moveNote', {
            id: note.id,
            position: { x: newLeft, y: newTop }
        });
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        broadcastEvent('moveNote', {
            id: note.id,
            position: { x: parseInt(note.style.left), y: parseInt(note.style.top) }
        });
    }
}

function setupNoteListeners(note) {
    const textarea = note.querySelector('.note-content');
    const deleteBtn = note.querySelector('.delete-note');

    textarea.addEventListener('input', () => {
        broadcastEvent('updateNote', {
            id: note.id,
            content: textarea.value
        });
        saveNotesToLocalStorage();
    });

    deleteBtn.addEventListener('click', () => {
        deleteNote(note.id, true);
    });
}

function updateNote(noteData, broadcast = true) {
    if (!noteData || !noteData.id) return;
    
    const note = document.getElementById(noteData.id);
    if (note) {
        const textarea = note.querySelector('.note-content');
        if (textarea && noteData.content !== undefined) {
            textarea.value = noteData.content;
            saveNotesToLocalStorage();
            if (broadcast) {
                broadcastEvent('updateNote', noteData);
            }
        }
    }
}

function deleteNote(noteId, broadcast = true) {
    const note = document.getElementById(noteId);
    if (note) {
        note.remove();
        saveNotesToLocalStorage();
        if (broadcast) {
            broadcastEvent('deleteNote', { id: noteId });
        }
    }
}

function moveNote(noteId, position, broadcast = true) {
    const note = document.getElementById(noteId);
    if (note) {
        note.style.left = position.x + 'px';
        note.style.top = position.y + 'px';
        if (broadcast) {
            const colorClass = Array.from(note.classList)
                .find(cls => cls.startsWith('note-color-'));
            broadcastEvent('moveNote', { 
                id: noteId, 
                position,
                colorClass 
            });
        }
    }
}

function broadcastEvent(type, data) {
    let eventData;
    switch(type) {
        case 'newNote':
            eventData = {
                type,
                note: {
                    id: data.id,
                    content: data.content || '',
                    position: data.position,
                    colorClass: data.colorClass
                }
            };
            break;
        case 'updateNote':
            eventData = {
                type,
                note: {
                    id: data.id,
                    content: data.content
                }
            };
            break;
        case 'moveNote':
            const note = document.getElementById(data.id);
            const colorClass = note ? Array.from(note.classList)
                .find(cls => cls.startsWith('note-color-')) : null;
            eventData = {
                type,
                id: data.id,
                position: data.position,
                colorClass: colorClass
            };
            break;
        default:
            eventData = { type, ...data };
    }
    
    connections.forEach(conn => {
        if (conn.open) {
            try {
                conn.send(eventData);
            } catch (err) {
                console.error('Failed to send data:', err);
                connections = connections.filter(c => c !== conn);
            }
        }
    });
}

function getHighestZIndex() {
    return Math.max(
        ...Array.from(document.getElementsByClassName('sticky-note'))
            .map(el => parseInt(getComputedStyle(el).zIndex) || 0)
    );
}

function initializeUI() {
    setupConnectionPanel();
    setupToolbar();
    setupCopyButton();
}

function setupConnectionPanel() {
    const panel = document.querySelector('.connection-area');
    const html = `
        <button class="collapse-btn">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    panel.insertAdjacentHTML('beforeend', html);

    const collapseBtn = panel.querySelector('.collapse-btn');
    collapseBtn.addEventListener('click', () => {
        panel.classList.toggle('collapsed');
        collapseBtn.querySelector('i').classList.toggle('fa-chevron-left');
        collapseBtn.querySelector('i').classList.toggle('fa-chevron-right');
    });
}

function setupToolbar() {
    document.getElementById('clear-all').addEventListener('click', () => {
        const modal = document.getElementById('confirm-modal');
        modal.classList.add('active');
    });

    document.getElementById('cancel-clear').addEventListener('click', () => {
        document.getElementById('confirm-modal').classList.remove('active');
    });

    document.getElementById('confirm-clear').addEventListener('click', () => {
        document.getElementById('confirm-modal').classList.remove('active');
        clearAllNotes();
    });

    document.getElementById('arrange').addEventListener('click', arrangeNotes);
}

function setupCopyButton() {
    document.getElementById('copy-id').addEventListener('click', () => {
        const peerId = document.getElementById('peer-id').value;
        navigator.clipboard.writeText(peerId).then(() => {
            showToast('ID copied to clipboard!');
        });
    });
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full text-sm fade-in';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function clearAllNotes() {
    const notes = document.getElementsByClassName('sticky-note');
    Array.from(notes).forEach(note => {
        deleteNote(note.id, true);
    });
}

function arrangeNotes() {
    const notes = Array.from(document.getElementsByClassName('sticky-note'));
    const padding = 20;
    const noteWidth = 200;
    const noteHeight = 200;
    const containerWidth = window.innerWidth - padding * 2;
    const notesPerRow = Math.floor(containerWidth / (noteWidth + padding));

    notes.forEach((note, index) => {
        const row = Math.floor(index / notesPerRow);
        const col = index % notesPerRow;
        const left = padding + col * (noteWidth + padding);
        const top = padding + row * (noteHeight + padding) + 80;

        note.style.transition = 'all 0.3s ease-in-out';
        note.style.left = `${left}px`;
        note.style.top = `${top}px`;
        
        broadcastEvent('moveNote', {
            id: note.id,
            position: { x: left, y: top }
        });
        
        setTimeout(() => {
            note.style.transition = 'none';
        }, 300);
    });
}

function saveNotesToLocalStorage() {
    const notes = Array.from(document.getElementsByClassName('sticky-note')).map(note => ({
        id: note.id,
        content: note.querySelector('.note-content').value,
        position: {
            x: parseInt(note.style.left),
            y: parseInt(note.style.top)
        },
        colorClass: Array.from(note.classList).find(cls => cls.startsWith('note-color-'))
    }));
    localStorage.setItem('peerNotes', JSON.stringify(notes));
}

function loadNotesFromLocalStorage() {
    const savedNotes = localStorage.getItem('peerNotes');
    if (savedNotes) {
        JSON.parse(savedNotes).forEach(noteData => {
            createNote(noteData, false);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initPeer();
    initializeUI();
    loadNotesFromLocalStorage();

    document.getElementById('connect-btn').addEventListener('click', () => {
        const connectTo = document.getElementById('connect-to').value.trim();
        if (connectTo) {
            try {
                const conn = peer.connect(connectTo);
                if (!conn) {
                    showToast('Failed to connect to peer');
                    return;
                }
                connections.push(conn);
                setupConnectionListeners(conn);
            } catch (err) {
                console.error('Connection failed:', err);
                showToast('Failed to connect to peer');
            }
        }
    });

    document.getElementById('add-note').addEventListener('click', () => {
        createNote({});
    });
});
