"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText as GSAPSplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { createClient } from '@supabase/supabase-js';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

// --- INLINED AUTH LOGIC ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: any;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.error("Supabase URL or Anon Key is missing. Please check your .env.local file.");
}

const getCurrentUser = async () => {
  if (!supabase) return { user: null, error: "Supabase not initialized." };
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

const signOut = async () => {
  if (!supabase) return { error: "Supabase not initialized." };
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};


// --- INLINED COMPONENTS ---

gsap.registerPlugin(ScrollTrigger, GSAPSplitText, useGSAP);

// 1. GooeyNav Component
const GooeyNav = ({
  items,
  animationTime = 600,
  particleCount = 15,
  particleDistances = [90, 10],
  particleR = 100,
  timeVariance = 300,
  initialActiveIndex = 0
}: {
  items: { label: string, href: string }[],
  animationTime?: number,
  particleCount?: number,
  particleDistances?: number[],
  particleR?: number,
  timeVariance?: number,
  initialActiveIndex?: number
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLUListElement>(null);
  const filterRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [activeIndex, setActiveIndex] = useState(initialActiveIndex);

  const palette = ['#00f5ff', '#8cfff0', '#00e0ff'];

  const noise = (n = 1) => n / 2 - Math.random() * n;

  const getXY = (distance: number, pointIndex: number, totalPoints: number) => {
    const angle = ((360 + noise(8)) / totalPoints) * pointIndex * (Math.PI / 180);
    return [distance * Math.cos(angle), distance * Math.sin(angle)];
  };

  const createParticle = (i: number, t: number, d: number[], r: number) => {
    let rotate = noise(r / 10);
    return {
      start: getXY(d[0], particleCount - i, particleCount),
      end: getXY(d[1] + noise(7), particleCount - i, particleCount),
      time: t,
      scale: 1 + noise(0.2),
      color: palette[Math.floor(Math.random() * palette.length)],
      rotate: rotate > 0 ? (rotate + r / 20) * 10 : (rotate - r / 20) * 10
    };
  };

  const makeParticles = (element: HTMLElement) => {
    const d = particleDistances;
    const r = particleR;
    element.style.setProperty('--time', `${animationTime * 2 + timeVariance}ms`);

    for (let i = 0; i < particleCount; i++) {
      const t = animationTime * 2 + noise(timeVariance * 2);
      const p = createParticle(i, t, d, r);
      element.classList.remove('active');

      setTimeout(() => {
        const particle = document.createElement('span');
        const point = document.createElement('span');
        particle.classList.add('particle');
        particle.style.setProperty('--start-x', `${p.start[0]}px`);
        particle.style.setProperty('--start-y', `${p.start[1]}px`);
        particle.style.setProperty('--end-x', `${p.end[0]}px`);
        particle.style.setProperty('--end-y', `${p.end[1]}px`);
        particle.style.setProperty('--time', `${p.time}ms`);
        particle.style.setProperty('--scale', String(p.scale));
        particle.style.setProperty('--color', p.color);
        particle.style.setProperty('--rotate', `${p.rotate}deg`);

        point.classList.add('point');
        particle.appendChild(point);
        element.appendChild(particle);
        requestAnimationFrame(() => element.classList.add('active'));
        setTimeout(() => {
          try {
            element.removeChild(particle);
          } catch { /* noop */ }
        }, t);
      }, 30);
    }
  };

  const updateEffectPosition = (element: HTMLElement) => {
    if (!containerRef.current || !filterRef.current || !textRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const pos = element.getBoundingClientRect();

    const styles = {
      left: `${pos.x - containerRect.x}px`,
      top: `${pos.y - containerRect.y}px`,
      width: `${pos.width}px`,
      height: `${pos.height}px`
    };
    Object.assign(filterRef.current.style, styles);
    Object.assign(textRef.current.style, styles);
    textRef.current.innerText = element.innerText;
  };

  const handleClick = (e: React.MouseEvent<HTMLLIElement>, index: number) => {
    const liEl = e.currentTarget;
    if (activeIndex === index) return;
    setActiveIndex(index);
    updateEffectPosition(liEl);

    if (filterRef.current) {
        Array.from(filterRef.current.querySelectorAll('.particle')).forEach(p => p.remove());
    }

    if (textRef.current) {
      textRef.current.classList.remove('active');
      void textRef.current.offsetWidth;
      textRef.current.classList.add('active');
    }
    if (filterRef.current) makeParticles(filterRef.current);
  };
  
  useEffect(() => {
    if (!navRef.current || !containerRef.current || !textRef.current) return;
    const activeLi = navRef.current.querySelectorAll('li')[activeIndex];
    if (activeLi) {
      updateEffectPosition(activeLi as HTMLElement);
      textRef.current.classList.add('active');
    }
    const observer = new ResizeObserver(() => {
        const currentActiveLi = navRef.current?.querySelectorAll('li')[activeIndex];
        if (currentActiveLi) {
            updateEffectPosition(currentActiveLi as HTMLElement);
        }
    });
    observer.observe(document.body);
    return () => observer.disconnect();
  }, [activeIndex]);

  return (
    <div className="gooey-nav-container" ref={containerRef}>
      <nav>
        <ul ref={navRef}>
          {items.map((item, index) => (
            <li key={index} className={activeIndex === index ? 'active' : ''} onClick={(e) => handleClick(e, index)}>
              <a href={item.href}>{item.label}</a>
            </li>
          ))}
        </ul>
      </nav>
      <span className="effect filter" ref={filterRef} />
      <span className="effect text" ref={textRef} />
    </div>
  );
};


// 2. LiquidChrome Component
const LiquidChrome = ({ baseColor = [0, 0.1, 0.1], speed = 0.2, amplitude = 0.3, frequencyX = 3, frequencyY = 3, interactive = true, ...props }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const renderer = new Renderer({ antialias: true, dpr: 2 });
    const gl = renderer.gl;
    const vertexShader = `attribute vec2 position; attribute vec2 uv; varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }`;
    const fragmentShader = `precision highp float; uniform float uTime; uniform vec3 uResolution; uniform vec3 uBaseColor; uniform float uAmplitude; uniform float uFrequencyX; uniform float uFrequencyY; uniform vec2 uMouse; varying vec2 vUv; vec4 renderImage(vec2 uvCoord) { vec2 fragCoord = uvCoord * uResolution.xy; vec2 uv = (2.0 * fragCoord - uResolution.xy) / min(uResolution.x, uResolution.y); for (float i = 1.0; i < 10.0; i++){ uv.x += uAmplitude / i * cos(i * uFrequencyX * uv.y + uTime + uMouse.x * 3.14159); uv.y += uAmplitude / i * cos(i * uFrequencyY * uv.x + uTime + uMouse.y * 3.14159); } vec2 diff = (uvCoord - uMouse); float dist = length(diff); float falloff = exp(-dist * 20.0); float ripple = sin(10.0 * dist - uTime * 2.0) * 0.03; uv += (diff / (dist + 0.0001)) * ripple * falloff; vec3 color = uBaseColor / abs(sin(uTime - uv.y - uv.x)); return vec4(color, 1.0); } void main() { vec4 col = vec4(0.0); int samples = 0; for (int i = -1; i <= 1; i++){ for (int j = -1; j <= 1; j++){ vec2 offset = vec2(float(i), float(j)) * (1.0 / min(uResolution.x, uResolution.y)); col += renderImage(vUv + offset); samples++; } } gl_FragColor = col / float(samples); }`;
    const geometry = new Triangle(gl);
    const program = new Program(gl, { vertex: vertexShader, fragment: fragmentShader, uniforms: { uTime: { value: 0 }, uResolution: { value: new Float32Array([gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height]) }, uBaseColor: { value: new Float32Array(baseColor) }, uAmplitude: { value: amplitude }, uFrequencyX: { value: frequencyX }, uFrequencyY: { value: frequencyY }, uMouse: { value: new Float32Array([0, 0]) } } });
    const mesh = new Mesh(gl, { geometry, program });
    function resize() { renderer.setSize(container.offsetWidth, container.offsetHeight); const resUniform = program.uniforms.uResolution.value as Float32Array; resUniform[0] = gl.canvas.width; resUniform[1] = gl.canvas.height; resUniform[2] = gl.canvas.width / gl.canvas.height; }
    window.addEventListener('resize', resize); resize();
    function handleMouseMove(event: MouseEvent) { const rect = container.getBoundingClientRect(); const x = (event.clientX - rect.left) / rect.width; const y = 1 - (event.clientY - rect.top) / rect.height; const mouseUniform = program.uniforms.uMouse.value as Float32Array; mouseUniform[0] = x; mouseUniform[1] = y; }
    if (interactive) container.addEventListener('mousemove', handleMouseMove);
    let animationId: number; function update(t: number) { animationId = requestAnimationFrame(update); program.uniforms.uTime.value = t * 0.001 * speed; renderer.render({ scene: mesh }); }
    animationId = requestAnimationFrame(update);
    container.appendChild(gl.canvas);
    return () => { cancelAnimationFrame(animationId); window.removeEventListener('resize', resize); if (interactive) container.removeEventListener('mousemove', handleMouseMove); if (gl.canvas.parentElement) gl.canvas.parentElement.removeChild(gl.canvas); gl.getExtension('WEBGL_lose_context')?.loseContext(); };
  }, [baseColor, speed, amplitude, frequencyX, frequencyY, interactive]);
  return <div ref={containerRef} className="liquidChrome-container" {...props} />;
};


// 3. SplitText Component
const SplitText = ({ text, className = '', delay = 100, duration = 0.6, ease = 'power3.out', splitType = 'chars', from = { opacity: 0, y: 40 }, to = { opacity: 1, y: 0 }, textAlign = 'center' }: {text: string, className?: string, delay?: number, duration?: number, ease?: string, splitType?: string, from?: object, to?: object, textAlign?: "center" | "left" | "right"}) => {
  const ref = useRef<HTMLHeadingElement>(null);
  useGSAP(() => {
    if (!ref.current || !text) return;
    gsap.set(ref.current, { visibility: 'visible' });
    let splitInstance = new GSAPSplitText(ref.current, { type: splitType, linesClass: 'split-line', wordsClass: 'split-word', charsClass: 'split-char' });
    gsap.fromTo(splitInstance.chars, { ...from }, { ...to, duration, ease, stagger: delay / 1000, scrollTrigger: { trigger: ref.current, start: 'top 90%', once: true } });
    return () => { if(splitInstance) splitInstance.revert(); };
  }, { dependencies: [text, delay, duration, ease, splitType, JSON.stringify(from), JSON.stringify(to)], scope: ref });
  return <h1 ref={ref} style={{ textAlign, visibility: 'hidden' }} className={`split-parent ${className}`}>{text}</h1>;
};


// --- MAIN PAGE COMPONENT ---
export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [user, setUser] = useState<any>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(() => {
    if (!searchQuery) {
      setError("Please enter a search term.");
      return;
    }
    setIsLoading(true);
    router.push(`/results?q=${encodeURIComponent(searchQuery)}`);
  }, [searchQuery, router]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleSearch();
    },
    [handleSearch]
  );
  
  const handleSidebarSearch = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") console.log("Sidebar Search:", sidebarSearch);
    },
    [sidebarSearch]
  );

  const splitTextMemo = useMemo(
    () => (
      <SplitText
        text="Rev AI"
        className="text-6xl font-bold text-center text-white pointer-events-auto"
      />
    ),
    []
  );

  const items = useMemo(
    () => [
      { label: "Home", href: "/" },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
    []
  );

  useEffect(() => {
    const checkAuth = async () => {
      const { user } = await getCurrentUser();
      if (!user) {
        router.push("/login");
      } else {
        setIsAuthenticated(true);
        setUser(user);
      }
    };
    checkAuth();
  }, [router]);

  if (isAuthenticated === null) {
    return (
      <main className="relative h-screen w-full overflow-hidden flex items-center justify-center bg-black">
        <div className="text-white text-xl">Loading...</div>
      </main>
    );
  }

  return (
    <>
      <style>{`
        .liquidChrome-container { width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: -1; }
        :root { --linear-ease: linear(0,0.068,0.19 2.7%,0.804 8.1%,1.037,1.199 13.2%,1.245,1.27 15.8%,1.274,1.272 17.4%,1.249 19.1%,0.996 28%,0.949,0.928 33.3%,0.926,0.933 36.8%,1.001 45.6%,1.013,1.019 50.8%,1.018 54.4%,1 63.1%,0.995 68%,1.001 85%,1); }
        .gooey-nav-container { position: relative; }
        .gooey-nav-container nav { display: flex; position: relative; }
        .gooey-nav-container nav ul { display: flex; gap: 2em; list-style: none; padding: 0 1em; margin: 0; position: relative; z-index: 3; color: white; text-shadow: 0 1px 1px hsl(205deg 30% 10% / 0.2); }
        .gooey-nav-container nav ul li { border-radius: 100vw; position: relative; cursor: pointer; transition: color 0.3s ease; color: white; }
        .gooey-nav-container nav ul li a { display: inline-block; padding: 0.6em 1em; text-decoration: none; color: inherit; }
        .gooey-nav-container nav ul li.active { color: black; text-shadow: none; }
        .gooey-nav-container .effect { position: absolute; left: 0; top: 0; width: 0; height: 0; opacity: 1; pointer-events: none; display: grid; place-items: center; z-index: 1; }
        .gooey-nav-container .effect.text { color: white; transition: color 0.3s ease; }
        .gooey-nav-container .effect.text.active { color: black; }
        .gooey-nav-container .effect.filter { filter: blur(7px) contrast(100) blur(0); mix-blend-mode: lighten; }
        .gooey-nav-container .effect.filter::before { content: ''; position: absolute; inset: -75px; z-index: -2; background: radial-gradient(circle at center, rgba(255,255,255,0.15), transparent 70%); }
        .gooey-nav-container .effect.filter::after { content: ''; position: absolute; inset: 0; background: white; transform: scale(0); opacity: 0; z-index: -1; border-radius: 100vw; }
        .gooey-nav-container .effect.active::after { animation: pill 0.3s ease both; }
        @keyframes pill { to { transform: scale(1); opacity: 1; } }
        .particle, .point { background: var(--color); opacity: 1; border-radius: 50%; width: 8px; height: 8px; box-shadow: 0 0 10px var(--color), 0 0 20px var(--color), 0 0 30px var(--color); animation: point var(--time) ease 1 -350ms; }
        .particle { --time: 5s; position: absolute; top: calc(50% - 4px); left: calc(50% - 4px); animation: particle calc(var(--time)) ease 1 -350ms; }
        @keyframes particle { 0% { transform: rotate(0deg) translate(var(--start-x), var(--start-y)); opacity: 1; } 70% { transform: rotate(calc(var(--rotate) * 0.5)) translate(calc(var(--end-x) * 1.2), calc(var(--end-y) * 1.2)); opacity: 1; } 85% { transform: rotate(calc(var(--rotate) * 0.66)) translate(var(--end-x), var(--end-y)); opacity: 1; } 100% { transform: rotate(calc(var(--rotate) * 1.2)) translate(calc(var(--end-x) * 0.5), calc(var(--end-y) * 0.5)); opacity: 1; } }
        @keyframes point { 0% { transform: scale(0); opacity: 0; } 25% { transform: scale(calc(var(--scale) * 0.25)); } 38% { opacity: 1; } 65% { transform: scale(var(--scale)); opacity: 1; } 85% { transform: scale(var(--scale)); opacity: 1; } 100% { transform: scale(0); opacity: 0; } }
        .split-parent { display: inline-block; overflow: hidden; } .split-char { display: inline-block; }
      `}</style>
      <main className="relative h-screen w-full overflow-hidden">
        <LiquidChrome />
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-6 left-6 z-50 flex flex-col justify-between w-8 h-6 cursor-pointer pointer-events-auto"
        >
          <span className={`block h-1 w-full bg-white rounded transition-all duration-300 ${sidebarOpen ? "rotate-45 translate-y-2.5" : ""}`}></span>
          <span className={`block h-1 w-full bg-white rounded transition-all duration-300 ${sidebarOpen ? "opacity-0" : ""}`}></span>
          <span className={`block h-1 w-full bg-white rounded transition-all duration-300 ${sidebarOpen ? "-rotate-45 -translate-y-2.5" : ""}`}></span>
        </button>
        <div className={`fixed top-0 left-0 h-full w-64 bg-white/10 backdrop-blur-lg border-r border-white/20 shadow-lg z-40 transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex flex-col px-6 pt-20 space-y-6 text-white h-full">
            {user && (
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg">
                    {user.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                        {user.user_metadata?.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{user.user_metadata?.full_name || 'User'}</p>
                    <p className="text-white/60 text-xs truncate">{user.email}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-4">
              <h3 className="text-white/80 text-sm font-medium">Search History</h3>
              <div className="relative">
                <input type="text" placeholder="Search history..." value={sidebarSearch} onChange={(e) => setSidebarSearch(e.target.value)} onKeyDown={handleSidebarSearch} className="w-full px-4 py-2 pr-10 rounded-full bg-cyan-400/20 backdrop-blur-md border border-cyan-300/60 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-[0_0_25px_rgba(0,255,255,0.4)] transition-all duration-300" />
                <button onClick={() => console.log("Sidebar search:", sidebarSearch)} className="absolute top-1/2 right-2 -translate-y-1/2 text-cyan-300 hover:text-cyan-200">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z" /></svg>
                </button>
              </div>
            </div>
            <nav className="flex flex-col space-y-3 text-sm flex-1">
              <a href="#" className="hover:text-cyan-400 transition-colors p-2 rounded-lg hover:bg-white/5">Nothing Phone 2</a>
              <a href="#" className="hover:text-cyan-400 transition-colors p-2 rounded-lg hover:bg-white/5">Cyberpunk 2077</a>
              <a href="#" className="hover:text-cyan-400 transition-colors p-2 rounded-lg hover:bg-white/5">iPhone 16</a>
            </nav>
            <div className="mt-auto pb-6">
              <button onClick={async () => { await signOut(); router.push("/login"); }} className="w-full bg-red-500/20 hover:bg-red-500/30 text-white px-4 py-3 rounded-lg border border-red-500/50 transition-all duration-300 shadow-[0_0_15px_rgba(255,0,0,0.2)] hover:shadow-[0_0_25px_rgba(255,0,0,0.4)] flex items-center justify-center gap-2 text-sm font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 shadow-[0_0_25px_rgba(255,255,255,0.15)] px-8 py-3 flex items-center justify-center">
          <GooeyNav items={items} />
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-24">
          <div className="transform -translate-y-8">{splitTextMemo}</div>
          <div className="mt-8 pointer-events-auto w-[420px] max-w-[90%] relative">
            <input id="search-input" type="text" placeholder="Search all of Reddit..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleKeyPress} disabled={isLoading} className="w-full px-6 py-4 pr-14 rounded-full bg-white/10 backdrop-blur-md border border-cyan-300/50 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 shadow-[0_0_20px_rgba(0,255,255,0.3)] text-lg transition-all duration-300 disabled:opacity-50" />
            <button onClick={handleSearch} disabled={isLoading} className="absolute top-1/2 right-1.5 -translate-y-1/2 bg-cyan-400/30 rounded-full p-3 text-white shadow-[0_0_15px_rgba(0,255,255,0.3)] hover:bg-cyan-400/50 transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </button>
          </div>
          <div className="mt-4 text-center h-8">
              {isLoading && <p className="text-white/80 animate-pulse">Navigating to results...</p>}
              {error && <p className="text-red-400">{error}</p>}
          </div>
        </div>
      </main>
    </>
  );
}

