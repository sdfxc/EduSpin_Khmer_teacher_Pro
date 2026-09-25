import React from 'react';
import { motion } from 'motion/react';

export type GlassVariant = 
  | 'dark-glass' 
  | 'indigo-glass' 
  | 'emerald-glass' 
  | 'orange-glass'
  | 'blue-glass' 
  | 'sky-glass' 
  | 'google-glass' 
  | 'crystal-glass'
  | 'liquid-glass'
  | 'email-glass'
  | 'amber-glass';

interface GlassLiquidOverlayProps {
  layoutId?: string;
  isDarkMode?: boolean;
  variant?: GlassVariant;
  className?: string;
  glow?: boolean;
}

export function GlassLiquidOverlay({
  layoutId,
  isDarkMode = true,
  variant = 'dark-glass',
  className = '',
  glow = true,
}: GlassLiquidOverlayProps) {
  const getVariantStyles = () => {
    if (variant === 'crystal-glass' || variant === 'liquid-glass' || variant === 'dark-glass') {
      return isDarkMode
        ? 'bg-neutral-800/80 border-t border-t-white/35 border-x border-white/15 border-b border-black/40 shadow-[0_8px_24px_rgba(0,0,0,0.45),inset_0_2px_4px_rgba(255,255,255,0.25),inset_0_-2px_4px_rgba(0,0,0,0.4)] backdrop-blur-2xl'
        : 'bg-white/90 border-t border-t-white border-x border-white/80 border-b border-neutral-200/80 shadow-[0_8px_24px_rgba(0,0,0,0.06),inset_0_2px_4px_rgba(255,255,255,1),inset_0_-1.5px_3px_rgba(0,0,0,0.04)] backdrop-blur-2xl';
    }
    if (variant === 'indigo-glass' || variant === 'email-glass') {
      return 'bg-gradient-to-b from-indigo-400 via-indigo-600 to-purple-800 border-t border-white/80 border-b border-indigo-950/80 shadow-[0_10px_35px_rgba(99,102,241,0.65),0_0_25px_rgba(168,85,247,0.5),inset_0_2.5px_4.5px_rgba(255,255,255,0.85),inset_0_-2.5px_4.5px_rgba(0,0,0,0.4)]';
    }
    if (variant === 'emerald-glass') {
      return 'bg-gradient-to-b from-emerald-400 via-emerald-500 to-teal-800 border-t border-white/80 border-b border-emerald-950/80 shadow-[0_10px_35px_rgba(16,185,129,0.65),0_0_25px_rgba(52,211,153,0.5),inset_0_2.5px_4.5px_rgba(255,255,255,0.85),inset_0_-2.5px_4.5px_rgba(0,0,0,0.4)]';
    }
    if (variant === 'orange-glass' || variant === 'amber-glass') {
      return 'bg-gradient-to-b from-orange-500 via-amber-500 to-orange-600 border-t border-white/85 border-b border-orange-950/80 shadow-[0_10px_35px_rgba(249,115,22,0.7),0_0_28px_rgba(251,146,60,0.55),inset_0_2.5px_4.5px_rgba(255,255,255,0.9),inset_0_-2.5px_4.5px_rgba(0,0,0,0.4)]';
    }
    if (variant === 'blue-glass') {
      return 'bg-gradient-to-b from-blue-400 via-blue-600 to-blue-800 border-t border-white/80 border-b border-blue-950/80 shadow-[0_10px_35px_rgba(24,119,242,0.6),0_0_22px_rgba(59,130,246,0.45),inset_0_2.5px_4.5px_rgba(255,255,255,0.85),inset_0_-2.5px_4.5px_rgba(0,0,0,0.4)]';
    }
    if (variant === 'sky-glass') {
      return 'bg-gradient-to-b from-sky-400 via-sky-500 to-cyan-700 border-t border-white/80 border-b border-sky-950/80 shadow-[0_10px_35px_rgba(2,132,199,0.6),0_0_22px_rgba(56,189,248,0.45),inset_0_2.5px_4.5px_rgba(255,255,255,0.85),inset_0_-2.5px_4.5px_rgba(0,0,0,0.4)]';
    }
    if (variant === 'google-glass') {
      return isDarkMode
        ? 'bg-gradient-to-b from-white/[0.22] via-slate-800/90 to-slate-900 border-t border-white/60 border-b border-black/80 shadow-[0_8px_25px_rgba(0,0,0,0.6),inset_0_2px_3px_rgba(255,255,255,0.7),inset_0_-2px_4px_rgba(0,0,0,0.4)]'
        : 'bg-gradient-to-b from-white via-slate-50 to-slate-100 border-t border-white border-b border-slate-300 shadow-[0_8px_25px_rgba(0,0,0,0.08),inset_0_2.5px_4px_rgba(255,255,255,1),inset_0_-1.5px_2px_rgba(0,0,0,0.05)]';
    }
    return isDarkMode
      ? 'bg-gradient-to-b from-white/[0.22] via-black/60 to-black/90 border-t border-white/50 border-b border-black/80 shadow-[0_8px_30px_rgba(0,0,0,0.7),inset_0_2px_3px_rgba(255,255,255,0.75),inset_0_-2px_5px_rgba(255,255,255,0.12)]'
      : 'bg-gradient-to-b from-white/95 via-white/85 to-slate-100/90 border-t border-white border-b border-slate-300 shadow-[0_8px_24px_rgba(0,0,0,0.08),inset_0_2.5px_4px_rgba(255,255,255,1),inset_0_-2px_4px_rgba(0,0,0,0.06)]';
  };

  const isColorVariant = 
    variant === 'indigo-glass' || 
    variant === 'emerald-glass' || 
    variant === 'orange-glass' || 
    variant === 'amber-glass' || 
    variant === 'blue-glass' || 
    variant === 'sky-glass' ||
    variant === 'email-glass';

  const isCustomRounded = className.includes('rounded-');
  const roundedClass = isCustomRounded ? '' : 'rounded-full';
  const roundedTopClass = isCustomRounded ? 'rounded-t-[inherit]' : 'rounded-t-full';

  const content = (
    <div
      className={`absolute inset-0 ${roundedClass} border backdrop-blur-2xl overflow-hidden pointer-events-none transition-colors ${getVariantStyles()} ${className}`}
    >
      {/* Top Specular Glare Dome Reflection (ចំណាំងពន្លឺកោងមូលតំណក់ទឹកថ្លា) */}
      <div
        className={`absolute top-0 inset-x-1.5 h-[54%] ${roundedTopClass} pointer-events-none ${
          isColorVariant
            ? 'bg-gradient-to-b from-white/85 via-white/30 to-transparent'
            : isDarkMode
              ? 'bg-gradient-to-b from-white/75 via-white/20 to-transparent'
              : 'bg-gradient-to-b from-white/95 via-white/45 to-transparent'
        }`}
      />

      {/* Central Radial Light Core (ស្នូលពន្លឺរលោងខាងក្នុង) */}
      <div
        className={`absolute top-0.5 left-1/2 -translate-x-1/2 w-4/5 h-[45%] rounded-full pointer-events-none ${
          isColorVariant
            ? 'bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.85)_0%,_transparent_75%)]'
            : isDarkMode
              ? 'bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.85)_0%,_transparent_75%)]'
              : 'bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.95)_0%,_transparent_75%)]'
        }`}
      />

      {/* Continuous Liquid Light Wave Animation (ចលនារលកពន្លឺចាំងឆ្លងកាត់តំណក់ទឹក) */}
      <motion.div
        className="absolute inset-y-0 w-1/3 -skew-x-25 bg-gradient-to-r from-transparent via-white/50 dark:via-white/40 to-transparent pointer-events-none"
        animate={{ x: ['-120%', '350%'] }}
        transition={{
          repeat: Infinity,
          duration: 2.5,
          ease: [0.4, 0, 0.2, 1],
          repeatDelay: 0.8,
        }}
      />

      {/* Secondary subtle glow pulse */}
      <motion.div
        className="absolute inset-0 rounded-full bg-white/10 pointer-events-none"
        animate={{ opacity: [0.1, 0.35, 0.1] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
      />

      {/* Bottom Droplet Meniscus Light Rim (គែមពន្លឺបាតតំណក់ទឹកថ្លា) */}
      <div
        className={`absolute bottom-0 inset-x-3 h-[1.5px] bg-gradient-to-r from-transparent to-transparent pointer-events-none ${
          isColorVariant
            ? 'via-white/70'
            : isDarkMode
              ? 'via-white/55'
              : 'via-white/95'
        }`}
      />
    </div>
  );

  if (layoutId) {
    return (
      <motion.div
        layoutId={layoutId}
        transition={{
          type: 'spring',
          stiffness: 380,
          damping: 24,
          mass: 0.65,
        }}
        className="absolute inset-0 pointer-events-none"
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

interface GlassLiquidButtonProps {
  children: React.ReactNode;
  isDarkMode?: boolean;
  variant?: GlassVariant;
  className?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  id?: string;
  title?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export function GlassLiquidButton({
  children,
  isDarkMode = true,
  variant = 'dark-glass',
  className = '',
  icon,
  disabled = false,
  type = 'button',
  id,
  title,
  onClick,
  ...rest
}: GlassLiquidButtonProps) {
  const isColorVariant = 
    variant === 'indigo-glass' || 
    variant === 'emerald-glass' || 
    variant === 'orange-glass' || 
    variant === 'amber-glass' || 
    variant === 'blue-glass' || 
    variant === 'sky-glass' ||
    variant === 'email-glass';

  return (
    <motion.button
      type={type}
      id={id}
      title={title}
      disabled={disabled}
      onClick={onClick}
      whileHover={disabled ? undefined : { scale: 1.04, y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.94, scaleY: 0.9, scaleX: 1.05 }}
      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
      className={`relative px-4 py-2.5 rounded-full text-xs font-black flex items-center gap-2 select-none whitespace-nowrap focus:outline-none isolate transition-shadow ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${
        isColorVariant
          ? 'text-white'
          : isDarkMode
            ? 'text-slate-100 hover:text-white'
            : 'text-slate-800 hover:text-slate-950'
      } ${className}`}
      {...(rest as any)}
    >
      <GlassLiquidOverlay isDarkMode={isDarkMode} variant={variant} />
      {icon && (
        <span className="relative z-10 w-6 h-6 rounded-full bg-white/25 border border-white/40 shadow-[0_0_8px_rgba(255,255,255,0.35)] flex items-center justify-center shrink-0 text-white">
          {icon}
        </span>
      )}
      <span className="relative z-10 flex items-center gap-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
        {children}
      </span>
    </motion.button>
  );
}

