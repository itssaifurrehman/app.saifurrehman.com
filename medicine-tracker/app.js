import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  query,
  where,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

let ui = null;
  
export async function getTableData() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      ui = user.uid;
      loginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
    }
    
  });

  const medicineList = document.getElementById("medicineList");
  medicineList.innerHTML = "";
  const q = query(collection(db, "medicines"), where("uid", "==", ui));
  const querySnapshot = await getDocs(q);
  querySnapshot.forEach((docSnap) => {
    const med = docSnap.data();
    const row = document.createElement("tr");

    // Name
    const nameCell = document.createElement("td");
    nameCell.textContent = med.name;
    nameCell.classList.add("border", "px-4", "py-2");
    row.appendChild(nameCell);
    const durationCell = document.createElement("td");
    durationCell.textContent = med.duration || "-";
    durationCell.classList.add("border", "px-4", "py-2");
    row.appendChild(durationCell);

    // Frequency
    const timesPerDay = Object.values(med.schedule).filter(
      (count) => count > 0
    ).length;
    const totalTabsPerDay = Object.values(med.schedule).reduce(
      (a, b) => a + b,
      0
    );

    const freqCell = document.createElement("td");
    freqCell.textContent = `${timesPerDay} time(s) a day (${totalTabsPerDay} tablet${
      totalTabsPerDay > 1 ? "s" : ""
    })`;
    freqCell.classList.add("border", "px-4", "py-2");
    row.appendChild(freqCell);

    // Times (schedule)
    const timesCell = document.createElement("td");
    timesCell.innerHTML = Object.entries(med.schedule)
      .map(([time, count]) => `${time}: ${count}`)
      .join("<br>");
    timesCell.classList.add("border", "px-4", "py-2");
    row.appendChild(timesCell);
    medicineList.appendChild(row);
  });
}

export function initDOM() {
  // DOM Elements
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const userSection = document.getElementById("userSection");
  const userNameSpan = document.getElementById("userName");
  const formSection = document.getElementById("formSection");
  const medForm = document.getElementById("medForm");
  const medName = document.getElementById("medName");
  const frequency = document.getElementById("frequency");
  const scheduleInputsDiv = document.getElementById("scheduleInputs");
  const scheduleInputs = scheduleInputsDiv.querySelectorAll(".time-dose");
  const doseSummary = document.getElementById("doseSummary");
  const historySection = document.getElementById("historySection");
  const medicineList = document.getElementById("medicineList");

  let currentUser = null;
  let editingDocId = null;

  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("User is logged in:", user);
      currentUser = user;
      userNameSpan.textContent = user.displayName;
      loginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
      userSection.classList.remove("hidden");
      formSection.classList.remove("hidden");
      historySection.classList.remove("hidden");
      loadMedicines();
    } else {
      currentUser = null;
      userNameSpan.textContent = "";
      loginBtn.classList.remove("hidden");
      logoutBtn.classList.add("hidden");
      userSection.classList.add("hidden");
      formSection.classList.add("hidden");
      historySection.classList.add("hidden");
    }
  });

  const toggleSidebarBtn = document.getElementById('toggleSidebar');
const closeSidebarBtn = document.getElementById('closeSidebar');
const sidebar = document.getElementById('sidebar');

if (toggleSidebarBtn) {
  toggleSidebarBtn.addEventListener('click', () => {
    sidebar.classList.toggle('-translate-x-full');
  });
}

if (closeSidebarBtn) {
  closeSidebarBtn.addEventListener('click', () => {
    sidebar.classList.add('-translate-x-full');
  });
}


  document.addEventListener("DOMContentLoaded", () => {
    const totalQuantity = document.getElementById("totalQuantity");
    const morningDose = document.getElementById("doseMorning");
    const noonDose = document.getElementById("doseNoon");
    const eveningDose = document.getElementById("doseEvening");
    const resultText = document.getElementById("medicineDuration");

    function updateMedicineDuration() {
      const total = parseInt(totalQuantity.value || 0);
      const morning = parseInt(morningDose.value || 0);
      const noon = parseInt(noonDose.value || 0);
      const evening = parseInt(eveningDose.value || 0);

      const dailyDose = morning + noon + evening;

      if (total > 0 && dailyDose > 0) {
        const days = Math.floor(total / dailyDose);
        const remaining = total % dailyDose;

        const now = new Date();
        const endDate = new Date();
        endDate.setDate(now.getDate() + days);

        let dayText = endDate.toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
        });

        let timeOfDay = "";
        if (remaining >= morning + noon + evening) {
          timeOfDay = "evening";
        } else if (remaining >= morning + noon) {
          timeOfDay = "noon";
        } else if (remaining >= morning) {
          timeOfDay = "morning";
        }

        resultText.innerText = `Medicine will last until ${dayText}${
          timeOfDay ? ` (${timeOfDay})` : ""
        }.`;
      } else {
        resultText.innerText = "";
      }
    }

    [totalQuantity, morningDose, noonDose, eveningDose].forEach((input) => {
      input.addEventListener("input", updateMedicineDuration);
    });
  });

  // Medicine form submit
  medForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = medName.value.trim();
    const freq = parseInt(frequency.value);
    const schedule = {};
    let totalDoses = 0;

    scheduleInputs.forEach((input) => {
      const time = input.dataset.time;
      const val = parseInt(input.value) || 0;
      if (val >= 0) {
        schedule[time] = val;
        totalDoses += val;
      }
    });

    const total = Object.values(schedule).reduce((a, b) => a + b, 0);
    const totalQuantity = parseInt(frequency.value); // total quantity bought
    const days = Math.floor(totalQuantity / total); // how many full days
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(now.getDate() + days);

    const dayText = endDate.toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    // Save this as a string in Firestore
    const data = {
      uid: currentUser.uid,
      name,
      frequency: freq,
      schedule,
      duration: `Until ${dayText}`, // now this works perfectly
      updatedAt: new Date().toISOString(), // always update this
    };
    if (editingDocId) {
      await updateDoc(doc(db, "medicines", editingDocId), data);
      editingDocId = null;
      medForm.querySelector("button[type=submit]").textContent = "Save";
    } else {
      await addDoc(collection(db, "medicines"), data);
    }

    medForm.reset();
    scheduleInputs.forEach((input) => (input.value = 0));
    scheduleInputsDiv.classList.add("hidden");
    doseSummary.textContent = "Assigned doses: 0";
    loadMedicines();
  });

  frequency.addEventListener("input", () => {
    scheduleInputsDiv.classList.remove("hidden");
    validateDoses(); // Keep the summary always updated
  });

  function validateDoses() {
    const totalQty = parseInt(frequency.value) || 0; // frequency = total pills bought
    let dailyDose = 0;
let  left=0;
    scheduleInputs.forEach((input) => {
      dailyDose += parseInt(input.value) || 0;
    });

    doseSummary.textContent = `Assigned doses: ${dailyDose}/day`;

    // if (dailyDose <= 0 || totalQty <= 0) {
    //   doseSummary.classList.add("text-red-600");
    // } else {
    //   doseSummary.classList.remove("text-red-600");
    // }

    // Duration logic
    const durationLabel = document.getElementById("medicineDuration");
    if (dailyDose > 0 && totalQty > 0) {
      const days = Math.floor(totalQty / dailyDose);
      const leftover = totalQty % dailyDose;

      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + days);

      const readableDate = endDate.toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
      });

      let leftoverText = leftover ? ` + ${leftover} dose(s) extra` : "";

      durationLabel.textContent = `🗓️ Will last until ${readableDate}${leftoverText}`;
      durationLabel.classList.remove("hidden");

  const takenDays = 0; // Not known at input time — defaulting to 0
  const takenSoFar = takenDays * dailyDose;
   left = totalQty - takenSoFar;

    } else {
      durationLabel.textContent = "";
      durationLabel.classList.add("hidden");
    }

  }


  scheduleInputs.forEach((input) => {
    input.addEventListener("input", validateDoses);
  });

    // async function loadMedicines() {
  async function loadMedicines() {
    medicineList.innerHTML = "";

    const nameSort = document.getElementById("sortName")?.value;
    const freqSort = document.getElementById("sortFrequency")?.value;
    const dosesSort = document.getElementById("sortDosesLeft")?.value;

    const q = query(
      collection(db, "medicines"),
      where("uid", "==", currentUser.uid)
    );
    const querySnapshot = await getDocs(q);

    let meds = [];
    querySnapshot.forEach((docSnap) => {
      const med = docSnap.data();
      med.id = docSnap.id;

      // Compute extra fields for sorting
      med.timesPerDay = Object.values(med.schedule).filter((n) => n > 0).length;
      med.totalDoses = Object.values(med.schedule).reduce((a, b) => a + b, 0);

      meds.push(med);
    });

    // ✅ Sort by selected filters
    if (nameSort) {
      meds.sort((a, b) =>
        nameSort === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      );
    }

    if (freqSort) {
      meds.sort((a, b) =>
        freqSort === "asc"
          ? a.timesPerDay - b.timesPerDay
          : b.timesPerDay - a.timesPerDay
      );
    }

    if (dosesSort) {
      meds.sort((a, b) =>
        dosesSort === "asc"
          ? a.totalDoses - b.totalDoses
          : b.totalDoses - a.totalDoses
      );
    }

    // Then render each row (your existing logic)
    meds.forEach((med) => {
      const row = document.createElement("tr");

      const nameCell = document.createElement("td");
      nameCell.textContent = med.name;
      nameCell.classList.add("border", "px-4", "py-2");
      row.appendChild(nameCell);

      // const stock = document.createElement("td");
      // stock.textContent = med.frequency || "0";
      // console.log(med)
      // stock.classList.add("border", "px-4", "py-2");
      // row.appendChild(stock);

      const durationCell = document.createElement("td");
      durationCell.textContent = med.duration || "-";
      durationCell.classList.add("border", "px-4", "py-2");
      row.appendChild(durationCell);

      const freqCell = document.createElement("td");
      freqCell.textContent = `${med.timesPerDay} time(s) a day (${
        med.totalDoses
      } tablet${med.totalDoses > 1 ? "s" : ""})`;
      freqCell.classList.add("border", "px-4", "py-2");
      row.appendChild(freqCell);

      const timesCell = document.createElement("td");
      timesCell.innerHTML = Object.entries(med.schedule)
        .map(([time, count]) => `${time}: ${count}`)
        .join("<br>");
      timesCell.classList.add("border", "px-4", "py-2");
      row.appendChild(timesCell);

      const actionCell = document.createElement("td");
      actionCell.classList.add("border", "px-4", "py-2");

      const delBtn = document.createElement("button");
      delBtn.textContent = "🗑️";
      delBtn.classList.add("text-red-600", "mr-2");
      delBtn.onclick = async () => {
        await deleteDoc(doc(db, "medicines", med.id));
        loadMedicines();
      };
      actionCell.appendChild(delBtn);

      const editBtn = document.createElement("button");
      editBtn.textContent = "✏️";
      editBtn.classList.add("text-blue-600");
      editBtn.onclick = () => {
        editingDocId = med.id;
        medName.value = med.name;
        frequency.value = med.frequency;

        doseSummary.textContent = `Assigned doses: ${Object.values(
          med.schedule
        ).reduce((a, b) => a + b, 0)}/${med.frequency}`;
        scheduleInputs.forEach((input) => {
          const time = input.dataset.time;
          input.value = med.schedule[time] || 0;
        });

        validateDoses();
        scheduleInputsDiv.classList.remove("hidden");
        medForm.querySelector("button[type=submit]").textContent = "Update";
      };
      actionCell.appendChild(editBtn);

      row.appendChild(actionCell);
      medicineList.appendChild(row);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document
      .querySelector('[data-page="view"]')
      .addEventListener("click", () => {
        loadPage("view-medicine.html");
      });

    document
      .querySelector('[data-page="add"]')
      .addEventListener("click", () => {
        loadPage("add-medicine.html");
      });
  });

  ["sortName", "sortFrequency", "sortDosesLeft"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", () => {
        loadMedicines();
      });
    } else {
    }
  });
}
