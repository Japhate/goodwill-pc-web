export default function HeritageSealLoader({
  size = "large",
  showText = false,
  className = "",
}) {
  const isSmall = size === "small";
  const wrapperSize = isSmall ? "h-20 w-20" : "h-36 w-36";
  const glowSize = isSmall ? "h-20 w-20" : "h-32 w-32";
  const iconSize = isSmall ? "h-12 w-12" : "h-24 w-24";
  const textTop = isSmall ? "" : "mt-7";
  const lineDrawClass = isSmall ? "" : "animate-[heritageLoaderLineDraw_2.4s_ease-in-out_infinite]";

  return (
    <div className={`relative flex flex-col items-center text-center text-[#3f2a1f] ${className}`}>
      <style>
        {`
          @keyframes heritageLoaderProgressSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @keyframes heritageLoaderReverseSpin {
            from { transform: rotate(360deg); }
            to { transform: rotate(0deg); }
          }

          @keyframes heritageLoaderArcTrace {
            0% { transform: rotate(-40deg); opacity: .45; }
            50% { transform: rotate(165deg); opacity: 1; }
            100% { transform: rotate(320deg); opacity: .45; }
          }

          @keyframes heritageLoaderMedallionBreath {
            0%, 100% {
              transform: scale(1);
              box-shadow: 0 18px 48px rgba(75, 52, 42, .12);
            }
            50% {
              transform: scale(1.025);
              box-shadow: 0 22px 56px rgba(194, 162, 74, .18);
            }
          }

          @keyframes heritageLoaderLineDraw {
            0% { stroke-dasharray: 0 1; opacity: .55; }
            45%, 70% { stroke-dasharray: 1 0; opacity: 1; }
            100% { stroke-dasharray: 1 0; opacity: .72; }
          }
        `}
      </style>

      <div className={`relative flex ${wrapperSize} items-center justify-center`}>
        <div className={`absolute ${glowSize} rounded-full bg-amber-300/12 blur-2xl`}></div>
        <div className="absolute inset-0 animate-[heritageLoaderProgressSpin_3.8s_linear_infinite] rounded-full border border-transparent border-t-amber-700/75 border-r-amber-600/35"></div>
        <div className="absolute inset-2 animate-[heritageLoaderArcTrace_2.8s_ease-in-out_infinite] rounded-full border-2 border-transparent border-t-[#c2a24a] border-l-[#c2a24a]/35"></div>
        <div className="absolute inset-5 animate-[heritageLoaderReverseSpin_6.2s_linear_infinite] rounded-full border border-transparent border-b-[#3f2a1f]/22 border-l-[#3f2a1f]/12"></div>
        <div className="absolute inset-1 animate-[heritageLoaderMedallionBreath_3.8s_ease-in-out_infinite] rounded-full border border-[#3f2a1f]/25 bg-white/64 shadow-xl"></div>
        <div className="absolute inset-4 rounded-full border-2 border-amber-800/20"></div>
        <div className="absolute inset-6 rounded-full border border-dashed border-[#3f2a1f]/16"></div>
        <svg className={`relative ${iconSize}`} viewBox="0 0 96 96" role="img" aria-hidden="true">
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path className={lineDrawClass} d="M48 13v18M38 22h20" stroke="#c2a24a" strokeWidth="2.8" pathLength="1" />
            <path className={lineDrawClass} d="M25 57 48 36l23 21" stroke="#3f2a1f" strokeWidth="3.5" pathLength="1" />
            <path className={lineDrawClass} d="M31 57h34v24H31z" fill="rgba(255,255,255,.78)" stroke="#3f2a1f" strokeWidth="2.4" pathLength="1" />
            <path d="M43 81V69a5 5 0 0 1 10 0v12" fill="#3f2a1f" />
            <path d="M20 84h56" stroke="#3f2a1f" strokeWidth="2.4" />
          </g>
        </svg>
      </div>

      {showText && (
        <div className={textTop}>
          <h1 className="text-2xl font-bold leading-tight text-[#3f2a1f]">Goodwill Presbyterian Church, USA</h1>
          <p className="mt-3 text-base font-semibold text-amber-800">Welcome.</p>
        </div>
      )}
    </div>
  );
}
