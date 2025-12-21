"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SplashScreenProps {
  onComplete: () => void;
  show?: boolean;
}

export function SplashScreen({ onComplete, show = true }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!show) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-50 overflow-hidden"
          suppressHydrationWarning
        >
          {/* Background layers */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-900 via-emerald-950 to-black" />

            {/* Architectural pattern */}
            <div className="absolute inset-0 splash-architectural-pattern opacity-60" />

            {/* Glow effects */}
            <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-full h-[60%] bg-emerald-900/30 blur-[120px]" />
            <div className="absolute top-[20%] left-[10%] w-80 h-80 bg-emerald-800/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-[20%] right-[5%] w-64 h-64 bg-amber-600/5 rounded-full blur-[80px]" />
          </div>

          {/* Main content */}
          <main className="relative z-10 flex flex-col items-center justify-center h-full w-full max-w-sm mx-auto py-16 px-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
              className="flex flex-col items-center space-y-14"
            >
              {/* Diamond icon container */}
              <div className="relative group scale-125">
                {/* Glow behind */}
                <div className="absolute inset-0 bg-amber-400/5 rounded-full blur-[60px] opacity-100 animate-pulse" />

                <div className="relative w-36 h-36 flex items-center justify-center">
                  {/* Rotating rings */}
                  <div className="absolute inset-0 border border-amber-300/10 rounded-full scale-105 animate-spin-slow" />
                  <div className="absolute inset-0 border border-emerald-500/10 rounded-full scale-125 animate-spin-slower-reverse" />

                  {/* Diamond shape */}
                  <div className="w-28 h-28 bg-gradient-to-br from-[#021812] to-black backdrop-blur-2xl border border-amber-500/30 rotate-45 flex items-center justify-center shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)]">
                    <div className="w-[90%] h-[90%] border-[0.5px] border-amber-400/10 flex items-center justify-center relative overflow-hidden">
                      {/* Highlight */}
                      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                      {/* Handshake icon - Official Vendra Logo */}
                      <svg
                        viewBox="0 0 369 221"
                        className="w-16 h-10 -rotate-45 splash-gold-icon"
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" clipRule="evenodd" d="M293.647 8.09106C285.672 12.5201 278.724 16.5481 278.206 17.0431C277.301 17.9081 278.255 20.1141 283.358 28.9611C284.468 30.8861 289.992 40.5611 295.633 50.4611C301.273 60.3611 309.619 74.9861 314.178 82.9611C327.199 105.737 328.578 108.192 330.88 112.711C332.071 115.049 333.451 116.961 333.947 116.961C334.443 116.961 342.445 112.865 351.73 107.858L368.611 98.7561L365.928 94.1081C364.453 91.5521 359.219 82.7111 354.297 74.4611C349.376 66.2111 344.581 58.1111 343.641 56.4611C341.931 53.4581 336.206 43.7611 319.284 15.2111C314.312 6.82405 309.773 -0.0219471 309.196 5.28757e-05C308.619 0.0210529 301.622 3.66206 293.647 8.09106ZM38.9252 26.2111C35.5972 32.3991 30.7442 41.5111 28.1402 46.4611C25.5372 51.4111 21.9492 58.1611 20.1682 61.4611C18.3872 64.7611 14.1082 72.8611 10.6582 79.4611C7.20918 86.0611 3.29818 93.3801 1.96618 95.7251C0.635177 98.0701 -0.225824 100.357 0.0521757 100.807C0.560176 101.63 18.3992 112.397 26.4912 116.765C28.8812 118.055 36.4472 122.452 43.3052 126.536C50.1632 130.62 56.0952 133.961 56.4882 133.961C56.8812 133.961 59.6322 131.2 62.6022 127.826C71.5072 117.71 81.1732 115.354 90.0092 121.147C93.8242 123.647 98.6472 130.323 98.6472 133.102C98.6472 135.726 99.8652 135.997 104.497 134.401C114.878 130.824 127.218 138.575 129.136 149.877L129.744 153.461H136.104C141.717 153.461 142.911 153.823 146.266 156.539C151.883 161.087 154.788 167.249 154.346 173.678C154.004 178.659 154.127 178.962 157.067 180.381C166.382 184.876 170.532 193.484 168.436 203.961C167.742 207.429 167.815 207.52 176.387 213.877C183.382 219.064 185.91 220.375 189.592 220.725C195.103 221.249 198.898 218.761 200.64 213.483C202.602 207.537 200.335 204.678 183.736 192.16C175.549 185.987 168.611 180.309 168.317 179.542C168.022 178.776 168.558 177.447 169.506 176.589C171.741 174.566 172.238 174.87 194.443 191.863C203.954 199.141 213.052 205.555 214.661 206.116C220.579 208.179 227.672 203.678 229.157 196.918C230.502 190.791 228.322 187.739 215.505 177.801C185.176 154.284 181.647 151.388 181.647 150.011C181.647 149.604 182.517 148.484 183.58 147.522C185.433 145.845 185.691 145.896 189.83 148.772C192.204 150.422 195.047 152.611 196.147 153.637C197.247 154.663 203.097 159.303 209.147 163.949C215.197 168.594 222.66 174.434 225.731 176.928C235.999 185.263 237.128 186.012 240.993 187.053C247.511 188.81 253.476 185.7 256.23 179.109C259.368 171.599 257.416 168.135 244.025 157.455C227.503 144.276 206.216 126.571 204.988 124.986C203.545 123.122 205.023 119.961 207.338 119.961C208.713 119.961 215.06 124.049 216.647 125.956C216.922 126.287 224.347 132.378 233.147 139.491C241.947 146.605 253.387 155.921 258.57 160.194C263.752 164.466 269.489 168.376 271.32 168.881C274.843 169.854 279.9 168.879 282.77 166.673C285.586 164.509 288.639 158.585 288.643 155.276C288.65 149.243 286.981 146.724 278.162 139.461C275.491 137.261 271.449 133.886 269.179 131.961C266.909 130.036 262.857 126.661 260.174 124.461C257.492 122.261 252.563 118.169 249.222 115.367C243.291 110.393 223.261 93.9501 214.62 86.9611C207.617 81.2961 192.28 68.7621 190.551 67.2891C189.182 66.1231 188.257 66.3231 184.051 68.6921C181.354 70.2111 176.459 72.8061 173.174 74.4571C167.34 77.3911 167.085 77.694 162.174 87.525C155.169 101.547 150.688 105.711 139.523 108.571C131.526 110.62 123.706 109.934 119.035 106.773C115.509 104.388 111.647 97.869 111.647 94.303C111.647 92.272 117.56 74.8971 123.675 58.9611C127.564 48.8241 129.835 46.42 145.369 35.993C151.489 31.885 156.243 28.1161 155.934 27.6161C155.105 26.2761 145.028 27.509 138.147 29.794C134.847 30.889 128.772 33.3491 124.647 35.2611C106.688 43.5811 102.615 42.945 71.3112 26.919C58.4642 20.342 47.2822 14.9611 46.4642 14.9611C45.5932 14.9611 42.4662 19.6271 38.9252 26.2111ZM183.162 20.6291C178.807 21.8781 135.886 50.667 133.931 53.65C131.01 58.108 119.647 91.041 119.647 95.049C119.647 101.464 125.753 104.039 135.958 101.928C146.479 99.75 149.734 96.6881 156.646 82.4611L161.505 72.4611L170.326 68.0111C175.178 65.5641 181.148 62.3011 183.593 60.7611C186.038 59.2211 188.513 57.9691 189.093 57.9781C189.673 57.9871 193.334 60.5751 197.229 63.7281C214.6 77.791 241.92 100.07 250.225 106.945C255.217 111.079 261.292 116.088 263.725 118.076C266.157 120.064 271.026 124.114 274.546 127.076C287.397 137.892 286.447 137.322 288.927 135.695C291.846 133.778 297.047 128.864 298.218 126.915C298.729 126.064 303.422 122.811 308.647 119.686C313.872 116.56 318.728 113.618 319.439 113.147C320.418 112.499 319.026 109.325 313.689 100.033C309.816 93.2911 306.647 87.549 306.647 87.273C306.647 86.996 305.816 85.5751 304.801 84.1151C303.785 82.6551 301.249 78.3111 299.165 74.4611C295.369 67.4501 272.682 27.773 272.088 27.107C271.914 26.912 269.156 28.037 265.96 29.607C260.855 32.113 259.051 32.4581 251.147 32.4351C244.493 32.4161 240.322 31.8081 235.147 30.1021C212.55 22.6571 190.256 18.5941 183.162 20.6291ZM71.3452 129.211C63.1502 137.121 58.6472 143.754 58.6472 147.916C58.6472 154.464 64.8192 159.961 72.1722 159.961C75.2132 159.961 76.7532 159.047 81.7522 154.28C89.2642 147.114 91.7572 143.085 91.8272 137.997C91.8932 133.251 89.7632 129.612 85.3432 126.917C80.1082 123.725 76.3992 124.333 71.3452 129.211ZM105.523 141.769C101.901 143.616 84.1312 161.324 81.9322 165.277C80.1742 168.439 80.3802 174.701 82.3532 178.041C84.1872 181.145 89.0842 183.961 92.6472 183.961C93.8562 183.961 96.2632 183.288 97.9962 182.464C102.487 180.331 119.392 162.817 121.249 158.372C124.036 151.702 120.846 144.196 114.011 141.34C109.84 139.597 109.777 139.6 105.523 141.769ZM118.534 172.711C107.478 183.862 105.805 185.986 105.193 189.647C103.757 198.235 110.091 204.835 118.664 203.685C122.509 203.17 124.117 201.961 133.8 192.308C145.354 180.79 147.647 177.335 147.647 171.442C147.647 168.458 146.882 166.96 143.765 163.843C140.444 160.523 139.253 159.961 135.529 159.961C131.279 159.961 130.873 160.266 118.534 172.711ZM140.34 194.863C130.183 205.331 128.474 208.716 130.671 214.018C132.257 217.849 137.424 220.961 142.197 220.961C145.622 220.961 146.799 220.171 153.745 213.211C161.852 205.088 163.681 201.216 162.2 195.315C161.386 192.073 156.682 187.517 152.72 186.136C149.902 185.154 149.459 185.466 140.34 194.863Z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Text content */}
              <div className="text-center space-y-6">
                <h1 className="text-6xl font-serif font-medium tracking-[0.15em] splash-gold-text-gradient drop-shadow-2xl">
                  VENDRA
                </h1>

                {/* Decorative line */}
                <div className="flex items-center justify-center gap-4 opacity-80">
                  <div className="w-12 h-[0.5px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
                  <div className="w-1 h-1 bg-amber-300 rounded-full rotate-45 shadow-[0_0_8px_#D4AF37]" />
                  <div className="w-12 h-[0.5px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
                </div>

                <p className="text-[10px] font-sans tracking-[0.6em] text-amber-100/50 uppercase font-light pt-1">
                  Conecta compradores y vendedores
                </p>
              </div>
            </motion.div>

            {/* Loading bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 2, delay: 0.5 }}
              className="absolute bottom-16 w-24"
            >
              <div className="splash-loader-container">
                <div className="splash-loader-bar" />
              </div>
            </motion.div>
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  );
}