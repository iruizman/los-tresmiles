import { firebaseApp } from "./firebase-config.js";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

export const db = getFirestore(firebaseApp);

function campaignsCollection(userId) {
  return collection(db, "users", userId, "campaigns");
}

export async function loadCloudCampaigns(userId) {
  if (!userId) return [];

  const snapshot = await getDocs(campaignsCollection(userId));

  return snapshot.docs.map((item) => ({
    ...item.data(),
    id: item.id
  }));
}

export async function saveCloudCampaign(userId, campaign) {
  if (!userId || !campaign?.id) {
    throw new Error("No se puede guardar la campaña en Firestore.");
  }

  const ref = doc(
    db,
    "users",
    userId,
    "campaigns",
    campaign.id
  );

  await setDoc(ref, campaign);
}

export async function removeCloudCampaign(userId, campaignId) {
  if (!userId || !campaignId) return;

  const ref = doc(
    db,
    "users",
    userId,
    "campaigns",
    campaignId
  );

  await deleteDoc(ref);
}