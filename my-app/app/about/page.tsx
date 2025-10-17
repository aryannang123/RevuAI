"use client";

import GooeyNav from "@/components/GooeyNav";
import Aurora from "./Aurora";

export default function AboutPage() {
  const items = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-black flex flex-col items-center text-white">
      {/* Aurora background */}
      <Aurora
        colorStops={["#3A29FF", "#FF94B4", "#FF3232"]}
        blend={0.4}          // slightly less blending so text stays visible
        amplitude={0.7}      // smoother background wave
        speed={0.35}         // slower motion for calm effect
        className="opacity-70" // softened overall glow
      />

      {/* Navigation */}
      <div
        className="fixed top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto
                   rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20
                   shadow-[0_0_25px_rgba(255,255,255,0.15)] px-8 py-3 flex items-center justify-center"
      >
        <GooeyNav items={items} initialActiveIndex={1} />
      </div>

      {/* Scrollable Content */}
      <section
        className="relative z-20 w-full max-w-6xl px-6 sm:px-8 lg:px-12 
                   pt-40 pb-32 space-y-16 overflow-y-auto hide-scrollbar 
                   scroll-smooth"
      >
        {/* Intro Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-cyan-300 drop-shadow-[0_0_10px_rgba(0,255,255,0.4)]">
            Turn Feedback into Fuel
          </h1>
          <p className="mt-4 text-lg md:text-xl text-white/85 max-w-4xl mx-auto leading-relaxed">
            We bridge the gap between raw user data and decisive action, transforming complex feedback into clear, actionable intelligence for your entire team.
          </p>
        </div>

        {/* Section 1 */}
        <div className="bg-white/5 backdrop-blur-md p-10 sm:p-12 rounded-2xl border border-white/10 shadow-lg hover:shadow-[0_0_20px_rgba(0,255,255,0.1)] transition-all">
          <h2 className="text-3xl font-bold text-cyan-300 mb-4">Our Mission: Democratize Data</h2>
          <p className="text-lg text-white/90 leading-relaxed max-w-5xl">
            Valuable customer insights are often locked away in spreadsheets and technical logs, inaccessible to the teams that need them most. 
            We believe in breaking down these information barriers. Our platform is designed to give non-technical teams—from marketing and sales 
            to leadership—direct access to the voice of the customer, empowering them to make faster, smarter decisions.
          </p>
        </div>

        {/* Section 2 */}
        <div className="bg-white/5 backdrop-blur-md p-10 sm:p-12 rounded-2xl border border-white/10 shadow-lg">
          <h2 className="text-3xl font-bold text-cyan-300 mb-10 text-center">How We Empower Your Team</h2>
          <div className="grid md:grid-cols-3 gap-10 text-center">
            <div className="hover:scale-105 transition-transform">
              <h3 className="text-xl font-semibold mb-3 text-cyan-200">Go from Data to Decision, Instantly</h3>
              <p className="text-white/85 leading-relaxed">
                Our AI engine doesn't just show you data; it tells you what to do next. It analyzes all feedback 
                and generates a single, prioritized action item, eliminating guesswork and analysis paralysis.
              </p>
            </div>
            <div className="hover:scale-105 transition-transform">
              <h3 className="text-xl font-semibold mb-3 text-cyan-200">Understand the "Why" Behind the Words</h3>
              <p className="text-white/85 leading-relaxed">
                We move beyond simple “negative” or “positive” ratings. By detecting specific user emotions like 
                frustration and confusion, we pinpoint the exact sources of user friction in your product.
              </p>
            </div>
            <div className="hover:scale-105 transition-transform">
              <h3 className="text-xl font-semibold mb-3 text-cyan-200">Clarity You Can Trust and Verify</h3>
              <p className="text-white/85 leading-relaxed">
                Transparency is key. Our platform allows you to click on any insight, chart, or score to instantly 
                see the original user comments that generated it, giving you full confidence in the data.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3 */}
        <div className="bg-white/5 backdrop-blur-md p-10 sm:p-12 rounded-2xl border border-white/10 shadow-lg">
          <h2 className="text-3xl font-bold text-cyan-300 mb-4">Our Vision for the Future</h2>
          <p className="text-lg text-white/90 leading-relaxed max-w-5xl">
            We envision a world where every company can effortlessly listen to and understand their customers. 
            By making sophisticated data analysis accessible to everyone, we help teams build better products, 
            create happier customers, and drive sustainable growth.
          </p>
        </div>
      </section>
    </main>
  );
}
