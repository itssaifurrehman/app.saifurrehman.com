// app.js
import { login, logout, onUserChange, getUser } from "./auth/auth.js";
import {
  addNote,
  getUserNotes,
  deleteNote,
  updateNote,
} from "./notes/notes.js";

import { renderNotes, clearNoteForm } from "./ui/ui.js";



document.getElementById("loginBtn").onclick = login;
document.getElementById("logoutBtn").onclick = logout;

let quill;
let currentEditId = null;

window.onload = () => {
  const noteStats = document.getElementById("noteStats");
  const wordLimitWarning = document.getElementById("wordLimitWarning");
  const editorContainer = document.getElementById("editorContainer");
  const saveBtn = document.getElementById("saveNote");

  const WORD_LIMIT = 5000;

  // ✅ Initialize Quill
  quill = new Quill("#editor", {
    theme: "snow",
    modules: {
      toolbar: "#toolbar"
    }
  });

  // ✅ Word count + limit
  quill.on("text-change", (delta, oldDelta, source) => {
    const plainText = quill.getText().trim();
    const words = plainText ? plainText.split(/\s+/).length : 0;
    const chars = plainText.length;
    const charsNoSpaces = plainText.replace(/\s/g, "").length;

    noteStats.textContent = `Words: ${words}/${WORD_LIMIT} | Characters: ${chars} | Characters (no spaces): ${charsNoSpaces}`;

    if (words > WORD_LIMIT) {
      wordLimitWarning.classList.remove("hidden");
      editorContainer.classList.remove("border-gray-300");
      editorContainer.classList.add("border-red-500");
      saveBtn.disabled = true;
      saveBtn.classList.add("opacity-50", "cursor-not-allowed");

      if (source === "user") {
        quill.deleteText(quill.getLength() - 2, 1);
      }
    } else {
      wordLimitWarning.classList.add("hidden");
      editorContainer.classList.remove("border-red-500");
      editorContainer.classList.add("border-gray-300");
      saveBtn.disabled = false;
      saveBtn.classList.remove("opacity-50", "cursor-not-allowed");
    }
  });

  // ✅ Limit copy-paste
  setTimeout(() => {
    if (quill?.root) {
      quill.root.addEventListener("paste", (e) => {
        const pastedText = (e.clipboardData || window.clipboardData).getData("text");
        const currentText = quill.getText().trim();
        const currentWords = currentText ? currentText.split(/\s+/).length : 0;
        const pastedWords = pastedText.trim().split(/\s+/).length;

        if (currentWords + pastedWords > WORD_LIMIT) {
          e.preventDefault();
          const allowedWords = WORD_LIMIT - currentWords;
          const limitedText = pastedText.trim().split(/\s+/).slice(0, allowedWords).join(" ");
          quill.insertText(quill.getSelection().index, limitedText);
        }
      });
    }
  }, 100);

  // ✅ Save note (mock)
  saveBtn.addEventListener("click", () => {
    const htmlContent = quill.root.innerHTML;
  });

  window.quill = quill; // Optional global
};




document.getElementById("saveNote").onclick = async () => {
  const user = getUser();
  if (!user) return alert("Login first");

  const title = document.getElementById("noteTitle").value.trim();
  const body = quill.root.innerHTML.trim();

  if (!title || !body || body === "<p><br></p>")
    return alert("Please fill in the title and note content");

 if (currentEditId) {
  await updateNote(currentEditId, { title, body });
  currentEditId = null;
  document.getElementById("saveNote").textContent = "Save Note";
} else {
    await addNote({
      uid: user.uid,
      title,
      body,
      createdAt: Date.now(),
    });
  }

clearNoteForm(quill);
const notes = await getUserNotes(user.uid);
renderNotes(notes, handleDelete, handleEdit);
};

async function handleDelete(id) {
  await deleteNote(id);
  const user = getUser();
  const notes = await getUserNotes(user.uid);
  renderNotes(notes, handleDelete);
}

onUserChange(async (user) => {
  if (user) {
    const notes = await getUserNotes(user.uid);
    renderNotes(notes, handleDelete, handleEdit);
  } else {
    document.getElementById("notesList").innerHTML = "<p class='text-gray-600'>Please login to view your notes.</p>";
  }
});

function handleEdit(note) {
  document.getElementById("noteTitle").value = note.title;
  quill.root.innerHTML = note.body;
  document.getElementById("saveNote").textContent = "Update Note";
  currentEditId = note.id;

  // Rerender to disable buttons for this note
  getUserNotes(getUser().uid).then((notes) => {
    renderNotes(notes, handleDelete, handleEdit, currentEditId);
  });
}
