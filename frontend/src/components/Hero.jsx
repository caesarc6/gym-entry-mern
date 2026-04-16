import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { Button } from "./ui/button";
import { ChevronRight } from "lucide-react";
import { HERO_OUTLINE_CTA_BUTTON_CLASSNAME } from "../lib/heroCtaButtonClasses";
import { cn } from "../lib/utils";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=2340&auto=format&fit=crop";

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/** Gentler drift: small y/scale range — blur unchanged, fewer visual updates per second via long durations */
const blobKeyframe = {
  y: [0, 7, -4, 0],
  scale: [1, 1.03, 0.985, 1],
};

const blobIdle = { y: 0, scale: 1 };

export const Hero = () => {
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: false });

  const [blobSize, setBlobSize] = useState({
    width: "25rem",
    height: "44rem",
  });
  const [largeBlobSize, setLargeBlobSize] = useState({
    width: "90rem",
    height: "50rem",
  });
  const [isMobile, setIsMobile] = useState(false);

  const memoizedBlobSize = useMemo(() => blobSize, [blobSize]);
  const memoizedLargeBlobSize = useMemo(() => largeBlobSize, [largeBlobSize]);

  const updateBlobSize = () => {
    const screenWidth = window.innerWidth;
    const mobile = screenWidth < 640;
    setIsMobile(mobile);

    if (mobile) {
      setBlobSize({ width: "25vw", height: "35vh" });
      setLargeBlobSize({ width: "99vw", height: "52vh" });
    } else if (screenWidth < 1024) {
      setBlobSize({ width: "20vw", height: "35vh" });
      setLargeBlobSize({ width: "60vw", height: "40vh" });
    } else {
      setBlobSize({ width: "25rem", height: "32rem" });
      setLargeBlobSize({ width: "90rem", height: "50rem" });
    }
  };

  useEffect(() => {
    updateBlobSize();
    const debouncedResize = debounce(updateBlobSize, 100);
    window.addEventListener("resize", debouncedResize);
    return () => window.removeEventListener("resize", debouncedResize);
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative isolate w-full min-w-0 overflow-hidden bg-[var(--hero-surface-light,#2c3d4c)] dark:bg-[var(--hero-surface-dark,#141c27)]"
    >
      <style>{`
        @keyframes heroMobileFloat {
          0%, 100% { transform: translateY(0px) scale(1); }
          25% { transform: translateY(4px) scale(1.015); }
          50% { transform: translateY(-2px) scale(0.992); }
          75% { transform: translateY(2px) scale(1.008); }
        }
      `}</style>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        <div className="absolute inset-0 overflow-hidden bg-[var(--hero-surface-light,#2c3d4c)] dark:bg-[var(--hero-surface-dark,#141c27)]">
          {isMobile ? (
            <>
              <div
                className="absolute rounded-full bg-gradient-to-r from-blue-950 to-slate-600 opacity-60 blur-2xl"
                style={{
                  top: "0px",
                  left: "30%",
                  width: memoizedBlobSize.width,
                  height: memoizedBlobSize.height,
                  animation: "heroMobileFloat 22s ease-in-out infinite",
                  animationPlayState: heroInView ? "running" : "paused",
                }}
              />
              <div
                className="absolute rounded-full bg-gradient-to-tl from-blue-300 to-blue-200 opacity-50 blur-2xl"
                style={{
                  bottom: "0px",
                  left: "70%",
                  width: memoizedLargeBlobSize.width,
                  height: memoizedLargeBlobSize.height,
                  animation: "heroMobileFloat 28s ease-in-out infinite",
                  animationDelay: "4s",
                  animationPlayState: heroInView ? "running" : "paused",
                }}
              />
            </>
          ) : (
            <>
              <motion.div
                className="absolute rounded-full bg-gradient-to-r from-blue-950 to-slate-600 blur-3xl"
                style={{
                  top: "-10%",
                  left: "50%",
                  width: memoizedBlobSize.width,
                  height: memoizedBlobSize.height,
                }}
                animate={heroInView ? blobKeyframe : blobIdle}
                transition={
                  heroInView
                    ? {
                        duration: 18,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }
                    : { duration: 0.25, ease: "easeOut" }
                }
              />
              <motion.div
                className="absolute rounded-full bg-gradient-to-tl from-blue-300 to-blue-200 blur-3xl"
                style={{
                  top: "-20%",
                  left: "50%",
                  width: memoizedLargeBlobSize.width,
                  height: memoizedLargeBlobSize.height,
                }}
                animate={heroInView ? blobKeyframe : blobIdle}
                transition={
                  heroInView
                    ? {
                        duration: 24,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }
                    : { duration: 0.25, ease: "easeOut" }
                }
              />
              <motion.div
                className="absolute rounded-full bg-gradient-to-r from-blue-950 to-slate-600 blur-3xl"
                style={{
                  bottom: "-30%",
                  left: "20%",
                  width: memoizedBlobSize.width,
                  height: memoizedBlobSize.height,
                }}
                animate={heroInView ? blobKeyframe : blobIdle}
                transition={
                  heroInView
                    ? {
                        duration: 20,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }
                    : { duration: 0.25, ease: "easeOut" }
                }
              />
              <motion.div
                className="absolute rounded-full bg-gradient-to-tl from-blue-300 to-blue-200 blur-3xl"
                style={{
                  bottom: "-36%",
                  right: "54%",
                  width: memoizedLargeBlobSize.width,
                  height: memoizedLargeBlobSize.height,
                }}
                animate={heroInView ? blobKeyframe : blobIdle}
                transition={
                  heroInView
                    ? {
                        duration: 26,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }
                    : { duration: 0.25, ease: "easeOut" }
                }
              />
            </>
          )}
        </div>
      </div>

      <main className="relative z-10 overflow-hidden">
        <section>
          <div className="relative min-h-[76vh] pb-36 pt-32 sm:min-h-[82vh] sm:pb-44 sm:pt-36">
            <div className="relative z-10 mx-auto w-full max-w-5xl px-6">
              {/* Image intentionally removed until replacement is ready. */}
              <div className="mx-auto mt-6 max-w-md text-center">
                <h1 className="text-balance font-serif text-4xl font-medium text-white sm:text-5xl">
                  Train with clarity. Progress with purpose.
                </h1>
                <p className="mt-4 text-balance text-zinc-200/95 leading-relaxed">
                  Log workouts, dig into analytics, and stay connected with your
                  crew. Built for momentum without the noise.
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Button asChild className="pr-1.5">
                    <Link to="/signup">
                      <span className="text-nowrap">Start Training Free</span>
                      <ChevronRight className="size-4 shrink-0" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className={cn(HERO_OUTLINE_CTA_BUTTON_CLASSNAME)}
                  >
                    <Link to="/login">
                      <span className="text-nowrap">Log In</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </section>
  );
};
