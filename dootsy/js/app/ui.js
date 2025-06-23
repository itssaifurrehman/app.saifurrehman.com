import { addTask, deleteTask, updateTask } from "./todo.js";

const taskList = document.getElementById("taskList");

function createTaskElement(task) {
  const li = document.createElement("li");
  li.className = "bg-white dark:bg-gray-800 p-3 rounded flex justify-between items-center";
  li.dataset.id = task.id;
  li.innerHTML = `
    <span class="task-text">${task.text}</span>
    <div class="flex gap-2">
      <button class="edit-btn text-blue-500">Edit</button>
      <button class="delete-btn text-red-500">Delete</button>
    </div>
  `;
  return li;
}

function renderTasks(tasks) {
  taskList.innerHTML = "";
  tasks
    .sort((a, b) => a.order - b.order)
    .forEach(task => {
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
      const newText = prompt("Update task:", e.target.closest("li").querySelector('.task-text').textContent);
      if (newText) {
        await updateTask(id, { text: newText });
        e.target.closest("li").querySelector('.task-text').textContent = newText;
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
    }
  });
}

function setupThemeToggle() {
  const toggleBtn = document.getElementById("themeToggle");
  toggleBtn.onclick = () => {
    console.log("Toggling theme");
    document.documentElement.classList.toggle("dark");
    document.documentElement.classList.toggle("light");
  };
}

export { renderTasks, bindTaskEvents, setupSortable, setupThemeToggle };
