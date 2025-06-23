import { db } from '../config/config.js';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

let userId = null;

function setUser(uid) {
  userId = uid;
}

async function getTasks() {
  const q = query(collection(db, "todos"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function addTask(text, order) {
  return await addDoc(collection(db, "todos"), {
    text,
    order,
    userId,
    completed: false,
    createdAt: Date.now()
  });
}

async function deleteTask(id) {
  return await deleteDoc(doc(db, "todos", id));
}

async function updateTask(id, updates) {
  return await updateDoc(doc(db, "todos", id), updates);
}

export { setUser, getTasks, addTask, deleteTask, updateTask };
