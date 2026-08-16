import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

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

export type OpportunityType = "job" | "formation" | "financement" | "partenariat" | "service";

export interface JobPost {
  id: string;
  type: OpportunityType;
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
  videoUrl?: string;
  auteur: string;
  authorUid: string;
  authorAvatar?: string;
  likes: number;
  shares: number;
  createdAt: number;
  verified?: boolean;
}

const STORAGE_KEYS = {
  posts: "kiko.local.posts.v1",
  opportunities: "kiko.local.opportunities.v1",
};

const seedPosts: Post[] = [
  {
    id: "local-demo-post-1",
    type: "video",
    titre: "Bienvenue sur KIKO",
    desc: "Découvre les publications de ta communauté.",
    videoUrl: "",
    auteur: "Khadija",
    authorUid: "local-demo-khadija",
    authorAvatar: "👩",
    likes: 234,
    shares: 12,
    createdAt: 1700000000000,
  },
  {
    id: "local-demo-post-2",
    type: "video",
    titre: "Startup Tech",
    desc: "Les idées locales qui deviennent des projets.",
    videoUrl: "",
    auteur: "Ahmed",
    authorUid: "local-demo-ahmed",
    authorAvatar: "👨",
    likes: 567,
    shares: 34,
    createdAt: 1699999900000,
  },
];

const seedOpportunities: JobPost[] = [
  {
    id: "local-demo-opportunity-1",
    type: "formation",
    domain: "technologie",
    title: "Formation développement web",
    desc: "Une formation pratique pour apprendre les bases du développement web.",
    skills: ["HTML", "CSS", "JavaScript"],
    city: "À distance",
    user: { name: "Khadija", avatar: "👩", city: "À distance" },
    authorUid: "local-demo-khadija",
    premium: false,
    createdAt: 1700000000000,
  },
  {
    id: "local-demo-opportunity-2",
    type: "partenariat",
    domain: "agriculture",
    title: "Partenariat pour projet local",
    desc: "Recherche de partenaires pour développer une initiative communautaire.",
    skills: ["Projet", "Réseau"],
    city: "Dakar",
    user: { name: "Ahmed", avatar: "👨", city: "Dakar" },
    authorUid: "local-demo-ahmed",
    premium: true,
    createdAt: 1699999900000,
  },
];

type Listener<T> = (value: T[]) => void;

const postListeners = new Set<Listener<Post>>();
const opportunityListeners = new Set<Listener<JobPost>>();
let postsCache: Post[] | null = null;
let opportunitiesCache: JobPost[] | null = null;
let postsLoadPromise: Promise<Post[]> | null = null;
let opportunitiesLoadPromise: Promise<JobPost[]> | null = null;

function sortNewest<T extends { createdAt: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.createdAt - a.createdAt);
}

async function readCollection<T>(key: string, seed: T[]): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      await AsyncStorage.setItem(key, JSON.stringify(seed));
      return [...seed];
    }

    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [...seed];
  } catch (error) {
    console.warn(`Impossible de lire le stockage local ${key}`, error);
    return [...seed];
  }
}

async function writeCollection<T>(key: string, items: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(items));
}

export async function getLocalPosts(limit = 60): Promise<Post[]> {
  if (!postsCache) {
    if (!postsLoadPromise) {
      postsLoadPromise = readCollection(STORAGE_KEYS.posts, seedPosts).then((items) => {
        postsCache = sortNewest(items);
        postsLoadPromise = null;
        return postsCache;
      });
    }
    await postsLoadPromise;
  }

  return (postsCache ?? []).slice(0, limit);
}

export async function getLocalOpportunities(limit = 200): Promise<JobPost[]> {
  if (!opportunitiesCache) {
    if (!opportunitiesLoadPromise) {
      opportunitiesLoadPromise = readCollection(STORAGE_KEYS.opportunities, seedOpportunities).then((items) => {
        opportunitiesCache = sortNewest(items);
        opportunitiesLoadPromise = null;
        return opportunitiesCache;
      });
    }
    await opportunitiesLoadPromise;
  }

  return (opportunitiesCache ?? []).slice(0, limit);
}

export async function addLocalPost(post: Omit<Post, "id" | "createdAt"> & Partial<Pick<Post, "id" | "createdAt">>): Promise<Post> {
  const current = await getLocalPosts(1000);
  const saved: Post = {
    ...post,
    id: post.id ?? `local-post-${Date.now()}`,
    createdAt: post.createdAt ?? Date.now(),
  };
  postsCache = sortNewest([saved, ...current.filter((item) => item.id !== saved.id)]);
  await writeCollection(STORAGE_KEYS.posts, postsCache);
  notifyPostListeners();
  return saved;
}

export function subscribeToPosts(callback: Listener<Post>, limit = 60): () => void {
  postListeners.add(callback);
  void getLocalPosts(limit).then((posts) => {
    if (postListeners.has(callback)) callback(posts.slice(0, limit));
  });
  return () => postListeners.delete(callback);
}

export function subscribeToJobPosts(callback: Listener<JobPost>, limit = 200): () => void {
  opportunityListeners.add(callback);
  void getLocalOpportunities(limit).then((opportunities) => {
    if (opportunityListeners.has(callback)) callback(opportunities.slice(0, limit));
  });
  return () => opportunityListeners.delete(callback);
}

export function subscribeToVideos(callback: Listener<Video>, limit = 30): () => void {
  const listener: Listener<Post> = (posts) => {
    const videos = posts
      .filter((post) => post.type === "video")
      .slice(0, limit)
      .map((post): Video => ({
        id: post.id,
        title: post.titre || post.text || "Vidéo",
        desc: post.desc || post.text,
        videoUrl: post.videoUrl || "",
        authorUid: post.authorUid,
        auteur: post.auteur,
        authorAvatar: post.authorAvatar,
        likes: post.likes,
        comments: 0,
        shares: post.shares,
        views: 0,
        createdAt: post.createdAt,
      }));
    callback(videos);
  };

  postListeners.add(listener);
  void getLocalPosts(1000).then(listener);
  return () => postListeners.delete(listener);
}

function notifyPostListeners() {
  void getLocalPosts(1000).then((posts) => {
    postListeners.forEach((listener) => listener(posts.slice(0, 60)));
  });
}

export async function savePickedMediaLocally(media: { uri: string; fileName: string; type: "photo" | "video" }): Promise<string> {
  if (!FileSystem.documentDirectory) {
    throw new Error("Le stockage local de l’application est indisponible.");
  }

  const mediaDirectory = `${FileSystem.documentDirectory}kiko-media/`;
  await FileSystem.makeDirectoryAsync(mediaDirectory, { intermediates: true });

  const extensionFromName = media.fileName.match(/\.[a-zA-Z0-9]+$/)?.[0];
  const fallbackExtension = media.type === "photo" ? ".jpg" : ".mp4";
  const extension = extensionFromName || fallbackExtension;
  const safeBaseName = media.fileName
    .replace(/\.[a-zA-Z0-9]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .slice(0, 60) || media.type;
  const destination = `${mediaDirectory}${Date.now()}-${safeBaseName}${extension}`;

  await FileSystem.copyAsync({ from: media.uri, to: destination });
  return destination;
}

export async function clearLocalDataForDevelopment(): Promise<void> {
  await AsyncStorage.multiRemove([STORAGE_KEYS.posts, STORAGE_KEYS.opportunities]);
  postsCache = null;
  opportunitiesCache = null;
}
