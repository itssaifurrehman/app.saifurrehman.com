import { addTask, deleteTask, updateTask } from "./todo.js";

const taskList = document.getElementById("taskList");

function createTaskElement(task) {
  const li = document.createElement("li");
  li.dataset.id = task.id;

  li.className = `
  flex items-center justify-between px-4 py-3 border-b border-gray-300 dark:border-gray-600
  bg-white dark:bg-gray-800 rounded transition-all duration-200
`;

  const checkedClass = task.completed ? "line-through text-gray-400" : "";
  const editDisabled = task.completed ? "opacity-50 cursor-not-allowed" : "";

  li.innerHTML = `
    <div class="flex items-center gap-3">
      <input type="checkbox" class="task-check h-5 w-5 accent-blue-500" ${
        task.completed ? "checked" : ""
      }>
      <span class="task-text text-lg ${checkedClass}">${task.text}</span>
    </div>

    <div class="flex gap-2">
      <button 
        class="edit-btn px-3 py-1 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded ${editDisabled}"
        ${task.completed ? "disabled" : ""}
      >
        Edit
      </button>
      <button 
        class="delete-btn px-3 py-1 text-sm text-white bg-red-500 hover:bg-red-600 rounded"
      >
        Delete
      </button>
    </div>
  `;

  return li;
}

function renderTasks(tasks) {
  taskList.innerHTML = "";
  tasks
    .sort((a, b) => a.order - b.order)
    .forEach((task) => {
      const el = createTaskElement(task);
      taskList.appendChild(el);
    });
}

function bindTaskEvents() {
  taskList.addEventListener("click", async (e) => {
    const id = e.target.closest("li").dataset.id;

    if (e.target.classList.contains("delete-btn")) {
      await deleteTask(id);
      e.target.closest("li").remove();
    }

    if (e.target.classList.contains("edit-btn")) {
      if (e.target.disabled) return;
      const newText = prompt(
        "Update task:",
        e.target.closest("li").querySelector(".task-text").textContent
      );
      if (newText) {
        await updateTask(id, { text: newText });
        e.target.closest("li").querySelector(".task-text").textContent =
          newText;
      }
    }
  });

  taskList.addEventListener("change", async (e) => {
    if (e.target.classList.contains("task-check")) {
      const li = e.target.closest("li");
      const id = li.dataset.id;
      const completed = e.target.checked;

      await updateTask(id, { completed });

      const textEl = li.querySelector(".task-text");
      const editBtn = li.querySelector(".edit-btn");

      textEl.classList.toggle("line-through", completed);
      textEl.classList.toggle("text-gray-400", completed);

      if (completed) {
        editBtn.disabled = true;
        editBtn.classList.add("opacity-50", "cursor-not-allowed");
      } else {
        editBtn.disabled = false;
        editBtn.classList.remove("opacity-50", "cursor-not-allowed");
      }
    }
  });
}

function setupSortable() {
  new Sortable(taskList, {
    animation: 150,
    onEnd: async () => {
      const items = [...taskList.children];
      for (let i = 0; i < items.length; i++) {
        const id = items[i].dataset.id;
        await updateTask(id, { order: i });
      }
    },
  });
}

function setupThemeToggle() {
  // const toggleBtn = document.getElementById("themeToggle");
  // toggleBtn.onclick = () => {
  //   console.log("Toggling theme");
  //   document.documentElement.classList.toggle("dark");
  //   document.documentElement.classList.toggle("light");
  // };
}

export { renderTasks, bindTaskEvents, setupSortable, setupThemeToggle };
