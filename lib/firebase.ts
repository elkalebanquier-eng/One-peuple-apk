import { initializeApp } from "firebase/app";
import { getDatabase, ref, query, orderByChild, limitToLast, onValue, off, push, update, get, DatabaseReference } from "firebase/database";

// Configuration Firebase depuis le fichier HTML
const firebaseConfig = {
  apiKey: "AIzaSyDHA87Tzxk9SMFGcHlhvx3Qmj6LUElPjJM",
  authDomain: "market-94bd8.firebaseapp.com",
  databaseURL: "https://market-94bd8-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "market-94bd8",
  storageBucket: "market-94bd8.firebasestorage.app",
  messagingSenderId: "641440139975",
  appId: "1:641440139975:web:ad794e3e7c0b151dd98ce2",
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Types de données
export interface User {
  uid: string;
  name: string;
  phone: string;
  pass: string;
  avatar?: string;
  bio?: string;
  country?: string;
  city?: string;
  verified?: boolean;
  createdAt: number;
}

export interface JobPost {
  id: string;
  type: "job" | "formation" | "financement" | "partenariat" | "service";
  domain?: string;
  title: string;
  desc: string;
  skills?: string[];
  price?: number;
  city?: string;
  wa?: string;
  user: { name: string; avatar: string; city?: string };
  authorUid: string;
  premium?: boolean;
  likedBy?: Record<string, boolean>;
  createdAt: number;
}

export interface Video {
  id: string;
  title: string;
  desc?: string;
  videoUrl: string;
  authorUid: string;
  auteur: string;
  authorAvatar?: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  createdAt: number;
}

export interface Post {
  id: string;
  type: "text" | "photo" | "video" | "opportunity";
  titre?: string;
  desc?: string;
  text?: string;
  photoUrls?: string[];
  auteur: string;
  authorUid: string;
  authorAvatar?: string;
  likes: number;
  shares: number;
  createdAt: number;
  verified?: boolean;
}

export interface Story {
  id: string;
  authorUid: string;
  auteur: string;
  authorAvatar?: string;
  photoUrl: string;
  createdAt: number;
  expiresAt: number;
}

// ═══════════════════════════════════════
// OPPORTUNITÉS (Job Posts)
// ═══════════════════════════════════════

export async function fetchJobPosts(limit: number = 200): Promise<JobPost[]> {
  try {
    const dbRef = ref(db, "jobPosts");
    const q = query(dbRef, orderByChild("createdAt"), limitToLast(limit));
    const snapshot = await get(q);

    if (!snapshot.exists()) return [];

    const data = snapshot.val();
    return Object.keys(data)
      .map((key) => ({
        id: key,
        ...data[key],
      }))
      .reverse();
  } catch (error) {
    console.error("Error fetching job posts:", error);
    return [];
  }
}

export function subscribeToJobPosts(
  callback: (posts: JobPost[]) => void,
  limit: number = 200
) {
  const dbRef = ref(db, "jobPosts");
  const q = query(dbRef, orderByChild("createdAt"), limitToLast(limit));

  const unsubscribe = onValue(q, (snapshot: any) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const data = snapshot.val();
    const posts = Object.keys(data)
      .map((key) => ({
        id: key,
        ...data[key],
      }))
      .reverse();

    callback(posts);
  });

  return unsubscribe;
}

// ═══════════════════════════════════════
// VIDÉOS
// ═══════════════════════════════════════

export async function fetchVideos(limit: number = 30): Promise<Video[]> {
  try {
    const dbRef = ref(db, "videos");
    const q = query(dbRef, orderByChild("createdAt"), limitToLast(limit));
    const snapshot = await get(q);

    if (!snapshot.exists()) return [];

    const data = snapshot.val();
    return Object.keys(data)
      .map((key) => ({
        id: key,
        ...data[key],
      }))
      .reverse();
  } catch (error) {
    console.error("Error fetching videos:", error);
    return [];
  }
}

export function subscribeToVideos(
  callback: (videos: Video[]) => void,
  limit: number = 30
) {
  const dbRef = ref(db, "videos");
  const q = query(dbRef, orderByChild("createdAt"), limitToLast(limit));

  const unsubscribe = onValue(q, (snapshot: any) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const data = snapshot.val();
    const videos = Object.keys(data)
      .map((key) => ({
        id: key,
        ...data[key],
      }))
      .reverse();

    callback(videos);
  });

  return unsubscribe;
}

// ═══════════════════════════════════════
// POSTS
// ═══════════════════════════════════════

export async function fetchPosts(limit: number = 60): Promise<Post[]> {
  try {
    const dbRef = ref(db, "posts");
    const q = query(dbRef, orderByChild("createdAt"), limitToLast(limit));
    const snapshot = await get(q);

    if (!snapshot.exists()) return [];

    const data = snapshot.val();
    return Object.keys(data)
      .map((key) => ({
        id: key,
        ...data[key],
      }))
      .reverse();
  } catch (error) {
    console.error("Error fetching posts:", error);
    return [];
  }
}

export function subscribeToPosts(
  callback: (posts: Post[]) => void,
  limit: number = 60
) {
  const dbRef = ref(db, "posts");
  const q = query(dbRef, orderByChild("createdAt"), limitToLast(limit));

  const unsubscribe = onValue(q, (snapshot: any) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const data = snapshot.val();
    const posts = Object.keys(data)
      .map((key) => ({
        id: key,
        ...data[key],
      }))
      .reverse();

    callback(posts);
  });

  return unsubscribe;
}

// ═══════════════════════════════════════
// UTILISATEURS
// ═══════════════════════════════════════

export async function fetchUser(uid: string): Promise<User | null> {
  try {
    const dbRef = ref(db, `users/${uid}`);
    const snapshot = await get(dbRef);

    if (!snapshot.exists()) return null;

    return {
      uid,
      ...snapshot.val(),
    };
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

export async function updateUser(uid: string, data: Partial<User>): Promise<void> {
  try {
    const dbRef = ref(db, `users/${uid}`);
    await update(dbRef, data);
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
}

// ═══════════════════════════════════════
// AUTHENTIFICATION
// ═══════════════════════════════════════

export async function registerUser(
  name: string,
  phone: string,
  pass: string
): Promise<User> {
  try {
    // Vérifier si le numéro existe déjà
    const usersRef = ref(db, "users");
    const snapshot = await get(usersRef);

    if (snapshot.exists()) {
      const users = snapshot.val();
      for (const uid in users) {
        if (users[uid].phone === phone) {
          throw new Error("Numéro déjà utilisé");
        }
      }
    }

    // Créer le nouvel utilisateur
    const uid = `u_${Date.now()}`;
    const user: User = {
      uid,
      name,
      phone,
      pass,
      avatar: "",
      bio: "Créateur de contenu africain 🌍",
      createdAt: Date.now(),
    };

    const dbRef = ref(db, `users/${uid}`);
    await update(dbRef, user);

    return user;
  } catch (error) {
    console.error("Error registering user:", error);
    throw error;
  }
}

export async function loginUser(phone: string, pass: string): Promise<User> {
  try {
    const usersRef = ref(db, "users");
    const snapshot = await get(usersRef);

    if (!snapshot.exists()) {
      throw new Error("Numéro introuvable");
    }

    const users = snapshot.val();
    for (const uid in users) {
      if (users[uid].phone === phone && users[uid].pass === pass) {
        return {
          uid,
          ...users[uid],
        };
      }
    }

    throw new Error("Mot de passe incorrect");
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  }
}

// ═══════════════════════════════════════
// LIKES
// ═══════════════════════════════════════

export async function togglePostLike(postId: string, uid: string): Promise<void> {
  try {
    const dbRef = ref(db, `posts/${postId}/likes`);
    const snapshot = await get(dbRef);
    const currentLikes = snapshot.val() || 0;

    await update(dbRef, currentLikes + 1);
  } catch (error) {
    console.error("Error toggling like:", error);
    throw error;
  }
}

// ═══════════════════════════════════════
// COMMENTAIRES
// ═══════════════════════════════════════

export function subscribeToComments(
  postId: string,
  callback: (comments: any[]) => void
) {
  const dbRef = ref(db, `comments/${postId}`);
  const q = query(dbRef, orderByChild("at"));

  const unsubscribe = onValue(q, (snapshot: any) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const data = snapshot.val();
    const comments = Object.keys(data).map((key) => ({
      id: key,
      ...data[key],
    }));

    callback(comments);
  });

  return unsubscribe;
}

export async function addComment(
  postId: string,
  uid: string,
  text: string,
  authorName: string
): Promise<void> {
  try {
    const commentsRef = ref(db, `comments/${postId}`);
    await push(commentsRef, {
      uid,
      text,
      auteur: authorName,
      at: Date.now(),
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    throw error;
  }
}

export default db;
