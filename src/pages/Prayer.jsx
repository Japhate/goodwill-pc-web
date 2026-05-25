import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { PrayerRequests } from "@/entities/PrayerRequests";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { HandHeart, Send, Users, Loader2, Heart, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Prayer() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [prayerRequest, setPrayerRequest] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const location = useLocation();

  const clickNavigating = useRef(false);
  const scrollTimeoutRef = useRef(null);

  const subNavLinks = useMemo(() => [
    { title: "Weekly Prayer", href: "#prayer-week", icon: Sparkles },
    { title: "Prayer Request", href: "#submit-request", icon: HandHeart },
    { title: "Prayer List", href: "#prayer-list", icon: Users },
  ], []);

  useEffect(() => {
    const handleHashNavigation = () => {
      const hash = window.location.hash;
      if (hash) {
        const id = hash.substring(1);
        setTimeout(() => {
          const element = document.getElementById(id);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveSection(id);
          }
        }, 200);
      } else {
        setActiveSection(subNavLinks[0]?.href.substring(1) || "");
      }
    };

    handleHashNavigation();
    window.addEventListener('hashchange', handleHashNavigation);

    return () => {
      window.removeEventListener('hashchange', handleHashNavigation);
    };
  }, [location.pathname, subNavLinks]);

  useEffect(() => {
    const sectionIds = subNavLinks.map(link => link.href.substring(1));
    const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

    const handleScroll = () => {
      if (clickNavigating.current) return;
      
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

      scrollTimeoutRef.current = setTimeout(() => {
        const scrollPosition = window.scrollY;
        const offset = window.innerWidth < 768 ? 140 : 124;

        if (window.innerHeight + scrollPosition >= document.body.offsetHeight - 2) {
          const lastSectionId = sections[sections.length - 1]?.id;
          if (lastSectionId) {
            setActiveSection(lastSectionId);
            return;
          }
        }

        let currentSectionId = "";
        for (const section of sections) {
          if (section.offsetTop <= scrollPosition + offset) {
            currentSectionId = section.id;
          } else {
            break;
          }
        }
        
        setActiveSection(prev => prev !== currentSectionId ? (currentSectionId || (sectionIds[0] || "")) : prev);
      }, 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [subNavLinks]);

  const handleSubNavClick = (e, href) => {
    e.preventDefault();
    const id = href.substring(1);
    const element = document.getElementById(id);

    if (element) {
      clickNavigating.current = true;
      setActiveSection(id);
      window.history.pushState(null, '', href);
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });

      setTimeout(() => {
        clickNavigating.current = false;
      }, 1000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim() || !prayerRequest.trim()) {
      alert("Please provide your name and prayer request.");
      return;
    }

    setSubmitting(true);
    try {
      await PrayerRequests.create({
        name,
        email: email || null,
        prayer_request: prayerRequest,
        is_public: isPublic,
        status: 'pending'
      });

      setName("");
      setEmail("");
      setPrayerRequest("");
      setIsPublic(false);
      setSubmitted(true);

      setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      console.error("Error submitting prayer request:", error);
      alert("There was an error submitting your prayer request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const congregationalPrayerList = [
    "Commissioned Pastor Delica Baxter",
    "Deacon Thaddeus Benjamin",
    "Ms. Alberta Benjamin",
    "Elder Ruby Boyd and Deacon James Boyd",
    "Mr. Ronnie Brown",
    "Mr. Louis Broughton",
    "Deacon Rebecca Chapman",
    "Elder Gladys Cooper",
    "Mr. Isaac and Mrs. Mary G. Cooper",
    "Deacon Mary Fortune Cooper",
    "Dr. Sis. Edna Davis",
    "Mrs. Rosa Dunham",
    "Deacon Everlina Farmer",
    "Elder Irvin and Mrs. Annie Fortune",
    "Deacon Harold Hampton",
    "Ms. Jonette Harper",
    "Mr. Brandon Hunter",
    "Mr. Freeman Humes",
    "Elders Genova and Joe Isaac",
    "Deacon Mozetta Isaac",
    "Mrs. Bridget Rivers Jones",
    "Deacon Hattie McLeod",
    "Mr. Lewis Scriven",
    "Trustee Stanley Scriven",
    "Elder Marion Slater",
    "Deacon Betty Slater",
    "Rev. Samuel Sparks",
    "Dr. Glenn and Joan Winter",
    "Mrs. Pearline Fleming",
    "Mrs. Alethia Gamble"
  ];

  return (
    <div className="min-h-screen" style={{ background: '#fdf8f0' }}>
      {/* Header */}
      <section
        className="text-white relative overflow-hidden"
        style={{
          backgroundImage: "url('/images/site/prayer-header.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'top',
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 md:pt-20 pb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold leading-tight">Prayer Ministry</h1>
            <p className="text-gray-300 mt-1 whitespace-nowrap" style={{ fontSize: 'clamp(8px, 1.8vw, 14px)' }}>
              "The prayer of a righteous person is powerful and effective" - James 5:16
            </p>
          </div>
        </div>
      </section>

      {/* Sub Navigation */}
      <div className="fixed top-20 left-0 right-0 z-30 shadow-md" style={{ background: 'var(--header-bg)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-center gap-2 sm:gap-4 pt-3 pb-0">
            {subNavLinks.map(link => (
              <Button 
                key={link.title} 
                variant="ghost" 
                asChild 
                className={`transition-all duration-200 px-3 py-1 h-auto shadow-sm ${
                  activeSection === link.href.substring(1)
                    ? 'bg-white text-black font-semibold scale-105 rounded-t-md rounded-b-none'
                    : 'bg-amber-400 text-black hover:bg-amber-300 rounded-t-md rounded-b-none'
                }`}
              >
                <a href={link.href} onClick={(e) => handleSubNavClick(e, link.href)} className="flex items-center gap-2">
                  <link.icon className="w-4 h-4" />
                  {link.title}
                </a>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Content with proper padding */}
      <div className="pt-24 md:pt-20">
        {/* Prayer for the Week Section */}
        <section id="prayer-week" className="py-4 scroll-mt-[210px]" style={{ background: 'linear-gradient(135deg, #fdf5e4 0%, #fdf8f0 100%)' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="border-2 border-amber-200 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center bg-gradient-to-r from-amber-100 to-yellow-100 rounded-t-lg">
                <div className="flex justify-center mb-4">
                  <div className="bg-amber-500 rounded-full p-3">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                </div>
                <CardTitle className="text-3xl font-bold text-gray-900">Prayer for the Week</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-lg">
                    <p className="text-lg md:text-xl text-gray-800 leading-relaxed italic mb-4">
                      "Gracious and Sovereign God,
                      <br /><br />
                      We lift before You our government leaders—local, state, and national. Grant them wisdom, integrity, and compassion to govern with justice and mercy. Let their hearts be guided by Your truth and their actions reflect care for the least among us.
                      <br /><br />
                      We pray for those facing hunger and food insecurity. Lord, provide daily bread and open doors for provision, dignity, and hope. Stir our hearts to respond generously, to share from our abundance, and to see Your face in every person in need.
                      <br /><br />
                      Strengthen Your Church, O God, to truly be the Church of Jesus Christ—living out the call of Matthew 25, to serve "the least of these," and fulfilling Matthew 28, to make disciples of all nations. Empower us to lead with love, serve with humility, and shine as witnesses of Your kingdom on earth.
                      <br /><br />
                      In Jesus' name we pray, Amen."
                    </p>
                    <p className="text-right text-sm text-amber-700 font-semibold">
                      - Goodwill Presbyterian Church
                    </p>
                  </div>
                  
                  <div className="text-center pt-4">
                    <p className="text-gray-600 mb-4">Join us in praying this prayer throughout the week</p>
                    <Badge className="bg-amber-500 text-white text-sm px-4 py-2">
                      Updated Weekly
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Submit Prayer Request Section */}
        <section id="submit-request" className="py-4 scroll-mt-[210px]" style={{ background: '#fdf8f0' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
                <HandHeart className="w-8 h-8 text-amber-600" />
                Submit a Prayer Request
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                We believe in the power of prayer. Share your request with us, and our prayer team will lift you up.
              </p>
            </div>

            <Card className="shadow-lg">
              <CardContent className="p-8">
                {submitted && (
                  <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg">
                    <p className="text-green-800 font-semibold">
                      ✓ Your prayer request has been submitted. Our prayer team will be praying for you.
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Your Name *
                    </label>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      required
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email (Optional)
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      We'll only use this to follow up if needed
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Prayer Request *
                    </label>
                    <Textarea
                      value={prayerRequest}
                      onChange={(e) => setPrayerRequest(e.target.value)}
                      placeholder="Share your prayer request..."
                      rows={6}
                      required
                      className="w-full"
                    />
                  </div>

                  <div className="flex items-start space-x-3 p-4 bg-amber-50 rounded-lg">
                    <Checkbox
                      id="isPublic"
                      checked={isPublic}
                      onCheckedChange={setIsPublic}
                      className="mt-1"
                    />
                    <div>
                      <label
                        htmlFor="isPublic"
                        className="text-sm font-semibold text-gray-700 cursor-pointer"
                      >
                        Share with congregation
                      </label>
                      <p className="text-xs text-gray-600 mt-1">
                        Your request will be reviewed and may be shared on our Congregational Prayer List
                      </p>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Submit Prayer Request
                      </>
                    )}
                  </Button>
                </form>

                <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Confidential:</strong> All prayer requests are treated with care and respect. 
                    Only requests marked as public will be shared with the congregation.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Congregational Prayer List Section */}
        <section id="prayer-list" className="py-4 scroll-mt-[210px]" style={{ background: '#f7edcf' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
                <Users className="w-8 h-8 text-amber-600" />
                Congregational Prayer List
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Please join us in lifting up these members of our church family in prayer
              </p>
            </div>

            <Card className="shadow-xl border-2 border-amber-200">
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {congregationalPrayerList.map((name, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
                      <div className="bg-amber-500 rounded-full p-2 flex-shrink-0 mt-0.5">
                        <Heart className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{name}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 pt-6 border-t border-amber-200">
                  <p className="text-center text-gray-600 italic">
                    "Therefore confess your sins to each other and pray for each other so that you may be healed. 
                    The prayer of a righteous person is powerful and effective." - James 5:16
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

      </div>
    </div>
  );
}
