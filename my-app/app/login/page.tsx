"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LiquidChrome from "@/components/LiquidChrome";

// --- NEW ---
// Import the GoogleLogin component
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';

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

    // --- NEW ---
    // Create a success handler for Google Sign-In
    const handleGoogleSuccess = (credentialResponse: CredentialResponse) => {
        console.log("Google Sign-In Success:", credentialResponse);
        // The credential is a JWT token. You would typically send this to your backend
        // to verify and create a user session.
        // For now, let's just redirect to the homepage.
        router.push("/");
    };
    
    // --- NEW ---
    // Create an error handler for Google Sign-In
    const handleGoogleError = () => {
        console.log('Login Failed');
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

                            {/* --- UPDATED --- */}
                            {/* Sign in with Google Button is now replaced with the component */}
                            <div className="flex justify-center">
                               <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={handleGoogleError}
                                    theme="outline"
                                    shape="rectangular"
                                    logo_alignment="left"
                                />
                            </div>
                        </>
                    ) : (
                        // Sign Up Form (unchanged)
                        <>
                            {/* ... your sign up form code remains here ... */}
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}