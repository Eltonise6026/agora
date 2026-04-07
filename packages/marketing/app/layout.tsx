import type { Metadata } from "next";
import "./tailwind.css";

export const metadata: Metadata = {
  title: "Agora - The Open Protocol for Agent Commerce",
  description:
    "The internet's missing commerce layer. Built for AI agents. Open for everyone. Search, cart, and checkout across any store with a single protocol.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
          backgroundColor: "#050508",
          color: "#ffffff",
          margin: 0,
          padding: 0,
        }}
      >
        {children}
      </body>
    </html>
  );
}
