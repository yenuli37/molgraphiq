import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { lazy, Suspense } from 'react';
import Navbar from './components/Navbar';

// Lazy-loaded routes — each page (and its deps like recharts) only
// downloads when the user actually navigates to that route.
const Home = lazy(() => import('./pages/Home'));
const Predict = lazy(() => import('./pages/Predict'));
const About = lazy(() => import('./pages/About'));

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
};

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

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <Suspense fallback={<RouteFallback />}>
              <motion.div {...pageTransition}>
                <Home />
              </motion.div>
            </Suspense>
          }
        />
        <Route
          path="/predict"
          element={
            <Suspense fallback={<RouteFallback />}>
              <motion.div {...pageTransition}>
                <Predict />
              </motion.div>
            </Suspense>
          }
        />
        <Route
          path="/about"
          element={
            <Suspense fallback={<RouteFallback />}>
              <motion.div {...pageTransition}>
                <About />
              </motion.div>
            </Suspense>
          }
        />
      </Routes>
    </AnimatePresence>
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
