# PeerNote

PeerNote is a real-time collaborative sticky notes application that allows users to create, share, and synchronize notes across multiple browsers using WebRTC peer-to-peer connections.

## Features

- Create, edit, and delete sticky notes
- Real-time synchronization between peers
- Drag and drop notes anywhere on the canvas
- Copy-paste connection IDs for easy sharing
- Different colors for visual variety
-  Responsive design
- 🔄Auto-arrange notes in a grid layout

## Setup

1. Clone this repository:
```bash
git clone https://github.com/PawiX25/PeerNotes.git
cd PeerNotes
```

2. Open index.html in your web browser or serve it using a local server:
```bash
python -m http.server 8000
# or
npx serve
```

3. Share your Peer ID with others to start collaborating!

## How to Use

1. When you open the application, you'll receive a unique Peer ID
2. Share this ID with someone you want to collaborate with
3. They can connect to you by entering your ID in the "Connect to Peer" field
4. Once connected, all notes will be synchronized between peers
5. Click "Add Note" to create new notes
6. Drag notes using the ✥ handle
7. Click the × button to delete notes
8. Use the "Arrange" button to organize notes in a grid

## Technologies Used

- PeerJS for WebRTC connections
- TailwindCSS for styling
- Font Awesome for icons

## Browser Support

PeerNote works in modern browsers that support WebRTC:
- Chrome
- Firefox
- Edge
- Safari
