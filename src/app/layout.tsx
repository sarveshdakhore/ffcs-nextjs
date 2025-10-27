import type { Metadata } from "next";
import "./globals.css";
import ErrorBoundary from '@/components/ErrorBoundary';

// Import all styles
import 'bootstrap/scss/bootstrap.scss';
import '@fortawesome/fontawesome-free/scss/fontawesome.scss';
import '@fortawesome/fontawesome-free/scss/solid.scss';
import '@fortawesome/fontawesome-free/scss/brands.scss';
import '../css/global/colors.css';
import '../css/main.css';
import '../css/course-panel.css';
import '../css/course-list.css';
import '../css/timetable.css';

export const metadata: Metadata = {
  title: "FFCS GDG",
  description: "Visualize and make the most optimum timetable for yourself.",
  keywords: "VIT,University,Vellore,chennai,FFCS,ffcPlanner,ffcsPlanner,course,registration,timetable,visualize,ffcsonthego new,FFCS NEW,ffcsonthego pref, VIT Vellore, Vellore institute of technology, VIT chennai, FFCS VIT, VIT FFCS, FFCS VIT Planner, Save Vit FFCS, FFCS On The Go, FFCSOnTheGo, FFCSOnTheGo new, FFCS On The Go New, FFCS, Fully Flexible Credit System, gdg, gdg vit, Google Developer Group",
  openGraph: {
    title: "FFCS GDG",
    description: "Visualize and make the most optimum timetable for yourself.",
    url: "https://ffcs.dscvit.com/",
    siteName: "FFCS GDG",
    images: [
      {
        url: "/images/og_image.png",
        width: 1200,
        height: 630,
      }
    ],
    type: "website",
  },
  icons: {
    icon: "/images/favicon.png",
    apple: "/images/icons/icon-192x192.png",
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
