"use client";

import Iridescence from "@/components/Iridescence";
import GooeyNav from "@/components/GooeyNav";

export default function ContactPage() {
  const team = [
    {
      name: "Eshwar",
      github: "ESHWAR1024",
      githubUrl: "https://github.com/ESHWAR1024",
      email: "eshwar10245@gmail.com",
    },
    {
      name: "Aryan",
      github: "aryannang123",
      githubUrl: "https://github.com/aryannang123",
      email: "aryannangarath407@gmail.com",
    },
    {
      name: "Amogh",
      github: "amogh-2007",
      githubUrl: "https://github.com/amogh-2007",
      email: "amoghherle07@gmail.com",
    },
    {
      name: "Gagan",
      github: "gaganraghavan",
      githubUrl: "https://github.com/gaganraghavan",
      email: "gaganraghavan@gmail.com",
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
      <section className="relative z-20 w-full max-w-6xl mx-auto px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {team.map((member, i) => (
            <div
              key={i}
              className="group relative backdrop-blur-2xl bg-white/10 border border-white/20 rounded-2xl p-6 hover:bg-white/15 hover:border-white/30 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_40px_rgba(0,255,255,0.2)]"
            >
              {/* Avatar with Initials */}
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 border-2 border-cyan-400/50 group-hover:border-cyan-400 transition-all duration-300 flex items-center justify-center group-hover:from-cyan-400 group-hover:to-blue-500">
                  <span className="text-white text-2xl font-bold">
                    {member.name.charAt(0)}
                  </span>
                </div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 to-white/5 group-hover:from-white/20 group-hover:to-white/10 transition-all duration-300"></div>
              </div>

              {/* Name */}
              <h3 className="text-xl font-bold text-white text-center mb-1 group-hover:text-cyan-100 transition-colors duration-300">
                {member.name}
              </h3>
              
              {/* Title */}
              <p className="text-cyan-300/80 text-sm text-center mb-4 font-medium">
                Developer
              </p>

              {/* GitHub Link */}
              <div className="space-y-3">
                <a
                  href={member.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-gray-800/50 hover:bg-gray-700/60 border border-gray-600/50 hover:border-gray-500/60 rounded-lg transition-all duration-300 group/github"
                >
                  <svg className="w-4 h-4 text-white group-hover/github:text-cyan-300 transition-colors duration-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  <span className="text-white text-sm font-medium group-hover/github:text-cyan-300 transition-colors duration-300">
                    @{member.github}
                  </span>
                </a>

                {/* Email */}
                <div className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-blue-800/30 border border-blue-600/40 rounded-lg">
                  <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-blue-200 text-xs font-medium truncate">
                    {member.email}
                  </span>
                </div>
              </div>
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
