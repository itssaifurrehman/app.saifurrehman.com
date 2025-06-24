const renderNotes = (notes, onDelete, onEdit, editingId = null) => {
  const container = document.getElementById("notesList");
  container.innerHTML = "";

  if (!notes.length) {
    container.innerHTML = "<p class='text-gray-500'>No notes yet.</p>";
    return;
  }

  notes.forEach(note => {
    const div = document.createElement("div");
    const isBeingEdited = note.id === editingId;

    div.className = `bg-white p-4 rounded shadow relative ${
      isBeingEdited ? "ring-2 ring-blue-400 bg-blue-50" : ""
    }`;

    div.innerHTML = `
      <h3 class="text-lg font-semibold mb-1">${note.title}</h3>
      <div class="text-gray-700 mb-2 prose prose-sm max-w-none">${note.body}</div>
      <div class="space-x-4">
        <button class="text-blue-500 font-medium ${isBeingEdited ? "opacity-40 pointer-events-none" : "hover:text-blue-700"}" data-id="${note.id}" data-action="edit" ${isBeingEdited ? "disabled" : ""}>Edit</button>
        <button class="text-red-500 font-medium ${isBeingEdited ? "opacity-40 pointer-events-none" : "hover:text-red-700"}" data-id="${note.id}" data-action="delete" ${isBeingEdited ? "disabled" : ""}>Delete</button>
      </div>
      ${isBeingEdited ? "<div class='absolute top-1 right-2 text-sm text-blue-600'>Editing...</div>" : ""}
    `;

    const editBtn = div.querySelector('[data-action="edit"]');
    const deleteBtn = div.querySelector('[data-action="delete"]');

    if (!isBeingEdited) {
      deleteBtn.onclick = () => onDelete(note.id);
      editBtn.onclick = () => onEdit(note);
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


export { renderNotes, clearNoteForm };