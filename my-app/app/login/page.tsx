"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LiquidChrome from "@/components/LiquidChrome";
import { signInWithGoogle, testConnection } from "@/lib/auth";

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Test connection on component mount
    useEffect(() => {
        const checkConnection = async () => {
            const result = await testConnection();
            if (!result.connected) {
                setError(`Connection failed: ${result.error}`);
            } else {
                console.log('Supabase connection successful');
            }
        };
        checkConnection();
    }, []);

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError("");
        
        const { error: authError } = await signInWithGoogle();
        
        if (authError) {
            setError(authError);
            setLoading(false);
        }
        // Google auth will redirect automatically on success
    };

    return (
        <main className="relative h-screen w-full overflow-hidden">
            <LiquidChrome />

            {/* Login Form Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="p-8 bg-white/10 backdrop-blur-lg border border-white/20 shadow-lg rounded-2xl pointer-events-auto w-full max-w-md">
                    {/* Rev AI Title */}
                    <h1 className="text-4xl font-bold mb-8 text-center text-white">Rev AI</h1>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Welcome Message */}
                    <div className="text-center mb-8">
                        <p className="text-white/80 text-lg mb-2">Welcome to Rev AI</p>
                        <p className="text-white/60 text-sm">Sign in with your Google account to continue</p>
                    </div>

                    {/* Sign in with Google */}
                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="w-full bg-white/10 hover:bg-white/20 text-white font-medium px-8 py-4 rounded-lg border border-white/30 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
                    >
                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span className="text-lg">
                            {loading ? "Signing in..." : "Continue with Google"}
                        </span>
                    </button>
                </div>
            </div>
        </main>
    );
}