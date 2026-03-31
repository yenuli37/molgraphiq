import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState, useRef } from 'react';
import Navbar from './components/Navbar';

// Lazy-loaded routes — each page (and its deps like recharts/framer-motion)
// only downloads when the user navigates to that route.
const Home = lazy(() => import('./pages/Home'));
const Predict = lazy(() => import('./pages/Predict'));
const About = lazy(() => import('./pages/About'));

// Minimal fallback — matches skeleton aesthetic
function RouteFallback() {
  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
      }}
    >
      <div
        style={{
          width: 200,
          height: 3,
          background: 'rgba(68,161,148,0.12)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '40%',
            height: '100%',
            background: 'linear-gradient(90deg, #44A194, #C7D9DD)',
            borderRadius: 4,
            animation: 'slide 1.2s ease-in-out infinite',
          }}
        />
      </div>
    </div>
  );
}

/**
 * Pure-CSS page transition wrapper.
 * Fades + slides in on mount via CSS keyframe — no framer-motion needed
 * in the App shell, keeping it out of the critical bundle.
 */
function PageTransition({ children }) {
  return <div className="page-transition">{children}</div>;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <Routes location={location} key={location.pathname}>
      <Route
        path="/"
        element={
          <Suspense fallback={<RouteFallback />}>
            <PageTransition><Home /></PageTransition>
          </Suspense>
        }
      />
      <Route
        path="/predict"
        element={
          <Suspense fallback={<RouteFallback />}>
            <PageTransition><Predict /></PageTransition>
          </Suspense>
        }
      />
      <Route
        path="/about"
        element={
          <Suspense fallback={<RouteFallback />}>
            <PageTransition><About /></PageTransition>
          </Suspense>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main>
        <AnimatedRoutes />
      </main>
    </BrowserRouter>
  );
}
