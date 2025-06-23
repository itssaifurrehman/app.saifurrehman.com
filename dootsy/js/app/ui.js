import { addTask, deleteTask, updateTask, getTasks } from "./todo.js";

const taskList = document.getElementById("taskList");

function createTaskElement(task) {
  const li = document.createElement("li");
  li.dataset.id = task.id;

  const checkedClass = task.completed ? "line-through text-gray-400" : "";
  const editDisabled = task.completed ? "opacity-50 cursor-not-allowed" : "";

  const colorMap = {
    Blue: "bg-blue-100 text-blue-600",
    Red: "bg-red-100 text-red-600",
    Green: "bg-green-100 text-green-600",
    Yellow: "bg-yellow-100 text-yellow-600",
  };

  const colorClass = colorMap[task.color] || "bg-gray-100 text-gray-600";

  const tagHTML = task.tag
    ? `<span class="text-xs font-semibold px-2 py-1 rounded-full ${colorClass}">${task.tag}</span>`
    : "";

  const dueDateHTML = task.dueDate
    ? `<p class="text-xs text-gray-500 dark:text-gray-400">Due: ${task.dueDate}</p>`
    : "";

  li.className = `
    flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3
    border-b border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800
    transition-all duration-300 rounded
  `;

  li.innerHTML = `
    <div class="flex items-start gap-3 w-full sm:w-auto">
      <input type="checkbox" class="task-check h-5 w-5 mt-1 accent-blue-500" ${
        task.completed ? "checked" : ""
      }>
      <div>
        <div class="flex items-center gap-2 flex-wrap">
          <span class="task-text text-lg ${checkedClass}">${task.text}</span>
          ${tagHTML}
        </div>
        ${dueDateHTML}
      </div>
    </div>

    <div class="flex gap-2 self-end sm:self-auto">
      <button 
        class="edit-btn px-3 py-1 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded ${editDisabled}"
        ${task.completed ? "disabled" : ""}
      >Edit</button>
      <button 
        class="delete-btn px-3 py-1 text-sm text-white bg-red-500 hover:bg-red-600 rounded"
      >Delete</button>
    </div>
  `;

  return li;
}

function renderTasks(tasks) {
  const incompleteList = document.getElementById("incompleteTasks");
  const completedList = document.getElementById("completedTasks");

  incompleteList.innerHTML = "";
  completedList.innerHTML = "";

  tasks.sort((a, b) => a.order - b.order);

  tasks.forEach((task) => {
    const el = createTaskElement(task);
    if (task.completed) {
      completedList.appendChild(el);
    } else {
      incompleteList.appendChild(el);
    }
  });

  setupSortable();
  updateEmptyState();
}

function bindTaskEvents() {
  const taskContainers = [
    document.getElementById("incompleteTasks"),
    document.getElementById("completedTasks"),
  ];

  taskContainers.forEach((container) => {
    container.addEventListener("click", async (e) => {
      const li = e.target.closest("li");
      if (!li) return;
      const id = li.dataset.id;

      if (e.target.classList.contains("delete-btn")) {
        await deleteTask(id);
        li.remove();
        const tasks = await getTasks();
        renderTasks(tasks);

        return;
      }

      if (e.target.classList.contains("edit-btn")) {
        if (e.target.disabled) return;

        const currentText = li.querySelector(".task-text").textContent;
        const newText = prompt("Update task:", currentText);

        if (newText) {
          await updateTask(id, { text: newText });
          li.querySelector(".task-text").textContent = newText;
        }
      }
    });

    container.addEventListener("change", async (e) => {
      if (e.target.classList.contains("task-check")) {
        const li = e.target.closest("li");
        const id = li.dataset.id;
        const completed = e.target.checked;

        li.classList.add(
          "opacity-0",
          "translate-x-4",
          "transition-all",
          "duration-300"
        );

        await updateTask(id, { completed });

        const tasks = await getTasks();
        renderTasks(tasks);
      }
    });
  });
}

document.getElementById("addBtn").addEventListener("click", async () => {
  const text = document.getElementById("taskInput").value.trim();
  const tag = document.getElementById("taskTag").value;
  const color = document.getElementById("taskColor").value;
  const dueDate = document.getElementById("taskDueDate").value;

  if (!text) return;

  const tasks = await getTasks();
  const order = tasks.length;

  await addTask({ text, tag, color, dueDate, order });

  const newTasks = await getTasks();
  console.log(newTasks, "theese: ");
  renderTasks(newTasks);

  document.getElementById("taskInput").value = "";
  document.getElementById("taskTag").value = "";
  document.getElementById("taskColor").value = "blue";
  document.getElementById("taskDueDate").value = "";
});

document.getElementById("tagFilter").addEventListener("change", async (e) => {
  const selectedTag = e.target.value;
  const tasks = await getTasks(selectedTag);
  renderTasks(tasks);
  setupSortable();
});

function setupSortable() {
  const incompleteList = document.getElementById("incompleteTasks");

  if (!incompleteList) {
    console.warn("Sortable init failed: #incompleteTasks not found.");
    return;
  }

  new Sortable(incompleteList, {
    animation: 150,
    onEnd: async () => {
      const items = [...incompleteList.children];
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

function updateEmptyState() {
  const incompleteList = document.getElementById("incompleteTasks");
  const completedList = document.getElementById("completedTasks");

  const noActiveMsg = document.getElementById("noActiveMessage");
  const noCompletedMsg = document.getElementById("noCompletedMessage");

  const hasIncomplete = incompleteList?.querySelectorAll("li").length > 0;
  const hasCompleted = completedList?.querySelectorAll("li").length > 0;

  if (!hasIncomplete) {
    noActiveMsg.classList.remove("hidden");
  } else {
    noActiveMsg.classList.add("hidden");
  }

  if (!hasCompleted) {
    noCompletedMsg.classList.remove("hidden");
  } else {
    noCompletedMsg.classList.add("hidden");
  }
}

export {
  renderTasks,
  bindTaskEvents,
  setupSortable,
  setupThemeToggle,
  updateEmptyState,
};
