import React, { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Film, Image as ImageIcon, Heart, MessageCircle, Share2, Plus, Send, X, Clock, User } from "lucide-react";
import { authenticatedFetch, resolveApiUrl } from "../lib/apiClient";

interface MomentsViewProps {
  user: any;
  posts: any[];
  setPosts: React.Dispatch<React.SetStateAction<any[]>>;
  stories: any[];
  onOpenStoryCreator: () => void;
  onOpenStoryViewer?: (storyId: string) => void;
  onOpenReels: () => void;
  onOpenUploadReel: () => void;
  goBack: () => void;
  openComposerSignal?: number;
  onComposerSignalConsumed?: () => void;
}

const mediaTypeForFile = (file: File) => file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "";

export const MomentsView: React.FC<MomentsViewProps> = ({
  user, posts, setPosts, stories, onOpenStoryCreator, onOpenStoryViewer, onOpenReels, onOpenUploadReel, goBack, openComposerSignal = 0, onComposerSignalConsumed
}) => {
  const [tab, setTab] = useState<"all" | "posts" | "stories" | "reels">("all");
  const [composerOpen, setComposerOpen] = useState(false);
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => { if (preview.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    if (openComposerSignal > 0) { setComposerOpen(true); onComposerSignalConsumed?.(); }
  }, [openComposerSignal, onComposerSignalConsumed]);

  const visiblePosts = useMemo(() => {
    const list = Array.isArray(posts) ? posts : [];
    if (tab === "posts" || tab === "all") return list;
    return [];
  }, [posts, tab]);

  const chooseFile = (file?: File | null) => {
    if (!file) return;
    if (mediaTypeForFile(file) !== "image") {
      alert("Posts currently support photos. For videos, use Upload Reel.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      alert("Photo must be 15 MB or smaller.");
      return;
    }
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const publishPost = async () => {
    if (!text.trim() && !selectedFile) {
      alert("Write something or add a photo first.");
      return;
    }
    setSaving(true);
    try {
      const form = new FormData();
      form.append("caption", text.trim());
      form.append("username", user.username || "");
      form.append("fullName", user.fullName || user.username || "Pardais User");
      form.append("userId", user.uniqueId || user.uid || "");
      form.append("avatar", user.avatar || "");
      if (selectedFile) form.append("media", selectedFile);

      const response = await authenticatedFetch(resolveApiUrl("/api/v1/posts"), { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.post) throw new Error(data?.error || "Post publish failed.");
      setPosts(prev => [data.post, ...prev.filter(p => p?.id !== data.post.id)]);
      setText("");
      setSelectedFile(null);
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
      setPreview("");
      setComposerOpen(false);
    } catch (err: any) {
      alert(err?.message || "Could not publish post. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const likePost = async (post: any) => {
    const liked = Array.isArray(post.likedBy) && post.likedBy.includes(user.username);
    setPosts(prev => prev.map(p => p.id === post.id ? {
      ...p,
      likes: Math.max(0, Number(p.likes || 0) + (liked ? -1 : 1)),
      likedBy: liked ? (p.likedBy || []).filter((u: string) => u !== user.username) : [...(p.likedBy || []), user.username]
    } : p));
    try {
      await authenticatedFetch(resolveApiUrl(`/api/v1/posts/${encodeURIComponent(post.id)}/like`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: user.username }) });
    } catch { /* optimistic UI remains; next sync reconciles */ }
  };

  return (
    <div className="flex-1 min-h-0 bg-[#0b0b14] text-white flex flex-col overflow-hidden">
      <header className="shrink-0 px-3 pt-3 pb-2 bg-[#0b0b14]/95 backdrop-blur-xl border-b border-white/10 z-20">
        <div className="flex items-center justify-between">
          <button onClick={goBack} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"><X className="w-4 h-4" /></button>
          <div className="text-center"><h2 className="text-base font-black tracking-wide">Moments</h2><p className="text-[8px] text-gray-500">Posts • Stories • Reels</p></div>
          <button onClick={() => setComposerOpen(true)} className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff007f] to-[#7b2cbf] flex items-center justify-center"><Plus className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-4 gap-1 mt-3 bg-[#151522] rounded-xl p-1">
          {([["all","All"],["posts","Posts"],["stories","Stories"],["reels","Reels"]] as const).map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} className={`py-2 rounded-lg text-[9px] font-black ${tab === id ? "bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] text-white" : "text-gray-400"}`}>{label}</button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {tab === "all" || tab === "stories" ? (
          <section>
            <div className="flex items-center justify-between mb-2"><h3 className="text-xs font-black">Stories</h3><button onClick={onOpenStoryCreator} className="text-[8px] text-pink-400 font-black">CREATE STORY</button></div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button onClick={onOpenStoryCreator} className="shrink-0 w-20 h-28 rounded-xl border border-pink-500/30 bg-gradient-to-b from-[#25162f] to-[#11111a] flex flex-col items-center justify-center gap-2"><Plus className="w-5 h-5 text-pink-400"/><span className="text-[8px] font-bold">Your Story</span></button>
              {stories.filter((s: any) => Number(s.expiresAt || 0) > Date.now()).slice(0, 15).map((s: any) => (
                <button type="button" key={s.id} onClick={() => onOpenStoryViewer?.(String(s.id))} className="shrink-0 w-20 h-28 rounded-xl overflow-hidden border border-white/10 relative bg-[#151522] text-left">
                  {s.type === "photo" && s.content ? <img src={s.content} className="absolute inset-0 w-full h-full object-cover" /> : s.type === "video" && s.content ? <video src={s.content} className="absolute inset-0 w-full h-full object-cover" muted playsInline /> : <div className={`absolute inset-0 bg-gradient-to-br ${s.bgColor || "from-pink-500 to-purple-700"} p-2 flex items-center justify-center text-center text-[9px] font-bold`}>{s.content}</div>}
                  <div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-black to-transparent"><span className="text-[7px] font-black truncate block">{s.fullName || s.username}</span></div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {tab === "all" || tab === "posts" ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between"><h3 className="text-xs font-black">Latest Posts</h3><button onClick={() => setComposerOpen(true)} className="text-[8px] text-cyan-300 font-black">CREATE POST</button></div>
            {visiblePosts.length === 0 ? <div className="rounded-2xl border border-white/10 bg-[#12121c] p-8 text-center text-gray-500 text-[10px]">No posts yet. Be the first to share a photo or thought.</div> : visiblePosts.map((post: any) => {
              const liked = Array.isArray(post.likedBy) && post.likedBy.includes(user.username);
              return <article key={post.id} className="rounded-2xl overflow-hidden border border-white/10 bg-[#12121c] shadow-lg">
                <div className="p-3 flex items-center gap-2"><img src={post.avatar || user.avatar} className="w-8 h-8 rounded-full object-cover border border-pink-500/40"/><div className="flex-1"><div className="text-[10px] font-black">{post.fullName || post.username}</div><div className="text-[7px] text-gray-500">@{post.username} • {post.createdAt ? new Date(post.createdAt).toLocaleString() : "Just now"}</div></div></div>
                {post.caption && <p className="px-3 pb-3 text-[10px] text-gray-200 leading-relaxed whitespace-pre-wrap">{post.caption}</p>}
                {post.mediaUrl && <img src={post.mediaUrl} className="w-full max-h-[430px] object-cover bg-black" loading="lazy" alt="Post" />}
                <div className="p-2 flex items-center gap-4 border-t border-white/5"><button onClick={() => likePost(post)} className={`flex items-center gap-1 text-[9px] font-bold ${liked ? "text-pink-400" : "text-gray-400"}`}><Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />{post.likes || 0}</button><button className="flex items-center gap-1 text-[9px] text-gray-400"><MessageCircle className="w-4 h-4"/>{post.comments?.length || 0}</button><button className="flex items-center gap-1 text-[9px] text-gray-400"><Share2 className="w-4 h-4"/>Share</button></div>
              </article>;
            })}
          </section>
        ) : null}

        {tab === "reels" && <section className="rounded-2xl border border-pink-500/20 bg-[#12121c] p-5 text-center"><Film className="w-10 h-10 text-pink-400 mx-auto mb-3"/><h3 className="text-sm font-black">Moments Reels</h3><p className="text-[9px] text-gray-500 mt-1 mb-4">Your existing Reels system stays unchanged.</p><button onClick={onOpenReels} className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[9px] font-black">OPEN REELS</button><button onClick={onOpenUploadReel} className="ml-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black">UPLOAD REEL</button></section>}
      </div>

      {composerOpen && <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end">
        <div className="w-full bg-[#12121d] rounded-t-3xl border-t border-pink-500/30 p-4 space-y-3 max-h-[82%] overflow-y-auto">
          <div className="flex items-center justify-between"><div><h3 className="text-sm font-black">Create Post</h3><p className="text-[8px] text-gray-500">Share a photo or write something.</p></div><button onClick={() => setComposerOpen(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><X className="w-4 h-4"/></button></div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="What's on your mind?" className="w-full h-24 resize-none rounded-2xl bg-[#0b0b14] border border-white/10 p-3 text-[10px] text-white outline-none focus:border-pink-500/50" />
          {preview && <div className="relative rounded-2xl overflow-hidden border border-white/10"><img src={preview} className="w-full max-h-64 object-cover"/><button onClick={() => { if (preview.startsWith("blob:")) URL.revokeObjectURL(preview); setPreview(""); setSelectedFile(null); }} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center"><X className="w-3.5 h-3.5"/></button></div>}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => chooseFile(e.target.files?.[0])}/>
          <div className="grid grid-cols-3 gap-2"><button onClick={() => fileRef.current?.click()} className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-center gap-2 text-[9px] font-black"><ImageIcon className="w-4 h-4 text-cyan-300"/>Photo</button><button onClick={() => { setComposerOpen(false); onOpenStoryCreator(); }} className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-center gap-2 text-[9px] font-black"><Camera className="w-4 h-4 text-pink-400"/>Story</button><button onClick={() => { setComposerOpen(false); onOpenUploadReel(); }} className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center justify-center gap-2 text-[9px] font-black"><Film className="w-4 h-4 text-purple-400"/>Reel</button></div>
          <button disabled={saving} onClick={publishPost} className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#ff007f] to-[#7b2cbf] text-white text-[10px] font-black flex items-center justify-center gap-2 disabled:opacity-50"><Send className="w-4 h-4"/>{saving ? "Publishing…" : "Publish Post"}</button>
        </div>
      </div>}
    </div>
  );
};
