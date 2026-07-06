import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  CreditCard, 
  Smartphone, 
  Building, 
  Users, 
  Globe, 
  Shield, 
  CheckCircle, 
  DollarSign,
  Repeat,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Quote
} from "lucide-react";
import { CHURCH_CONTACT, CHURCH_LOCATION } from "@/lib/churchIdentity";

export default function Give() {
  const [selectedAmount, setSelectedAmount] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [selectedFund, setSelectedFund] = useState("general");
  const [givingFrequency, setGivingFrequency] = useState("one-time");

  const quickAmounts = ["25", "50", "100", "250", "500", "1000"];
  
  const funds = [
    {
      id: "general",
      name: "General Fund",
      description: "Supports our church's day-to-day ministry operations including worship, pastoral care, and community outreach.",
      icon: Heart
    },
    {
      id: "building",
      name: "Building & Maintenance",
      description: "Helps maintain our church facilities and supports future building projects and renovations.",
      icon: Building
    },
    {
      id: "missions",
      name: "Missions & Outreach",
      description: "Supports local and global missions, community service projects, and evangelism efforts.",
      icon: Globe
    },
    {
      id: "youth",
      name: "Youth Ministry",
      description: "Funds youth programs, camps, activities, and resources to help young people grow in faith.",
      icon: Users
    }
  ];

  const givingMethods = [
    {
      title: "Online Giving",
      description: "Secure, convenient giving through our online portal",
      icon: CreditCard,
      features: ["One-time or recurring", "Multiple payment methods", "Immediate confirmation", "Tax-deductible receipts"]
    },
    {
      title: "Text to Give",
      description: "Quick and easy giving via text message",
      icon: Smartphone,
      features: ["Text GIVE to (555) 123-4567", "Follow simple prompts", "Secure and encrypted", "Perfect for mobile users"]
    },
    {
      title: "In-Person Giving",
      description: "Traditional giving during worship services",
      icon: Building,
      features: ["Offering plates", "Cash or check", "Special envelopes available", "Personal and meaningful"]
    }
  ];

  const impactStories = [
    {
      title: "Community Food Pantry",
      description: "Thanks to your generous giving, we've been able to serve over 500 families monthly through our food pantry program.",
      amount: "$15,000",
      period: "Monthly Impact"
    },
    {
      title: "Youth Summer Camp",
      description: "Your donations helped send 25 young people to summer camp, where 8 made first-time commitments to Christ.",
      amount: "$12,500",
      period: "Annual Program"
    },
    {
      title: "Facility Improvements",
      description: "Building fund contributions enabled us to renovate the children's wing, creating a safer and more welcoming space.",
      amount: "$45,000",
      period: "Capital Project"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section style={{ background: 'var(--header-bg)' }} className="text-white pt-20 pb-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Give</h1>
            <p className="text-xl max-w-3xl mx-auto leading-relaxed text-amber-100">
              Your generosity helps us spread God's love and make a difference in our community and beyond
            </p>
            <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-lg p-4 max-w-2xl mx-auto">
              <blockquote className="text-lg italic text-amber-200">
                "Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver."
              </blockquote>
              <p className="text-amber-300 font-medium mt-2">2 Corinthians 9:7</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Give Section */}
      <section className="py-4 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Make a Donation</h2>
            <p className="text-lg text-gray-600">Choose your amount and fund to support our ministry</p>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-center text-2xl">Quick Give</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Amount Selection */}
              <fieldset>
                <legend className="block text-sm font-medium text-gray-700 mb-3">Select Amount</legend>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4" role="group" aria-label="Quick donation amounts">
                  {quickAmounts.map((amount) => (
                    <button
                      type="button"
                      key={amount}
                      onClick={() => {setSelectedAmount(amount); setCustomAmount("");}}
                      aria-pressed={selectedAmount === amount}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                        selectedAmount === amount 
                          ? 'border-amber-500 bg-amber-50 text-amber-700' 
                          : 'border-gray-300 hover:border-amber-300'
                      }`}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-gray-400" />
                  <label htmlFor="custom-giving-amount" className="sr-only">Custom donation amount</label>
                  <Input
                    id="custom-giving-amount"
                    type="number"
                    placeholder="Custom amount"
                    value={customAmount}
                    onChange={(e) => {setCustomAmount(e.target.value); setSelectedAmount("");}}
                    min="1"
                    inputMode="decimal"
                    className="flex-1"
                  />
                </div>
              </fieldset>

              {/* Fund Selection */}
              <div>
                <label id="giving-fund-label" className="block text-sm font-medium text-gray-700 mb-3">Choose Fund</label>
                <Select value={selectedFund} onValueChange={setSelectedFund}>
                  <SelectTrigger aria-labelledby="giving-fund-label">
                    <SelectValue placeholder="Select a fund" />
                  </SelectTrigger>
                  <SelectContent>
                    {funds.map((fund) => (
                      <SelectItem key={fund.id} value={fund.id}>
                        {fund.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedFund && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      {funds.find(f => f.id === selectedFund)?.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Frequency Selection */}
              <fieldset>
                <legend className="block text-sm font-medium text-gray-700 mb-3">Giving Frequency</legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3" role="group" aria-label="Giving frequency">
                  {[
                    { id: "one-time", label: "One Time", icon: Calendar },
                    { id: "monthly", label: "Monthly", icon: Repeat },
                    { id: "weekly", label: "Weekly", icon: Repeat }
                  ].map((freq) => (
                    <button
                      type="button"
                      key={freq.id}
                      onClick={() => setGivingFrequency(freq.id)}
                      aria-pressed={givingFrequency === freq.id}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 flex items-center justify-center gap-2 ${
                        givingFrequency === freq.id 
                          ? 'border-amber-500 bg-amber-50 text-amber-700' 
                          : 'border-gray-300 hover:border-amber-300'
                      }`}
                    >
                      <freq.icon className="w-4 h-4" />
                      {freq.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Give Button */}
              <div className="pt-4">
                <Button className="w-full bg-amber-600 hover:bg-amber-700 text-lg py-3">
                  <Heart className="w-5 h-5 mr-2" />
                  Give ${customAmount || selectedAmount || "0"} {givingFrequency !== "one-time" && `(${givingFrequency})`}
                </Button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Secure donation processing • SSL encrypted • Tax deductible
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Fund Details */}
      <section className="py-4 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Where Your Gifts Go</h2>
            <p className="text-lg text-gray-600">Every dollar makes a difference in advancing God's kingdom</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {funds.map((fund) => (
              <Card key={fund.id} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <fund.icon className="w-8 h-8 text-amber-600" />
                  </div>
                  <CardTitle className="text-xl">{fund.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-center">{fund.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Ways to Give */}
      <section className="py-4 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Ways to Give</h2>
            <p className="text-lg text-gray-600">Choose the method that works best for you</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {givingMethods.map((method, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <method.icon className="w-8 h-8 text-green-600" />
                  </div>
                  <CardTitle className="text-xl">{method.title}</CardTitle>
                  <p className="text-gray-600">{method.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {method.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Stories */}
      <section className="py-4 bg-amber-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Your Impact</h2>
            <p className="text-lg text-gray-600">See how your generosity is making a difference</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {impactStories.map((story, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-xl">{story.title}</CardTitle>
                    <Badge className="bg-green-100 text-green-800">{story.period}</Badge>
                  </div>
                  <p className="text-2xl font-bold text-amber-600">{story.amount}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{story.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Security & FAQ */}
      <section className="py-4 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Security */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-8 h-8 text-green-600" />
                <h3 className="text-2xl font-bold text-gray-900">Secure & Trusted</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">SSL Encrypted</h4>
                    <p className="text-gray-600">All transactions are protected with bank-level security</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">PCI Compliant</h4>
                    <p className="text-gray-600">We meet the highest standards for handling payment information</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Tax Deductible</h4>
                    <p className="text-gray-600">Immediate receipts provided for all donations</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Questions About Giving?</h3>
              <div className="space-y-4">
                <p className="text-gray-600">
                  If you have any questions about giving, need help setting up recurring donations, 
                  or want to discuss other ways to support our ministry, we're here to help.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-500" />
                    <span>{CHURCH_CONTACT.phoneDisplay}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-500" />
                    <span>{CHURCH_CONTACT.email}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div>
                      <p>{CHURCH_LOCATION.addressLines[0]}</p>
                      <p>{CHURCH_LOCATION.addressLines[1]}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section style={{ background: 'var(--header-bg)' }} className="py-4 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Quote className="w-12 h-12 text-amber-300 mx-auto mb-6" />
          <blockquote className="text-xl md:text-2xl italic mb-6 text-amber-100">
            "Giving to our church isn't just about supporting programs—it's about being part of something bigger than ourselves. 
            Every time I give, I'm reminded that God has blessed me to be a blessing to others."
          </blockquote>
          <p className="text-amber-300 font-medium">— Sarah Johnson, Church Member since 2015</p>
        </div>
      </section>
    </div>
  );
}
