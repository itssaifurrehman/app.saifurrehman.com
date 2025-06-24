const viewNoteModal = document.getElementById("viewNoteModal");
const modalNoteTitle = document.getElementById("modalNoteTitle");
const modalNoteContent = document.getElementById("modalNoteContent");
const closeModalBtn = document.getElementById("closeModal");

let currentModalNoteId = null;

const renderNotes = (notes, onDelete, onEdit, editingId = null) => {
  const container = document.getElementById("notesList");
  container.innerHTML = "";

  if (!notes.length) {
    container.innerHTML = "<p class='text-gray-500'>No notes yet.</p>";
    return;
  }

  notes.forEach((note) => {
    const isBeingEdited = note.id === editingId;

    const div = document.createElement("div");
    div.className = `bg-white p-4 rounded shadow relative ${
      isBeingEdited ? "ring-2 ring-blue-400 bg-blue-50" : ""
    }`;

    // Card content
    div.innerHTML = `
      <h3 class="text-lg font-semibold mb-1">${note.title}</h3>
     <div class="note-preview prose max-w-none text-gray-700 line-clamp-3 mb-2">
  ${note.body}
</div>


      <div class="flex gap-3 flex-wrap items-center mt-2">
        <button class="text-sm text-blue-600 " data-id="${
          note.id
        }" data-action="view" ${
      isBeingEdited ? "disabled" : ""
    }>👁️ View</button>
        <button class="text-blue-500 font-medium ${
          isBeingEdited
            ? "opacity-40 pointer-events-none"
            : "hover:text-blue-700"
        }" data-id="${note.id}" data-action="edit" ${
      isBeingEdited ? "disabled" : ""
    }>✏️ Edit</button>
        <button class="text-red-500 font-medium ${
          isBeingEdited
            ? "opacity-40 pointer-events-none"
            : "hover:text-red-700"
        }" data-id="${note.id}" data-action="delete" ${
      isBeingEdited ? "disabled" : ""
    }>🗑️ Delete</button>
      </div>

      ${
        isBeingEdited
          ? "<div class='absolute top-1 right-2 text-sm text-blue-600'>Editing...</div>"
          : ""
      }
    `;

    // Attach handlers after innerHTML is inserted
    const viewBtn = div.querySelector('[data-action="view"]');
    const editBtn = div.querySelector('[data-action="edit"]');
    const deleteBtn = div.querySelector('[data-action="delete"]');

    viewBtn.onclick = () => openNoteModal(note);

    if (!isBeingEdited) {
      editBtn.onclick = () => onEdit(note);
      deleteBtn.onclick = () => onDelete(note.id);
    }

    container.appendChild(div);
  });
};

const clearNoteForm = (quill) => {
  document.getElementById("noteTitle").value = "";
  try {
    quill.setContents([]);
  } catch (e) {
    console.warn("Quill not ready yet:", e);
  }
};

// Show modal
function openNoteModal(note) {
  modalNoteTitle.textContent = note.title || "Untitled";
  modalNoteContent.innerHTML = note.body || "<em>No content</em>";
  currentModalNoteId = note.id;
  viewNoteModal.classList.remove("hidden");
  viewNoteModal.classList.add("flex");
}

// Close modal
function closeNoteModal() {
  viewNoteModal.classList.add("hidden");
  viewNoteModal.classList.remove("flex");
  currentModalNoteId = null;
}

closeModalBtn.addEventListener("click", closeNoteModal);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeNoteModal();
});

export { renderNotes, clearNoteForm };
