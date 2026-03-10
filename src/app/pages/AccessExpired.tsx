import React from "react";
import { motion } from "motion/react";
import svgPaths from "../../imports/svg-qd05zunzc7";

export default function AccessExpired() {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-white">
      {/* Gradient blob background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-[45vw] h-[45vw] rounded-full bg-[#6B4BC8] opacity-70 blur-[80px] will-change-transform" style={{ top: '70%', left: '5%', animation: 'blob0 18s ease-in-out infinite' }} />
        <div className="absolute w-[50vw] h-[50vw] rounded-full bg-[#904498] opacity-70 blur-[80px] will-change-transform" style={{ top: '5%', right: '-5%', animation: 'blob1 22s ease-in-out infinite' }} />
        <div className="absolute w-[55vw] h-[55vw] rounded-full bg-[#DE6231] opacity-70 blur-[80px] will-change-transform" style={{ top: '10%', left: '-10%', animation: 'blob2 20s ease-in-out infinite' }} />
        <div className="absolute w-[48vw] h-[48vw] rounded-full bg-[#CA3C43] opacity-70 blur-[80px] will-change-transform" style={{ bottom: '5%', right: '0%', animation: 'blob3 16s ease-in-out infinite' }} />
        <div className="absolute w-[40vw] h-[40vw] rounded-full bg-[#6B4BC8] opacity-60 blur-[80px] will-change-transform" style={{ top: '40%', left: '30%', animation: 'blob4 24s ease-in-out infinite' }} />
        <style>{`
          @keyframes blob0 { 0%,100%{transform:translate(0,0)} 20%{transform:translate(30vw,-35vh)} 40%{transform:translate(-10vw,15vh)} 60%{transform:translate(40vw,-20vh)} 80%{transform:translate(10vw,30vh)} }
          @keyframes blob1 { 0%,100%{transform:translate(0,0)} 20%{transform:translate(-30vw,40vh)} 40%{transform:translate(15vw,-15vh)} 60%{transform:translate(-20vw,30vh)} 80%{transform:translate(10vw,-35vh)} }
          @keyframes blob2 { 0%,100%{transform:translate(0,0)} 20%{transform:translate(40vw,20vh)} 40%{transform:translate(-8vw,45vh)} 60%{transform:translate(30vw,-15vh)} 80%{transform:translate(-15vw,35vh)} }
          @keyframes blob3 { 0%,100%{transform:translate(0,0)} 20%{transform:translate(-25vw,-40vh)} 40%{transform:translate(15vw,20vh)} 60%{transform:translate(-35vw,-15vh)} 80%{transform:translate(20vw,35vh)} }
          @keyframes blob4 { 0%,100%{transform:translate(0,0)} 20%{transform:translate(-20vw,30vh)} 40%{transform:translate(30vw,-20vh)} 60%{transform:translate(-15vw,-30vh)} 80%{transform:translate(25vw,18vh)} }
        `}</style>
      </div>

      {/* Content layer */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 w-full">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8 w-40 h-36"
        >
          <svg className="w-full h-full" fill="none" preserveAspectRatio="xMidYMid meet" viewBox="0 0 1015.76 896.692">
            <g clipPath="url(#clip0_about)">
              <g>
                <path d={svgPaths.pbf61800} fill="#CA3C43" />
                <path d={svgPaths.p150d8e80} fill="#533AA4" />
                <path d={svgPaths.p229c9e00} fill="#6B4BC8" />
                <path d={svgPaths.p2dff2200} fill="#904498" />
                <path d={svgPaths.p32fe9bf0} fill="#B64237" />
                <path d={svgPaths.p1528c400} fill="#A63432" />
                <path d={svgPaths.p2a7060c0} fill="#B64237" />
                <path d={svgPaths.p20cdc600} fill="#A63432" />
                <path d={svgPaths.p2eb53200} fill="#B64237" />

                <motion.g
                  style={{ transformOrigin: "689px 425px" }}
                  animate={{ scaleY: [1, 0.45, 1] }}
                  transition={{ repeat: Infinity, duration: 1.1, delay: 0, ease: "easeInOut" }}
                >
                  <path d={svgPaths.p33998080} fill="#DE6231" />
                </motion.g>

                <motion.g
                  style={{ transformOrigin: "552px 374px" }}
                  animate={{ scaleY: [1, 0.4, 1] }}
                  transition={{ repeat: Infinity, duration: 0.9, delay: 0.15, ease: "easeInOut" }}
                >
                  <path d={svgPaths.p249d7e00} fill="#D43B36" />
                  <path d={svgPaths.p32323ef0} fill="#A63432" />
                  <path d={svgPaths.p3938e180} fill="#A63432" />
                  <path d={svgPaths.p23466300} fill="#B64237" />
                  <path d={svgPaths.p3b94ea00} fill="#B64237" />
                  <path d={svgPaths.p32412900} fill="#B64237" />
                </motion.g>

                <path d={svgPaths.p2b908a00} fill="#DE6231" />
                <path d={svgPaths.p2392cc80} fill="#B64237" />
                <path d={svgPaths.p2905d400} fill="#D43B36" />

                <motion.g
                  style={{ transformOrigin: "758px 410px" }}
                  animate={{ scaleY: [1, 0.6, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: 0.05, ease: "easeInOut" }}
                >
                  <path d={svgPaths.p26b97b00} fill="#DE6231" />
                </motion.g>

                <motion.g
                  style={{ transformOrigin: "484px 361px" }}
                  animate={{ scaleY: [1, 0.45, 1] }}
                  transition={{ repeat: Infinity, duration: 1.25, delay: 0.3, ease: "easeInOut" }}
                >
                  <path d={svgPaths.p188dea00} fill="#6B4BC8" />
                  <path d={svgPaths.p27d93f00} fill="#533AA4" />
                </motion.g>

                <motion.g
                  style={{ transformOrigin: "827px 386px" }}
                  animate={{ scaleY: [1, 0.75, 1] }}
                  transition={{ repeat: Infinity, duration: 1.8, delay: 0.1, ease: "easeInOut" }}
                >
                  <path d={svgPaths.pdd8af00} fill="#DE6231" />
                  <path d={svgPaths.p328a6e00} fill="#B64237" />
                  <path d={svgPaths.p3c758380} fill="#D43B36" />
                </motion.g>

                <motion.g
                  style={{ transformOrigin: "415px 364px" }}
                  animate={{ scaleY: [1, 0.6, 1] }}
                  transition={{ repeat: Infinity, duration: 1.35, delay: 0.22, ease: "easeInOut" }}
                >
                  <path d={svgPaths.p180fa600} fill="#6B4BC8" />
                  <path d={svgPaths.p3741ab00} fill="#533AA4" />
                </motion.g>

                <motion.g
                  style={{ transformOrigin: "346px 356px" }}
                  animate={{ scaleY: [1, 0.75, 1] }}
                  transition={{ repeat: Infinity, duration: 2.0, delay: 0.08, ease: "easeInOut" }}
                >
                  <path d={svgPaths.p2b8a9d00} fill="#6B4BC8" />
                  <path d={svgPaths.p3c37980} fill="#533AA4" />
                </motion.g>

                <path d={svgPaths.p2ecb6380} fill="#A63432" />
              </g>
            </g>
            <defs>
              <clipPath id="clip0_about">
                <rect fill="white" height="896.692" width="1015.76" />
              </clipPath>
            </defs>
          </svg>
        </motion.div>

        {/* Frosted glass panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-sm"
        >
          <div className="rounded-3xl bg-white/40 backdrop-blur-2xl border border-white/40 shadow-2xl overflow-hidden px-6 py-6 text-center">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center mx-auto mb-4 shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Access Period Ended
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-5">
              Your timed access to Voca has expired. The session you were granted has concluded.
            </p>

            <div className="rounded-2xl bg-white/60 border border-white/60 p-4 mb-5 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
                Need more time?
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                Reach out to the <span className="font-semibold text-gray-900">ChronoOS Team</span> at{" "}
                <a
                  href="https://knowwhatson.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0A84FF] hover:underline font-semibold"
                >
                  What's On!
                </a>{" "}
                to request extended access.
              </p>
            </div>

            <a
              href="https://knowwhatson.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full h-[52px] rounded-2xl bg-white text-gray-900 font-semibold text-[17px] active:scale-[0.97] transition-all shadow-lg hover:bg-gray-50"
            >
              Visit What's On!
            </a>

            <div className="w-full pt-5 flex justify-center items-center text-[10px] text-gray-500 font-medium tracking-wide">
              A part of <a href="https://chrono.knowwhatson.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-[#0a84ff] transition-colors mx-1 underline decoration-gray-300 underline-offset-2">ChronoOS</a> ♥ by <a href="https://knowwhatson.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-[#0a84ff] transition-colors ml-1 underline decoration-gray-300 underline-offset-2">What's On!</a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
