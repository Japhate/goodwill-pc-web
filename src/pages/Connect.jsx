import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Mail, Clock, Car, Users, Heart, Copy, Check, Map, MailQuestion, Handshake, Video } from "lucide-react";
import { getActiveSpecialServiceNotice } from "@/lib/specialServiceNotice";

export default function Connect() {
  const location = useLocation();
  const [copiedItem, setCopiedItem] = useState(null);
  const [copyMessage, setCopyMessage] = useState("");
  const [activeSection, setActiveSection] = useState("");
  const [now, setNow] = useState(new Date());
  const clickNavigating = useRef(false);
  const scrollTimeout = useRef(null);
  const activeSpecialServiceNotice = getActiveSpecialServiceNotice(now);
  const inPersonOnlyNotice = activeSpecialServiceNotice?.liveStreamAvailable === false ? activeSpecialServiceNotice : null;

  const subNavLinks = useMemo(() => [
    { title: "Plan a Visit", href: "#visit", icon: Map },
    { title: "Contact Us", href: "#contact", icon: MailQuestion },
    { title: "Volunteer", href: "#volunteer", icon: Handshake },
    { title: "Location & Directions", href: "#location", icon: MapPin },
  ], []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(interval);
  }, []);

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

  const copyToClipboard = async (text, itemId, itemType) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(itemId);
      
      const messages = {
        phone: "Phone number copied to clipboard",
        email: "Email address copied to clipboard",
        address: "Address copied to clipboard"
      };
      
      setCopyMessage(messages[itemType] || "Copied to clipboard");
      
      setTimeout(() => {
        setCopiedItem(null);
        setCopyMessage("");
      }, 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      setCopyMessage("Failed to copy!");
      setTimeout(() => setCopyMessage(""), 2000);
    }
  };

  const contactInfo = [
    {
      icon: Phone,
      title: "Phone",
      details: ["(803) 495-3599"],
      actionText: "Call Now",
      href: "tel:8034953599",
      copyText: "(803) 495-3599",
      copyId: "phone",
      copyType: "phone"
    },
    {
      icon: Mail,
      title: "Email",
      details: ["goodwillpresch1867@gmail.com"],
      actionText: "Send Email",
      href: "mailto:goodwillpresch1867@gmail.com",
      copyText: "goodwillpresch1867@gmail.com",
      copyId: "email",
      copyType: "email"
    },
    {
      icon: MapPin,
      title: "Address",
      details: ["295 North Brick Church Road", "Mayesville, SC 29104"],
      actionText: "Get Directions",
      href: "https://www.google.com/maps/search/?api=1&query=295+North+Brick+Church+Road,Mayesville,SC+29104",
      target: "_blank",
      copyText: "295 North Brick Church Road, Mayesville, SC 29104",
      copyId: "address",
      copyType: "address"
    }
  ];

  const serviceHours = [
    inPersonOnlyNotice
      ? {
          day: "Today",
          time: inPersonOnlyNotice.serviceTimeLabel,
          event: "United Service at Second Presbyterian Church",
          location: inPersonOnlyNotice.locationLabel,
          directionsUrl: inPersonOnlyNotice.directionsUrl,
          note: "No service at Goodwill's main sanctuary. No livestream today.",
          urgent: true,
        }
      : { day: "Sunday", time: "10:30 AM", event: "Worship Service" },
    { day: "Wednesday", time: "6:30 PM", event: "Bible Study", zoomLink: "https://us02web.zoom.us/j/82827270338?pwd=9JhQLcH0WjX6Xvy7LqvNtZUE3UBr9C.1" }
  ];
  
  useEffect(() => {
    const sectionIds = subNavLinks.map(link => link.href.substring(1));
    const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

    const handleScroll = () => {
      if (clickNavigating.current) {
        return; 
      }
      
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      scrollTimeout.current = setTimeout(() => {
        const scrollPosition = window.scrollY;
        const offset = 150;

        if ((window.innerHeight + scrollPosition) >= (document.body.offsetHeight - 2)) {
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
        
        setActiveSection(currentSectionId || (sectionIds[0] || ""));
      }, 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
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

  const volunteerOpportunities = [
    {
      title: "Worship Team",
      description: "Share your musical talents with our congregation",
      commitment: "Sunday mornings + practice",
      skills: "Musical ability, heart for worship"
    },
    {
      title: "Children's Ministry",
      description: "Help nurture the next generation in their faith journey",
      commitment: "Sunday mornings or special events",
      skills: "Love for children, patience, reliability"
    },
    {
      title: "Greeter/Usher",
      description: "Welcome visitors and help create a warm atmosphere",
      commitment: "1-2 Sundays per month",
      skills: "Friendly personality, welcoming spirit"
    },
    {
      title: "Food Pantry",
      description: "Serve families in need through our community outreach",
      commitment: "Flexible scheduling",
      skills: "Servant's heart, physical ability to lift boxes"
    },
    {
      title: "Tech Team",
      description: "Support worship through sound, video, and livestreaming",
      commitment: "Sunday services + training",
      skills: "Technical aptitude, attention to detail"
    },
    {
      title: "Administrative Support",
      description: "Help with office tasks, mailings, and church communications",
      commitment: "Flexible hours",
      skills: "Basic computer skills, organizational abilities"
    }
  ];

  return (
    <div className="min-h-screen" style={{ background: '#fdf8f0' }}>
      {/* Header */}
      <section
        className="text-white relative overflow-hidden"
        style={{
          backgroundImage: "url('/images/site/connect-header.png')",
          backgroundSize: 'cover',
          backgroundPosition: '50% 65%',
        }}
      >
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 md:pt-20 pb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold leading-tight">Connect With Us</h1>
            <p className="text-gray-300 text-sm mt-1">Visit · Contact · Volunteer · Directions</p>
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

      {/* Copy Message Toast */}
      {copyMessage && (
        <div className="fixed top-24 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in slide-in-from-right">
          {copyMessage}
        </div>
      )}

      {/* Content with padding to account for fixed sub-nav */}
      <div className="pt-24 md:pt-20">
        {/* First Time Visitors */}
        <section id="visit" className="py-4 scroll-mt-[210px]" style={{ background: '#fdf8f0' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Plan Your First Visit
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                We'd love to welcome you! Here's what to expect when you visit us.
              </p>
            </div>

            {inPersonOnlyNotice && (
              <div className="mx-auto mb-8 max-w-4xl rounded-lg border border-red-200 bg-red-50 p-5 text-center shadow-sm">
                <p className="text-sm font-bold uppercase tracking-widest text-red-700">Important Worship Update</p>
                <h3 className="mt-1 text-2xl font-bold text-gray-900">United Service Today at 10:30 AM</h3>
                <p className="mx-auto mt-2 max-w-2xl rounded-md bg-red-600 px-4 py-3 text-sm font-bold text-white">
                  Today's service is at Second Presbyterian Church in Sumter. No service at Goodwill's main sanctuary. No livestream today.
                </p>
                <Button asChild className="mt-4 bg-amber-600 text-white hover:bg-amber-700">
                  <a href={inPersonOnlyNotice.directionsUrl} target="_blank" rel="noopener noreferrer">
                    <MapPin className="mr-2 h-4 w-4" />
                    Get Directions
                  </a>
                </Button>
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">When to Arrive</h3>
                <p className="text-gray-600">
                  We recommend arriving 10-15 minutes early to find parking and get settled. 
                  Our greeters will be happy to help you find your way.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">What to Wear</h3>
                <p className="text-gray-600">
                  Come as you are! We dress casually to business casual. 
                  The most important thing is that you feel comfortable.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">What to Expect</h3>
                <p className="text-gray-600">
                  Our service includes worship music, prayer, and a message from God's Word. 
                  We'd love to pray for you and answer any questions you have.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Sunday Service Overview</h3>
              <div className="grid grid-cols-2 gap-3 md:gap-0 md:flex md:flex-row md:items-center md:justify-center" style={{ gridAutoFlow: 'column', gridTemplateRows: 'repeat(3, minmax(0, 1fr))' }}>
                {[
                  { icon: '🙏', title: 'Welcome &\nAnnouncements' },
                  { icon: '🎵', title: 'Opening\nWorship' },
                  { icon: '📖', title: 'Prayer &\nScripture(s)' },
                  { icon: '💬', title: 'Message from\nGod\'s Word' },
                  { icon: '🤝', title: 'Closing &\nFellowship' }
                ].map((step, idx) => (
                  <div key={idx} className="relative flex flex-col w-full">
                    <div className="flex flex-row items-center md:flex-col md:items-center gap-3 md:gap-2 relative md:flex-1">
                      <div className="relative w-14 h-14">
                        <div className="w-14 h-14 rounded-full bg-amber-100 border-4 border-amber-600 flex items-center justify-center text-2xl shadow-md">
                          {step.icon}
                        </div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center border-2 border-white shadow-md">
                          {idx < 3 ? idx + 1 : idx}
                        </div>
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 text-left md:text-center whitespace-pre-line md:mt-2">{step.title}</h4>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Contact Information */}
        <section id="contact" className="py-4 scroll-mt-[210px]" style={{ background: '#fdf8f0' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Contact Details */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-6">Get in Touch</h2>
                  <p className="text-lg text-gray-600 mb-8">
                    Whether you're planning your first visit or have been part of our family for years, 
                    we're here to help and answer any questions you might have.
                  </p>
                </div>

                <div className="grid gap-6">
                  {contactInfo.map((item, index) => (
                    <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                            <item.icon className="w-6 h-6 text-amber-600" />
                          </div>
                          <CardTitle className="text-xl">{item.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {item.title === "Address" ? (
                            <div className="flex items-center justify-between">
                              <div>
                                {item.details.map((detail, i) => (
                                  <p key={i} className="text-gray-600">{detail}</p>
                                ))}
                              </div>
                              <button
                                onClick={() => copyToClipboard(item.copyText, item.copyId, item.copyType)}
                                className="p-1 text-gray-400 hover:text-amber-600 transition-colors"
                                title="Copy to clipboard"
                              >
                                {copiedItem === item.copyId ? (
                                  <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          ) : (
                            item.details.map((detail, i) => (
                              <div key={i} className="flex items-center justify-between">
                                <p className="text-gray-600">{detail}</p>
                                <button
                                  onClick={() => copyToClipboard(item.copyText, item.copyId, item.copyType)}
                                  className="p-1 text-gray-400 hover:text-amber-600 transition-colors"
                                  title="Copy to clipboard"
                                >
                                  {copiedItem === item.copyId ? (
                                    <Check className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            ))
                          )}
                          <Button asChild variant="outline" className="mt-4 text-amber-600 border-amber-600 hover:bg-amber-50">
                            <a href={item.href} target={item.target || "_self"}>
                              {item.actionText}
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Service Times & Parking/Accessibility */}
              <div className="space-y-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                      <Clock className="w-6 h-6 text-amber-600" />
                      Service Times
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {serviceHours.map((service, index) => (
                        <div key={index} className={`flex flex-col gap-3 rounded-lg p-3 sm:flex-row sm:items-center sm:justify-between ${service.urgent ? "border border-red-200 bg-red-50" : "bg-gray-50"}`}>
                          <div className="flex-1">
                            <p className={`font-medium ${service.urgent ? "text-red-800" : "text-gray-900"}`}>{service.event}</p>
                            <p className="text-sm text-gray-600">{service.day}</p>
                            {service.location && <p className="mt-1 text-sm font-semibold text-gray-800">{service.location}</p>}
                            {service.note && <p className="mt-2 rounded bg-red-600 px-3 py-2 text-xs font-bold text-white">{service.note}</p>}
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            {service.directionsUrl && (
                              <Button asChild size="sm" className="bg-amber-600 text-white hover:bg-amber-700">
                                <a href={service.directionsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  <span>Directions</span>
                                </a>
                              </Button>
                            )}
                            {service.zoomLink && (
                              <Button asChild size="sm" className="h-auto rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700">
                                <a href={service.zoomLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                                  <Video className="w-4 h-4" />
                                  <span>Join Zoom</span>
                                </a>
                              </Button>
                            )}
                            <p className="font-semibold text-amber-600">{service.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                      <Car className="w-6 h-6 text-amber-600" />
                      Parking & Accessibility
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-amber-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-amber-900 mb-2">Parking</h4>
                        <p className="text-amber-800">
                          Free and convenient parking is available in our main lot for all who worship and fellowship with us.
                        </p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-green-900 mb-2">Accessibility</h4>
                        <p className="text-green-800 text-sm">
                          Our building is fully accessible with ramps accessible restrooms.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Volunteer Opportunities */}
        <section id="volunteer" className="py-4 scroll-mt-[210px]" style={{ background: '#fdf5e4' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Volunteer Opportunities
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Use your gifts and talents to serve God and our community
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {volunteerOpportunities.map((opportunity, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <CardTitle className="text-xl text-gray-900">{opportunity.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-gray-600">{opportunity.description}</p>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-semibold text-gray-900">Commitment:</span>
                        <p className="text-gray-600">{opportunity.commitment}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900">Skills Needed:</span>
                        <p className="text-gray-600">{opportunity.skills}</p>
                      </div>
                    </div>
                    <Button asChild className="w-full bg-amber-600 hover:bg-amber-700 mt-4">
                      <a href="#contact">Learn More</a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-12">
              <Card className="max-w-2xl mx-auto">
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Ready to Get Involved?
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Contact our church office to learn more about volunteer opportunities 
                    or to schedule a meeting with one of our ministry leaders.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild className="bg-amber-600 hover:bg-amber-700">
                      <a href="mailto:goodwillpresch1867@gmail.com">Contact Church Office</a>
                    </Button>
                    <Button asChild variant="outline" className="border-amber-600 text-amber-600 hover:bg-amber-50">
                      <Link to={createPageUrl("Prayer")}>Submit Prayer Request</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        
        {/* Location & Directions */}
        <section id="location" className="py-4 scroll-mt-[210px]" style={{ background: '#fdf8f0' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Location & Directions
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                We're located in the heart of Mayesville, South Carolina
              </p>
            </div>

            {inPersonOnlyNotice && (
              <div className="mx-auto mb-8 max-w-4xl rounded-lg border border-red-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-widest text-red-700">Today's Worship Location</p>
                    <h3 className="mt-1 text-xl font-bold text-gray-900">{inPersonOnlyNotice.locationLabel}</h3>
                    <p className="mt-2 rounded-md bg-red-600 px-3 py-2 text-sm font-bold text-white">
                      Goodwill's main sanctuary will not host today's 10:30 AM service.
                    </p>
                  </div>
                  <Button asChild className="bg-amber-600 text-white hover:bg-amber-700">
                    <a href={inPersonOnlyNotice.directionsUrl} target="_blank" rel="noopener noreferrer">
                      <MapPin className="mr-2 h-4 w-4" />
                      Get Directions
                    </a>
                  </Button>
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-12">
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                      <MapPin className="w-6 h-6 text-amber-600" />
                      Address & Detailed Directions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="bg-amber-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-amber-900 mb-2">Our Address</h4>
                        <p className="text-amber-800">
                          295 N Brick Church Rd<br />
                          Mayesville, SC 29104
                        </p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold text-gray-900">From I-95:</h4>
                        <p className="text-gray-600 text-sm">
                          Take Exit 119 toward Mayesville. Follow US-15 North for approximately 3 miles. 
                          Turn right onto N Brick Church Rd. The church will be on your left.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold text-gray-900">From Florence:</h4>
                        <p className="text-gray-600 text-sm">
                          Take US-15 South toward Mayesville for about 15 miles. 
                          Turn left onto N Brick Church Rd. The church will be on your left.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Interactive Map</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80 bg-gray-200 rounded-lg overflow-hidden">
                      <iframe
                        src="https://maps.google.com/maps?q=295%20N%20Brick%20Church%20Rd%2C%20Mayesville%2C%20SC%2029104&t=&z=15&ie=UTF8&iwloc=&output=embed"
                        className="w-full h-full border-0"
                        loading="lazy"
                        aria-label="Detailed map of church location"
                      ></iframe>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
