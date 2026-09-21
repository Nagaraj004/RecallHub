import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Category,
  Topic,
  createCategory,
  createTopic,
  listCategories,
  listTopics,
  seedDefaultCategories,
} from "../../api/categories";
import { Knowledge, createKnowledge, listKnowledge, searchKnowledge } from "../../api/knowledge";
import PageTransition from "../../components/common/PageTransition";
import DifficultyRating from "../../components/common/DifficultyRating";
import TiltCard from "../../components/common/TiltCard";
import {
  BookOpen,
  Folder,
  Layers,
  Plus,
  Search,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Star,
  X,
} from "../../components/icons";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  // Mobile Drill-down Navigation State: 'categories' -> 'topics' -> 'knowledge'
  const [mobileView, setMobileView] = useState<"categories" | "topics" | "knowledge">("categories");

  // Tablet Overlay Drawer state for Knowledge items
  const [tabletKnowledgeDrawerOpen, setTabletKnowledgeDrawerOpen] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newTopicName, setNewTopicName] = useState("");
  const [newKnowledgeTitle, setNewKnowledgeTitle] = useState("");
  const [newKnowledgeDifficulty, setNewKnowledgeDifficulty] = useState(3);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Knowledge[] | null>(null);
  const [searching, setSearching] = useState(false);

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);

  const navigate = useNavigate();

  async function refreshCategories() {
    setLoadingCategories(true);
    try {
      let cats = await listCategories();
      if (cats.length === 0) {
        await seedDefaultCategories();
        cats = await listCategories();
      }
      setCategories(cats);
      if (cats.length > 0 && !selectedCategory) {
        setSelectedCategory(cats[0].id);
      }
    } catch (err) {
      console.error("Failed to list categories:", err);
    } finally {
      setLoadingCategories(false);
    }
  }

  useEffect(() => {
    refreshCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      setLoadingTopics(true);
      listTopics(selectedCategory)
        .then((tops) => {
          setTopics(tops);
          if (tops.length > 0) {
            setSelectedTopic(tops[0].id);
          } else {
            setSelectedTopic(null);
            setKnowledge([]);
          }
        })
        .finally(() => setLoadingTopics(false));
    } else {
      setTopics([]);
      setSelectedTopic(null);
      setKnowledge([]);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedTopic) {
      setLoadingKnowledge(true);
      listKnowledge({ topic_id: selectedTopic })
        .then(setKnowledge)
        .finally(() => setLoadingKnowledge(false));
    } else {
      setKnowledge([]);
    }
  }, [selectedTopic]);

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const cat = await createCategory(newCategoryName.trim());
      setNewCategoryName("");
      const updated = await listCategories();
      setCategories(updated);
      setSelectedCategory(cat.id);
      setMobileView("topics");
    } catch (err) {
      console.error("Failed to add category:", err);
    }
  }

  async function handleAddTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!newTopicName.trim() || !selectedCategory) return;
    try {
      const topic = await createTopic(selectedCategory, newTopicName.trim());
      setNewTopicName("");
      const tops = await listTopics(selectedCategory);
      setTopics(tops);
      setSelectedTopic(topic.id);
      setMobileView("knowledge");
      setTabletKnowledgeDrawerOpen(true);
    } catch (err) {
      console.error("Failed to add topic:", err);
    }
  }

  async function handleAddKnowledge(e: React.FormEvent) {
    e.preventDefault();
    if (!newKnowledgeTitle.trim() || !selectedTopic) return;
    try {
      await createKnowledge({
        topic_id: selectedTopic,
        title: newKnowledgeTitle.trim(),
        difficulty: newKnowledgeDifficulty,
      });
      setNewKnowledgeTitle("");
      setNewKnowledgeDifficulty(3);
      const items = await listKnowledge({ topic_id: selectedTopic });
      setKnowledge(items);
    } catch (err) {
      console.error("Failed to add knowledge:", err);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await searchKnowledge(searchQuery.trim());
      setSearchResults(res);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  }

  const activeCategory = categories.find((c) => c.id === selectedCategory);
  const activeTopic = topics.find((t) => t.id === selectedTopic);

  // Column 1 Component: Categories List
  const categoriesColumn = (
    <div className="glass-panel p-4 flex flex-col h-[560px] border">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5">
          <Folder size={16} className="text-indigo-500 dark:text-indigo-400" />
          <h2 className="font-heading font-semibold text-sm uppercase tracking-wider text-slate-700 dark:text-white/80">
            Categories
          </h2>
        </div>
        <span className="text-xs text-slate-400 dark:text-white/40 font-mono">({categories.length})</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {loadingCategories ? (
          <div className="space-y-2">
            <div className="skeleton-glass h-10 rounded-xl" />
            <div className="skeleton-glass h-10 rounded-xl" />
            <div className="skeleton-glass h-10 rounded-xl" />
          </div>
        ) : (
          categories.map((c) => {
            const isSelected = selectedCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedCategory(c.id);
                  setMobileView("topics");
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-between group ${
                  isSelected
                    ? "bg-brand-500/15 dark:bg-white/15 text-brand-600 dark:text-white border border-brand-500/20 dark:border-white/20 shadow-inner font-semibold"
                    : "text-slate-600 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span className="truncate">{c.name}</span>
                <ChevronRight
                  size={14}
                  className={`transition-transform ${
                    isSelected ? "text-brand-500 dark:text-brand-400 translate-x-0.5" : "text-slate-400 dark:text-white/20 group-hover:text-slate-700 dark:group-hover:text-white/50"
                  }`}
                />
              </button>
            );
          })
        )}
      </div>

      <form onSubmit={handleAddCategory} className="pt-3 border-t border-slate-200/70 dark:border-white/10 mt-2 flex gap-1.5">
        <input
          type="text"
          className="glass-input flex-1 px-2.5 py-1.5 text-xs"
          placeholder="New category..."
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
        />
        <button
          type="submit"
          disabled={!newCategoryName.trim()}
          title="Add Category"
          className="glass-btn-primary p-2 shrink-0 disabled:opacity-40"
        >
          <Plus size={14} />
        </button>
      </form>
    </div>
  );

  // Column 2 Component: Topics List
  const topicsColumn = (
    <div className="glass-panel p-4 flex flex-col h-[560px] border">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5">
          <Layers size={16} className="text-purple-500 dark:text-purple-400" />
          <h2 className="font-heading font-semibold text-sm uppercase tracking-wider text-slate-700 dark:text-white/80">
            Topics
          </h2>
        </div>
        {activeCategory && (
          <span className="text-xs text-brand-600 dark:text-brand-300 font-medium truncate max-w-[120px]">
            {activeCategory.name}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {!selectedCategory ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 dark:text-white/40 text-xs">
            <Folder size={24} className="mb-2 opacity-50" />
            <span>Select a category to view its topics</span>
          </div>
        ) : loadingTopics ? (
          <div className="space-y-2">
            <div className="skeleton-glass h-10 rounded-xl" />
            <div className="skeleton-glass h-10 rounded-xl" />
          </div>
        ) : topics.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 dark:text-white/40 text-xs">
            <Layers size={24} className="mb-2 opacity-50" />
            <span>No topics in this category yet. Add one below!</span>
          </div>
        ) : (
          topics.map((t) => {
            const isSelected = selectedTopic === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedTopic(t.id);
                  setMobileView("knowledge");
                  setTabletKnowledgeDrawerOpen(true);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-between group ${
                  isSelected
                    ? "bg-brand-500/15 dark:bg-white/15 text-brand-600 dark:text-white border border-brand-500/20 dark:border-white/20 shadow-inner font-semibold"
                    : "text-slate-600 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span className="truncate">{t.name}</span>
                <ChevronRight
                  size={14}
                  className={`transition-transform ${
                    isSelected ? "text-brand-500 dark:text-brand-400 translate-x-0.5" : "text-slate-400 dark:text-white/20 group-hover:text-slate-700 dark:group-hover:text-white/50"
                  }`}
                />
              </button>
            );
          })
        )}
      </div>

      {selectedCategory && (
        <form onSubmit={handleAddTopic} className="pt-3 border-t border-slate-200/70 dark:border-white/10 mt-2 flex gap-1.5">
          <input
            type="text"
            className="glass-input flex-1 px-2.5 py-1.5 text-xs"
            placeholder="New topic in category..."
            value={newTopicName}
            onChange={(e) => setNewTopicName(e.target.value)}
          />
          <button
            type="submit"
            disabled={!newTopicName.trim()}
            title="Add Topic"
            className="glass-btn-primary p-2 shrink-0 disabled:opacity-40"
          >
            <Plus size={14} />
          </button>
        </form>
      )}
    </div>
  );

  // Column 3 Component: Knowledge Units List
  const knowledgeColumn = (
    <div className="glass-panel p-4 flex flex-col h-[560px] border">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5">
          <BookOpen size={16} className="text-emerald-500 dark:text-emerald-400" />
          <h2 className="font-heading font-semibold text-sm uppercase tracking-wider text-slate-700 dark:text-white/80">
            Knowledge Items
          </h2>
        </div>
        {activeTopic && (
          <span className="text-xs text-brand-600 dark:text-brand-300 font-medium truncate max-w-[150px]">
            {activeTopic.name}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {!selectedTopic ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 dark:text-white/40 text-xs">
            <Layers size={24} className="mb-2 opacity-50" />
            <span>Select a topic to view its captured knowledge</span>
          </div>
        ) : loadingKnowledge ? (
          <div className="space-y-2.5">
            <div className="skeleton-glass h-16 rounded-xl" />
            <div className="skeleton-glass h-16 rounded-xl" />
            <div className="skeleton-glass h-16 rounded-xl" />
          </div>
        ) : knowledge.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 dark:text-white/40 text-xs">
            <BookOpen size={24} className="mb-2 opacity-50" />
            <span>No knowledge items yet. Add your first concept below!</span>
          </div>
        ) : (
          knowledge.map((k) => (
            <TiltCard
              key={k.id}
              onClick={() => navigate(`/knowledge/${k.id}`)}
              className="glass-card p-3.5 hover:border-brand-500/50 cursor-pointer block group"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xs sm:text-sm font-semibold group-hover:text-brand-500 transition-colors">
                  {k.title}
                </h3>
                <div className="flex items-center gap-1 shrink-0 text-amber-500 dark:text-amber-400 text-[11px]">
                  <Star size={12} className="fill-amber-400 text-amber-500" />
                  <span>{k.difficulty}/5</span>
                </div>
              </div>

              {k.my_understanding && (
                <p className="text-xs text-slate-600 dark:text-white/60 mt-1 line-clamp-2 leading-relaxed">
                  {k.my_understanding}
                </p>
              )}

              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200/60 dark:border-white/[0.07] text-[11px] text-slate-400 dark:text-white/40">
                <span className="capitalize">{k.type || "concept"}</span>
                <span className="text-brand-600 dark:text-brand-300 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Inspect &rarr;
                </span>
              </div>
            </TiltCard>
          ))
        )}
      </div>

      {selectedTopic && (
        <div className="pt-3 border-t border-slate-200/70 dark:border-white/10 mt-2 space-y-2">
          <div className="flex items-center justify-between px-1">
            <DifficultyRating
              value={newKnowledgeDifficulty}
              onChange={setNewKnowledgeDifficulty}
              variant="form"
              size="sm"
            />
          </div>
          <form onSubmit={handleAddKnowledge} className="flex gap-1.5">
            <input
              type="text"
              className="glass-input flex-1 px-2.5 py-1.5 text-xs"
              placeholder="New knowledge item title..."
              value={newKnowledgeTitle}
              onChange={(e) => setNewKnowledgeTitle(e.target.value)}
            />
            <button
              type="submit"
              disabled={!newKnowledgeTitle.trim()}
              title="Add Knowledge Item"
              className="glass-btn-primary px-3 py-1.5 text-xs font-semibold shrink-0 disabled:opacity-40 flex items-center gap-1"
            >
              <Plus size={14} />
              <span>Add</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );

  return (
    <PageTransition className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold">
            Knowledge Vault
          </h1>
          <p className="text-sm text-slate-600 dark:text-white/60 mt-1">
            Hierarchical knowledge browser: Category &rarr; Topic &rarr; Knowledge Unit.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative w-full md:w-80">
          <input
            type="text"
            className="glass-input w-full pl-9 pr-8 py-2 text-xs sm:text-sm"
            placeholder="Search concepts, tags, topics..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!e.target.value.trim()) setSearchResults(null);
            }}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-white/40">
            <Search size={15} />
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSearchResults(null);
              }}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              ×
            </button>
          )}
        </form>
      </div>

      {/* Global Search Results Overlay/View if Active */}
      {searchResults !== null && (
        <div className="glass-panel p-6 border border-brand-400/30 shadow-glow-brand space-y-4 animate-[fadeIn_200ms_ease-out]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search size={18} className="text-brand-500 dark:text-brand-400" />
              <h2 className="font-heading font-bold text-lg">
                Search Results for "{searchQuery}" ({searchResults.length})
              </h2>
            </div>
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchResults(null);
              }}
              className="text-xs text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
            >
              Clear search
            </button>
          </div>

          {searchResults.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-white/50 py-4 text-center">
              No matching knowledge items found. Try another query or keyword.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {searchResults.map((k) => (
                <Link
                  key={k.id}
                  to={`/knowledge/${k.id}`}
                  className="glass-card p-4 hover:border-brand-400/50 flex flex-col justify-between group"
                >
                  <div>
                    <h3 className="text-sm font-semibold group-hover:text-brand-500 transition-colors">
                      {k.title}
                    </h3>
                    {k.description && (
                      <p className="text-xs text-slate-600 dark:text-white/60 mt-1 line-clamp-2">{k.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/60 dark:border-white/10 text-[11px] text-slate-400 dark:text-white/40">
                    <span>Difficulty: {k.difficulty}/5</span>
                    <span className="text-brand-500 dark:text-brand-400 flex items-center gap-0.5 font-semibold">
                      Open <ArrowRight size={10} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MOBILE DRILL-DOWN VIEW (<640px) ── */}
      <div className="block sm:hidden">
        {/* Mobile Navigation Header / Breadcrumbs */}
        <div className="flex items-center justify-between mb-3 bg-white/40 dark:bg-white/5 p-2 rounded-xl border border-slate-200 dark:border-white/10">
          {mobileView === "categories" && (
            <span className="text-xs font-semibold text-slate-500 dark:text-white/60">
              Select Category
            </span>
          )}

          {mobileView === "topics" && (
            <button
              onClick={() => setMobileView("categories")}
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-brand-500/10 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Categories</span>
            </button>
          )}

          {mobileView === "knowledge" && (
            <button
              onClick={() => setMobileView("topics")}
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-brand-500/10 transition-colors"
            >
              <ArrowLeft size={14} />
              <span>{activeCategory?.name || "Topics"}</span>
            </button>
          )}

          <div className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${mobileView === "categories" ? "bg-brand-500" : "bg-slate-300 dark:bg-white/20"}`} />
            <span className={`w-2 h-2 rounded-full ${mobileView === "topics" ? "bg-brand-500" : "bg-slate-300 dark:bg-white/20"}`} />
            <span className={`w-2 h-2 rounded-full ${mobileView === "knowledge" ? "bg-brand-500" : "bg-slate-300 dark:bg-white/20"}`} />
          </div>
        </div>

        {/* Render Single Active Column on Mobile */}
        {mobileView === "categories" && categoriesColumn}
        {mobileView === "topics" && topicsColumn}
        {mobileView === "knowledge" && knowledgeColumn}
      </div>

      {/* ── TABLET 2-COLUMN VIEW (640px - 1024px) ── */}
      <div className="hidden sm:grid lg:hidden sm:grid-cols-2 gap-4 relative">
        {categoriesColumn}
        {topicsColumn}

        {/* Tablet Slide-in Drawer for 3rd Column (Knowledge Items) */}
        {tabletKnowledgeDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in p-4 sm:p-6">
            <div className="w-full max-w-md h-full relative">
              <button
                onClick={() => setTabletKnowledgeDrawerOpen(false)}
                className="absolute top-4 right-4 z-20 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
                title="Close drawer"
              >
                <X size={16} />
              </button>
              {knowledgeColumn}
            </div>
          </div>
        )}
      </div>

      {/* ── DESKTOP 3-COLUMN VIEW (>1024px) ── */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-5">
        <div className="lg:col-span-3">{categoriesColumn}</div>
        <div className="lg:col-span-4">{topicsColumn}</div>
        <div className="lg:col-span-5">{knowledgeColumn}</div>
      </div>
    </PageTransition>
  );
}
