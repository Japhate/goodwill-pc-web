import { useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, HandHeart, Mail, Lock, BarChart3, Server, MapPin } from "lucide-react";
import {
  CHURCH_CONTACT,
  CHURCH_IDENTITY,
  CHURCH_LOCATION,
} from "@/lib/churchIdentity";

const LAST_UPDATED = "July 6, 2026";

const privacySections = [
  {
    icon: HandHeart,
    title: "Information You Choose to Share",
    body: [
      "Prayer requests may include your name, email address, request details, and whether you asked for the request to appear publicly.",
      "Newsletter subscriptions include your name, email address, subscription status, and unsubscribe information.",
      "Contact, event, and volunteer messages may include the details you provide so the church can respond.",
    ],
  },
  {
    icon: Lock,
    title: "Admin and Account Information",
    body: [
      "Administrator access uses Firebase Authentication and admin records to protect church content tools.",
      "Admin activity may be logged for accountability, troubleshooting, and protecting church records.",
    ],
  },
  {
    icon: BarChart3,
    title: "Site Analytics and Reliability",
    body: [
      "The site may use Google Analytics 4 to understand general page visits. Logged-in administrator sessions are skipped.",
      "Core Web Vitals and browser error reports may be collected to help identify slow pages, broken screens, or reliability issues.",
      "These reports are intended for technical troubleshooting and do not ask for prayer text, form field values, giving details, or passwords.",
    ],
  },
  {
    icon: Server,
    title: "Services That Help Run the Site",
    body: [
      "The site may use Firebase for content, files, and authentication; Resend for email; Render for hosting; Google services for analytics, maps, and YouTube embeds; and uptime tools for availability checks.",
      "Those providers may process limited technical data needed to deliver, secure, monitor, and improve the website.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "How We Use and Protect Information",
    body: [
      "We use submitted information to respond to requests, share church updates, administer site content, troubleshoot issues, and support ministry communication.",
      "We do not sell visitor information. Public prayer requests are only shown publicly when submitted for public sharing and approved through the church's process.",
      "Access to sensitive church website tools is limited to authorized administrators.",
    ],
  },
  {
    icon: Mail,
    title: "Your Choices",
    body: [
      "You can unsubscribe from newsletter emails using the unsubscribe link in each message.",
      "You can contact the church to ask about correcting or removing information you submitted through the site.",
      "You can limit analytics through browser privacy controls or by contacting the church for help with a site-specific opt-out.",
    ],
  },
];

export default function Privacy() {
  useEffect(() => {
    document.title = `Privacy Policy | ${CHURCH_IDENTITY.shortName}`;
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f1e5]">
      <section className="bg-gradient-to-br from-[#3D2519] via-[#5f422f] to-[#A3873E] px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Badge className="mb-5 bg-white/15 text-amber-100 hover:bg-white/20">Privacy & Data Use</Badge>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">Privacy Policy</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-amber-50/90">
            {CHURCH_IDENTITY.name} uses this website to support worship, prayer, communication, and community connection.
            This page explains what information the site handles and how it is used.
          </p>
          <p className="mt-4 text-sm font-semibold text-amber-100">Last updated: {LAST_UPDATED}</p>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-6">
          <Card className="border-amber-200 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl text-[#3D2519]">
                <ShieldCheck className="h-6 w-6 text-amber-700" />
                Our Commitment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                We aim to collect only what is useful for ministry, communication, website security, and reliability.
                Prayer requests and personal messages are treated with care, and administrative access is limited to authorized church leaders and site administrators.
              </p>
              <p>
                This policy may be updated as the website changes. The latest version will remain available on this page.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {privacySections.map((section) => (
              <Card key={section.title} className="border-amber-100 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl text-[#3D2519]">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                      <section.icon className="h-5 w-5" />
                    </span>
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm leading-6 text-gray-700">
                    {section.body.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-amber-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl text-[#3D2519]">
                <MapPin className="h-6 w-6 text-amber-700" />
                Contact the Church
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 text-gray-700 md:grid-cols-[1fr_auto] md:items-center">
              <div className="space-y-2">
                <p className="font-semibold text-gray-900">{CHURCH_IDENTITY.name}</p>
                <p>{CHURCH_LOCATION.displayAddress}</p>
                <p>
                  <a className="font-semibold text-amber-800 hover:text-amber-900" href={CHURCH_CONTACT.phoneHref}>
                    {CHURCH_CONTACT.phoneDisplay}
                  </a>
                  <span className="mx-2 text-gray-400">|</span>
                  <a className="font-semibold text-amber-800 hover:text-amber-900" href={CHURCH_CONTACT.emailHref}>
                    {CHURCH_CONTACT.email}
                  </a>
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                <Button asChild className="bg-amber-700 text-white hover:bg-amber-800">
                  <Link to={createPageUrl("Connect") + "#contact"}>Contact Us</Link>
                </Button>
                <Button asChild variant="outline" className="border-amber-300 text-amber-900 hover:bg-amber-50">
                  <Link to={createPageUrl("Prayer") + "#submit-request"}>Prayer Request</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
