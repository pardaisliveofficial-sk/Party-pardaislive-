export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  duration: string;
  category: "Ambient" | "Chill Beats" | "Sufi Chill" | "Electro Pop" | "Instrumental";
  cover: string;
}

export const MOCK_TRACKS: MusicTrack[] = [
  {
    id: "track-1",
    title: "Sufi Mystic Whistle",
    artist: "Dervish Lounge",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    duration: "6:12",
    category: "Sufi Chill",
    cover: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    id: "track-2",
    title: "Pardais Lofi Loop",
    artist: "Pardais Party Beats",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    duration: "7:05",
    category: "Chill Beats",
    cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    id: "track-3",
    title: "Ghazal Instrumental flute",
    artist: "Ustad Flutist",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    duration: "5:44",
    category: "Instrumental",
    cover: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    id: "track-4",
    title: "Bhangra Fusion Synth",
    artist: "DJ Shurba",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    duration: "5:02",
    category: "Electro Pop",
    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    id: "track-5",
    title: "Desi Ambient Sunset",
    artist: "Tabla & Ambient",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    duration: "6:03",
    category: "Ambient",
    cover: "https://images.unsplash.com/photo-1446057032654-9d8885b7518a?auto=format&fit=crop&w=150&h=150&q=80"
  },
  {
    id: "track-6",
    title: "Karachi Neon Nights",
    artist: "Pak Synth Wave",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    duration: "6:33",
    category: "Electro Pop",
    cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=150&h=150&q=80"
  }
];
