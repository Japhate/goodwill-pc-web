
import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X, Megaphone, PlaySquare, FileText, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils";
import { AnnouncementsEvents } from "@/entities/AnnouncementsEvents";
import { HeroSlide } from "@/entities/HeroSlide";
import { getPublicAnnouncements } from "@/lib/publicAnnouncements";
import { Sermons } from "@/entities/Sermons";
import { format } from "date-fns";
import PageLoadingScreen from "@/components/PageLoadingScreen";

const SearchModal = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState("");
    const [allItems, setAllItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const dialogRef = useRef(null);
    const inputRef = useRef(null);
    const previousFocusRef = useRef(null);

    useEffect(() => {
        const fetchAllData = async () => {
            if (isOpen && allItems.length === 0) {
                setLoading(true);
                try {
                    const [announcements, heroSlides, sermons] = await Promise.all([
                        AnnouncementsEvents.list("-date", 200),
                        HeroSlide.list("order", 200),
                        Sermons.list("-date", 100),
                    ]);
                    
                    const mappedAnnouncements = getPublicAnnouncements(announcements, heroSlides)
                        .map(item => ({ ...item, type: 'Announcement' }));
                    const mappedSermons = sermons.map(item => ({ ...item, type: 'Sermon' }));
                    
                    setAllItems([...mappedAnnouncements, ...mappedSermons]);
                } catch (error) {
                    console.error("Error fetching search data:", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchAllData();
    }, [isOpen, allItems.length]);

    useEffect(() => {
        if (!isOpen) return undefined;

        previousFocusRef.current = document.activeElement;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        window.setTimeout(() => inputRef.current?.focus(), 0);

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                onClose();
                return;
            }

            if (event.key !== "Tab" || !dialogRef.current) return;

            const focusableElements = Array.from(
                dialogRef.current.querySelectorAll(
                    'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )
            ).filter((element) => !element.hasAttribute("aria-hidden"));

            if (focusableElements.length === 0) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = originalOverflow;
            previousFocusRef.current?.focus?.();
        };
    }, [isOpen, onClose]);

    const searchResults = useMemo(() => {
        if (!query) return [];
        const lowerCaseQuery = query.toLowerCase();
        return allItems.filter(item => 
            item.title?.toLowerCase().includes(lowerCaseQuery) ||
            item.content?.toLowerCase().includes(lowerCaseQuery) ||
            item.speaker?.toLowerCase().includes(lowerCaseQuery) ||
            item.scripture?.toLowerCase().includes(lowerCaseQuery)
        ).slice(0, 10);
    }, [query, allItems]);

    const getResultLink = (item) => {
        if (item.type === 'Sermon') {
            return createPageUrl("Resources") + "#latest-sermon";
        }
        if (item.type === 'Announcement') {
            return createPageUrl("Updates") + "#announcements-events";
        }
        return "/";
    };

    const ResultIcon = ({ type }) => {
        if (type === 'Sermon') return <PlaySquare className="w-5 h-5 text-red-500" />;
        if (type === 'Announcement') return <Megaphone className="w-5 h-5 text-blue-500" />;
        return <FileText className="w-5 h-5 text-gray-500" />;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
                    onClick={onClose}
                    role="presentation"
                >
                    <div className="flex items-start justify-center min-h-screen pt-16 px-4">
                        <motion.div
                            ref={dialogRef}
                            initial={{ y: -50, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: -50, opacity: 0, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200"
                            onClick={(e) => e.stopPropagation()}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="search-modal-title"
                            aria-describedby="search-modal-description"
                        >
                            {/* Search Header */}
                            <div className="relative border-b border-gray-200">
                                <h2 id="search-modal-title" className="sr-only">Search Goodwill Presbyterian</h2>
                                <p id="search-modal-description" className="sr-only">Find announcements, sermons, events, and more.</p>
                                <div className="flex items-center px-6 py-4">
                                    <Search className="w-6 h-6 text-gray-400 mr-4" />
                                    <label htmlFor="site-search-input" className="sr-only">Search announcements, sermons, events, and resources</label>
                                    <Input
                                        ref={inputRef}
                                        id="site-search-input"
                                        type="text"
                                        placeholder="Search announcements, sermons, and more..."
                                        className="flex-1 text-lg border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        autoComplete="off"
                                    />
                                    <button 
                                        onClick={onClose} 
                                        className="ml-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                        aria-label="Close search"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Search Content */}
                            <div className="max-h-[60vh] overflow-y-auto">
                                {loading && (
                                    <div className="p-8 text-center text-gray-500">
                                        <PageLoadingScreen compact backgroundClassName="bg-transparent" className="mb-4 py-1" />
                                        Loading search data...
                                    </div>
                                )}

                                {!loading && query && searchResults.length > 0 && (
                                    <div className="p-2">
                                        <div className="px-4 py-2 text-sm font-medium text-gray-500 uppercase tracking-wider">
                                            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                                        </div>
                                        <ul>
                                            {searchResults.map(item => (
                                                <li key={`${item.type}-${item.id}`}>
                                                    <Link 
                                                        to={getResultLink(item)} 
                                                        onClick={onClose} 
                                                        className="block p-4 rounded-xl hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100 last:border-b-0"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-start gap-4 flex-1">
                                                                <ResultIcon type={item.type} />
                                                                <div className="flex-1">
                                                                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{item.title}</h3>
                                                                    <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                                                                        <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-medium">
                                                                            {item.type}
                                                                        </span>
                                                                        {item.date && (
                                                                            <span>{format(new Date(item.date), "MMM d, yyyy")}</span>
                                                                        )}
                                                                    </div>
                                                                    {item.content && (
                                                                        <p className="text-sm text-gray-600 line-clamp-2">
                                                                            {item.content}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                                                        </div>
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {!loading && query && searchResults.length === 0 && (
                                    <div className="p-12 text-center">
                                        <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No results found</h3>
                                        <p className="text-gray-500">Try adjusting your search terms or check for typos.</p>
                                    </div>
                                )}
                                
                                {!query && !loading && (
                                    <div className="p-12 text-center">
                                        <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Search Goodwill Presbyterian</h3>
                                        <p className="text-gray-500">Find announcements, sermons, events, and more.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SearchModal;
