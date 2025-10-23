"use client";

import Link from "next/link";
import Aurora from "./Aurora";
import ProfileCard from "./ProfileCard";

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

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 text-white">
      {/* Aurora Background */}
      <Aurora
        colorStops={["#3A29FF", "#FF94B4", "#FF3232"]}
        blend={0.4}
        amplitude={0.8}
        speed={0.35}
        className="opacity-70"
      />

      {/* ✅ Navigation Bar */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex space-x-8 bg-gray-900/40 backdrop-blur-md border border-cyan-500/20 rounded-2xl px-8 py-3 shadow-lg shadow-cyan-500/10">
        <Link href="/" className="text-cyan-300 hover:text-white font-medium transition-colors duration-300">
          Home
        </Link>
        <Link href="/about" className="text-cyan-300 hover:text-white font-medium transition-colors duration-300">
          About
        </Link>
        <Link href="/contact" className="text-white font-semibold border-b-2 border-cyan-400 pb-1">
          Contact
        </Link>
      </nav>

      {/* Header */}
      <section className="relative z-20 text-center pt-40 pb-12 px-6">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient">
          Meet Our Team
        </h1>
        <p className="mt-4 text-white/70 text-lg">Reach out through GitHub or Email ✨</p>
      </section>

{/* ✅ Cards Section - centered, spaced, no overlap */}
<section className="relative z-20 w-full max-w-7xl mx-auto px-8 pb-40">
  <div className="flex flex-wrap justify-center gap-12">
    {team.map((member, i) => (
      <div
        key={i}
        className="flex flex-col items-center space-y-3 relative"
        style={{ isolation: "isolate" }}   // 👈 each card on its own layer
      >
        <div className="w-[220px] h-[260px] relative">
          <ProfileCard
            name={member.name}
            title="Developer"
            handle={member.github}
            email={member.email}
            githubUrl={member.githubUrl}
            handleColor="rgba(0,255,255,0.9)"
            emailColor="rgba(255,255,255,0.6)"
            backgroundImage={member.avatarUrl}
            showUserInfo={true}
            enableTilt={true}
            className="relative z-0"
            showBehindGradient={false}   // 🚫 disables holographic shine
            behindGradient="none"
            innerGradient="none"
            miniAvatarUrl={null}
          />
        </div>

        <a
          href={member.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:underline block"
        >
          @{member.github}
        </a>
        <a
          href={`mailto:${member.email}`}
          className="text-gray-400 hover:text-cyan-300 text-sm block"
        >
          {member.email}
        </a>
      </div>
    ))}
  </div>
</section>


      {/* Footer */}
      <footer className="relative z-20 text-center pb-20">
        <p className="text-xl text-white/85 font-medium">Thank you for visiting 💙</p>
        <p className="text-white/60 mt-2">Stay connected with the Rev AI team</p>
      </footer>

      <style jsx>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </main>
  );
}
