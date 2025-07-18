'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Cat {
  id: number;
  url: string;
  tags: string[]; // Store tags from Cataas API
}

export default function Home() {
  const NUM_CATS = 10;
  const CAT_API_URL = 'https://cataas.com/cat?json=true&type=small'; // Request smaller images
  const MAX_RETRIES = 3; // Limit retries to avoid infinite loops
  const [cats, setCats] = useState<Cat[]>([]);
  const [likedCats, setLikedCats] = useState<Cat[]>([]);
  const [currentCatIndex, setCurrentCatIndex] = useState(0);
  const [screen, setScreen] = useState<'start' | 'cards' | 'summary'>('start');
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0); // Store end touch position
  const [isLoading, setIsLoading] = useState(false); // Loading state
  const [showDesktopGuide, setShowDesktopGuide] = useState(false);
  const [showClickGuide, setShowClickGuide] = useState(false); // State for click guide
  const [minimumGuideTimeElapsed, setMinimumGuideTimeElapsed] = useState(false); // Track minimum guide duration

  // Detect desktop (non-touch) device
  useEffect(() => {
    const isTouchDevice =
      'maxTouchPoints' in navigator ? navigator.maxTouchPoints > 0 : false;
    setShowDesktopGuide(!isTouchDevice);
  }, []);

  // Fetch cat images in parallel, ensuring no duplicates and storing tags
  useEffect(() => {
    if (screen === 'cards' && cats.length === 0) {
      setIsLoading(true);
      const fetchCats = async () => {
        const fetchedUrls = new Set<string>();
        const fetchSingleCat = async (id: number): Promise<Cat | null> => {
          let retries = 0;
          while (retries < MAX_RETRIES) {
            try {
              const response = await fetch(CAT_API_URL);
              const data = await response.json();
              const catUrl = data.url.startsWith('http')
                ? data.url
                : `https://cataas.com${data.url.startsWith('/') ? '' : '/'}${
                    data.url
                  }`;

              // Check for duplicate
              if (!fetchedUrls.has(catUrl)) {
                fetchedUrls.add(catUrl);
                return { id, url: catUrl, tags: data.tags || [] }; // Store tags
              }
              retries++;
            } catch (error) {
              console.error('Error fetching cat:', error);
              retries++;
            }
          }
          console.warn(
            `Could not fetch unique cat image after ${MAX_RETRIES} attempts for id ${id}`
          );
          return {
            id,
            url: 'https://cataas.com/cat/cute?type=small',
            tags: ['cute'],
          }; // Fallback
        };

        // Fetch all cats in parallel
        const catPromises = Array.from({ length: NUM_CATS }, (_, i) =>
          fetchSingleCat(i)
        );
        const results = await Promise.all(catPromises);
        setCats(results.filter((cat): cat is Cat => cat !== null));
        setIsLoading(false);
      };
      fetchCats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // Handle guide visibility based on loading state and minimum duration
  useEffect(() => {
    if (showClickGuide && minimumGuideTimeElapsed && !isLoading) {
      setShowClickGuide(false);
      setMinimumGuideTimeElapsed(false); // Reset for next time
    }
  }, [showClickGuide, minimumGuideTimeElapsed, isLoading]);

  // Generate preference summary based on tags
  const getPreferenceSummary = () => {
    if (likedCats.length === 0) {
      return "You didn't like any cats this time!";
    }

    // Count tag frequencies
    const tagCounts: { [key: string]: number } = {};
    likedCats.forEach((cat) => {
      cat.tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    // Find most common tags
    const sortedTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2) // Take top 2 tags
      .map(([tag]) => tag);

    if (sortedTags.length === 0) {
      return "You liked some cats, but we couldn't identify specific preferences.";
    }

    const tagString =
      sortedTags.length === 1
        ? sortedTags[0]
        : `${sortedTags[0]} and ${sortedTags[1]}`;
    return `You prefer ${tagString} cats!`;
  };

  // Handle swipe gestures
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsSwiping(true);
    setSwipeOffset(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    setTouchEndX(currentX); // Store end position
    const diffX = currentX - swipeOffset;
    const card = document.getElementById(`cat-card-${currentCatIndex}`);
    if (card) {
      card.style.transform = `translateX(${diffX}px) rotate(${diffX / 20}deg)`;
      const likeStamp = card.querySelector('.like-stamp');
      const dislikeStamp = card.querySelector('.dislike-stamp');
      if (diffX > 50) {
        likeStamp?.classList.add('stamp-visible');
        dislikeStamp?.classList.remove('stamp-visible');
      } else if (diffX < -50) {
        dislikeStamp?.classList.add('stamp-visible');
        likeStamp?.classList.remove('stamp-visible');
      } else {
        likeStamp?.classList.remove('stamp-visible');
        dislikeStamp?.classList.remove('stamp-visible');
      }
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    const card = document.getElementById(`cat-card-${currentCatIndex}`);
    if (!card) return;
    const diffX = touchEndX - swipeOffset; // Use end position from touchMove
    if (Math.abs(diffX) > 100) {
      card.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
      card.style.opacity = '0';
      if (diffX > 0) {
        card.style.transform = `translateX(100%) rotate(10deg)`;
        setLikedCats([...likedCats, cats[currentCatIndex]]);
      } else {
        card.style.transform = `translateX(-100%) rotate(-10deg)`;
      }
      setTimeout(() => {
        setCurrentCatIndex((prev) => {
          const nextIndex = prev + 1;
          if (nextIndex >= cats.length) {
            setScreen('summary');
            return prev;
          }
          return nextIndex;
        });
        // Reset stamps for the new card
        card.querySelector('.like-stamp')?.classList.remove('stamp-visible');
        card.querySelector('.dislike-stamp')?.classList.remove('stamp-visible');
        card.style.transition = `transform 1000ms ease, opacity 1000ms ease`;
        card.style.transform = '';
        card.style.opacity = '1';
        // Reset swipe states
        setSwipeOffset(0);
        setTouchEndX(0);
      }, 300);
    } else {
      card.style.transition = 'transform 0.3s ease';
      card.style.transform = '';
      card.querySelector('.like-stamp')?.classList.remove('stamp-visible');
      card.querySelector('.dislike-stamp')?.classList.remove('stamp-visible');
      setTimeout(() => {
        card.style.transition = '';
        // Reset swipe states
        setSwipeOffset(0);
        setTouchEndX(0);
      }, 300);
    }
  };

  // Handle click for desktop devices
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isSwiping) return; // Ignore clicks during swipe
    const card = document.getElementById(`cat-card-${currentCatIndex}`);
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const clickX = e.clientX - rect.left; // Click position relative to card

    // Ensure click is within card width (matching guide frame)
    if (clickX < 0 || clickX > rect.width) return; // Ignore clicks outside card width

    const cardWidth = rect.width;
    const midpoint = cardWidth / 2;

    // Show stamp based on click position
    const likeStamp = card.querySelector('.like-stamp');
    const dislikeStamp = card.querySelector('.dislike-stamp');
    if (clickX > midpoint) {
      likeStamp?.classList.add('stamp-visible');
      dislikeStamp?.classList.remove('stamp-visible');
    } else {
      dislikeStamp?.classList.add('stamp-visible');
      likeStamp?.classList.remove('stamp-visible');
    }

    // Simulate swipe based on click position
    setSwipeOffset(rect.left + midpoint); // Set swipe start at midpoint
    if (clickX > midpoint) {
      // Click on right side: like
      setTouchEndX(rect.left + midpoint + 150); // Simulate right swipe (diffX > 100)
    } else {
      // Click on left side: dislike
      setTouchEndX(rect.left + midpoint - 150); // Simulate left swipe (diffX < -100)
    }

    // Delay handleTouchEnd to allow stamp to be visible
    setTimeout(() => {
      handleTouchEnd();
    }, 300); // 200ms delay to show stamp
  };

  // Handle Start Swiping button click
  const handleStartSwiping = () => {
    setScreen('cards');
    if (showDesktopGuide) {
      setShowClickGuide(true);
      setMinimumGuideTimeElapsed(false);
      setTimeout(() => {
        setMinimumGuideTimeElapsed(true);
      }, 1000); // Mark minimum 1 seconds elapsed
    }
  };

  // Reset the app
  const resetApp = () => {
    setCats([]);
    setLikedCats([]);
    setCurrentCatIndex(0);
    setScreen('start');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 w-full max-w-md mx-auto p-4">
      {/* Start Screen */}
      {screen === 'start' && (
        <div className="flex flex-col items-center justify-center h-full">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Paws & Preferences
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Swipe right to like a kitty, left to dislike!
          </p>
          <button
            onClick={handleStartSwiping}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-blue-600"
          >
            Start Swiping
          </button>
        </div>
      )}

      {/* Card Stack */}
      {screen === 'cards' && (
        <div className="relative h-[500px] w-full">
          {/* Click Guide */}
          {showDesktopGuide && showClickGuide && (
            <div className="absolute top-0 left-0 w-full h-full flex z-50 animate-in fade-in-0 zoom-in-95 duration-300 animate-out fade-out-0 zoom-out-95 duration-300">
              <div className="w-1/2 h-full rounded-l-lg bg-blue-100 bg-opacity-20 shadow-md flex items-center justify-center text-center">
                <p className="text-blue-700 font-sans font-semibold text-lg">
                  Double-Click to Dislike
                </p>
              </div>
              <div className="w-1/2 h-full rounded-r-lg bg-red-100 bg-opacity-20 shadow-md flex items-center justify-center text-center">
                <p className="text-red-700 font-sans font-semibold text-lg">
                  Double-Click to Like
                </p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-lg text-gray-600">Loading cats...</p>
            </div>
          ) : cats[currentCatIndex] ? (
            <>
              <div
                id={`cat-card-${currentCatIndex}`}
                className="absolute w-full h-full bg-white rounded-lg shadow-lg overflow-hidden"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={handleClick}
              >
                <Image
                  src={cats[currentCatIndex].url}
                  alt="Cat"
                  fill
                  className="object-cover"
                  unoptimized
                  priority={currentCatIndex === 0} // Prioritize first image
                />
                <div className="like-stamp absolute top-5 left-5 text-2xl font-bold text-green-500 border-4 border-green-500 p-2 rotate-[-20deg] opacity-0 transition-opacity duration-200">
                  LIKE
                </div>
                <div className="dislike-stamp absolute top-5 right-5 text-2xl font-bold text-red-500 border-4 border-red-500 p-2 rotate-[-20deg] opacity-0 transition-opacity duration-200">
                  DISLIKE
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-lg text-gray-600">No cats loaded</p>
            </div>
          )}
        </div>
      )}

      {/* Summary Screen */}
      {screen === 'summary' && (
        <div className="flex flex-col items-center justify-center h-full">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Your Favorite Kitties!
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            You liked {likedCats.length} out of {cats.length} cats!
          </p>
          <p className="text-lg text-gray-600 mb-6">{getPreferenceSummary()}</p>
          <div className="grid grid-cols-2 gap-4 w-full">
            {likedCats.map((cat) => (
              <div key={cat.id} className="relative">
                <Image
                  src={cat.url}
                  alt="Liked Cat"
                  width={150}
                  height={100}
                  className="w-full h-32 object-cover rounded-lg"
                  unoptimized
                />
                <p className="text-sm text-gray-500 mt-1">
                  {cat.tags.join(', ')}
                </p>
              </div>
            ))}
          </div>
          <button
            onClick={resetApp}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-blue-600 mt-6"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
