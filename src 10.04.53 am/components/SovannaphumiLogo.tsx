import React, { useState } from 'react';
import { formatGoogleDriveImageUrl, DEFAULT_GOOGLE_DRIVE_LOGO_LINK } from '../lib/driveUtils';

// ============================================================================
// 📍 CODE LOCATION FOR INPUTTING GOOGLE DRIVE LOGO LINK:
// You can change or input your Google Drive link right here:
// ============================================================================
export const GOOGLE_DRIVE_LOGO_INPUT = "https://drive.google.com/file/d/1AHlIse7sV5KwQ9EOzhLl6ZPuJhvUz1km/view?usp=sharing";

// Direct CDN URL generated from the Google Drive file ID:
export const GOOGLE_DRIVE_DIRECT_URL = formatGoogleDriveImageUrl(GOOGLE_DRIVE_LOGO_INPUT);

interface SovannaphumiLogoProps {
  className?: string;
  size?: number | string;
  alt?: string;
  src?: string;
}

export const SovannaphumiLogo: React.FC<SovannaphumiLogoProps> = ({ 
  className = "w-11 h-11", 
  size,
  alt = "សាលារៀនសុវណ្ណភូមិ - Sovannaphumi School Logo",
  src
}) => {
  // Try local offline PNG first for ultra-fast instant render, with Google Drive direct link as fallback/override
  const initialSrc = src 
    ? formatGoogleDriveImageUrl(src) 
    : '/sovannaphumi.png';

  const [currentSrc, setCurrentSrc] = useState(initialSrc);
  const [hasError, setHasError] = useState(false);

  const styleProps = size ? { width: size, height: size } : {};

  const handleImgError = () => {
    // If local asset failed, fallback to local transparent alternative
    if (currentSrc === '/sovannaphumi.png') {
      setCurrentSrc('/logo-sovannaphumi_school.png');
    } else if (currentSrc === '/logo-sovannaphumi_school.png') {
      setCurrentSrc(GOOGLE_DRIVE_DIRECT_URL);
    } else {
      setHasError(true);
    }
  };

  if (hasError) {
    return (
      <svg 
        viewBox="0 0 120 120" 
        className={`${className} pointer-events-none select-none`} 
        style={styleProps}
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="60" cy="60" r="56" fill="#0284c7" stroke="#f59e0b" strokeWidth="2.5" />
        <circle cx="60" cy="60" r="46" fill="#b91c1c" stroke="#f59e0b" strokeWidth="1.5" />
        <path d="M 45,55 L 60,40 L 75,55 L 75,70 C 75,75 60,82 60,82 C 60,82 45,75 45,70 Z" fill="#eab308" stroke="#ffffff" strokeWidth="1" />
        <text x="60" y="58" fontSize="6" fontWeight="bold" fill="#ffffff" textAnchor="middle">SPS</text>
      </svg>
    );
  }

  return (
    <img 
      src={currentSrc} 
      alt={alt}
      style={styleProps}
      className={`${className} object-contain shrink-0 select-none drop-shadow-xs`}
      onError={handleImgError}
      referrerPolicy="no-referrer"
      loading="eager"
    />
  );
};

export default SovannaphumiLogo;
