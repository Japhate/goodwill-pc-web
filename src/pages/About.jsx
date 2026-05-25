import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Users, BookOpen, Globe, HelpCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function About() {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState("");
  const clickNavigating = useRef(false); // Flag to indicate if scroll is due to click navigation
  const scrollTimeoutRef = useRef(null); // Ref for scroll debouncing timeout

  const subNavLinks = useMemo(() => [
    { title: "Our Story/History", href: "#story" },
    { title: "Our Mission & Vision", href: "#mission" },
    { title: "Beliefs and Values", href: "#values" },
    { title: "Leadership Team", href: "#team" },
    { title: "FAQs", href: "#faq" },
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
        }, 300); // Changed delay to 300ms
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
    // Filter out nulls in case an ID doesn't exist yet (e.g., initial render before elements are mounted)
    const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

    const handleScroll = () => {
      if (clickNavigating.current) {
        // If navigation was initiated by a click or hash change, defer scroll handling
        return; 
      }
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        const scrollPosition = window.scrollY;
        // Offset for sticky headers, adjusted to cover the sub-nav based on screen size
        const offset = 150; // Updated offset for scroll spy

        // Special case for the bottom of the page
        // Check if we are at the very bottom of the scrollable area
        // Allow for a small buffer (e.g., 2px) to account for floating point inaccuracies
        if (window.innerHeight + scrollPosition >= document.body.offsetHeight - 2) {
          const lastSectionId = sections[sections.length - 1]?.id;
          if (lastSectionId) {
            setActiveSection(lastSectionId);
            return;
          }
        }

        let currentSectionId = "";
        // Loop through sections to find the one currently in view from the top
        // Assuming sections are ordered top-to-bottom on the page.
        for (const section of sections) {
          // If the section's top is visible above or at the scroll position + offset
          if (section.offsetTop <= scrollPosition + offset) {
            currentSectionId = section.id;
          } else {
            // Optimization: if we've passed the current section, subsequent sections will be even further down
            // This relies on `sections` being sorted by their appearance on the page, which it should be.
            break;
          }
        }
        
        // Only update if the section has actually changed to avoid unnecessary re-renders
        setActiveSection(prev => prev !== currentSectionId ? (currentSectionId || (sectionIds[0] || "")) : prev);
      }, 50); // Debounce by 50ms
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial check on mount

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current); // Clear timeout on unmount
      }
    };
  }, [subNavLinks]); // Rerun if subNavLinks change

  const handleSubNavClick = (e, href) => {
    e.preventDefault();
    const id = href.substring(1);
    const element = document.getElementById(id);

    if (element) {
      clickNavigating.current = true;
      setActiveSection(id);
      window.history.pushState(null, '', href);
      element.scrollIntoView({ behavior: 'smooth', block: 'start' }); // Changed to scrollIntoView

      setTimeout(() => {
        clickNavigating.current = false;
      }, 1000);
    }
  };

  const values = [
    {
      icon: Heart,
      title: "Love",
      description: "We believe in showing Christ's love to everyone we meet"
    },
    {
      icon: Users,
      title: "Community",
      description: "We're committed to building authentic relationships"
    },
    {
      icon: BookOpen,
      title: "Truth",
      description: "We ground everything in God's Word and biblical truth"
    },
    {
      icon: Globe,
      title: "Mission",
      description: "We're called to serve both locally and globally"
    }
  ];

  const staff = [
    {
      name: "Rev. Dr. Joe Rigsby",
      role: "Pastor",
      bio: "Rev. Dr. Joe Rigsby has been faithfully serving our congregation with a heart for biblical teaching, pastoral care, and community outreach."
    },
    {
      name: "Elder Barbara R. Champagne",
      role: "Elder",
      bio: "Elder Barbara R. Champagne provides spiritual leadership and guidance to our church family, serving with wisdom and dedication."
    },
    {
      name: "Deacon Loretta Hampton",
      role: "Chair of the Deacon's Board",
      bio: "Deacon Loretta Hampton leads our deacons in serving the congregation and community with compassion and care."
    },
    {
      name: "Elder Herman Muldrow",
      role: "Chair of Building and Grounds",
      bio: "Elder Herman Muldrow oversees the maintenance and care of our church facilities, ensuring a welcoming space for worship and fellowship."
    },
    {
      name: "Elder Dwayne Edwards",
      role: "Elder",
      bio: "Dwayne provides spiritual leadership and governance, offering wisdom and guidance to our church family."
    }
  ];

  const faqs = [
    {
      question: "What should I expect during my first visit?",
      answer: "You can expect a warm welcome from our greeters, contemporary worship music, a biblical message, and friendly conversation after the service. Our services typically last about 75 minutes."
    },
    {
      question: "What do people wear to church?",
      answer: "We encourage you to come as you are! You'll see everything from casual to business attire. The most important thing is that you feel comfortable."
    },
    {
      question: "Do you have programs for children?",
      answer: "Yes! We offer nursery care during worship, children's Sunday school, and youth programs. Our children's ministry provides age-appropriate activities and biblical teaching."
    },
    {
      question: "How can I get involved in the church?",
      answer: "There are many ways to get involved including joining a small group, volunteering in various ministries, participating in community outreach, or using your gifts in worship or service."
    },
    {
      question: "What is your denominational affiliation?",
      answer: "We are a Presbyterian Church (USA) congregation, which means we follow Reformed theology and Presbyterian governance while maintaining ecumenical relationships with other Christian denominations."
    },
    {
      question: "Do you offer Bible studies?",
      answer: "Yes, we have adult Bible study on Wednesday evenings at 6:30 PM, as well as various small groups throughout the week. Check our events page for current offerings."
    }
  ];
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section
        className="text-white relative overflow-hidden"
        style={{
          backgroundImage: "url('/images/site/about-header.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: '50% 75%',
        }}
      >
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 md:pt-20 pb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold leading-tight">About Our Church</h1>
            <p className="text-gray-300 text-sm mt-1">Our history · Mission · Leadership · Faith & beliefs</p>
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
                        <a href={link.href} onClick={(e) => handleSubNavClick(e, link.href)}>
                            {link.title}
                        </a>
                    </Button>
                ))}
            </div>
        </div>
      </div>

      {/* Content with padding to account for fixed sub-nav - reduced spacing */}
      <div className="pt-24 md:pt-20">
        {/* Our Story */}
        <section id="story" className="py-4 bg-white scroll-mt-[210px]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Our Story</h2>
                <div className="prose prose-lg text-gray-600 space-y-4">
                  <p>
                    Goodwill Presbyterian Church was founded in 1867 by a group of faithful believers who felt called 
                    to create a place where people could experience God's love and grow in their faith together.
                  </p>
                  <p>
                    The first pastor of Goodwill Presbyterian Church was Rev. Matthew R. Miller, who served from 1867 to 1880. The second minister identified is Dr. Irby D. Davis, who is noted as the first black minister, serving from 1894 to 1924.
                  </p>
                  <p>
                    Over the years, we've grown from a small gathering to a thriving community 
                    of faithful members. But our mission remains the same: to be a place where everyone can 
                    find hope, healing, and purpose in Jesus Christ.
                  </p>
                  <p>
                    We believe that church isn't just about Sunday services—it's about building relationships, 
                    serving our community, and walking through life's joys and challenges together.
                  </p>
                </div>
              </div>
              <div>
                <img 
                  src="/images/site/about-community.png"
                  alt="Goodwill Presbyterian Church building"
                  className="rounded-lg shadow-lg"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Mission & Vision Statement */}
        <section id="mission" style={{ background: 'var(--header-bg)' }} className="text-white py-4 scroll-mt-[210px]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-8">Our Mission & Vision</h2>
              <div className="grid lg:grid-cols-2 gap-12">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
                  <h3 className="text-2xl font-bold text-amber-300 mb-4">Our Mission Statement</h3>
                  <p className="text-xl leading-relaxed text-amber-100">
                    To bring humankind into the fold and to nurture and equip them for ministry in the church and the world.
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
                  <h3 className="text-2xl font-bold text-amber-300 mb-4">Our Vision</h3>
                  <p className="text-xl leading-relaxed text-amber-100">
                    "To be a thriving community where all people experience God's transforming love, 
                    grow in faith, and are empowered to serve others."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Beliefs and Values */}
        <section id="values" className="py-4 bg-gray-50 scroll-mt-[210px]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Beliefs & Values</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                These core beliefs and values guide everything we do as a church community
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
              {values.map((value, index) => (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <value.icon className="w-8 h-8 text-amber-600" />
                    </div>
                    <CardTitle className="text-xl text-gray-900">{value.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{value.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Core Beliefs */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">What We Believe</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Scripture</h4>
                      <p className="text-gray-600 text-sm">We believe the Bible is God's inspired Word and our ultimate authority for faith and life.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Trinity</h4>
                      <p className="text-gray-600 text-sm">We believe in one God eternally existing in three persons: Father, Son, and Holy Spirit.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Salvation</h4>
                      <p className="text-gray-600 text-sm">We believe salvation comes through faith in Jesus Christ alone, by grace alone.</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Church</h4>
                      <p className="text-gray-600 text-sm">We believe the church is the body of Christ, called to worship, fellowship, and service.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Sacraments</h4>
                      <p className="text-gray-600 text-sm">We practice baptism and communion as means of grace ordained by Christ.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Mission</h4>
                      <p className="text-gray-600 text-sm">We believe we are called to share the gospel and serve others in Christ's name.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Leadership Team */}
        <section id="team" className="py-4 bg-white scroll-mt-[210px]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Meet Our Leadership Team</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Our dedicated staff and leaders are here to serve and support our church family
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {staff.map((person, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                  <CardHeader className="text-center">
                    <CardTitle className="text-xl text-gray-900">{person.name}</CardTitle>
                    <p className="text-amber-600 font-medium">{person.role}</p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-center">{person.bio}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section id="faq" className="py-4 bg-gray-50 scroll-mt-[210px]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
              <p className="text-lg text-gray-600">
                Have questions about our church? Here are some answers to help you feel more prepared for your visit.
              </p>
            </div>

            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-start gap-3 text-xl text-gray-900">
                      <HelpCircle className="w-6 h-6 text-amber-600 mt-0.5 flex-shrink-0" />
                      {faq.question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 ml-9">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-12">
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Still Have Questions?</h3>
                  <p className="text-gray-600 mb-6">
                    Don't hesitate to reach out! Our staff and volunteers are always happy to answer 
                    any questions you might have about our church, programs, or beliefs.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild className="bg-amber-600 hover:bg-amber-700">
                      <Link to={createPageUrl("Connect") + "#contact"}>Contact Us</Link>
                    </Button>
                    <Button asChild variant="outline" className="border-amber-600 text-amber-600 hover:bg-amber-50">
                      <Link to={createPageUrl("Connect") + "#visit"}>Plan a Visit</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
