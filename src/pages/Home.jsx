import { useState, useEffect, useRef, useMemo } from "react";
import { createPageUrl } from "@/utils";
import { Clock, MapPin, BookOpen, ChevronDown, Youtube as YoutubeIcon, Send, Video, Play, Pause, Map, Navigation } from "lucide-react";
import HeroSlideshow from "@/components/home/HeroSlideshow";
import { Button } from "@/components/ui/button";
import { AnnouncementsEvents } from "@/entities/AnnouncementsEvents";
import { Sermons } from "@/entities/Sermons";
import { format, isBefore, startOfDay, parseISO } from "date-fns";
import { Input } from "@/components/ui/input";
import { NewsletterSubscriptions } from "@/entities/NewsletterSubscriptions";
import { createSpecialServicePopup, getActiveSpecialServiceNotice } from "@/lib/specialServiceNotice";
import { SitePopups } from "@/entities/SitePopups";
import SitePopupModal, { getActivePopup } from "@/components/home/SitePopupModal";

function createUnsubscribeToken() {
  const bytes = new Uint8Array(18);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  return `${Date.now()}${Math.random()}`.replace(/\D/g, "").padEnd(36, "0").slice(0, 36);
}

function isValidNewsletterEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function Home() {
  const [announcements, setAnnouncements] = useState([]);
  const [latestSermon, setLatestSermon] = useState(null);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState("");
  const [isNewsletterSubmitting, setIsNewsletterSubmitting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(() => Math.floor(Math.random() * 100));
  const [versesPaused, setVersesPaused] = useState(false);
  const announcementsScrollRef = useRef(null);
  const scrollTimerRef = useRef(null);
  const isTransitioning = useRef(false);
  const observerRef = useRef(null);
  const [liveSermonUrl, setLiveSermonUrl] = useState("https://www.youtube.com/embed/bERzxb_Sbvo");
  const [liveEvents, setLiveEvents] = useState([]);
  const [sitePopups, setSitePopups] = useState([]);

  // New state variables for live stream logic
  const [isLive, setIsLive] = useState(false);
  const [playingSermonId, setPlayingSermonId] = useState(null); // To prevent multiple videos playing simultaneously
  const [hasLiveSermon, setHasLiveSermon] = useState(false); // NEW: Track if there's a Live sermon in DB
  const [liveSermon, setLiveSermon] = useState(null); // NEW: Store the actual live sermon object
  const activeSpecialServiceNotice = getActiveSpecialServiceNotice();
  const inPersonOnlyNotice = activeSpecialServiceNotice?.liveStreamAvailable === false ? activeSpecialServiceNotice : null;
  const serviceLabel = activeSpecialServiceNotice?.serviceLabel || "Sunday Morning Service @ 10:30 AM";
  const serviceLocationLabel = activeSpecialServiceNotice?.locationLabel || "295 N Brick Church Road, Mayesville, SC 29104";
  const serviceDirectionsUrl = activeSpecialServiceNotice?.directionsUrl || "https://www.google.com/maps/search/?api=1&query=295+N+Brick+Church+Rd,+Mayesville,+SC+29104";
  const activeSitePopup = useMemo(() => getActivePopup(sitePopups), [sitePopups]);

  // Scripture verses that rotate
  const scriptureVerses = [
    { text: "For where two or three gather in my name, there am I with them.", reference: "Matthew 18:20" },
    { text: "Trust in the Lord with all your heart and lean not on your own understanding.", reference: "Proverbs 3:5" },
    { text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.", reference: "John 3:16" },
    { text: "I can do all things through Christ who strengthens me.", reference: "Philippians 4:13" },
    { text: "The Lord is my shepherd; I shall not want.", reference: "Psalm 23:1" },
    { text: "Be still, and know that I am God.", reference: "Psalm 46:10" },
    { text: "Cast all your anxiety on him because he cares for you.", reference: "1 Peter 5:7" },
    { text: "But they who wait for the Lord shall renew their strength; they shall mount up with wings like eagles.", reference: "Isaiah 40:31" },
    { text: "The Lord bless you and keep you; the Lord make his face shine on you and be gracious to you.", reference: "Numbers 6:24-25" },
    { text: "This is the day that the Lord has made; let us rejoice and be glad in it.", reference: "Psalm 118:24" },
    { text: "Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.", reference: "Joshua 1:9" },
    { text: "The steadfast love of the Lord never ceases; his mercies never come to an end; they are new every morning.", reference: "Lamentations 3:22-23" },
    { text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.", reference: "Jeremiah 29:11" },
    { text: "Come to me, all you who are weary and burdened, and I will give you rest.", reference: "Matthew 11:28" },
    { text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.", reference: "Romans 8:28" },
    { text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.", reference: "Philippians 4:6" },
    { text: "Love is patient, love is kind. It does not envy, it does not boast, it is not proud.", reference: "1 Corinthians 13:4" },
    { text: "The Lord is close to the brokenhearted and saves those who are crushed in spirit.", reference: "Psalm 34:18" },
    { text: "Seek first his kingdom and his righteousness, and all these things will be given to you as well.", reference: "Matthew 6:33" },
    { text: "Your word is a lamp for my feet, a light on my path.", reference: "Psalm 119:105" },
    { text: "Let the peace of Christ rule in your hearts, since as members of one body you were called to peace.", reference: "Colossians 3:15" },
    { text: "The prayer of a righteous person is powerful and effective.", reference: "James 5:16" },
    { text: "Draw near to God, and he will draw near to you.", reference: "James 4:8" },
    { text: "He heals the brokenhearted and binds up their wounds.", reference: "Psalm 147:3" },
    { text: "Even youths grow tired and weary, and young men stumble and fall; but those who hope in the Lord will renew their strength.", reference: "Isaiah 40:30-31" },
    { text: "God is our refuge and strength, an ever-present help in trouble.", reference: "Psalm 46:1" },
    { text: "The name of the Lord is a fortified tower; the righteous run to it and are safe.", reference: "Proverbs 18:10" },
    { text: "Blessed are the pure in heart, for they will see God.", reference: "Matthew 5:8" },
    { text: "Rejoice in the Lord always. I will say it again: Rejoice!", reference: "Philippians 4:4" },
    { text: "In the beginning God created the heavens and the earth.", reference: "Genesis 1:1" },
    { text: "The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you.", reference: "Zephaniah 3:17" },
    { text: "No eye has seen, no ear has heard, and no mind has imagined what God has prepared for those who love him.", reference: "1 Corinthians 2:9" },
    { text: "Give thanks to the Lord, for he is good; his love endures forever.", reference: "Psalm 107:1" },
    { text: "Blessed is the one who does not walk in step with the wicked or stand in the way that sinners take.", reference: "Psalm 1:1" },
    { text: "For it is by grace you have been saved, through faith — and this is not from yourselves, it is the gift of God.", reference: "Ephesians 2:8" },
    { text: "Let your light shine before others, that they may see your good deeds and glorify your Father in heaven.", reference: "Matthew 5:16" },
    { text: "Do not conform to the pattern of this world, but be transformed by the renewing of your mind.", reference: "Romans 12:2" },
    { text: "Greater love has no one than this: to lay down one's life for one's friends.", reference: "John 15:13" },
    { text: "The Spirit of the Lord is on me, because he has anointed me to proclaim good news to the poor.", reference: "Luke 4:18" },
    { text: "If my people, who are called by my name, will humble themselves and pray and seek my face and turn from their wicked ways, then I will hear from heaven.", reference: "2 Chronicles 7:14" },
    { text: "Whoever believes in me, as Scripture has said, rivers of living water will flow from within them.", reference: "John 7:38" },
    { text: "I am the way and the truth and the life. No one comes to the Father except through me.", reference: "John 14:6" },
    { text: "The Lord is my light and my salvation — whom shall I fear?", reference: "Psalm 27:1" },
    { text: "You will keep in perfect peace those whose minds are steadfast, because they trust in you.", reference: "Isaiah 26:3" },
    { text: "Create in me a pure heart, O God, and renew a steadfast spirit within me.", reference: "Psalm 51:10" },
    { text: "Delight yourself in the Lord, and he will give you the desires of your heart.", reference: "Psalm 37:4" },
    { text: "My grace is sufficient for you, for my power is made perfect in weakness.", reference: "2 Corinthians 12:9" },
    { text: "Do not let your hearts be troubled. You believe in God; believe also in me.", reference: "John 14:1" },
    { text: "The earth is the Lord's, and everything in it, the world, and all who live in it.", reference: "Psalm 24:1" },
    { text: "For the word of God is alive and active, sharper than any double-edged sword.", reference: "Hebrews 4:12" },
    { text: "I lift up my eyes to the mountains — where does my help come from? My help comes from the Lord.", reference: "Psalm 121:1-2" },
    { text: "Be kind and compassionate to one another, forgiving each other, just as in Christ God forgave you.", reference: "Ephesians 4:32" },
    { text: "For everyone born of God overcomes the world. This is the victory that has overcome the world, even our faith.", reference: "1 John 5:4" },
    { text: "Now faith is confidence in what we hope for and assurance about what we do not see.", reference: "Hebrews 11:1" },
    { text: "The Lord is gracious and compassionate, slow to anger and rich in love.", reference: "Psalm 145:8" },
    { text: "He who began a good work in you will carry it on to completion until the day of Christ Jesus.", reference: "Philippians 1:6" },
    { text: "As for me and my household, we will serve the Lord.", reference: "Joshua 24:15" },
    { text: "May the God of hope fill you with all joy and peace as you trust in him.", reference: "Romans 15:13" },
    { text: "Jesus wept.", reference: "John 11:35" },
    { text: "Truly I tell you, if you have faith as small as a mustard seed, you can say to this mountain, 'Move from here to there,' and it will move.", reference: "Matthew 17:20" },
    { text: "The Lord is my strength and my shield; my heart trusts in him, and he helps me.", reference: "Psalm 28:7" },
    { text: "Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!", reference: "2 Corinthians 5:17" },
    { text: "Commit to the Lord whatever you do, and he will establish your plans.", reference: "Proverbs 16:3" },
    { text: "My God will meet all your needs according to the riches of his glory in Christ Jesus.", reference: "Philippians 4:19" },
    { text: "Humble yourselves before the Lord, and he will lift you up.", reference: "James 4:10" },
    { text: "The joy of the Lord is your strength.", reference: "Nehemiah 8:10" },
    { text: "Taste and see that the Lord is good; blessed is the one who takes refuge in him.", reference: "Psalm 34:8" },
    { text: "O Lord, you are my God; I will exalt you and praise your name, for in perfect faithfulness you have done wonderful things.", reference: "Isaiah 25:1" },
    { text: "He gives strength to the weary and increases the power of the weak.", reference: "Isaiah 40:29" },
    { text: "Fear not, for I am with you; be not dismayed, for I am your God; I will strengthen you, I will help you.", reference: "Isaiah 41:10" },
    { text: "Blessed are the peacemakers, for they will be called children of God.", reference: "Matthew 5:9" },
    { text: "Clothe yourselves with compassion, kindness, humility, gentleness and patience.", reference: "Colossians 3:12" },
    { text: "Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.", reference: "Galatians 6:9" },
    { text: "The Lord your God is God; he is the faithful God, keeping his covenant of love to a thousand generations.", reference: "Deuteronomy 7:9" },
    { text: "Those who sow with tears will reap with songs of joy.", reference: "Psalm 126:5" },
    { text: "I have been crucified with Christ and I no longer live, but Christ lives in me.", reference: "Galatians 2:20" },
    { text: "Let everything that has breath praise the Lord.", reference: "Psalm 150:6" },
    { text: "The Spirit himself testifies with our spirit that we are God's children.", reference: "Romans 8:16" },
    { text: "Do not grieve the Holy Spirit of God, with whom you were sealed for the day of redemption.", reference: "Ephesians 4:30" },
    { text: "We love because he first loved us.", reference: "1 John 4:19" },
    { text: "The Lord is not slow in keeping his promise, as some understand slowness. Instead he is patient with you.", reference: "2 Peter 3:9" },
    { text: "For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline.", reference: "2 Timothy 1:7" },
    { text: "I am the resurrection and the life. The one who believes in me will live, even though they die.", reference: "John 11:25" },
    { text: "And surely I am with you always, to the very end of the age.", reference: "Matthew 28:20" },
    { text: "For the wages of sin is death, but the gift of God is eternal life in Christ Jesus our Lord.", reference: "Romans 6:23" },
    { text: "In all your ways acknowledge him, and he will make straight your paths.", reference: "Proverbs 3:6" },
    { text: "The mountains may shake and the hills may tremble, but my love will never leave you.", reference: "Isaiah 54:10" },
    { text: "I am the bread of life. Whoever comes to me will never go hungry.", reference: "John 6:35" },
    { text: "God is love. Whoever lives in love lives in God, and God in them.", reference: "1 John 4:16" },
    { text: "The Lord makes firm the steps of the one who delights in him.", reference: "Psalm 37:23" },
    { text: "But seek first his kingdom and his righteousness, and all these things will be given to you.", reference: "Matthew 6:33" },
    { text: "Ask and it will be given to you; seek and you will find; knock and the door will be opened to you.", reference: "Matthew 7:7" },
    { text: "Be on your guard; stand firm in the faith; be courageous; be strong.", reference: "1 Corinthians 16:13" },
    { text: "Praise be to the God and Father of our Lord Jesus Christ, who has blessed us in the heavenly realms with every spiritual blessing in Christ.", reference: "Ephesians 1:3" },
    { text: "Let the message of Christ dwell among you richly as you teach and admonish one another with all wisdom.", reference: "Colossians 3:16" },
    { text: "But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control.", reference: "Galatians 5:22-23" },
    { text: "How can a young person stay on the path of purity? By living according to your word.", reference: "Psalm 119:9" },
    { text: "Blessed are those who mourn, for they will be comforted.", reference: "Matthew 5:4" },
  ];

  // Helper functions for live stream logic
  // Service details for EST (UTC-5)
  // NOTE: This currently uses client's local time. For strict EST,
  // a timezone library (e.g., date-fns-tz) would be needed to convert `now` to EST.
  const SERVICE_DAY = 0; // Sunday (0 for Sunday, 1 for Monday, etc.)
  const SERVICE_HOUR = 10; // 10 AM
  const SERVICE_MINUTE = 30; // 30 minutes
  const SERVICE_DURATION_MINUTES = 90; // Service typically lasts 90 minutes (10:30 AM to 12:00 PM)

  // Helper function to check if currently in service time (Sunday 10:30 AM - 12:00 PM)
  const isServiceTime = () => {
    const now = new Date();
    if (getActiveSpecialServiceNotice(now)?.liveStreamAvailable === false) return false;

    const isSunday = now.getDay() === SERVICE_DAY;
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    if (!isSunday) return false;
    
    // Service runs from 10:30 AM to 12:00 PM
    const serviceStart = SERVICE_HOUR * 60 + SERVICE_MINUTE; // 10:30 in minutes
    const serviceEnd = (SERVICE_HOUR * 60 + SERVICE_MINUTE) + SERVICE_DURATION_MINUTES; // 12:00 in minutes
    const currentTime = currentHour * 60 + currentMinute;
    
    return currentTime >= serviceStart && currentTime < serviceEnd;
  };

  // Check for scheduled announcement events that are live right now.
  useEffect(() => {
    const checkLiveEvents = () => {
      const now = new Date();
      if (getActiveSpecialServiceNotice(now)) {
        setLiveEvents([]);
        return;
      }

      const currentDay = format(now, 'yyyy-MM-dd');
      const currentTime = format(now, 'HH:mm');

      const live = announcements.filter(announcement => {
        if (!announcement.date || !announcement.time || !announcement.end_time) return false;

        const eventDate = format(parseISO(announcement.date), 'yyyy-MM-dd');
        if (eventDate !== currentDay) return false;

        return currentTime >= announcement.time && currentTime <= announcement.end_time;
      });

      const uniqueLive = live.filter((event, index, self) =>
        index === self.findIndex(item => item.id === event.id)
      );

      setLiveEvents(uniqueLive);
    };

    checkLiveEvents();
    const interval = setInterval(checkLiveEvents, 30000);

    return () => clearInterval(interval);
  }, [announcements]);

  // Rotate verses every 10 seconds
  useEffect(() => {
    if (versesPaused) return;
    const verseInterval = setInterval(() => {
      setCurrentVerseIndex((prev) => (prev + 1) % scriptureVerses.length);
    }, 10000);

    return () => clearInterval(verseInterval);
  }, [scriptureVerses.length, versesPaused]);

  // Enhanced Intersection Observer for scroll-triggered animations
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px -50px 0px' }
    );

    // Observe all elements with fade-in-section class
    const elements = document.querySelectorAll('.fade-in-section');
    elements.forEach((el) => observerRef.current.observe(el));

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [announcements, latestSermon, isLive]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allAnnouncements, allSermons, allSitePopups] = await Promise.all([
            AnnouncementsEvents.list('-created_date', 100),
            Sermons.list('-date', 10),
            SitePopups.list('priority', 50).catch(() => [])
        ]);

        // Filter for Active and Timeless announcements
        const activeAnnouncements = allAnnouncements.filter(a => 
          a.status === 'Active' || a.status === 'Timeless' || !a.status
        );
        
        const today = startOfDay(new Date());

        const upcomingAndUndated = activeAnnouncements.filter(item => {
            // Timeless items always show
            if (item.status === 'Timeless') return true;
            // Items without dates always show
            if (!item.date) return true;
            // Active items only show if date is today or future
            return !isBefore(parseISO(item.date), today);
        });

        const sortedAnnouncements = upcomingAndUndated.sort((a, b) => {
          const aHasDate = !!a.date;
          const bHasDate = !!b.date;

          if (aHasDate && !bHasDate) return -1;
          if (!aHasDate && bHasDate) return 1;

          if (!aHasDate && !bHasDate) {
            return new Date(b.created_date) - new Date(a.created_date);
          }
          
          if (aHasDate && bHasDate) {
            return new Date(a.date) - new Date(b.date);
          }
          
          return 0;
        });
        
        const top10 = sortedAnnouncements.slice(0, 10);
        if (top10.length > 1) { 
          setAnnouncements([...top10, ...top10, ...top10]);
          setCurrentIndex(top10.length);
        } else {
          setAnnouncements(top10);
        }
        
        // Check if there's a Live sermon - FIXED: use allSermons
        const liveSermonCandidate = allSermons.find(s => s.status === 'Live');
        if (liveSermonCandidate) {
          setHasLiveSermon(true);
          setLiveSermon(liveSermonCandidate); // Store the live sermon object
          if (liveSermonCandidate.youtube_url) {
            const videoId = getYouTubeVideoId(liveSermonCandidate.youtube_url);
            if (videoId) {
              setLiveSermonUrl(`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`);
            }
          }
        } else {
          setHasLiveSermon(false);
          setLiveSermon(null);
        }

        const activeSermon = allSermons.find(s => s.status === 'Active');
        setLatestSermon(activeSermon || (allSermons.length > 0 ? allSermons[0] : null));
        setSitePopups(
          allSitePopups?.length > 0
            ? allSitePopups
            : activeSpecialServiceNotice
              ? [createSpecialServicePopup(activeSpecialServiceNotice)]
              : []
        );
        
      } catch (error) {
        console.error("Error loading homepage data:", error);
      }
    };
    loadData();
  }, []);

  // Live stream and countdown logic - UPDATED to check for Live sermon in DB
  useEffect(() => {
    const updateLiveStatus = () => {
      if (getActiveSpecialServiceNotice(new Date())?.liveStreamAvailable === false) {
        setIsLive(false);
        return;
      }

      // If there's a sermon marked as "Live" in the database, show it regardless of time
      if (hasLiveSermon) {
        setIsLive(true);
        return;
      }
      
      // Otherwise, use time-based check
      setIsLive(isServiceTime());
    };

    updateLiveStatus();
    const interval = setInterval(updateLiveStatus, 1000);
    
    return () => clearInterval(interval);
  }, [hasLiveSermon]); // Depend on hasLiveSermon

  const resetScrollTimer = () => {
    if (announcements.length / 3 <= 1) return;
    if (scrollTimerRef.current) {
      clearInterval(scrollTimerRef.current);
    }
    scrollTimerRef.current = setInterval(() => {
      handleScroll('right');
    }, 5000);
  };

  const handleScroll = (direction) => {
            if (isTransitioning.current) return;
            isTransitioning.current = true;

            if (direction === 'right') {
                setCurrentIndex(prev => prev + 1);
            } else {
                setCurrentIndex(prev => prev - 1);
            }
            resetScrollTimer();
          }

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    const email = newsletterEmail.trim().toLowerCase();
    if (!email || isNewsletterSubmitting) return;
    if (!isValidNewsletterEmail(email)) {
      setNewsletterStatus("error");
      setNewsletterMessage("Please enter a valid email address.");
      return;
    }

    setIsNewsletterSubmitting(true);
    setNewsletterStatus("");
    setNewsletterMessage("");

    try {
        const emailKey = encodeURIComponent(email);
        const unsubscribeToken = createUnsubscribeToken();

        await NewsletterSubscriptions.create({
          email,
          email_key: emailKey,
          unsubscribe_token: unsubscribeToken,
          status: "active",
        });

        setNewsletterStatus("success");
        setNewsletterMessage("Thank you for subscribing!");
        setNewsletterEmail("");
        try {
          const welcomeResponse = await fetch('/api/send-welcome-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              emailKey,
              unsubscribeToken,
              host: window.location.host,
              protocol: window.location.protocol.replace(':', ''),
            }),
          });

          if (!welcomeResponse.ok) {
            setNewsletterMessage("Thank you for subscribing. You are on the list, but the welcome email could not be sent.");
          }
        } catch {
          setNewsletterMessage("Thank you for subscribing. You are on the list, but the welcome email could not be sent.");
        }
        setTimeout(() => setNewsletterMessage(""), 5000);
    } catch (error) {
        console.error("Newsletter subscription error:", error);
        if (error?.message === "already-subscribed" || error?.status === 409) {
          setNewsletterStatus("success");
          setNewsletterMessage("Thank you. You're already subscribed with that email.");
          setNewsletterEmail("");
          try {
            const duplicateResponse = await fetch('/api/send-duplicate-subscription-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email }),
            });

            if (!duplicateResponse.ok) {
              setNewsletterMessage("Thank you. You're already subscribed with that email, but we could not send the confirmation email.");
            }
          } catch {
            setNewsletterMessage("Thank you. You're already subscribed with that email, but we could not send the confirmation email.");
          }
          setTimeout(() => setNewsletterMessage(""), 5000);
          return;
        }

        setNewsletterStatus("error");
        setNewsletterMessage("Subscription failed. Please try again.");
        setTimeout(() => setNewsletterMessage(""), 5000);
    } finally {
        setIsNewsletterSubmitting(false);
    }
  }
  
  useEffect(() => {
    if (announcements.length / 3 > 1) {
      resetScrollTimer();
    } else if (scrollTimerRef.current) {
      clearInterval(scrollTimerRef.current);
    }
    return () => {
      if (scrollTimerRef.current) {
        clearInterval(scrollTimerRef.current);
      }
    };
  }, [announcements.length]);

  useEffect(() => {
    const scrollContainer = announcementsScrollRef.current;
    if (!scrollContainer) return;
  
    const numRealItems = announcements.length / 3;
    
    const positionCarousel = (animate = false) => {
        const cardElement = scrollContainer.children[0];
        if (!cardElement) return;

        scrollContainer.style.transition = animate ? 'transform 500ms ease-in-out' : 'none';

        const cardStyle = getComputedStyle(cardElement);
        const cardMarginLeft = parseFloat(cardStyle.marginLeft);
        const cardMarginRight = parseFloat(cardStyle.marginRight);
        const cardWidth = cardElement.offsetWidth + cardMarginLeft + cardMarginRight;
        
        const parentWidth = scrollContainer.parentElement.offsetWidth;
        const scrollOffset = (currentIndex * cardWidth) - (parentWidth / 2) + (cardWidth / 2);
        
        scrollContainer.style.transform = `translateX(-${scrollOffset}px)`;
    };
    
    positionCarousel(isTransitioning.current);
  
    const handleTransitionEnd = () => {
      isTransitioning.current = false;
      
      if (currentIndex >= numRealItems * 2) {
        setCurrentIndex(numRealItems);
      }
      if (currentIndex < numRealItems) {
        setCurrentIndex(currentIndex + numRealItems);
      }
    };

    const handleResize = () => {
        positionCarousel(false);
    };
  
    scrollContainer.addEventListener('transitionend', handleTransitionEnd);
    window.addEventListener('resize', handleResize);
    
    return () => {
      scrollContainer.removeEventListener('transitionend', handleTransitionEnd);
      window.removeEventListener('resize', handleResize);
    };
  }, [currentIndex, announcements.length]);


  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    // Updated regex to handle /live/ URLs as well
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|live\/|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const embedUrl = useMemo(() => {
    // Don't show main video if an inline video is playing or if there's no latestSermon with a youtube_url
    if (playingSermonId || !latestSermon?.youtube_url) return null;
    const videoId = getYouTubeVideoId(latestSermon.youtube_url);
    if (!videoId) return null;

    const params = new URLSearchParams({ rel: 0 });
    if (latestSermon.start_time) {
      params.set('start', latestSermon.start_time);
    }
    // Autoplay for the latest sermon (not live stream) can be controlled by a separate state if desired.
    // For now, it defaults to off (autoplay not set)
    
    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  }, [latestSermon, playingSermonId]);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #FBF7F0 0%, #F5E8CC 30%, #EDD9A3 55%, #F2E6D6 75%, #FBF7F0 100%)' }}>
      <SitePopupModal popup={activeSitePopup} />
      {/* Live Events Banner - Fixed at very top */}
      {liveEvents.length > 0 && (
        <div className="fixed top-20 left-0 right-0 z-50 bg-gradient-to-r from-red-600 to-red-700 text-white py-1 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="font-bold uppercase tracking-wider text-sm">HAPPENING NOW</span>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
                {liveEvents.map((event) => (
                  <div key={event.id} className="flex flex-col sm:flex-row items-center gap-2 text-sm">
                    <div className="text-center md:text-left">
                      <span className="font-semibold">{event.title}</span>
                      {event.location && (
                        <span className="text-red-100 ml-1 text-xs">@ {event.location}</span>
                      )}
                      <span className="text-red-100 ml-1 text-xs">
                        ({event.time} - {event.end_time})
                      </span>
                    </div>
                    {event.zoom_link && (
                      <a
                        href={event.zoom_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white text-red-600 hover:bg-red-50 px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 shadow-md text-xs"
                      >
                        <Video className="w-3 h-3" />
                        Join Zoom
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          /* Glassmorphism Styles */
          .glass-card {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          }

          .glass-card-light {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
          }

          /* Neumorphism Styles */
          .neumorphic {
            background: #f0f0f3;
            border-radius: 20px;
            box-shadow: 8px 8px 16px #d1d1d4, -8px -8px 16px #ffffff;
          }

          .neumorphic-inset {
            background: #f0f0f3;
            border-radius: 20px;
            box-shadow: inset 8px 8px 16px #d1d1d4, inset -8px -8px 16px #ffffff;
          }

          .neumorphic-button {
            background: linear-gradient(145deg, #f5f5f8, #e6e6e9);
            border-radius: 12px;
            box-shadow: 5px 5px 10px #d1d1d4, -5px -5px 10px #ffffff;
            transition: all 0.2s ease;
          }

          .neumorphic-button:hover {
            box-shadow: 3px 3px 6px #d1d1d4, -3px -3px 6px #ffffff;
          }

          .neumorphic-button:active {
            box-shadow: inset 3px 3px 6px #d1d1d4, inset -3px -3px 6px #ffffff;
          }

          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(50px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes fadeInLeft {
            from {
              opacity: 0;
              transform: translateX(-50px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes fadeInRight {
            from {
              opacity: 0;
              transform: translateX(50px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            25% { transform: translateY(-25px) rotate(5deg); }
            50% { transform: translateY(-15px) rotate(-5deg); }
            75% { transform: translateY(-30px) rotate(3deg); }
          }

          @keyframes floatSlow {
            0%, 100% { transform: translateY(0px) translateX(0px); }
            33% { transform: translateY(-40px) translateX(20px); }
            66% { transform: translateY(-20px) translateX(-15px); }
          }

          @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
          }

          @keyframes pulse {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.1); }
          }

          @keyframes glow {
            0%, 100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.3); }
            50% { box-shadow: 0 0 40px rgba(251, 191, 36, 0.6); }
          }

          @keyframes verseTransition {
            0% { opacity: 0; transform: translateY(20px); }
            10% { opacity: 1; transform: translateY(0); }
            90% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-20px); }
          }

          @keyframes pageFlip {
            0%, 100% { transform: rotateY(0deg); }
            50% { transform: rotateY(15deg); }
          }

          .fade-in-section {
            opacity: 0;
            transform: translateY(50px);
            transition: opacity 1s cubic-bezier(0.4, 0, 0.2, 1), 
                        transform 1s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .fade-in-section.animate-in {
            opacity: 1;
            transform: translateY(0);
          }

          .parallax-bg {
            will-change: transform;
            transition: transform 0.1s linear;
          }

          .float-animation {
            animation: float 8s ease-in-out infinite;
          }

          .float-slow {
            animation: floatSlow 12s ease-in-out infinite;
          }

          .shimmer-effect {
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
            background-size: 1000px 100%;
            animation: shimmer 4s infinite;
          }

          .pulse-glow {
            animation: pulse 3s ease-in-out infinite;
          }

          .glow-effect {
            animation: glow 2s ease-in-out infinite;
          }

          .parallax-layer-1 {
            transform: translateZ(0);
          }

          .parallax-layer-2 {
            transform: translateZ(-10px) scale(1.1);
          }

          .card-hover-lift {
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), 
                        box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .card-hover-lift:hover {
            transform: translateY(-10px) scale(1.02);
            box-shadow: 0 20px 40px rgba(0,0,0,0.15);
          }

          .verse-transition {
            animation: verseTransition 10s ease-in-out;
          }

          .bible-pages {
            animation: pageFlip 6s ease-in-out infinite;
          }

          @keyframes gradient {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }

          .animate-gradient {
            background-size: 200% auto;
            animation: gradient 3s ease infinite;
          }

          `}
          </style>

      {/* Floating Background Elements Throughout Page */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Top Layer */}
        <div 
          className="absolute top-20 left-[10%] w-3 h-3 bg-amber-400/25 rounded-full float-animation" 
          style={{ animationDelay: '0s' }}
        ></div>
        <div 
          className="absolute top-40 right-[15%] w-4 h-4 bg-yellow-400/20 rounded-full float-slow" 
          style={{ animationDelay: '2s' }}
        ></div>
        <div 
          className="absolute top-[60%] left-[20%] w-2 h-2 bg-amber-500/25 rounded-full float-animation" 
          style={{ animationDelay: '4s' }}
        ></div>
        <div 
          className="absolute top-[80%] right-[25%] w-3 h-3 bg-yellow-300/20 rounded-full float-slow" 
          style={{ animationDelay: '1s' }}
        ></div>

        {/* Additional floating elements */}
        <div className="absolute top-[30%] left-[5%] w-2 h-2 bg-amber-300/20 rounded-full pulse-glow"></div>
        <div 
          className="absolute top-[50%] right-[10%] w-3 h-3 bg-amber-400/20 rounded-full pulse-glow" 
          style={{ animationDelay: '1.5s' }}
        ></div>
        <div 
          className="absolute bottom-[20%] left-[15%] w-4 h-4 bg-yellow-400/25 rounded-full float-animation" 
          style={{ animationDelay: '3s' }}
        ></div>

        {/* Larger ambient circles */}
        <div className="absolute top-[25%] right-[5%] w-32 h-32 bg-gradient-to-br from-amber-300/10 to-yellow-200/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[30%] left-[8%] w-40 h-40 bg-gradient-to-br from-amber-200/10 to-yellow-100/10 rounded-full blur-3xl"></div>
      </div>

      {/* Hero Slideshow Section */}
      <div>
        <HeroSlideshow />
      </div>

      {/* New to Goodwill Section */}
      <section 
        style={{ background: 'linear-gradient(135deg, #3D2519 0%, #4B342A 40%, #6B4A35 70%, #A3873E 100%)' }} 
        className="text-white py-2 fade-in-section relative overflow-hidden"
      >
        {/* Background Pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{ 
            backgroundImage: 'radial-gradient(circle, rgba(251,191,36,0.3) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}
        ></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center">
                
                <div className="max-w-4xl mx-auto">
                    <div className="mb-3 space-y-1">
                        <p className="text-sm sm:text-base md:text-lg font-bold text-amber-300 flex flex-wrap items-center justify-center gap-2 text-center">
                            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                            {serviceLabel}
                        </p>
                        <p className="text-xs sm:text-sm md:text-base text-amber-200 flex flex-wrap items-center justify-center gap-2 text-center">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            {serviceLocationLabel}
                        </p>
                        <div className="flex flex-row gap-3 items-center justify-center mx-auto">
                            <Button asChild className="bg-white/20 hover:bg-white/40 text-white font-semibold px-6 py-2 rounded-md shadow transition-all hover:shadow-lg border border-white/40 hover:border-white/60 flex items-center gap-2">
                                <a 
                                    href={serviceDirectionsUrl}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2"
                                >
                                    <Navigation className="w-4 h-4" />
                                    Get Directions
                                </a>
                            </Button>
                            <Button asChild className="bg-white/20 hover:bg-white/40 text-white font-semibold px-6 py-2 rounded-md shadow transition-all hover:shadow-lg border border-white/40 hover:border-white/60 flex items-center gap-2">
                                <a 
                                    href="/Connect#visit"
                                    className="flex items-center gap-2"
                                >
                                    <Map className="w-4 h-4" />
                                    Plan a Visit
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </section>


      {/* Scripture Divider with Rotating Verses */}
      <section className="relative py-4 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1501612780327-45045538702b?q=80&w=2070')`,
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/70 to-black/80"></div>

        {/* Floating scripture accents */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div 
            className="absolute top-20 left-20 w-4 h-4 bg-amber-400/40 rounded-full float-animation glow-effect"
          ></div>
          <div 
            className="absolute bottom-20 right-20 w-3 h-3 bg-yellow-300/40 rounded-full float-slow glow-effect"
            style={{ animationDelay: '2s' }}
          ></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10 fade-in-section">
          {/* Open Bible Icon */}
          <div className="mb-2 flex justify-center">
            <div className="relative">
              <BookOpen className="w-20 h-20 text-amber-300 bible-pages" />
              <div className="absolute inset-0 bg-amber-300/20 rounded-full blur-xl"></div>
            </div>
          </div>

          {/* Rotating Scripture Verse */}
          <div className="flex flex-col items-center justify-center gap-2">
            <blockquote key={currentVerseIndex} className="text-2xl md:text-4xl font-serif text-white leading-relaxed italic verse-transition">
              "{scriptureVerses[currentVerseIndex].text}"
              <div className="mt-0">
              <span className="text-amber-300 text-xl font-semibold not-italic">— {scriptureVerses[currentVerseIndex].reference}</span>
            </div>
            </blockquote>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentVerseIndex((prev) => (prev - 1 + scriptureVerses.length) % scriptureVerses.length)}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                aria-label="Previous verse"
              >
                <ChevronDown className="w-5 h-5 text-amber-300 rotate-90" />
              </button>
              <button
                onClick={() => setVersesPaused(!versesPaused)}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                aria-label={versesPaused ? "Resume verses" : "Pause verses"}
              >
                {versesPaused ? (
                  <Play className="w-5 h-5 text-amber-300" />
                ) : (
                  <Pause className="w-5 h-5 text-amber-300" />
                )}
              </button>
              <button
                onClick={() => setCurrentVerseIndex((prev) => (prev + 1) % scriptureVerses.length)}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                aria-label="Next verse"
              >
                <ChevronDown className="w-5 h-5 text-amber-300 -rotate-90" />
              </button>
            </div>
          </div>
        </div>
      </section>



      {/* Latest Sermon Section - Now shows Live Stream during service time */}
      <section id="latest-sermon" className="py-8 fade-in-section relative overflow-hidden scroll-mt-[160px] md:scroll-mt-[144px]" style={{ background: 'linear-gradient(160deg, #FEF3D0 0%, #F5E4A8 40%, #EDD595 60%, #F5E4A8 80%, #FEF3D0 100%)' }}>
        {/* Background accents */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-purple-200/20 to-transparent rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {inPersonOnlyNotice ? (
            <div className="relative overflow-hidden rounded-3xl border border-red-200 bg-white shadow-2xl lg:flex lg:items-stretch">
              <div className="relative flex min-h-[260px] items-center justify-center bg-gradient-to-br from-red-800 via-red-700 to-amber-700 p-8 text-white lg:w-1/2">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="relative text-center">
                  <Video className="mx-auto mb-4 h-16 w-16 text-amber-200" />
                  <p className="text-sm font-bold uppercase tracking-widest text-amber-200">Live Stream Update</p>
                  <h2 className="mt-2 text-3xl font-bold">No Live Stream Today</h2>
                </div>
              </div>
              <div className="relative p-6 lg:w-1/2 lg:p-8">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
                  Important Worship Update
                </div>
                <h2 className="mb-3 text-2xl font-bold text-gray-900">United Service Today</h2>
                <p className="mb-4 rounded-md bg-red-600 px-4 py-3 text-sm font-bold leading-relaxed text-white">
                  {inPersonOnlyNotice.liveStreamMessage}
                </p>
                <div className="mb-5 space-y-2 text-sm text-gray-700">
                  <p className="flex items-center gap-2 font-semibold">
                    <Clock className="h-4 w-4 text-amber-600" />
                    {inPersonOnlyNotice.serviceTimeLabel}
                  </p>
                  <p className="flex items-center gap-2 font-semibold">
                    <MapPin className="h-4 w-4 text-amber-600" />
                    {inPersonOnlyNotice.locationLabel}
                  </p>
                </div>
                <Button asChild className="bg-amber-600 text-white hover:bg-amber-700">
                  <a href={inPersonOnlyNotice.directionsUrl} target="_blank" rel="noopener noreferrer">
                    <Navigation className="mr-2 h-4 w-4" />
                    Get Directions
                  </a>
                </Button>
              </div>
            </div>
          ) : isLive && liveSermon ? (
            <div className="relative rounded-3xl overflow-hidden bg-white shadow-2xl lg:flex lg:items-stretch border border-gray-100">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-red-500/5 pointer-events-none"></div>
              <div className="relative lg:w-1/2 lg:flex-shrink-0">
                <div className="w-full bg-gradient-to-br from-gray-900 to-black relative" style={{ paddingTop: '56.25%' }}>
                  <iframe
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    src={`${liveSermonUrl}?autoplay=1`}
                    title="Live Worship Service"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  ></iframe>
                </div>
              </div>
              <div className="relative p-6 lg:p-8 lg:w-1/2 lg:flex lg:flex-col lg:justify-center bg-gradient-to-br from-white to-gray-50">
                <div className="inline-flex items-center gap-2 mb-3 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 rounded-full shadow-lg">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <h3 className="text-xs font-bold uppercase text-white tracking-wider">LIVE NOW</h3>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{liveSermon.title}</h2>
                <div className="text-gray-600 text-sm space-y-1.5 mb-4">
                  <p><span className="font-semibold">Speaker:</span> {liveSermon.speaker}</p>
                  <p><span className="font-semibold">Date:</span> {format(parseISO(liveSermon.date), 'MMMM d, yyyy')}</p>
                  {liveSermon.scripture && <p><span className="font-semibold">Scripture:</span> {liveSermon.scripture}</p>}
                  {liveSermon.series && <p><span className="font-semibold">Series:</span> {liveSermon.series}</p>}
                </div>
                {liveSermon.notes && (
                  <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg mb-4">
                    <p className="text-xs text-gray-700 italic line-clamp-2">{liveSermon.notes}</p>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-4">
                  <a 
                    href={createPageUrl("Connect") + "#visit"}
                    className="bg-transparent border-2 border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black font-semibold px-8 py-3 text-lg transition-all duration-300 group inline-flex items-center justify-center rounded-md glow-effect"
                  >
                    Visit In Person
                  </a>
                </div>
              </div>
            </div>
          ) : latestSermon ? (
            <div className="relative rounded-3xl overflow-hidden bg-white shadow-2xl lg:flex lg:items-stretch border border-gray-100">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-500/5 pointer-events-none"></div>
              <div className="relative lg:w-1/2 lg:flex-shrink-0">
                <div style={{ paddingTop: '56.25%', position: 'relative' }} className="bg-gradient-to-br from-gray-900 to-black">
                  {embedUrl ? (
                      <iframe 
                          src={embedUrl}
                          title="YouTube video player" 
                          frameBorder="0" 
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                          allowFullScreen
                          referrerPolicy="strict-origin-when-cross-origin"
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                      ></iframe>
                  ) : playingSermonId ? (
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} className="bg-gray-200 flex items-center justify-center rounded-lg">
                          <div className="text-center">
                              <YoutubeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-500">Video playing in More Sermons section</p>
                              <Button 
                                  onClick={() => setPlayingSermonId(null)}
                                  variant="outline"
                                  className="mt-4"
                              >
                                  Stop Inline Video
                              </Button>
                          </div>
                      </div>
                  ) : (
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} className="bg-gray-200 flex items-center justify-center">
                          {latestSermon?.youtube_url && getYouTubeVideoId(latestSermon.youtube_url) ? (
                              <img 
                                  src={`https://img.youtube.com/vi/${getYouTubeVideoId(latestSermon.youtube_url)}/hqdefault.jpg`}
                                  alt={latestSermon.title}
                                  className="w-full h-full object-cover"
                              />
                          ) : (
                              <p className="text-gray-500">Video not available</p>
                          )}
                      </div>
                  )}
                </div>
              </div>
              <div className="relative p-6 lg:p-8 lg:w-1/2 lg:flex lg:flex-col lg:justify-center bg-gradient-to-br from-white to-gray-50">
                <div className="inline-flex items-center gap-2 mb-3 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full shadow-lg">
                  <YoutubeIcon className="w-3.5 h-3.5 text-white" />
                  <h3 className="text-xs font-bold uppercase text-white tracking-wider">Latest Sermon</h3>
                </div>
                <h2 className="mb-1 break-words text-lg font-bold leading-tight text-gray-900 sm:text-xl md:text-2xl lg:text-3xl">{latestSermon.title}</h2>
                <div className="text-gray-600 text-sm space-y-0.5 mb-4">
                    <p><span className="font-semibold">Speaker:</span> {latestSermon.speaker}</p>
                    <p><span className="font-semibold">Date:</span> {format(parseISO(latestSermon.date), 'MMMM d, yyyy')}</p>
                    {latestSermon.scripture && <p><span className="font-semibold">Scripture:</span> {latestSermon.scripture}</p>}
                    {latestSermon.series && <p><span className="font-semibold">Series:</span> {latestSermon.series}</p>}
                </div>
                {latestSermon.notes && (
                    <p className="italic text-gray-700 text-xs mb-4 bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg">
                        {latestSermon.notes}
                    </p>
                )}
                <div className="flex flex-col sm:flex-row gap-4">
                    <a 
                        href={createPageUrl("Resources") + "#more-sermons"}
                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold px-6 py-3 rounded-full inline-flex items-center justify-center transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                        <YoutubeIcon className="w-5 h-5 mr-2" />
                        Watch More Sermons
                    </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 max-w-5xl mx-auto">
                <YoutubeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No sermon available</h3>
                <p className="text-gray-600">Please check back later for the latest message.</p>
            </div>
          )}
        </div>
      </section>

      {/* Call to Action */}
      <section 
                    style={{ background: 'linear-gradient(135deg, #3D2519 0%, #4B342A 40%, #6B4A35 70%, #A3873E 100%)' }} 
                    className="py-8 text-white fade-in-section relative overflow-hidden"
                  >
        {/* Pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{ 
            backgroundImage: 'linear-gradient(45deg, rgba(251,191,36,0.2) 25%, transparent 25%, transparent 75%, rgba(251,191,36,0.2) 75%)',
            backgroundSize: '60px 60px'
          }}
        ></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Join Our Family?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto text-amber-100">
            Whether you're new to faith or looking for a church home, we'd love to welcome you
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/Connect#visit"
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-4 py-3 rounded-md inline-flex items-center justify-center transition-colors glow-effect"
            >
              Visit Us
            </a>
            <a 
              href={createPageUrl("Prayer")}
              className="border border-white text-white hover:bg-white hover:text-black font-semibold px-4 py-3 rounded-md inline-flex items-center justify-center transition-colors glow-effect"
            >
              Prayer Request
            </a>
          </div>
        </div>
      </section>

      {/* Stay Connected Section */}
      <section className="py-8 fade-in-section relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #FBF7F0 0%, #F5E8CC 40%, #EDD9A3 70%, #F2E6D6 100%)' }}>
        {/* Background elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-purple-200/20 to-transparent rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center neumorphic p-8 card-hover-lift">
                <div className="space-y-4">
                    <h4 className="font-bold text-2xl text-gray-900">Stay Connected</h4>
                    <p className="text-gray-600">Subscribe for the latest news, events, and updates from Goodwill Church.</p>
                    <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-2">
                        <Input 
                            type="email" 
                            name="email"
                            autoComplete="email"
                            placeholder="Your Email Address" 
                            value={newsletterEmail}
                            onChange={(e) => setNewsletterEmail(e.target.value)}
                            className="bg-gray-100"
                            disabled={isNewsletterSubmitting}
                            aria-describedby={newsletterMessage ? "newsletter-status" : undefined}
                            required
                        />
                        <Button type="submit" disabled={isNewsletterSubmitting} aria-busy={isNewsletterSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white glow-effect disabled:cursor-not-allowed disabled:opacity-70">
                            <Send className="w-4 h-4 mr-2 sm:mr-0" /><span className="sm:hidden lg:inline">{isNewsletterSubmitting ? "Subscribing..." : "Subscribe"}</span>
                        </Button>
                    </form>
                    {newsletterMessage && (
                      <p
                        id="newsletter-status"
                        className={`mt-2 text-sm ${newsletterStatus === "error" ? "text-red-700" : "text-green-700"}`}
                        role="status"
                        aria-live="polite"
                      >
                        {newsletterMessage}
                      </p>
                    )}
                </div>


            </div>
        </div>
      </section>
    </div>
  );
}
