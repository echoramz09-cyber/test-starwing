/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { 
  Trophy, 
  Users, 
  Calendar, 
  Twitter, 
  Instagram, 
  Youtube, 
  Twitch,
  ChevronRight,
  Gamepad2,
  Target,
  Zap,
  Sword,
  Settings,
  Plus,
  Trash2,
  X,
  LogIn,
  LogOut,
  Rocket
} from "lucide-react";
import React, { useRef, useState, useEffect, Component, ErrorInfo, ReactNode } from "react";
import { db, auth } from "./firebase";
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  query,
  orderBy,
  getDoc,
  getDocFromServer
} from "firebase/firestore";
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from "firebase/auth";
import { SiteConfig, TeamStats, Player, Achievement, Match } from "./types";

// Error Handling Spec for Firestore Operations
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Error Boundary Component
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    const { hasError, error } = this.state;
    if (hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(error?.message || "{}");
        if (parsed.error) {
          errorMessage = `Database Error: ${parsed.error} (${parsed.operationType} on ${parsed.path})`;
        }
      } catch (e) {
        errorMessage = error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/50 rounded-2xl p-8 shadow-2xl">
            <X className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-white mb-4">Application Error</h1>
            <p className="text-slate-400 mb-8">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-xl transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const GOLDEN = "#FFD700";
const DEEP_BLUE = "#0A192F";

// Fallback data in case Supabase is not configured yet
const DEFAULT_CONFIG: SiteConfig = {
  id: "1",
  hero_title_top: "Rise of the",
  hero_title_bottom: "Starwing",
  hero_description: "Forged in the fires of competition, Starwing Empire is more than a team. We are a legacy of precision, strategy, and absolute dominance in the global eSports landscape.",
  hero_image: "https://picsum.photos/seed/gaming/800/800"
};

const DEFAULT_STATS: TeamStats[] = [
  { id: "1", label: "Tournaments Won", value: "42", icon: "Trophy" },
  { id: "2", label: "Active Players", value: "15", icon: "Users" },
  { id: "3", label: "Global Ranking", value: "#03", icon: "Target" },
  { id: "4", label: "Win Rate", value: "89%", icon: "Zap" },
];

const DEFAULT_ROSTER: Player[] = [
  { id: "1", name: "Viper", role: "IGL / Entry Fragger", img: "https://picsum.photos/seed/p1/400/500" },
  { id: "2", name: "Ghost", role: "AWP / Sniper", img: "https://picsum.photos/seed/p2/400/500" },
  { id: "3", name: "Nova", role: "Support / Lurker", img: "https://picsum.photos/seed/p3/400/500" },
];

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: "1", year: "2025", title: "World Tactical Championship", rank: "1st Place", prize: "$500,000" },
  { id: "2", year: "2024", title: "Apex Legends Global Series", rank: "2nd Place", prize: "$250,000" },
];

const DEFAULT_MATCHES: Match[] = [
  { id: "1", opponent: "Shadow Legion", game: "Valorant", date: "Oct 15, 2026", time: "18:00 GMT", is_live: true },
  { id: "2", opponent: "Void Walkers", game: "CS:GO 2", date: "Oct 22, 2026", time: "20:00 GMT", is_live: false },
];

const iconMap: Record<string, any> = {
  Trophy, Users, Target, Zap, Sword, Calendar, Gamepad2
};

export default function App() {
  return (
    <ErrorBoundary>
      <StarwingApp />
    </ErrorBoundary>
  );
}

function StarwingApp() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
  const [stats, setStats] = useState<TeamStats[]>(DEFAULT_STATS);
  const [roster, setRoster] = useState<Player[]>(DEFAULT_ROSTER);
  const [achievements, setAchievements] = useState<Achievement[]>(DEFAULT_ACHIEVEMENTS);
  const [matches, setMatches] = useState<Match[]>(DEFAULT_MATCHES);
  const [loading, setLoading] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);

  // Validate Connection to Firestore
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthReady(true);
      
      if (firebaseUser) {
        // Check if user is admin
        const isAdminEmail = firebaseUser.email === "asxramzonfire09@starwing.com";
        if (isAdminEmail) {
          setIsAdmin(true);
        } else {
          try {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists() && userDoc.data().role === 'admin') {
              setIsAdmin(true);
            } else {
              setIsAdmin(false);
            }
          } catch (e) {
            setIsAdmin(false);
          }
        }
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let configLoaded = false;
    let statsLoaded = false;
    let rosterLoaded = false;
    let achievementsLoaded = false;
    let matchesLoaded = false;

    const checkLoaded = () => {
      if (configLoaded && statsLoaded && rosterLoaded && achievementsLoaded && matchesLoaded) {
        setLoading(false);
      }
    };

    const unsubConfig = onSnapshot(collection(db, 'site_config'), (snapshot) => {
      if (!snapshot.empty) {
        setConfig(snapshot.docs[0].data() as SiteConfig);
      }
      configLoaded = true;
      checkLoaded();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'site_config');
      configLoaded = true;
      checkLoaded();
    });

    const unsubStats = onSnapshot(query(collection(db, 'team_stats'), orderBy('id')), (snapshot) => {
      if (!snapshot.empty) {
        setStats(snapshot.docs.map(doc => doc.data() as TeamStats));
      }
      statsLoaded = true;
      checkLoaded();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'team_stats');
      statsLoaded = true;
      checkLoaded();
    });

    const unsubRoster = onSnapshot(query(collection(db, 'roster'), orderBy('id')), (snapshot) => {
      if (!snapshot.empty) {
        setRoster(snapshot.docs.map(doc => doc.data() as Player));
      }
      rosterLoaded = true;
      checkLoaded();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'roster');
      rosterLoaded = true;
      checkLoaded();
    });

    const unsubAchievements = onSnapshot(query(collection(db, 'achievements'), orderBy('year', 'desc')), (snapshot) => {
      if (!snapshot.empty) {
        setAchievements(snapshot.docs.map(doc => doc.data() as Achievement));
      }
      achievementsLoaded = true;
      checkLoaded();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'achievements');
      achievementsLoaded = true;
      checkLoaded();
    });

    const unsubMatches = onSnapshot(query(collection(db, 'matches'), orderBy('date')), (snapshot) => {
      if (!snapshot.empty) {
        setMatches(snapshot.docs.map(doc => doc.data() as Match));
      }
      matchesLoaded = true;
      checkLoaded();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'matches');
      matchesLoaded = true;
      checkLoaded();
    });

    // Fallback if some collections are empty or fail
    const timeout = setTimeout(() => setLoading(false), 2000);

    return () => {
      unsubConfig();
      unsubStats();
      unsubRoster();
      unsubAchievements();
      unsubMatches();
      clearTimeout(timeout);
    };
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    
    const username = loginForm.username.trim();
    const password = loginForm.password;
    const email = `${username}@starwing.com`;
    
    // Check if these are the master admin credentials
    const isMasterAdmin = username === "asxramzonfire09" && password === "rehanabegum123";
    
    try {
      // Try to sign in
      await signInWithEmailAndPassword(auth, email, password);
      setShowLoginModal(false);
      setLoginForm({ username: "", password: "" });
    } catch (error: any) {
      console.error("Login attempt failed:", error.code);
      
      // If user doesn't exist and it's the master admin, create the account silently
      if ((error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') && isMasterAdmin) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          // Set the admin role in Firestore
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            email: email,
            role: 'admin'
          });
          setShowLoginModal(false);
          setLoginForm({ username: "", password: "" });
          return;
        } catch (createError: any) {
          if (createError.code === 'auth/operation-not-allowed') {
            setLoginError("Please enable 'Email/Password' in your Firebase Console (Authentication > Sign-in method).");
          } else {
            setLoginError("System error during first-time setup. Please try again.");
          }
          return;
        }
      }

      if (error.code === 'auth/operation-not-allowed') {
        setLoginError("Please enable 'Email/Password' in your Firebase Console (Authentication > Sign-in method).");
      } else {
        setLoginError("Invalid username or password. Please try again.");
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const updateConfig = async (newConfig: Partial<SiteConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    if (isAdmin) {
      try {
        await setDoc(doc(db, 'site_config', config.id || '1'), updated);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `site_config/${config.id}`);
      }
    }
  };

  const updateStat = async (id: string, updates: Partial<TeamStats>) => {
    const updated = stats.map(s => s.id === id ? { ...s, ...updates } : s);
    setStats(updated);
    if (isAdmin) {
      try {
        await updateDoc(doc(db, 'team_stats', id), updates);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `team_stats/${id}`);
      }
    }
  };

  const addPlayer = async () => {
    if (!isAdmin) return;
    const newId = Math.random().toString(36).substr(2, 9);
    const newPlayer = { id: newId, name: "New Player", role: "Role", img: "https://picsum.photos/seed/new/400/500" };
    try {
      await setDoc(doc(db, 'roster', newId), newPlayer);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'roster');
    }
  };

  const deletePlayer = async (id: string) => {
    if (!isAdmin) return;
    setRoster(roster.filter(p => p.id !== id));
    try {
      await deleteDoc(doc(db, 'roster', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `roster/${id}`);
    }
  };

  const updatePlayer = async (id: string, updates: Partial<Player>) => {
    const updated = roster.map(p => p.id === id ? { ...p, ...updates } : p);
    setRoster(updated);
    if (isAdmin) {
      try {
        await updateDoc(doc(db, 'roster', id), updates);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `roster/${id}`);
      }
    }
  };

  const addAchievement = async () => {
    if (!isAdmin) return;
    const newId = Math.random().toString(36).substr(2, 9);
    const newAch = { id: newId, year: "2026", title: "New Achievement", rank: "1st", prize: "$0" };
    try {
      await setDoc(doc(db, 'achievements', newId), newAch);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'achievements');
    }
  };

  const updateAchievement = async (id: string, updates: Partial<Achievement>) => {
    const updated = achievements.map(a => a.id === id ? { ...a, ...updates } : a);
    setAchievements(updated);
    if (isAdmin) {
      try {
        await updateDoc(doc(db, 'achievements', id), updates);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `achievements/${id}`);
      }
    }
  };

  const deleteAchievement = async (id: string) => {
    if (!isAdmin) return;
    setAchievements(achievements.filter(a => a.id !== id));
    try {
      await deleteDoc(doc(db, 'achievements', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `achievements/${id}`);
    }
  };

  const addMatch = async () => {
    if (!isAdmin) return;
    const newId = Math.random().toString(36).substr(2, 9);
    const newMatch = { id: newId, opponent: "Opponent", game: "Game", date: "2026-12-31", time: "00:00", is_live: false };
    try {
      await setDoc(doc(db, 'matches', newId), newMatch);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'matches');
    }
  };

  const updateMatch = async (id: string, updates: Partial<Match>) => {
    const updated = matches.map(m => m.id === id ? { ...m, ...updates } : m);
    setMatches(updated);
    if (isAdmin) {
      try {
        await updateDoc(doc(db, 'matches', id), updates);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `matches/${id}`);
      }
    }
  };

  const deleteMatch = async (id: string) => {
    if (!isAdmin) return;
    setMatches(matches.filter(m => m.id !== id));
    try {
      await deleteDoc(doc(db, 'matches', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `matches/${id}`);
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#020617] text-white font-sans selection:bg-amber-500/30 selection:text-amber-200 overflow-x-hidden">
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#020617] z-[500] flex flex-col items-center justify-center"
          >
            <div className="relative mb-12">
              <motion.div 
                animate={{ 
                  y: [0, -10, 0],
                  rotate: [0, 2, -2, 0]
                }}
                transition={{ 
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="relative z-10"
              >
                <Rocket className="w-16 h-16 text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
              </motion.div>
              
              {/* Exhaust Flames */}
              <motion.div 
                animate={{ 
                  scaleY: [1, 1.5, 1],
                  opacity: [0.5, 0.8, 0.5]
                }}
                transition={{ 
                  duration: 0.2,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-4 h-12 bg-gradient-to-t from-transparent via-orange-500 to-amber-500 rounded-full blur-sm"
              />
              
              {/* Particles */}
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    y: [0, 40],
                    x: [0, (i - 2) * 10],
                    opacity: [1, 0],
                    scale: [1, 0]
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: "easeOut"
                  }}
                  className="absolute bottom-0 left-1/2 w-1 h-1 bg-amber-400 rounded-full"
                />
              ))}
            </div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-black uppercase italic tracking-tighter"
            >
              STAR<span className="text-amber-500">WING</span>
            </motion.h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-4 animate-pulse">Igniting Systems...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Toggle */}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-4">
        {user ? (
          <button 
            onClick={logout}
            className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform group"
            title="Logout"
          >
            <LogOut className="text-white" />
          </button>
        ) : (
          <button 
            onClick={() => setShowLoginModal(true)}
            className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform group"
            title="Login as Admin"
          >
            <LogIn className="text-black" />
          </button>
        )}
        {isAdmin && (
          <button 
            onClick={() => setIsAdmin(!isAdmin)}
            className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform group"
            title="Admin Panel"
          >
            {isAdmin ? <X className="text-black" /> : <Settings className="text-black group-hover:rotate-90 transition-transform" />}
          </button>
        )}
      </div>

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowLoginModal(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-white"
              >
                <X />
              </button>
              
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                  <Sword className="text-black w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black uppercase italic">Admin <span className="text-amber-500">Access</span></h2>
                <p className="text-slate-400 text-sm mt-2">Enter your credentials to manage the empire.</p>
              </div>

              <form onSubmit={login} className="space-y-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Username</label>
                  <input 
                    type="text"
                    required
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                    placeholder="Enter username"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Password</label>
                  <input 
                    type="password"
                    required
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                    placeholder="Enter password"
                  />
                </div>
                
                {loginError && (
                  <p className="text-red-500 text-xs font-bold text-center">{loginError}</p>
                )}

                <button 
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-widest py-4 rounded-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                >
                  Authorize
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Panel Overlay */}
      <AnimatePresence>
        {isAdmin && (
          <motion.div 
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed top-0 right-0 w-full md:w-[400px] h-full bg-slate-900/95 backdrop-blur-xl z-[90] border-l border-white/10 p-8 overflow-y-auto shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black uppercase italic text-amber-500">Admin Panel</h2>
              <button onClick={() => setIsAdmin(false)} className="text-slate-400 hover:text-white"><X /></button>
            </div>

            <div className="space-y-10">
              {/* Hero Config */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                  <Zap className="w-3 h-3" /> Hero Section
                </h3>
                <div className="space-y-4">
                  <input 
                    value={config.hero_title_top} 
                    onChange={(e) => updateConfig({ hero_title_top: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm"
                    placeholder="Title Top"
                  />
                  <input 
                    value={config.hero_title_bottom} 
                    onChange={(e) => updateConfig({ hero_title_bottom: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm text-amber-500 font-bold"
                    placeholder="Title Bottom"
                  />
                  <textarea 
                    value={config.hero_description} 
                    onChange={(e) => updateConfig({ hero_description: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm h-24"
                    placeholder="Description"
                  />
                  <input 
                    value={config.hero_image} 
                    onChange={(e) => updateConfig({ hero_image: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded p-2 text-xs"
                    placeholder="Hero Image URL"
                  />
                </div>
              </section>

              {/* Stats Config */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                  <Target className="w-3 h-3" /> Stats
                </h3>
                <div className="space-y-4">
                  {stats.map(stat => (
                    <div key={stat.id} className="grid grid-cols-2 gap-2">
                      <input 
                        value={stat.label} 
                        onChange={(e) => updateStat(stat.id, { label: e.target.value })}
                        className="bg-white/5 border border-white/10 rounded p-2 text-xs"
                      />
                      <input 
                        value={stat.value} 
                        onChange={(e) => updateStat(stat.id, { value: e.target.value })}
                        className="bg-white/5 border border-white/10 rounded p-2 text-xs font-bold"
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Roster Config */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Users className="w-3 h-3" /> Roster
                  </h3>
                  <button onClick={addPlayer} className="text-amber-500 hover:text-amber-400"><Plus size={16}/></button>
                </div>
                <div className="space-y-6">
                  {roster.map(player => (
                    <div key={player.id} className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3">
                      <div className="flex justify-between">
                        <input 
                          value={player.name} 
                          onChange={(e) => updatePlayer(player.id, { name: e.target.value })}
                          className="bg-transparent font-bold text-amber-500 focus:outline-none"
                        />
                        <button onClick={() => deletePlayer(player.id)} className="text-red-500/50 hover:text-red-500"><Trash2 size={14}/></button>
                      </div>
                      <input 
                        value={player.role} 
                        onChange={(e) => updatePlayer(player.id, { role: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded p-2 text-xs"
                        placeholder="Role"
                      />
                      <input 
                        value={player.img} 
                        onChange={(e) => updatePlayer(player.id, { img: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded p-2 text-[10px]"
                        placeholder="Image URL"
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Achievements Config */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Trophy className="w-3 h-3" /> Achievements
                  </h3>
                  <button onClick={addAchievement} className="text-amber-500 hover:text-amber-400"><Plus size={16}/></button>
                </div>
                <div className="space-y-4">
                  {achievements.map(ach => (
                    <div key={ach.id} className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-2">
                      <div className="flex gap-2">
                        <input 
                          value={ach.year} 
                          onChange={(e) => updateAchievement(ach.id, { year: e.target.value })}
                          className="w-16 bg-white/5 border border-white/10 rounded p-2 text-xs"
                        />
                        <input 
                          value={ach.title} 
                          onChange={(e) => updateAchievement(ach.id, { title: e.target.value })}
                          className="flex-1 bg-white/5 border border-white/10 rounded p-2 text-xs"
                        />
                        <button onClick={() => deleteAchievement(ach.id)} className="text-red-500/50 hover:text-red-500"><Trash2 size={14}/></button>
                      </div>
                      <div className="flex gap-2">
                        <input 
                          value={ach.rank} 
                          onChange={(e) => updateAchievement(ach.id, { rank: e.target.value })}
                          className="flex-1 bg-white/5 border border-white/10 rounded p-2 text-xs"
                        />
                        <input 
                          value={ach.prize} 
                          onChange={(e) => updateAchievement(ach.id, { prize: e.target.value })}
                          className="flex-1 bg-white/5 border border-white/10 rounded p-2 text-xs text-amber-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Matches Config */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> Matches
                  </h3>
                  <button onClick={addMatch} className="text-amber-500 hover:text-amber-400"><Plus size={16}/></button>
                </div>
                <div className="space-y-4">
                  {matches.map(match => (
                    <div key={match.id} className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-2">
                      <div className="flex justify-between items-center">
                        <input 
                          value={match.opponent} 
                          onChange={(e) => updateMatch(match.id, { opponent: e.target.value })}
                          className="bg-transparent font-bold text-sm focus:outline-none"
                        />
                        <button onClick={() => deleteMatch(match.id)} className="text-red-500/50 hover:text-red-500"><Trash2 size={14}/></button>
                      </div>
                      <input 
                        value={match.game} 
                        onChange={(e) => updateMatch(match.id, { game: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded p-2 text-xs"
                      />
                      <div className="flex gap-2">
                        <input 
                          value={match.date} 
                          onChange={(e) => updateMatch(match.id, { date: e.target.value })}
                          className="flex-1 bg-white/5 border border-white/10 rounded p-2 text-xs"
                        />
                        <input 
                          value={match.time} 
                          onChange={(e) => updateMatch(match.id, { time: e.target.value })}
                          className="flex-1 bg-white/5 border border-white/10 rounded p-2 text-xs"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-xs font-bold uppercase cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={match.is_live} 
                          onChange={(e) => updateMatch(match.id, { is_live: e.target.checked })}
                          className="accent-amber-500"
                        />
                        Live Soon / Now
                      </label>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Light Leaks */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] bg-blue-900/30 blur-[150px] rounded-full" />
        <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] bg-indigo-900/20 blur-[100px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/50 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.5)]">
              <Sword className="text-black w-6 h-6" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase italic">
              Starwing <span className="text-amber-500">Empire</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-widest">
            <a href="#about" className="hover:text-amber-500 transition-colors">About</a>
            <a href="#roster" className="hover:text-amber-500 transition-colors">Roster</a>
            <a href="#achievements" className="hover:text-amber-500 transition-colors">Achievements</a>
            <a href="#matches" className="hover:text-amber-500 transition-colors">Matches</a>
          </div>
          <button className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            Join Empire
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10"
          >
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-1 rounded-full mb-6">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
              <span className="text-blue-400 text-xs font-bold uppercase tracking-widest">Dominating the Arena</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black uppercase italic leading-[0.9] mb-6">
              {config.hero_title_top} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 drop-shadow-sm">
                {config.hero_title_bottom}
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-lg mb-10 leading-relaxed">
              {config.hero_description}
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="group relative bg-amber-500 text-black px-8 py-4 rounded-xl font-black uppercase tracking-widest flex items-center gap-2 overflow-hidden transition-all hover:pr-10">
                <span className="relative z-10">Explore Roster</span>
                <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
              </button>
              <button className="border border-white/10 hover:bg-white/5 px-8 py-4 rounded-xl font-black uppercase tracking-widest transition-all">
                Our Story
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            <div className="relative z-10 aspect-square rounded-3xl overflow-hidden border border-white/10 bg-blue-900/20 backdrop-blur-sm group">
              <img 
                src={config.hero_image} 
                alt="Gaming Setup" 
                className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent" />
              <div className="absolute bottom-8 left-8 right-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-500 font-black text-2xl">#1 GLOBAL</p>
                    <p className="text-sm text-slate-400">Ranked in Tactical Shooters</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                    <Target className="text-amber-500" />
                  </div>
                </div>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 border-t-2 border-r-2 border-amber-500/50" />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 border-b-2 border-l-2 border-amber-500/50" />
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-blue-950/20 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => {
              const Icon = iconMap[stat.icon] || Zap;
              return (
                <motion.div 
                  key={stat.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="text-center"
                >
                  <Icon className="w-8 h-8 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-4xl font-black text-white mb-1">{stat.value}</h3>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">{stat.label}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Roster Section */}
      <section id="roster" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-amber-500 font-black uppercase tracking-widest text-sm mb-4">The Vanguard</h2>
              <h3 className="text-5xl font-black uppercase italic">Active <span className="text-amber-500">Roster</span></h3>
            </div>
            <p className="text-slate-400 max-w-md">
              Meet the elite warriors who represent the Starwing Empire on the global stage. Each a master of their craft.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {roster.map((player, i) => (
              <motion.div 
                key={player.id}
                whileHover={{ y: -10 }}
                className="group relative rounded-2xl overflow-hidden border border-white/10 bg-blue-900/10"
              >
                <div className="aspect-[4/5] overflow-hidden">
                  <img 
                    src={player.img} 
                    alt={player.name} 
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <h4 className="text-3xl font-black uppercase italic group-hover:text-amber-500 transition-colors">{player.name}</h4>
                  <p className="text-amber-500/70 text-sm font-bold uppercase tracking-widest">{player.role}</p>
                  <div className="mt-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Twitter className="w-4 h-4 text-slate-400 hover:text-white cursor-pointer" />
                    <Twitch className="w-4 h-4 text-slate-400 hover:text-white cursor-pointer" />
                    <Instagram className="text-slate-400 hover:text-white cursor-pointer" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Achievements Section */}
      <section id="achievements" className="py-32 px-6 bg-blue-950/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-black uppercase italic mb-4">Hall of <span className="text-amber-500">Fame</span></h2>
            <div className="w-24 h-1 bg-amber-500 mx-auto rounded-full" />
          </div>

          <div className="grid gap-4">
            {achievements.map((ach, i) => (
              <motion.div 
                key={ach.id}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors group"
              >
                <div className="text-amber-500 font-black text-2xl w-20">{ach.year}</div>
                <div className="flex-1 text-center md:text-left">
                  <h4 className="text-xl font-bold uppercase">{ach.title}</h4>
                  <p className="text-slate-500 text-sm">{ach.rank}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-amber-500 font-black">{ach.prize}</span>
                  <Trophy className="w-6 h-6 text-amber-500 group-hover:scale-125 transition-transform" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Matches Section */}
      <section id="matches" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-12">
            <Calendar className="text-amber-500 w-8 h-8" />
            <h3 className="text-4xl font-black uppercase italic">Upcoming <span className="text-amber-500">Battles</span></h3>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {matches.map((match, i) => (
              <div key={match.id} className="p-8 rounded-3xl border border-white/10 bg-gradient-to-br from-blue-900/20 to-transparent backdrop-blur-sm relative overflow-hidden group">
                {match.is_live && (
                  <div className="absolute top-0 right-0 p-4">
                    <div className="bg-red-500 text-[10px] font-black px-2 py-1 rounded uppercase animate-pulse">Live Soon</div>
                  </div>
                )}
                <div className="flex items-center justify-between gap-8">
                  <div className="text-center flex-1">
                    <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Sword className="text-amber-500" />
                    </div>
                    <p className="font-black uppercase tracking-tighter">Starwing</p>
                  </div>
                  <div className="text-4xl font-black italic text-amber-500">VS</div>
                  <div className="text-center flex-1">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Gamepad2 className="text-slate-400" />
                    </div>
                    <p className="font-black uppercase tracking-tighter">{match.opponent}</p>
                  </div>
                </div>
                <div className="mt-8 pt-8 border-t border-white/5 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">{match.game}</p>
                    <p className="text-sm font-bold">{match.date} • {match.time}</p>
                  </div>
                  <button className="text-amber-500 text-xs font-black uppercase tracking-widest hover:underline">Set Reminder</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/10 bg-black">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center">
                <Sword className="text-black w-5 h-5" />
              </div>
              <span className="text-xl font-black tracking-tighter uppercase italic">
                Starwing <span className="text-amber-500">Empire</span>
              </span>
            </div>
            <p className="text-slate-500 max-w-sm mb-8">
              The ultimate destination for competitive excellence. Join the empire and witness the future of eSports.
            </p>
            <div className="flex gap-4">
              {[Twitter, Instagram, Youtube, Twitch].map((Icon, i) => (
                <a key={i} href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-amber-500 hover:text-black transition-all">
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-black uppercase tracking-widest text-sm mb-6">Quick Links</h4>
            <ul className="space-y-4 text-sm text-slate-400 font-bold uppercase tracking-wider">
              <li><a href="#" className="hover:text-amber-500 transition-colors">Home</a></li>
              <li><a href="#roster" className="hover:text-amber-500 transition-colors">Roster</a></li>
              <li><a href="#achievements" className="hover:text-amber-500 transition-colors">Achievements</a></li>
              <li><a href="#matches" className="hover:text-amber-500 transition-colors">Matches</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black uppercase tracking-widest text-sm mb-6">Newsletter</h4>
            <p className="text-xs text-slate-500 mb-4 uppercase font-bold">Get the latest updates</p>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="EMAIL ADDRESS" 
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs w-full focus:outline-none focus:border-amber-500 transition-colors"
              />
              <button className="bg-amber-500 text-black px-4 py-2 rounded-lg font-black text-xs uppercase">Go</button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 text-center text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em]">
          © 2026 Starwing Empire eSports. All Rights Reserved. Designed for Champions.
        </div>
      </footer>
    </div>
  );
}
