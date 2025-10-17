import type { Metadata } from "next";
// --- FIX: Corrected font imports from the 'geist' package ---
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";

// Import the GoogleOAuthProvider
import { GoogleOAuthProvider } from '@react-oauth/google';

export const metadata: Metadata = {
  title: "Rev AI", // Updated title for your app
  description: "Login page for Rev AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Ensure you have a .env.local file with your Google Client ID
  // NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    throw new Error("Missing Google Client ID. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your .env.local file.");
  }

  return (
    <html lang="en">
      <body
        // --- FIX: Use the correct variable names from the new imports ---
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        {/* The provider now wraps your entire application */}
        <GoogleOAuthProvider clientId={googleClientId}>
          {children}
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
