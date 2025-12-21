<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>VENDRA - Ultra-Luxury Splash</title>
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&amp;family=Playfair+Display:ital,wght@0,400;0,600;1,400&amp;family=Plus+Jakarta+Sans:wght@300;400;500&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              emerald: {
                800: "#065F46",
                900: "#064E3B",
                950: "#022C22", // Deepest emerald
                1000: "#011510", // Near black
              },
              gold: {
                100: "#FBF5E2",
                200: "#F2E2B8",
                300: "#E5C883",
                400: "#D4AF37", // Classic Gold
                500: "#B08D26",
                600: "#8C6E19",
                700: "#705610", // Darker gold/bronze
              },
              bone: {
                  100: "#F5F5F0",
                  200: "#E8E8E0",
              }
            },
            fontFamily: {
              serif: ["'Playfair Display'", "serif"],
              display: ["'Cinzel'", "serif"],
              sans: ["'Plus Jakarta Sans'", "sans-serif"],
            },
            animation: {
              'fade-in-slow': 'fadeIn 2s ease-out forwards',
              'fade-in-up': 'fadeInUp 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
              'pulse-gold': 'pulseGold 4s infinite',
              'shimmer-text': 'shimmerText 6s linear infinite',
              'spin-slow': 'spin 15s linear infinite',
              'spin-slower-reverse': 'spin 20s linear infinite reverse',
            },
            keyframes: {
              fadeIn: {
                '0%': { opacity: '0' },
                '100%': { opacity: '1' },
              },
              fadeInUp: {
                '0%': { opacity: '0', transform: 'translateY(30px)' },
                '100%': { opacity: '1', transform: 'translateY(0)' },
              },
              pulseGold: {
                '0%, 100%': { borderColor: 'rgba(212, 175, 55, 0.2)', boxShadow: '0 0 0 0 rgba(212, 175, 55, 0)' },
                '50%': { borderColor: 'rgba(212, 175, 55, 0.5)', boxShadow: '0 0 30px 0 rgba(212, 175, 55, 0.15)' },
              },
              shimmerText: {
                '0%': { backgroundPosition: '-200% center' },
                '100%': { backgroundPosition: '200% center' },
              }
            }
          },
        },
      };
    </script>
<style>
        .architectural-pattern {
            background-image: 
                linear-gradient(30deg, rgba(212, 175, 55, 0.03) 1px, transparent 1px),
                linear-gradient(150deg, rgba(212, 175, 55, 0.03) 1px, transparent 1px);
            background-size: 60px 60px;
            mask-image: radial-gradient(circle at 50% 50%, black 50%, transparent 90%);
            -webkit-mask-image: radial-gradient(circle at 50% 50%, black 50%, transparent 90%);
        }
        .gold-text-gradient {
            background: linear-gradient(
                90deg, 
                #8C6E19 0%, 
                #D4AF37 25%, 
                #FFF8DC 50%, 
                #D4AF37 75%, 
                #8C6E19 100%
            );
            background-size: 200% auto;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-shadow: 0 0 30px rgba(212, 175, 55, 0.2);
        }
        .gold-icon-gradient {
            background: linear-gradient(
                135deg, 
                #BF953F 0%, 
                #FCF6BA 25%, 
                #B38728 50%, 
                #FBF5E2 75%, 
                #AA771C 100%
            );
            background-size: 200% 200%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));
        }
        .emerald-glow {
            background: radial-gradient(circle at center, rgba(6, 78, 59, 0.4) 0%, transparent 70%);
        }
        .loader-line-container {
            position: relative;
            width: 100%;
            height: 1px;
            background: rgba(212, 175, 55, 0.1);
            overflow: hidden;
        }
        .loader-line-bar {
            position: absolute;
            height: 100%;
            width: 50%;
            background: linear-gradient(90deg, transparent, #D4AF37, transparent);
            animation: loadingMove 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes loadingMove {
            0% { left: -50%; }
            100% { left: 100%; }
        }
    </style>
<style>
    body {
      min-height: max(800px, 100dvh);
    }
</style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="h-screen w-full bg-emerald-1000 overflow-hidden relative flex flex-col items-center justify-center selection:bg-gold-500 selection:text-white">
<div class="absolute inset-0 z-0 pointer-events-none">
<div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900 via-emerald-950 to-black"></div>
<div class="absolute inset-0 architectural-pattern opacity-60"></div>
<div class="absolute top-[-10%] left-1/2 -translate-x-1/2 w-full h-[60%] bg-emerald-900/30 blur-[120px]"></div>
<div class="absolute top-[20%] left-[10%] w-80 h-80 bg-emerald-800/10 rounded-full blur-[100px]"></div>
<div class="absolute bottom-[20%] right-[5%] w-64 h-64 bg-gold-600/5 rounded-full blur-[80px]"></div>
</div>
<main class="relative z-10 flex flex-col items-center justify-between h-full w-full max-w-sm py-16 px-8">
<div class="flex-1"></div>
<div class="flex flex-col items-center space-y-14 animate-fade-in-up">
<div class="relative group scale-125">
<div class="absolute inset-0 bg-gold-400/5 rounded-full blur-[60px] opacity-100 animate-pulse-gold"></div>
<div class="relative w-36 h-36 flex items-center justify-center">
<div class="absolute inset-0 border border-gold-300/10 rounded-full scale-105 animate-spin-slow"></div>
<div class="absolute inset-0 border border-emerald-500/10 rounded-full scale-125 animate-spin-slower-reverse"></div>
<div class="w-28 h-28 bg-gradient-to-br from-[#021812] to-black backdrop-blur-2xl border border-gold-500/30 rotate-45 flex items-center justify-center shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)]">
<div class="w-[90%] h-[90%] border-[0.5px] border-gold-400/10 flex items-center justify-center relative overflow-hidden group-hover:border-gold-400/20 transition-colors duration-700">
<div class="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
<span class="material-symbols-outlined text-6xl gold-icon-gradient -rotate-45 animate-shimmer-text" style="font-variation-settings: 'FILL' 1, 'wght' 200;">
                            handshake
                        </span>
</div>
</div>
</div>
</div>
<div class="text-center space-y-6">
<h1 class="text-6xl font-display font-medium tracking-[0.15em] gold-text-gradient animate-shimmer-text drop-shadow-2xl">
                VENDRA
            </h1>
<div class="flex items-center justify-center gap-4 opacity-80">
<div class="w-12 h-[0.5px] bg-gradient-to-r from-transparent via-gold-500/60 to-transparent"></div>
<div class="w-1 h-1 bg-gold-300 rounded-full rotate-45 shadow-[0_0_8px_#D4AF37]"></div>
<div class="w-12 h-[0.5px] bg-gradient-to-r from-transparent via-gold-500/60 to-transparent"></div>
</div>
<p class="text-[10px] font-sans tracking-[0.6em] text-gold-100/50 uppercase font-light pt-1">
                Curated Luxury
            </p>
</div>
</div>
<div class="flex-1 flex flex-col justify-end w-full space-y-6 animate-fade-in-slow" style="animation-delay: 0.5s;">
<div class="flex flex-col items-center gap-6">
<div class="w-24 loader-line-container">
<div class="loader-line-bar"></div>
</div>
</div>
</div>
</main>

</body></html>