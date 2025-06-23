import { db } from "../config/config.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

let userId = null;

function setUser(uid) {
  userId = uid;
}

async function getTasks(tagFilter = "") {
  let q = query(collection(db, "tasks"), where("userId", "==", userId));

  if (tagFilter) {
    q = query(q, where("tag", "==", tagFilter));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function addTask({
  text,
  tag = "",
  color = "",
  dueDate = "",
  order = 0,
}) {
  return await addDoc(collection(db, "tasks"), {
    text,
    tag,
    color,
    dueDate,
    order,
    completed: false,
    createdAt: serverTimestamp(),
    userId,
  });
}

// async function addTask(text, order) {
//   return await addDoc(collection(db, "todos"), {
//     text,
//     order,
//     userId,
//     completed: false,
//     createdAt: Date.now()
//   });
// }

async function deleteTask(id) {
  return await deleteDoc(doc(db, "tasks", id));
}

async function updateTask(id, updates) {
  return await updateDoc(doc(db, "tasks", id), updates);
}

export { setUser, getTasks, addTask, deleteTask, updateTask };
