import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import {
  firebaseAuth,
  firebaseStorage,
  firestore,
} from "@/lib/firebase";

function sortItems(items, sort) {
  if (!sort) return items;
  const descending = sort.startsWith("-");
  const key = descending ? sort.slice(1) : sort;
  return [...items].sort((a, b) => {
    const av = a[key] ?? "";
    const bv = b[key] ?? "";
    if (av === bv) return 0;
    return (av > bv ? 1 : -1) * (descending ? -1 : 1);
  });
}

function filterItems(items, filter = {}) {
  const keys = Object.keys(filter || {});
  return items.filter((item) => keys.every((key) => String(item[key]) === String(filter[key])));
}

async function collectionItems(entityName) {
  const snapshot = await getDocs(collection(firestore, entityName));
  return snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
}

function isManagedStorageUrl(fileUrl, folder) {
  if (!fileUrl) return false;

  try {
    const url = new URL(fileUrl);
    return url.hostname === "firebasestorage.googleapis.com"
      && decodeURIComponent(url.pathname).includes(`/${folder}/`);
  } catch {
    return false;
  }
}

async function deleteHeroImageFile(item) {
  if (!isManagedStorageUrl(item?.image_url, "homepage-hero-images")) return;

  try {
    await deleteObject(ref(firebaseStorage, item.image_url));
  } catch (error) {
    if (error?.code !== "storage/object-not-found") throw error;
  }
}

async function deleteStoredFile(fileUrl, folder) {
  if (!isManagedStorageUrl(fileUrl, folder)) return;

  try {
    await deleteObject(ref(firebaseStorage, fileUrl));
  } catch (error) {
    if (error?.code !== "storage/object-not-found") throw error;
  }
}

async function deleteBulletinFiles(id, item) {
  const otherBulletins = (await collectionItems("Bulletins")).filter((bulletin) => bulletin.id !== id);

  if (!otherBulletins.some((bulletin) => bulletin.file_url === item.file_url)) {
    await deleteStoredFile(item.file_url, "bulletins-pdfs");
  }

  if (!otherBulletins.some((bulletin) => bulletin.thumbnail_url === item.thumbnail_url)) {
    await deleteStoredFile(item.thumbnail_url, "bulletin-thumbnails");
  }
}

function firebaseEntity(entityName) {
  return {
    list: async (sort, limit) => {
      const items = sortItems(await collectionItems(entityName), sort);
      return items.slice(0, limit || undefined);
    },
    filter: async (filter = {}, sort, limit) => {
      const items = sortItems(filterItems(await collectionItems(entityName), filter), sort);
      return items.slice(0, limit || undefined);
    },
    create: async (data) => {
      const item = {
        ...data,
        created_date: data.created_date || new Date().toISOString(),
      };
      const created = await addDoc(collection(firestore, entityName), item);
      return { id: created.id, ...item };
    },
    update: async (id, data) => {
      const item = { ...data, updated_date: new Date().toISOString() };
      await updateDoc(doc(firestore, entityName, id), item);
      return { id, ...item };
    },
    delete: async (id) => {
      if (entityName === "HeroSlide" || entityName === "Bulletins") {
        const itemSnapshot = await getDoc(doc(firestore, entityName, id));
        if (itemSnapshot.exists()) {
          if (entityName === "HeroSlide") {
            await deleteHeroImageFile(itemSnapshot.data());
          } else {
            await deleteBulletinFiles(id, itemSnapshot.data());
          }
        }
      }
      await deleteDoc(doc(firestore, entityName, id));
      return { success: true };
    },
  };
}

function waitForAuthUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

async function firebaseUser() {
  const user = firebaseAuth.currentUser || await waitForAuthUser();
  if (!user) throw new Error("Not authenticated");

  const adminRecord = await getDoc(doc(firestore, "admins", user.uid));
  if (!adminRecord.exists()) throw new Error("This account is not an administrator.");

  return {
    id: user.uid,
    email: user.email,
    full_name: user.displayName || user.email,
    role: "admin",
  };
}

const UPLOAD_FOLDERS = {
  heroImage: "homepage-hero-images",
  bulletinPdf: "bulletins-pdfs",
  bulletinThumbnail: "bulletin-thumbnails",
  announcementImage: "announcement-images",
};

function uploadPath(file, destination) {
  const folder = UPLOAD_FOLDERS[destination] || "other-uploads";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  return `${folder}/${Date.now()}-${safeName}`;
}

export const firebaseApi = {
  entities: new Proxy({}, {
    get: (_, name) => firebaseEntity(name),
  }),
  auth: {
    me: firebaseUser,
    signIn: async (email, password) => {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      return firebaseUser();
    },
    logout: () => signOut(firebaseAuth),
    redirectToLogin: () => {},
  },
  integrations: {
    Core: {
      UploadFile: async ({ file, destination }) => {
        if (!file) return { file_url: "" };
        await firebaseUser();
        const uploadRef = ref(firebaseStorage, uploadPath(file, destination));
        await uploadBytes(uploadRef, file, { contentType: file.type });
        return { file_url: await getDownloadURL(uploadRef) };
      },
      InvokeLLM: async () => null,
      SendEmail: async () => ({ success: true }),
      SendSMS: async () => ({ success: true }),
      GenerateImage: async () => null,
      ExtractDataFromUploadedFile: async () => null,
    },
  },
  appLogs: {
    logUserInApp: async () => {},
  },
};
