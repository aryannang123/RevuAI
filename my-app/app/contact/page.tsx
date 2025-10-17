"use client";

import GooeyNav from "@/components/GooeyNav";
import Aurora from "./Aurora";
import ProfileCard from "./ProfileCard";

export default function ContactPage() {
  const items = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

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
      email: "ryannangarath407@gmail.com",
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
      email: "gaganraghawan@gmail.com",
    },
  ];

  return (
    <main
      className="relative min-h-screen w-full overflow-y-auto overflow-x-hidden bg-black 
                 flex flex-col items-center text-white scrollbar-hide"
    >
      {/* Aurora Background */}
      <Aurora
        colorStops={["#3A29FF", "#FF94B4", "#FF3232"]}
        blend={0.4}
        amplitude={0.8}
        speed={0.35}
        className="opacity-70"
      />

      {/* Navigation */}
      <div
        className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto
                   rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20
                   shadow-[0_0_25px_rgba(255,255,255,0.15)] px-8 py-3 flex items-center justify-center"
      >
        <GooeyNav items={items} initialActiveIndex={2} />
      </div>

      {/* Header */}
      <div className="z-20 mt-32 text-center mb-12 px-6">
        <h1 className="text-5xl font-bold text-cyan-300 drop-shadow-[0_0_12px_rgba(0,255,255,0.3)]">
          Meet Our Team
        </h1>
        <p className="mt-3 text-white/80 text-lg">
          Reach out to us through our GitHub or Email.
        </p>
      </div>

      {/* Cards Section */}
      <div className="relative z-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 px-8 pb-40 w-full max-w-7xl justify-items-center">
        {team.map((member, index) => (
          <div key={index} className="flex flex-col items-center space-y-3">
            <ProfileCard
              name={member.name}
              title="Team Member"
              handle={member.github}
              status="Online"
              contactText="GitHub"
              showUserInfo={true}
              enableTilt={true}
              enableMobileTilt={false}
              avatarUrl={null}
              iconUrl={null}
              grainUrl={null}
              behindGradient={false}
              innerGradient={false}
              showBehindGradient={false}
              miniAvatarUrl={null}
              className="w-[270px] h-[270px] profile-glow"
              onContactClick={() => window.open(member.githubUrl, "_blank")}
            />
            <div className="text-center">
              <p className="text-white/90 font-semibold">{member.name}</p>
              <a
                href={member.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline block"
              >
                @{member.github}
              </a>
              <p className="text-white/70 text-sm">{member.email}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 👇 Added smooth scroll padding + thank-you section */}
      <div className="relative z-20 w-full text-center pb-72 mt-32">

        <p className="text-2xl font-semibold text-white/90">
          Thank you for visiting ✨
        </p>
        <p className="text-white/60 mt-2">
          We appreciate your time — stay connected!
        </p>
      </div>
    </main>
  );
}
