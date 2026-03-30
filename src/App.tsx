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
  X
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { getSupabase } from "./lib/supabase";
import { SiteConfig, TeamStats, Player, Achievement, Match } from "./types";

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
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
  const [stats, setStats] = useState<TeamStats[]>(DEFAULT_STATS);
  const [roster, setRoster] = useState<Player[]>(DEFAULT_ROSTER);
  const [achievements, setAchievements] = useState<Achievement[]>(DEFAULT_ACHIEVEMENTS);
  const [matches, setMatches] = useState<Match[]>(DEFAULT_MATCHES);
  const [loading, setLoading] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const supabase = getSupabase();

  useEffect(() => {
    if (supabase) {
      fetchData();
      
      // Set up real-time subscriptions
      const configSub = supabase.channel('site_config').on('postgres_changes', { event: '*', schema: 'public', table: 'site_config' }, fetchData).subscribe();
      const statsSub = supabase.channel('team_stats').on('postgres_changes', { event: '*', schema: 'public', table: 'team_stats' }, fetchData).subscribe();
      const rosterSub = supabase.channel('roster').on('postgres_changes', { event: '*', schema: 'public', table: 'roster' }, fetchData).subscribe();
      const achievementsSub = supabase.channel('achievements').on('postgres_changes', { event: '*', schema: 'public', table: 'achievements' }, fetchData).subscribe();
      const matchesSub = supabase.channel('matches').on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, fetchData).subscribe();

      return () => {
        supabase.removeChannel(configSub);
        supabase.removeChannel(statsSub);
        supabase.removeChannel(rosterSub);
        supabase.removeChannel(achievementsSub);
        supabase.removeChannel(matchesSub);
      };
    } else {
      setLoading(false);
    }
  }, []);

  const fetchData = async () => {
    if (!supabase) return;
    try {
      const { data: configData } = await supabase.from('site_config').select('*').single();
      if (configData) setConfig(configData);

      const { data: statsData } = await supabase.from('team_stats').select('*').order('id');
      if (statsData) setStats(statsData);

      const { data: rosterData } = await supabase.from('roster').select('*').order('id');
      if (rosterData) setRoster(rosterData);

      const { data: achievementsData } = await supabase.from('achievements').select('*').order('year', { ascending: false });
      if (achievementsData) setAchievements(achievementsData);

      const { data: matchesData } = await supabase.from('matches').select('*').order('date');
      if (matchesData) setMatches(matchesData);
    } catch (error) {
      console.error("Error fetching data from Supabase:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (newConfig: Partial<SiteConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    if (supabase) await supabase.from('site_config').upsert(updated);
  };

  const updateStat = async (id: string, updates: Partial<TeamStats>) => {
    const updated = stats.map(s => s.id === id ? { ...s, ...updates } : s);
    setStats(updated);
    if (supabase) await supabase.from('team_stats').update(updates).eq('id', id);
  };

  const addPlayer = async () => {
    const newPlayer = { name: "New Player", role: "Role", img: "https://picsum.photos/seed/new/400/500" };
    if (supabase) {
      const { data } = await supabase.from('roster').insert(newPlayer).select().single();
      if (data) setRoster([...roster, data]);
    }
  };

  const deletePlayer = async (id: string) => {
    setRoster(roster.filter(p => p.id !== id));
    if (supabase) await supabase.from('roster').delete().eq('id', id);
  };

  const updatePlayer = async (id: string, updates: Partial<Player>) => {
    const updated = roster.map(p => p.id === id ? { ...p, ...updates } : p);
    setRoster(updated);
    if (supabase) await supabase.from('roster').update(updates).eq('id', id);
  };

  const addAchievement = async () => {
    const newAch = { year: "2026", title: "New Achievement", rank: "1st", prize: "$0" };
    if (supabase) {
      const { data } = await supabase.from('achievements').insert(newAch).select().single();
      if (data) setAchievements([...achievements, data]);
    }
  };

  const updateAchievement = async (id: string, updates: Partial<Achievement>) => {
    const updated = achievements.map(a => a.id === id ? { ...a, ...updates } : a);
    setAchievements(updated);
    if (supabase) await supabase.from('achievements').update(updates).eq('id', id);
  };

  const deleteAchievement = async (id: string) => {
    setAchievements(achievements.filter(a => a.id !== id));
    if (supabase) await supabase.from('achievements').delete().eq('id', id);
  };

  const addMatch = async () => {
    const newMatch = { opponent: "Opponent", game: "Game", date: "2026-12-31", time: "00:00", is_live: false };
    if (supabase) {
      const { data } = await supabase.from('matches').insert(newMatch).select().single();
      if (data) setMatches([...matches, data]);
    }
  };

  const updateMatch = async (id: string, updates: Partial<Match>) => {
    const updated = matches.map(m => m.id === id ? { ...m, ...updates } : m);
    setMatches(updated);
    if (supabase) await supabase.from('matches').update(updates).eq('id', id);
  };

  const deleteMatch = async (id: string) => {
    setMatches(matches.filter(m => m.id !== id));
    if (supabase) await supabase.from('matches').delete().eq('id', id);
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#020617] text-white font-sans selection:bg-amber-500/30 selection:text-amber-200 overflow-x-hidden">
      {/* Admin Toggle */}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-4">
        <button 
          onClick={() => setIsAdmin(!isAdmin)}
          className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform group"
          title="Admin Panel"
        >
          {isAdmin ? <X className="text-black" /> : <Settings className="text-black group-hover:rotate-90 transition-transform" />}
        </button>
      </div>

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
