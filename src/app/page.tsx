'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Cat {
  id: number;
  url: string;
}

export default function Home() {
  const NUM_CATS = 10;
  const CAT_API_URL = 'https://cataas.com/cat?json=true';
  const [cats, setCats] = useState<Cat[]>([]);
  const [likedCats, setLikedCats] = useState<Cat[]>([]);
  const [currentCatIndex, setCurrentCatIndex] = useState(0);
  const [screen, setScreen] = useState<'start' | 'cards' | 'summary'>('start');
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Fetch cat images
  useEffect(() => {
    if (screen === 'cards' && cats.length === 0) {
      const fetchCats = async () => {
        const newCats: Cat[] = [];
        for (let i = 0; i < NUM_CATS; i++) {
          try {
            const response = await fetch(CAT_API_URL);
            const data = await response.json();
            newCats.push({ id: i, url: `https://cataas.com${data.url}` });
          } catch (error) {
            console.error('Error fetching cat:', error);
          }
        }
        setCats(newCats);
      };
      fetchCats();
    }
  }, [screen]);

  // Handle swipe gestures
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsSwiping(true);
    setSwipeOffset(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
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
    const rect = card.getBoundingClientRect();
    const diffX = swipeOffset - (rect.left + rect.width / 2);
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
        card.style.transition = '';
        card.style.transform = '';
        card.style.opacity = '1';
      }, 300);
    } else {
      card.style.transition = 'transform 0.3s ease';
      card.style.transform = '';
      card.querySelector('.like-stamp')?.classList.remove('stamp-visible');
      card.querySelector('.dislike-stamp')?.classList.remove('stamp-visible');
      setTimeout(() => {
        card.style.transition = '';
      }, 300);
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
        <div className="flex flex-col items-center justify-center h-screen">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Paws & Preferences
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Swipe right to like a kitty, left to dislike!
          </p>
          <button
            onClick={() => setScreen('cards')}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-blue-600"
          >
            Start Swiping
          </button>
        </div>
      )}

      {/* Card Stack */}
      {screen === 'cards' && (
        <div className="relative h-[500px] w-full">
          {cats[currentCatIndex] && (
            <div
              id={`cat-card-${currentCatIndex}`}
              className="absolute w-full h-full bg-white rounded-lg shadow-lg overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <Image
                src={cats[currentCatIndex].url}
                alt="Cat"
                fill
                className="object-cover"
                unoptimized
              />
              <div className="like-stamp absolute top-5 left-5 text-2xl font-bold text-green-500 border-4 border-green-500 p-2 rotate-[-20deg] opacity-0 transition-opacity duration-200">
                LIKE
              </div>
              <div className="dislike-stamp absolute top-5 right-5 text-2xl font-bold text-red-500 border-4 border-red-500 p-2 rotate-[-20deg] opacity-0 transition-opacity duration-200">
                DISLIKE
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary Screen */}
      {screen === 'summary' && (
        <div className="flex flex-col items-center justify-center h-screen">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Your Favorite Kitties!
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            You liked {likedCats.length} out of {cats.length} cats!
          </p>
          <div className="grid grid-cols-2 gap-4 w-full">
            {likedCats.map((cat) => (
              <Image
                key={cat.id}
                src={cat.url}
                alt="Liked Cat"
                width={150}
                height={100}
                className="w-full h-32 object-cover rounded-lg"
                unoptimized
              />
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
