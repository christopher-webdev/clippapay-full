import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Users, Video, TrendingUp, Target, Shield } from "lucide-react";
import clippapayLogo from "/ClippaPayb.svg";
import NavBar from "../components/NavBar";

const Campaign = () => {
  return (
    <div className="min-h-screen">
      <NavBar />
      {/* Hero Section */}
      <section className="gradient-hero text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
        
        <div className="container mx-auto px-4 py-20 md:py-32 relative z-10">
          <div className="max-w-4xl mx-auto text-center animate-fade-in-up">
            {/* Logo */}
            <div className="mb-8 flex justify-center">
              <img src={clippapayLogo} alt="Clippapay" className="h-16 md:h-20 w-auto" />
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Achieve Campaign Success Through
              <span className="block text-accent">
                People-Powered Influence
              </span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-foreground/90 leading-relaxed">
              Transform real people into your brand's most authentic voices with Clippapay's revolutionary UGC platform
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-glow text-lg px-8 py-6 rounded-full transition-smooth"
              >
                Book a 15-Minute Demo
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20 text-lg px-8 py-6 rounded-full backdrop-blur-sm transition-smooth"
              >
                Start ₦1M Test Project
              </Button>
            </div>
            <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-accent" />
                <span>500,000+ Active Clippers</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-accent" />
                <span>Verified Engagements</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-accent" />
                <span>Dedicated Manager</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-foreground">
                Campaign Success in the Digital Age
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                Modern campaigns aren't won by spending big—they're won by winning hearts and trust online. 
                Clippapay connects you with <strong className="text-foreground">real people</strong> who become authentic voices for your message across WhatsApp, TikTok, Instagram, Facebook, and X.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* UGC Campaign Section */}
      <section className="py-20 gradient-card">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="animate-fade-in-up">
                <div className="inline-block mb-4">
                  <span className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold">
                    The Real Magic
                  </span>
                </div>
                <h2 className="text-3xl md:text-5xl font-bold mb-6 text-foreground">
                  UGC Campaigns
                  <span className="block text-2xl md:text-3xl text-primary mt-2">
                    People-to-People Influence
                  </span>
                </h2>
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  Your message transforms into <strong className="text-foreground">hundreds or thousands of unique videos</strong> created by our network of 500,000+ active Clippers.
                </p>
                <ul className="space-y-4">
                  <li className="flex gap-3">
                    <Users className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <strong className="text-foreground">Authentic & Diverse:</strong>
                      <p className="text-muted-foreground">Each Clipper creates content in their own style, language, and tone</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <Video className="w-6 h-6 text-secondary flex-shrink-0 mt-1" />
                    <div>
                      <strong className="text-foreground">Multi-Voice Approach:</strong>
                      <p className="text-muted-foreground">Messages from trusted friends and family, not generic promotional ads</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <TrendingUp className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                    <div>
                      <strong className="text-foreground">Socially Contagious:</strong>
                      <p className="text-muted-foreground">Word-of-mouth influence at digital speed prevents ad fatigue</p>
                    </div>
                  </li>
                </ul>
              </div>
              <Card className="p-8 shadow-elegant bg-card animate-scale-in">
                <h3 className="text-2xl font-bold mb-6 text-foreground">Why UGC Outperforms Ads</h3>
                <div className="space-y-6">
                  <div className="border-l-4 border-primary pl-4">
                    <h4 className="font-semibold text-lg text-foreground mb-2">Genuine Faces</h4>
                    <p className="text-muted-foreground">People see relatable creators, not generic marketing visuals</p>
                  </div>
                  <div className="border-l-4 border-secondary pl-4">
                    <h4 className="font-semibold text-lg text-foreground mb-2">Personal Connection</h4>
                    <p className="text-muted-foreground">Each message feels personal, not sponsored or forced</p>
                  </div>
                  <div className="border-l-4 border-accent pl-4">
                    <h4 className="font-semibold text-lg text-foreground mb-2">Fresh Variety</h4>
                    <p className="text-muted-foreground">Constant variation keeps the message engaging and dynamic</p>
                  </div>
                </div>
                <div className="mt-8 p-6 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-center text-lg font-semibold text-foreground">
                    Your message doesn't just go viral—
                    <span className="block text-primary mt-2 text-xl">
                      it becomes socially contagious
                    </span>
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* PGC Campaign Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-block mb-4">
              <span className="bg-secondary text-secondary-foreground px-4 py-2 rounded-full text-sm font-semibold">
                Professional Content
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-foreground">
              PGC Campaigns
              <span className="block text-2xl md:text-3xl text-secondary mt-2">
                Controlled Messaging, Professional Quality
              </span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Professional creators produce high-quality content based on your team's creative direction. 
              You maintain full control and post on your official channels—perfect for combining official branding with grassroots UGC amplification.
            </p>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-foreground">
                The Numbers
                <span className="block text-2xl md:text-3xl text-primary mt-2">
                  Proven, Scalable Reach
                </span>
              </h2>
              <p className="text-lg text-muted-foreground mb-4">
                Every 1,000 verified views earns the Clipper ₦5,000
              </p>
            </div>

            <div className="overflow-x-auto shadow-elegant rounded-xl">
              <table className="w-full bg-card">
                <thead>
                  <tr className="gradient-primary text-primary-foreground">
                    <th className="py-6 px-6 text-left text-lg font-bold">Budget (₦)</th>
                    <th className="py-6 px-6 text-left text-lg font-bold">Verified Views</th>
                    <th className="py-6 px-6 text-left text-lg font-bold">Estimated Reach</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr className="hover:bg-muted/30 transition-smooth">
                    <td className="py-6 px-6 font-bold text-xl text-foreground">₦10,000,000</td>
                    <td className="py-6 px-6 text-lg text-muted-foreground">2,000,000 views</td>
                    <td className="py-6 px-6 text-lg font-semibold text-success">~1.5–2 million people</td>
                  </tr>
                  <tr className="hover:bg-muted/30 transition-smooth">
                    <td className="py-6 px-6 font-bold text-xl text-foreground">₦100,000,000</td>
                    <td className="py-6 px-6 text-lg text-muted-foreground">20,000,000 views</td>
                    <td className="py-6 px-6 text-lg font-semibold text-success">~15–20 million people</td>
                  </tr>
                  <tr className="hover:bg-muted/30 transition-smooth bg-accent/5">
                    <td className="py-6 px-6 font-bold text-2xl text-accent">₦1,000,000,000</td>
                    <td className="py-6 px-6 text-lg text-muted-foreground">200,000,000 views</td>
                    <td className="py-6 px-6 text-lg font-bold text-accent">~150–200 million impressions</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-8 text-center">
              <p className="text-lg text-muted-foreground italic">
                These aren't random eyeballs—these are <strong className="text-foreground">real, verified engagements</strong> from people seeing content shared by those they personally know and trust.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why It Works */}
      <section className="py-20 gradient-card">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-12 text-center text-foreground">
              Why It Secures Campaign Success
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="p-6 shadow-soft hover:shadow-elegant transition-smooth bg-card">
                <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">Authenticity Beats Algorithms</h3>
                <p className="text-muted-foreground">Real people sharing your message builds deeper emotional trust than any paid ad</p>
              </Card>

              <Card className="p-6 shadow-soft hover:shadow-elegant transition-smooth bg-card">
                <div className="w-12 h-12 gradient-accent rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">Diversity of Voices</h3>
                <p className="text-muted-foreground">Hundreds of thousands of unique videos—every message feels fresh, never repetitive</p>
              </Card>

              <Card className="p-6 shadow-soft hover:shadow-elegant transition-smooth bg-card">
                <div className="w-12 h-12 bg-success rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-success-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">Speed & Virality</h3>
                <p className="text-muted-foreground">Messages spread rapidly through family, social, and professional networks</p>
              </Card>

              <Card className="p-6 shadow-soft hover:shadow-elegant transition-smooth bg-card">
                <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-secondary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">Hyper-Targeting</h3>
                <p className="text-muted-foreground">Reach any region or demographic through localized, culturally relevant content</p>
              </Card>

              <Card className="p-6 shadow-soft hover:shadow-elegant transition-smooth bg-card">
                <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center mb-4">
                  <CheckCircle className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">Data-Driven Transparency</h3>
                <p className="text-muted-foreground">Every engagement is tracked and verified on Clippapay's dashboard</p>
              </Card>

              <Card className="p-6 shadow-soft hover:shadow-elegant transition-smooth bg-card">
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">Dedicated Support</h3>
                <p className="text-muted-foreground">Your dedicated social media manager ensures seamless execution from setup to reporting</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 gradient-hero text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Your Competitors Are Spending Millions on Cold Ads
              <span className="block text-accent mt-4">
                You Can Spend Smarter
              </span>
            </h2>
            <p className="text-xl md:text-2xl mb-8 text-primary-foreground/90 leading-relaxed">
              Turn real people into authentic brand voices. Seize this opportunity before your competitors do.
            </p>
            
            <div className="bg-primary-foreground/10 backdrop-blur-lg rounded-2xl p-8 md:p-12 mb-8 border border-primary-foreground/20 shadow-glow">
              <h3 className="text-2xl md:text-3xl font-bold mb-4">Start Your Test Project Today</h3>
              <p className="text-lg mb-6 text-primary-foreground/80">
                Pilot a ₦1M test project in one constituency and see measurable results in just 7 days
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="https://wa.me/2348053353964?text=Hello%20ClippaPay%20Team%2C%20I%20want%20to%20know%20more."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-glow text-lg px-10 py-6 rounded-full transition-smooth inline-flex items-center justify-center"
                >
                  Book a 15-Minute Demo
                </a>
                <a 
                  href="https://wa.me/2348053353964?text=Hello%20ClippaPay%20Team%2C%20I%20want%20to%20know%20more."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 text-lg px-10 py-6 rounded-full transition-smooth inline-flex items-center justify-center"
                >
                  Contact Us Now
                </a>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mt-12">
              <div className="text-center">
                <div className="text-5xl font-bold text-accent mb-2">500K+</div>
                <div className="text-primary-foreground/80">Active Clippers</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-accent mb-2">200M+</div>
                <div className="text-primary-foreground/80">Potential Reach</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-accent mb-2">7 Days</div>
                <div className="text-primary-foreground/80">To See Results</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-foreground/5 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">
            &copy; 2025 Clippapay. Harness the power of authentic influence for campaign success.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Campaign;