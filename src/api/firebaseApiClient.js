import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
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
  if (!firestore) {
    throw new Error("Firebase is not configured. Managed content cannot fall back to local data.");
  }
  const snapshot = await getDocs(collection(firestore, entityName));
  return snapshot.docs.map((entry) => ({ ...entry.data(), id: entry.id }));
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

async function deleteReplacedHeroImageFile(id, previousItem, nextItem) {
  const previousUrl = previousItem?.image_url;
  const nextUrl = nextItem?.image_url;
  if (!previousUrl || previousUrl === nextUrl) return;
  if (!isManagedStorageUrl(previousUrl, "homepage-hero-images")) return;

  const otherSlides = (await collectionItems("HeroSlide")).filter((slide) => slide.id !== id);
  if (otherSlides.some((slide) => slide.image_url === previousUrl)) return;

  await deleteHeroImageFile(previousItem);
}

async function deleteLandingImageFile(item) {
  if (!isManagedStorageUrl(item?.image_url, "landing-images")) return;

  try {
    await deleteObject(ref(firebaseStorage, item.image_url));
  } catch (error) {
    if (error?.code !== "storage/object-not-found") throw error;
  }
}

async function deleteReplacedLandingImageFile(previousItem, nextItem) {
  const previousUrl = previousItem?.image_url;
  const nextUrl = nextItem?.image_url;
  if (!previousUrl || previousUrl === nextUrl) return;
  if (!isManagedStorageUrl(previousUrl, "landing-images")) return;

  await deleteLandingImageFile(previousItem);
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

async function deleteNewsletterBroadcastFiles(id, item) {
  const attachments = Array.isArray(item.attachments) ? item.attachments : [];
  if (attachments.length === 0) return;

  const otherBroadcasts = (await collectionItems("NewsletterBroadcasts")).filter((broadcast) => broadcast.id !== id);
  const otherAttachmentUrls = new Set(
    otherBroadcasts
      .flatMap((broadcast) => Array.isArray(broadcast.attachments) ? broadcast.attachments : [])
      .map((attachment) => attachment?.file_url)
      .filter(Boolean)
  );

  await Promise.all(
    attachments
      .map((attachment) => attachment?.file_url)
      .filter((fileUrl) => fileUrl && !otherAttachmentUrls.has(fileUrl))
      .map((fileUrl) => deleteStoredFile(fileUrl, "newsletter-attachments"))
  );
}

async function deleteAnnouncementFiles(id, item) {
  const otherAnnouncements = (await collectionItems("AnnouncementsEvents"))
    .filter((announcement) => announcement.id !== id);

  if (!otherAnnouncements.some((announcement) => announcement.image_upload === item?.image_upload)) {
    await deleteStoredFile(item?.image_upload, "announcement-images");
  }

  if (!otherAnnouncements.some((announcement) => announcement.file_upload === item?.file_upload)) {
    await deleteStoredFile(item?.file_upload, "announcement-files");
  }
}

async function deleteHeroSlideWithLinkedAnnouncement(id) {
  const slideRef = doc(firestore, "HeroSlide", id);
  const slideSnapshot = await getDoc(slideRef);
  const slide = slideSnapshot.exists() ? slideSnapshot.data() : null;

  if (slide) await deleteHeroImageFile(slide);
  await deleteDoc(slideRef);

  const announcementId = slide?.announcement_id;
  if (!announcementId) return;

  const remainingSlides = await collectionItems("HeroSlide");
  const announcementStillUsed = remainingSlides.some((item) =>
    String(item.announcement_id || "") === String(announcementId)
  );
  if (announcementStillUsed) return;

  const announcementRef = doc(firestore, "AnnouncementsEvents", String(announcementId));
  const announcementSnapshot = await getDoc(announcementRef);
  if (announcementSnapshot.exists()) {
    await deleteAnnouncementFiles(String(announcementId), announcementSnapshot.data());
    await deleteDoc(announcementRef);
  }
}

async function deleteAnnouncementWithLinkedSlides(id) {
  const announcementRef = doc(firestore, "AnnouncementsEvents", id);
  const announcementSnapshot = await getDoc(announcementRef);
  const linkedSlides = (await collectionItems("HeroSlide")).filter((slide) =>
    String(slide.announcement_id || "") === String(id)
  );

  for (const slide of linkedSlides) {
    await deleteHeroImageFile(slide);
    await deleteDoc(doc(firestore, "HeroSlide", slide.id));
  }

  if (announcementSnapshot.exists()) {
    await deleteAnnouncementFiles(id, announcementSnapshot.data());
  }
  await deleteDoc(announcementRef);
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
      const templateId = entityName === "EmailTemplates" ? data?.id : null;
      const { id: _ignoredId, ...documentData } = data || {};
      const item = {
        ...documentData,
        created_date: documentData.created_date || new Date().toISOString(),
      };

      if (entityName === "NewsletterSubscriptions") {
        const email = item.email?.trim().toLowerCase();
        const emailKey = item.email_key || encodeURIComponent(email);
        const firstName = String(item.first_name || "").trim().replace(/\s+/g, " ");
        const lastName = String(item.last_name || "").trim().replace(/\s+/g, " ");
        const subscription = {
          first_name: firstName,
          last_name: lastName,
          email,
          email_key: emailKey,
          unsubscribe_token: item.unsubscribe_token,
          status: item.status || "active",
          created_date: item.created_date,
        };
        const subscriptionRef = doc(firestore, entityName, emailKey);

        try {
          const existingSubscription = await getDoc(subscriptionRef);
          if (existingSubscription.exists() && existingSubscription.data()?.status !== "unsubscribed") {
            throw new Error("already-subscribed");
          }
        } catch (error) {
          if (error?.message === "already-subscribed") throw error;
          if (error?.code !== "permission-denied") throw error;
        }

        try {
          await setDoc(subscriptionRef, subscription);
        } catch (error) {
          if (error?.code === "permission-denied") {
            throw new Error("already-subscribed");
          }
          throw error;
        }

        return { ...subscription, id: emailKey };
      }

      if (entityName === "EmailTemplates") {
        if (!templateId) throw new Error("Email template id is required");
        await setDoc(doc(firestore, entityName, templateId), item);
        return { id: templateId, ...item };
      }

      const created = await addDoc(collection(firestore, entityName), item);
      return { ...item, id: created.id };
    },
    update: async (id, data) => {
      const previousSnapshot = entityName === "HeroSlide" || entityName === "LandingImage"
        ? await getDoc(doc(firestore, entityName, id))
        : null;
      const item = { ...data, updated_date: new Date().toISOString() };
      await updateDoc(doc(firestore, entityName, id), item);
      if (entityName === "HeroSlide" && previousSnapshot?.exists()) {
        await deleteReplacedHeroImageFile(id, previousSnapshot.data(), item);
      }
      if (entityName === "LandingImage" && previousSnapshot?.exists()) {
        await deleteReplacedLandingImageFile(previousSnapshot.data(), item);
      }
      return { id, ...item };
    },
    delete: async (id) => {
      if (entityName === "HeroSlide") {
        await deleteHeroSlideWithLinkedAnnouncement(id);
        return { success: true };
      }
      if (entityName === "AnnouncementsEvents") {
        await deleteAnnouncementWithLinkedSlides(id);
        return { success: true };
      }
      if (entityName === "HeroSlide" || entityName === "LandingImage" || entityName === "Bulletins" || entityName === "NewsletterBroadcasts") {
        const itemSnapshot = await getDoc(doc(firestore, entityName, id));
        if (itemSnapshot.exists()) {
          if (entityName === "LandingImage") {
            await deleteLandingImageFile(itemSnapshot.data());
          } else if (entityName === "Bulletins") {
            await deleteBulletinFiles(id, itemSnapshot.data());
          } else {
            await deleteNewsletterBroadcastFiles(id, itemSnapshot.data());
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
  const adminData = adminRecord.data() || {};
  const role = adminData.role || (String(adminData.email || user.email || "").trim().toLowerCase() === "nebajaphate@gmail.com" ? "site_developer" : "site_admin");

  return {
    id: user.uid,
    email: adminData.email || user.email,
    first_name: adminData.first_name || "",
    last_name: adminData.last_name || "",
    photo_url: adminData.photo_url || "",
    full_name: [adminData.first_name, adminData.last_name].filter(Boolean).join(" ") || user.displayName || user.email,
    admin_role: role,
    role_key: role,
    role: "admin",
  };
}

const UPLOAD_FOLDERS = {
  heroImage: "homepage-hero-images",
  landingImage: "landing-images",
  bulletinPdf: "bulletins-pdfs",
  bulletinThumbnail: "bulletin-thumbnails",
  announcementImage: "announcement-images",
  announcementFile: "announcement-files",
  newsletterAttachment: "newsletter-attachments",
  adminProfilePhoto: "admin-profile-images",
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
        const metadata = { contentType: file.type };
        if (destination === "heroImage" || destination === "landingImage") {
          metadata.cacheControl = "public,max-age=31536000";
        }
        await uploadBytes(uploadRef, file, metadata);
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
