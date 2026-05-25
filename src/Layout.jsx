import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
    Home, Users, BookOpen, Facebook, Youtube, HandHeart,
    Video, Menu, X, Mail, Phone, ArrowUp, BookText,
    Users2, HelpCircle, Megaphone, CalendarDays, Images, Youtube as YoutubeIcon, PlaySquare,
    FileText, Send, Sparkles, BookHeart, Map, MailQuestion, Handshake, Search, Settings
} from "lucide-react";
import SearchModal from "@/components/search/SearchModal";
import { Button } from "@/components/ui/button";
import { localApi } from '@/api/localApiClient';

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchUser = async () => {
        try {
            const user = await localApi.auth.me();
            setCurrentUser(user);
        } catch (e) {
            setCurrentUser(null);
            console.error("Failed to fetch user:", e);
        }
    };
    fetchUser();
  }, [currentPageName]);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const isActive = (href) => location.pathname === href;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigation = [
    { name: 'Home', href: createPageUrl('Home'), icon: Home, dropdown: [] },
    { 
      name: 'About', 
      href: createPageUrl('About'), 
      icon: Users, 
      dropdown: [
          { name: 'Our Beliefs', href: createPageUrl('About') + '#beliefs', icon: BookHeart },
          { name: 'Our History', href: createPageUrl('About') + '#history', icon: BookText },
          { name: 'Leadership', href: createPageUrl('About') + '#leadership', icon: Users2 },
          { name: 'FAQ', href: createPageUrl('About') + '#faq', icon: HelpCircle },
      ] 
    },
    { 
      name: 'Updates', 
      href: createPageUrl('Updates'), 
      icon: Megaphone, 
      dropdown: [
          { name: 'Announcements', href: createPageUrl('Updates') + '#announcements-events', icon: Megaphone },
          { name: 'Calendar', href: createPageUrl('Updates') + '#calendar', icon: CalendarDays },
          { name: 'Past Events', href: createPageUrl('Updates') + '#past-events', icon: Images },
      ] 
    },
    { 
      name: 'Resources', 
      href: createPageUrl('Resources'), 
      icon: BookOpen, 
      dropdown: [
          { name: 'Live Stream', href: createPageUrl('Resources') + '#live-stream', icon: Video },
          { name: 'Latest Sermon', href: createPageUrl('Resources') + '#latest-sermon', icon: YoutubeIcon },
          { name: 'Sermon Archive', href: createPageUrl('Resources') + '#more-sermons', icon: PlaySquare },
          { name: 'Worship Bulletins', href: createPageUrl('Resources') + '#bulletins', icon: FileText },
      ] 
    },
    { 
      name: 'Prayer', 
      href: createPageUrl('Prayer'), 
      icon: HandHeart, 
      dropdown: [
          { name: 'Prayer for the Week', href: createPageUrl('Prayer') + '#prayer-week', icon: Sparkles },
          { name: 'Submit Prayer Request', href: createPageUrl('Prayer') + '#submit-request', icon: Send },
          { name: 'Congregational Prayer List', href: createPageUrl('Prayer') + '#prayer-list', icon: Users },
          { name: 'Prayer Resources', href: createPageUrl('Prayer') + '#resources', icon: BookOpen },
      ] 
    },
    { 
      name: 'Connect', 
      href: createPageUrl('Connect'), 
      icon: Handshake, 
      dropdown: [
          { name: 'Contact Us', href: createPageUrl('Connect') + '#contact', icon: MailQuestion },
          { name: 'Plan a Visit', href: createPageUrl('Connect') + '#visit', icon: Map },
          { name: 'Prayer Request', href: createPageUrl('Prayer'), icon: HandHeart },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <style>
        {`
          :root {
            --header-bg: linear-gradient(135deg, #3D2519 0%, #4B342A 40%, #6B4A35 70%, #A3873E 100%);
            --header-hover: #37251E;
            --nav-text: #FBF7F0;
            --nav-active-text: #FFFFFF;
          }

          /* Hide scrollbar for webkit browsers */
          ::-webkit-scrollbar {
            width: 0px;
            background: transparent;
          }

          /* Hide scrollbar for Firefox */
          html {
            scrollbar-width: none;
          }

          /* Ensure body and html still allow scrolling */
          html, body {
            overflow-x: hidden;
            overflow-y: auto;
          }

          .action-button-live {
            background: linear-gradient(135deg, #dc2626, #ef4444);
            box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
          }

          .action-button-live:hover {
            background: linear-gradient(135deg, #b91c1c, #dc2626);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
          }

          .action-button-give {
            background: linear-gradient(135deg, #16a34a, #22c55e);
            box-shadow: 0 2px 8px rgba(34, 197, 94, 0.35);
          }

          .action-button-give:hover {
            background: linear-gradient(135deg, #15803d, #16a34a);
            box-shadow: 0 4px 12px rgba(22, 163, 74, 0.4);
          }

          .dropdown-menu {
            left: 50%;
            transform: translateX(-50%) scale(0.95); /* Apply initial scale for animation */
            transform-origin: top center; /* Set transform origin */
            opacity: 0;
            visibility: hidden;
            transition: transform 0.2s ease, opacity 0.2s ease;
            pointer-events: none;
            z-index: 100;
          }

          .dropdown-container:hover .dropdown-menu {
            transform: translateX(-50%) scale(1); /* Scale to full size when active */
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
          }

          /* New rule to hide dropdown for active page */
          .dropdown-container.is-active:hover .dropdown-menu {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            transform: translateX(-50%) scale(0.95);
          }

          .dropdown-container {
            padding-bottom: 8px; /* Extend hover area below the nav item */
          }

          .social-facebook {
            background-color: #1877F2;
          }

          .social-facebook:hover {
            background-color: #166FE5;
          }

          .social-instagram {
            background: linear-gradient(45deg, #F58529, #DD2A7B, #8134AF, #515BD4);
          }

          .social-instagram:hover {
            background: linear-gradient(45deg, #F58529, #DD2A7B, #8134AF, #515BD4);
            opacity: 0.9;
          }

          .social-youtube {
            background-color: #FF0000;
          }

          .social-youtube:hover {
            background-color: #E60000;
          }

          .action-button {
            height: 32px;
            padding: 0 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
          }
        `}
      </style>

      <header className="fixed top-0 left-0 right-0 z-50 w-full" style={{ background: 'linear-gradient(135deg, #3D2519 0%, #4B342A 40%, #6B4A35 70%, #A3873E 100%)' }}>
        <div className="mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-screen-2xl">
          {/* Logo */}
          <Link to={createPageUrl("Home")} className="flex flex-shrink-0 items-center space-x-3">
            <div className="w-14 h-14 rounded-full bg-white p-1 shadow-lg flex items-center justify-center">
              <img
                src="/images/site/church-logo.png"
                alt="Goodwill Presbyterian Church Logo"
                className="h-full w-full object-contain rounded-full"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold uppercase tracking-widest text-amber-100 text-xl" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>Goodwill</span>
              <span className="font-serif italic text-yellow-200 text-xs tracking-normal" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}>
                Presbyterian Church (USA)
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex flex-grow items-center justify-center space-x-1">
            {navigation.map((item) => (
              <div
                key={item.name}
                className={`dropdown-container relative ${isActive(item.href) ? 'is-active' : ''}`}
              >
                <Link
                  to={item.href}
                  className={`flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors duration-300 ${
                    isActive(item.href)
                      ? 'text-[var(--nav-active-text)] bg-black/30'
                      : 'text-[var(--nav-text)] hover:bg-black/20'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>

                {/* Dropdown Menu - Improved positioning */}
                {item.dropdown.length > 0 && (
                  <div className={`dropdown-menu absolute top-full w-64 bg-white/95 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-2 z-50`}>
                    {item.dropdown.map((dropdownItem, dropdownIndex) => (
                      <Link
                        key={dropdownIndex}
                        to={dropdownItem.href}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-800 rounded-lg hover:bg-amber-100 hover:text-amber-900 hover:shadow-sm hover:translate-x-1 transition-all duration-150 font-medium"
                      >
                        {dropdownItem.icon && <dropdownItem.icon className="w-5 h-5 text-yellow-600" />}
                        <span>{dropdownItem.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Action Buttons & Social Media & Mobile Toggle */}
          <div className="flex items-center space-x-4">
            {/* Action Buttons and Social Media Stack */}
            <div className="hidden lg:flex flex-col items-center space-y-1">
              {/* Action Buttons Row */}
              <div className="flex items-center space-x-2">
                <a
                  href={createPageUrl("Resources") + "#live-stream"}
                  className="action-button action-button-live text-white"
                >
                  <Video className="w-4 h-4" />
                  <span>LIVE</span>
                </a>
                <Link
                  to={createPageUrl("Give")}
                  className="action-button action-button-give text-white"
                >
                  <HandHeart className="w-4 h-4" />
                  <span>GIVE</span>
                </Link>
              </div>

              {/* Social Media and Search Row */}
              <div className="flex items-center space-x-1">
                <a href="https://www.facebook.com/share/177iq2ZzgN/" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full text-white social-facebook transition-all duration-300 hover:scale-110">
                  <Facebook className="w-4 h-4" />
                </a>
                <a href="https://www.youtube.com/@goodwillpresbyterianchurch1867" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full text-white social-youtube transition-all duration-300 hover:scale-110">
                  <Youtube className="w-4 h-4" />
                </a>

                {/* Separator Line */}
                <div className="w-px h-6 bg-white/30 mx-2"></div>

                {/* Search Button */}
                <button
                  onClick={() => setSearchOpen(true)}
                  className="group flex h-9 w-9 items-center justify-center rounded-full border-2 border-transparent text-amber-100 transition-colors hover:border-amber-400 hover:bg-white/10"
                  aria-label="Open search"
                >
                  <Search className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                </button>
              </div>
            </div>

            {/* Action Buttons for smaller screens (but not mobile) */}
            <div className="hidden sm:flex lg:hidden items-center space-x-2">
              <a
                href={createPageUrl("Resources") + "#live-stream"}
                className="action-button action-button-live text-white"
              >
                <Video className="w-4 h-4" />
                <span>LIVE</span>
              </a>
              <Link
                to={createPageUrl("Give")}
                className="action-button action-button-give text-white"
              >
                <HandHeart className="w-4 h-4" />
                <span>GIVE</span>
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md text-amber-100 hover:bg-black/30"
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="border-t border-white/20 bg-black/20 lg:hidden">
            <div className="px-4 py-2 space-y-1">
               {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 rounded-lg px-4 py-3 transition-all duration-200 ${
                      isActive(item.href)
                        ? "bg-black/40 font-medium text-[var(--nav-active-text)]"
                        : "text-[var(--nav-text)] hover:bg-black/20"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-base font-medium">{item.name}</span>
                  </Link>
                )
               )}
            </div>

            {/* Combined Action & Social Section for Mobile */}
            <div className="p-4 space-y-4 border-t border-white/20">
              {/* LIVE and GIVE buttons */}
              <div className="flex items-center justify-center space-x-4">
                  <a
                    href={createPageUrl("Resources") + "#live-stream"}
                    className="action-button action-button-live text-white flex-1"
                  >
                    <Video className="w-4 h-4" />
                    <span>LIVE</span>
                  </a>
                  <Link
                    to={createPageUrl("Give")}
                    className="action-button action-button-give text-white flex-1"
                  >
                    <HandHeart className="w-4 h-4" />
                    <span>GIVE</span>
                  </Link>
              </div>

              {/* Social Media Links for Mobile */}
              <div className="flex items-center justify-center space-x-4 pt-2">
                <a href="https://www.facebook.com/share/177iq2ZzgN/" target="_blank" rel="noopener noreferrer" className="p-3 rounded-full text-white bg-blue-600 transition-transform hover:scale-110">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="https://www.youtube.com/@goodwillpresbyterianchurch1867" target="_blank" rel="noopener noreferrer" className="p-3 rounded-full text-white bg-red-600 transition-transform hover:scale-110">
                  <Youtube className="w-5 h-5" />
                </a>
                <button
                  onClick={() => { setSearchOpen(true); setMobileMenuOpen(false); }}
                  className="p-3 rounded-full text-amber-100 bg-white/10 hover:bg-white/20 transition-colors"
                  aria-label="Open search"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Add padding-top to main content to account for fixed header */}
      <main className="flex-1 pt-20">
        {children}
      </main>

      {/* Footer */}
      <footer style={{ background: 'linear-gradient(135deg, #3D2519 0%, #4B342A 40%, #6B4A35 70%, #A3873E 100%)' }} className="text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Branding & Mission */}
            <div className="lg:col-span-1 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-14 h-14 bg-white rounded-full p-1 flex items-center justify-center shadow-lg">
                  <img
                    src="/images/site/church-logo.png"
                    alt="Goodwill Presbyterian Church Logo"
                    className="w-full h-full object-contain rounded-full"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-amber-100" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}>Goodwill Presbyterian Church</h3>
                </div>
              </div>
              <p className="text-sm text-yellow-100/90" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                A sanctuary of love, hope and peace for all. Join us as we worship, learn and serve together.
              </p>
            </div>

            {/* Links Grid with Vertical Dividers */}
            <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-bold text-sm text-amber-100 mb-3" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}>Quick Links</h4>
                <ul className="space-y-1 text-sm text-yellow-100/90" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                  <li><Link to={createPageUrl("Home")} className="hover:text-amber-300 transition-colors">Home</Link></li>
                  <li><Link to={createPageUrl("About")} className="hover:text-amber-300 transition-colors">About Us</Link></li>
                  <li><Link to={createPageUrl("Updates")} className="hover:text-amber-300 transition-colors">Updates</Link></li>
                  <li><Link to={createPageUrl("Resources")} className="hover:text-amber-300 transition-colors">Resources</Link></li>
                  <li><Link to={createPageUrl("Give")} className="hover:text-amber-300 transition-colors">Give</Link></li>
                </ul>
              </div>
              
              {/* Vertical Divider */}
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-px bg-white/20 hidden md:block"></div>
                <div className="pl-0 md:pl-6">
                  <h4 className="font-bold text-sm text-amber-100 mb-3" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}>Connect</h4>
                  <ul className="space-y-1 text-sm text-yellow-100/90" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                    <li><Link to={createPageUrl("Connect") + "#contact"} className="hover:text-amber-300 transition-colors">Contact Us</Link></li>
                    <li><Link to={createPageUrl("Connect") + "#visit"} className="hover:text-amber-300 transition-colors">Plan a Visit</Link></li>
                    <li><Link to={createPageUrl("Prayer")} className="hover:text-amber-300 transition-colors">Prayer Requests</Link></li>
                    <li><Link to={createPageUrl("About") + "#faq"} className="hover:text-amber-300 transition-colors">FAQs</Link></li>
                  </ul>
                </div>
              </div>
              
              {/* Vertical Divider */}
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-px bg-white/20 hidden md:block"></div>
                <div className="pl-0 md:pl-6">
                  <h4 className="font-bold text-sm text-amber-100 mb-3" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}>Worship With Us</h4>
                  <div className="text-sm text-yellow-100/90 space-y-1" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                      <p className="font-semibold">Sunday Service: 10:30 AM</p>
                      <p>295 N Brick Church Rd</p>
                      <p>Mayesville, SC 29104</p>
                      <a href="https://www.google.com/maps/search/?api=1&query=295+N+Brick+Church+Rd,+Mayesville,+SC+29104" target="_blank" rel="noopener noreferrer" className="font-semibold text-amber-300 hover:text-amber-100 transition-colors inline-block mt-1">
                        Get Directions →
                      </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="bg-black/20 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Contact Info */}
            <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 text-sm text-yellow-100/90">
              <a href="tel:8034953599" className="flex items-center gap-2 hover:text-amber-300 transition-colors">
                <Phone className="w-4 h-4" /> (803) 495-3599
              </a>
              <a href="mailto:goodwillpresch1867@gmail.com" className="flex items-center gap-2 hover:text-amber-300 transition-colors">
                <Mail className="w-4 h-4" /> goodwillpresch1867@gmail.com
              </a>
            </div>

            {/* Admin & Social Media */}
            <div className="flex items-center space-x-3">
              {currentUser && currentUser.role === 'admin' && (
                <Link to={createPageUrl("Admin")} className="p-2 rounded-full text-white bg-amber-600 hover:bg-amber-700 transition-all duration-300 hover:scale-110">
                  <Settings className="w-4 h-4" />
                </Link>
              )}
              <a href="https://www.facebook.com/share/177iq2ZzgN/" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full text-white social-facebook transition-all duration-300 hover:scale-110">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="https://www.youtube.com/@goodwillpresbyterianchurch1867" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full text-white social-youtube transition-all duration-300 hover:scale-110">
                <Youtube className="w-4 h-4" />
              </a>
              </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="bg-black/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="text-center">
              <p className="text-xs text-gray-400">
                &copy; {new Date().getFullYear()} Goodwill Presbyterian Church. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Back to Top Button */}
      {showBackToTop && (
          <Button
              onClick={scrollToTop}
              size="icon"
              className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-amber-600 hover:bg-amber-700 text-white shadow-lg transition-all duration-300 animate-bounce z-50"
          >
              <ArrowUp className="h-6 w-6" />
          </Button>
      )}

      {/* Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
