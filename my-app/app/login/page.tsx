"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LiquidChrome from "@/components/LiquidChrome";

export default function LoginPage() {
    const router = useRouter();
    const [isSignUp, setIsSignUp] = useState(false);

    const handleLogin = () => {
        // Redirect to the home page (app/page.tsx)
        router.push("/");
    };

    const handleSignUp = () => {
        // Handle sign up logic here
        console.log("Sign up clicked");
        // After successful sign up, redirect back to login form
        setIsSignUp(false);
    };

    return (
        <main className="relative h-screen w-full overflow-hidden">
            <LiquidChrome />

            {/* Login Form Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="p-8 bg-white/10 backdrop-blur-lg border border-white/20 shadow-lg rounded-2xl pointer-events-auto w-full max-w-md">
                    {/* Rev AI Title */}
                    <h1 className="text-4xl font-bold mb-8 text-center text-white">Rev AI</h1>

                    {!isSignUp ? (
                        // Login Form
                        <>
                            {/* Username Input */}
                            <div className="mb-4">
                                <input
                                    type="text"
                                    placeholder="Username or email"
                                    className="w-full px-4 py-3 rounded-lg bg-white/10 backdrop-blur-md border border-white/30 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300"
                                />
                            </div>

                            {/* Password Input */}
                            <div className="mb-6">
                                <input
                                    type="password"
                                    placeholder="Password"
                                    className="w-full px-4 py-3 rounded-lg bg-white/10 backdrop-blur-md border border-white/30 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300"
                                />
                            </div>

                            {/* Login Button */}
                            <button
                                onClick={handleLogin}
                                className="w-full bg-cyan-400/30 hover:bg-cyan-400/50 text-white font-semibold px-8 py-3 rounded-lg mb-4 transition-all duration-300 shadow-[0_0_15px_rgba(0,255,255,0.3)] hover:shadow-[0_0_25px_rgba(0,255,255,0.5)]"
                            >
                                Login
                            </button>

                            {/* Sign Up Link */}
                            <div className="text-center mb-4">
                                <span className="text-white/70 text-sm">Don't have an account? </span>
                                <button
                                    onClick={() => setIsSignUp(true)}
                                    className="text-cyan-400 hover:text-cyan-300 text-sm font-medium underline transition-colors duration-300"
                                >
                                    Sign up
                                </button>
                            </div>

                            {/* Divider */}
                            <div className="flex items-center mb-4">
                                <div className="flex-1 h-px bg-white/20"></div>
                                <span className="px-4 text-white/70 text-sm">or</span>
                                <div className="flex-1 h-px bg-white/20"></div>
                            </div>

                            {/* Sign in with Google */}
                            <button
                                onClick={() => {
                                    // Handle Google sign-in here
                                    console.log("Google sign-in clicked");
                                    router.push("/");
                                }}
                                className="w-full bg-white/10 hover:bg-white/20 text-white font-medium px-8 py-3 rounded-lg border border-white/30 transition-all duration-300 flex items-center justify-center gap-3"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Sign in with Google
                            </button>
                        </>
                    ) : (
                        // Sign Up Form
                        <>
                            {/* Username Input */}
                            <div className="mb-4">
                                <input
                                    type="text"
                                    placeholder="Username"
                                    className="w-full px-4 py-3 rounded-lg bg-white/10 backdrop-blur-md border border-white/30 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300"
                                />
                            </div>

                            {/* Email Input */}
                            <div className="mb-4">
                                <input
                                    type="email"
                                    placeholder="Email"
                                    className="w-full px-4 py-3 rounded-lg bg-white/10 backdrop-blur-md border border-white/30 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300"
                                />
                            </div>

                            {/* Password Input */}
                            <div className="mb-4">
                                <input
                                    type="password"
                                    placeholder="Password"
                                    className="w-full px-4 py-3 rounded-lg bg-white/10 backdrop-blur-md border border-white/30 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300"
                                />
                            </div>

                            {/* Confirm Password Input */}
                            <div className="mb-6">
                                <input
                                    type="password"
                                    placeholder="Confirm password"
                                    className="w-full px-4 py-3 rounded-lg bg-white/10 backdrop-blur-md border border-white/30 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-300"
                                />
                            </div>

                            {/* Sign Up Button */}
                            <button
                                onClick={handleSignUp}
                                className="w-full bg-cyan-400/30 hover:bg-cyan-400/50 text-white font-semibold px-8 py-3 rounded-lg mb-4 transition-all duration-300 shadow-[0_0_15px_rgba(0,255,255,0.3)] hover:shadow-[0_0_25px_rgba(0,255,255,0.5)]"
                            >
                                Sign Up
                            </button>

                            {/* Back to Login Link */}
                            <div className="text-center">
                                <span className="text-white/70 text-sm">Already have an account? </span>
                                <button
                                    onClick={() => setIsSignUp(false)}
                                    className="text-cyan-400 hover:text-cyan-300 text-sm font-medium underline transition-colors duration-300"
                                >
                                    Login
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}
