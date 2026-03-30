export interface TeamStats {
  id: string;
  label: string;
  value: string;
  icon: string;
}

export interface Player {
  id: string;
  name: string;
  role: string;
  img: string;
  twitter?: string;
  twitch?: string;
  instagram?: string;
}

export interface Achievement {
  id: string;
  year: string;
  title: string;
  rank: string;
  prize: string;
}

export interface Match {
  id: string;
  opponent: string;
  game: string;
  date: string;
  time: string;
  is_live: boolean;
}

export interface SiteConfig {
  id: string;
  hero_title_top: string;
  hero_title_bottom: string;
  hero_description: string;
  hero_image: string;
}
