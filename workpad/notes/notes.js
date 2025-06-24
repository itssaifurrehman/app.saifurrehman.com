// notes/notes.js
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
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const NOTES_COLLECTION = "notes";

const addNote = async (note) => {
  return await addDoc(collection(db, NOTES_COLLECTION), note);
};

const getUserNotes = async (uid) => {
  const q = query(collection(db, "notes"), where("uid", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

const deleteNote = async (id) => {
  return await deleteDoc(doc(db, NOTES_COLLECTION, id));
};

const updateNote = async (id, updatedData) => {
  return await updateDoc(doc(db, NOTES_COLLECTION, id), updatedData);
};

export { addNote, getUserNotes, deleteNote, updateNote };
