"use client";

import Iridescence from "@/components/Iridescence";
import GooeyNav from "@/components/GooeyNav";
import ProfileCard from "@/components/ProfileCard";

export default function ContactPage() {
  const team = [
    {
      name: "Eshwar",
      github: "ESHWAR1024",
      githubUrl: "https://github.com/ESHWAR1024",
      email: "eshwar10245@gmail.com",
      avatarUrl: "/yorichi.jpg",
    },
    {
      name: "Aryan",
      github: "aryannang123",
      githubUrl: "https://github.com/aryannang123",
      email: "aryannangarath407@gmail.com",
      avatarUrl: "/akaza.jpg",
    },
    {
      name: "Amogh",
      github: "amogh-2007",
      githubUrl: "https://github.com/amogh-2007",
      email: "amoghherle07@gmail.com",
      avatarUrl: "/rengoku.jpeg",
    },
    {
      name: "Gagan",
      github: "gaganraghavan",
      githubUrl: "https://github.com/gaganraghavan",
      email: "gaganraghavan@gmail.com",
      avatarUrl: "/zeinitsu.jpeg",
    },
  ];

  const items = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <main className="relative min-h-screen w-full overflow-hidden text-white flex flex-col items-center justify-center">
      {/* Iridescent Background */}
      <div className="absolute inset-0 -z-20">
        <Iridescence color={[0.4, 0.6, 1]} mouseReact={false} amplitude={0.1} speed={1.0} />
      </div>

      {/* Glass GooeyNav */}
      <div className="absolute top-8 z-30 flex justify-center w-full">
        <div className="backdrop-blur-2xl bg-white/15 border border-white/30 rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.15)] px-10 py-2">
          <div style={{ height: 40, position: "relative", width: "auto" }}>
            <GooeyNav
              items={items}
              particleCount={15}
              particleDistances={[90, 10]}
              particleR={100}
              initialActiveIndex={2} // Contact active
              animationTime={600}
              timeVariance={300}
              colors={[1, 2, 3, 1, 2, 3, 1, 4]}
            />
          </div>
        </div>
      </div>

      {/* Header */}
      <section className="relative z-20 text-center pt-40 pb-12 px-6">
        <h1 className="text-6xl font-extrabold text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]">
          Meet Our Team
        </h1>
        <p className="mt-4 text-cyan-100/80 text-lg font-medium">Reach out through GitHub or Email ✨</p>
      </section>

      {/* Team Cards */}
      <section className="relative z-20 w-full max-w-7xl mx-auto px-8 pb-56">
        <div className="flex flex-wrap justify-center gap-16">
          {team.map((member, i) => (
            <div
              key={i}
              className="flex flex-col items-center relative"
              style={{ isolation: "isolate" }}
            >
              {/* Card container with spacing so contents below don't overlap */}
              <div className="w-[230px] h-[280px] relative mb-6">
                <ProfileCard
                  name={member.name}
                  title="Developer"
                  handle={member.github}
                  /* removed githubUrl and email props to avoid TS errors */
                  handleColor="rgba(0,255,255,0.9)"
                  backgroundImage={member.avatarUrl}
                  showUserInfo={true}
                  enableTilt={true}
                  className="relative z-0 hover:scale-[1.03] hover:shadow-[0_0_25px_rgba(0,255,255,0.3)] transition-all duration-300 ease-in-out rounded-2xl"
                  showBehindGradient={false}
                  behindGradient="none"
                  innerGradient="none"
                  miniAvatarUrl={null}
                />
              </div>

              {/* Plain text (not links) displayed below the card */}
              <p className="text-cyan-400 font-semibold text-lg mb-1">@{member.github}</p>
              <p className="text-gray-300 text-sm">{member.email}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-20 text-center pb-20 w-full bg-transparent backdrop-blur-md pt-6">
        <p className="text-2xl font-bold text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.4)] tracking-wide">
          Thank you for visiting 💙
        </p>
        <p className="text-cyan-100/80 mt-2 text-lg font-medium">Stay connected with the Rev AI team</p>
      </footer>

      <style jsx>{`
        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </main>
  );
}
