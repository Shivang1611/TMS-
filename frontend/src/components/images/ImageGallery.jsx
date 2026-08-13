import { useState, useMemo, useCallback, useEffect } from 'react';
import { Image, Expand, X, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Parses HTML string and extracts all <img> src URLs.
 */
function extractImages(html) {
  if (!html) return [];
  const srcRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  const urls = [];
  let match;
  while ((match = srcRegex.exec(html)) !== null) {
    if (match[1] && !urls.includes(match[1])) {
      urls.push(match[1]);
    }
  }
  return urls;
}

/**
 * ImageGallery — displays all images extracted from an HTML string
 * in a responsive masonry-like grid. Click an image to open a lightbox
 * with prev/next navigation.
 */
export default function ImageGallery({ html, title = 'Images' }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [brokenSet, setBrokenSet] = useState(new Set());

  const images = useMemo(() => extractImages(html), [html]);
  const workingImages = images.filter((src) => !brokenSet.has(src));

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (lightboxIndex !== null) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [lightboxIndex]);

  const handlePrev = useCallback((e) => {
    e.stopPropagation();
    setLightboxIndex((prev) => (prev === 0 ? workingImages.length - 1 : prev - 1));
  }, [workingImages.length]);

  const handleNext = useCallback((e) => {
    e.stopPropagation();
    setLightboxIndex((prev) => (prev === workingImages.length - 1 ? 0 : prev + 1));
  }, [workingImages.length]);

  const handleKeyDown = useCallback((e) => {
    if (lightboxIndex === null) return;
    if (e.key === 'Escape') setLightboxIndex(null);
    if (e.key === 'ArrowLeft') handlePrev(e);
    if (e.key === 'ArrowRight') handleNext(e);
  }, [lightboxIndex, handlePrev, handleNext]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (workingImages.length === 0) return null;

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <Image className="h-4 w-4 text-surface-400" />
        <h3 className="text-sm font-medium text-surface-700">
          {title} ({workingImages.length})
        </h3>
      </div>

      {/* Responsive grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {workingImages.map((src, idx) => (
          <button
            key={src}
            type="button"
            onClick={() => setLightboxIndex(idx)}
            className="group relative aspect-square overflow-hidden rounded-lg border border-surface-200 bg-surface-50 hover:border-primary-300 hover:shadow-md transition-all duration-200"
          >
            <img
              src={src}
              alt={`Image ${idx + 1}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              onError={() => setBrokenSet((prev) => new Set(prev).add(src))}
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all duration-200">
              <Expand className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow-lg" />
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxIndex(null)}
        >
          <div className="relative flex items-center justify-center max-h-[90vh] max-w-[90vw]">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md hover:bg-surface-50 transition-colors"
            >
              <X className="h-4 w-4 text-surface-600" />
            </button>

            {/* Previous */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="absolute -left-12 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white transition-colors z-10"
              >
                <ChevronLeft className="h-5 w-5 text-surface-600" />
              </button>
            )}

            {/* Image */}
            <img
              src={workingImages[lightboxIndex]}
              alt={`Image ${lightboxIndex + 1}`}
              className="max-h-[85vh] max-w-[85vw] rounded-xl shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Next */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="absolute -right-12 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md hover:bg-white transition-colors z-10"
              >
                <ChevronRight className="h-5 w-5 text-surface-600" />
              </button>
            )}
          </div>

          {/* Counter */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-xs text-white/90">
            {lightboxIndex + 1} / {workingImages.length}
          </div>
        </div>
      )}
    </div>
  );
}
