const loaderOptions = [
  {
    name: "1. Line-Art Church",
    description: "Clean steeple mark with glowing windows.",
    render: "church",
  },
  {
    name: "2. Stained Glass",
    description: "Soft panels brightening like morning worship light.",
    render: "glass",
  },
  {
    name: "3. Sanctuary Light",
    description: "Warm rays passing across a quiet cross.",
    render: "rays",
  },
  {
    name: "4. Cross And Sunrise",
    description: "Minimal cross with a sunrise pulse.",
    render: "sunrise",
  },
  {
    name: "5. Church Window",
    description: "Arched window with reverent amber glow.",
    render: "window",
  },
  {
    name: "6. Elegant Wordmark",
    description: "Typography-led with subtle spiritual light.",
    render: "wordmark",
  },
];

const challengerOptions = [
  {
    name: "7. Heritage Church Seal",
    description: "A formal church emblem with an elegant seal motion.",
    render: "seal",
  },
  {
    name: "8. Sanctuary Door",
    description: "Welcoming doors opening with warm interior light.",
    render: "door",
  },
  {
    name: "9. Candle And Cross",
    description: "Quiet candle glow with a centered cross.",
    render: "candle",
  },
  {
    name: "10. Open Bible Light",
    description: "Scripture-inspired pages with a rising gold glow.",
    render: "bible",
  },
  {
    name: "11. Chapel At Dawn",
    description: "Small chapel silhouette with sunrise movement.",
    render: "chapel",
  },
  {
    name: "12. Presbyterian Window",
    description: "A stately arched window with subtle glass shimmer.",
    render: "presbyterian-window",
  },
  {
    name: "13. Minimal Cross Halo",
    description: "Premium minimal cross with an expanding halo.",
    render: "halo",
  },
  {
    name: "14. Steeple Light Sweep",
    description: "Tall steeple mark with cinematic moving light.",
    render: "steeple",
  },
  {
    name: "15. Church On Hill",
    description: "Peaceful church silhouette grounded in landscape.",
    render: "hill",
  },
  {
    name: "16. Gold Thread Wordmark",
    description: "Elegant typography with a fine spiritual thread.",
    render: "thread",
  },
];

const heritageSealOptions = Array.from({ length: 16 }, (_, index) => ({
  name: `${index + 1}. Heritage Seal ${String.fromCharCode(65 + index)}`,
  description: [
    "Classic formal seal with a dashed outer ring.",
    "Double-ring seal with a slow halo pulse.",
    "Gold medallion seal with heavier presence.",
    "Minimal ivory seal with refined linework.",
    "Windowed seal with stained-glass accents.",
    "Laurel-inspired seal for a heritage feel.",
    "Scripture seal with an open Bible base.",
    "Tall steeple seal with formal symmetry.",
    "Sunrise seal with a hopeful glow.",
    "Dark walnut seal with gold linework.",
    "Soft embossed seal with gentle shadow.",
    "Cross-forward seal with restrained church mark.",
    "Circular parish mark with rotating thread.",
    "Arched sanctuary seal with warm windows.",
    "Founders-style seal with bolder outline.",
    "Premium quiet seal with minimal motion.",
  ][index],
  render: `heritage-${index + 1}`,
}));

const lineArtChurchOptions = Array.from({ length: 16 }, (_, index) => ({
  name: `${index + 1}. Line-Art Church ${String.fromCharCode(65 + index)}`,
  description: [
    "Original clean steeple mark with glowing windows.",
    "Taller steeple with a more formal vertical presence.",
    "Wider sanctuary silhouette with stronger roofline.",
    "Minimal chapel linework with almost no fill.",
    "Soft gold roof accent and warmer windows.",
    "Rounded chapel body with gentler architecture.",
    "Twin-window version with brighter worship glow.",
    "Slim modern church mark with elegant proportions.",
    "Cross-forward version with restrained roofline.",
    "Small church on base line with grounded feel.",
    "Deep walnut linework with ivory interior.",
    "Fine-line premium version with delicate strokes.",
    "Slightly taller doors and more welcoming entry.",
    "Arched steeple window with sanctuary detail.",
    "Bolder outline for stronger mobile visibility.",
    "Quiet luxury version with minimal motion.",
  ][index],
  render: `lineart-${index + 1}`,
}));

const heritageSealOActiveOptions = Array.from({ length: 20 }, (_, index) => ({
  name: `${index + 1}. Heritage Seal O Motion ${String.fromCharCode(65 + index)}`,
  description: [
    "Cinematic gold ring tracing around the seal.",
    "Counter-rotating heritage rings with a calm center.",
    "Hand-drawn seal linework revealing the church mark.",
    "Broad sanctuary light sweep over the medallion.",
    "Soft halo ripples expanding from the seal.",
    "Fine gold thread loading beneath the medallion.",
    "Cross light pulse with a clean windowless church.",
    "Dashed outer ring with a slow ceremonial turn.",
    "Breathing embossed medallion with warm depth.",
    "Scripture-line shimmer under the church mark.",
    "Orbiting gold bead like a reverent progress indicator.",
    "Vertical candlelight scan through the seal.",
    "Partial loading arc with a steady chapel silhouette.",
    "Sunrise rays blooming behind the seal.",
    "Slow formal medallion turn with still linework.",
    "Steeple highlight traveling upward.",
    "Inner ring pulse with anchored outer ring.",
    "Gentle seal lift with a moving prayer line.",
    "Golden halo wave behind a grounded church seal.",
    "Premium quiet motion with restrained ceremonial glow.",
  ][index],
  render: `heritage-o-active-${index + 1}`,
}));

const heritageSealOFeaturedOption = {
  name: "Featured. Heritage Seal O Motion A + C",
  description: "Combines Motion A's cinematic gold ring trace with Motion C's hand-drawn seal reveal.",
  render: "heritage-o-combo-ac",
};

function HeritageSealOActiveArt({ variant }) {
  const isComboAC = variant === "heritage-o-combo-ac";
  const styleIndex = isComboAC ? 1 : Number(variant.replace("heritage-o-active-", "")) || 1;
  const showOuterSpin = isComboAC || [1, 8, 13, 15, 17].includes(styleIndex);
  const showCounterSpin = styleIndex === 2;
  const showLineDraw = isComboAC || [3, 10, 16].includes(styleIndex);
  const showSweep = [4, 12, 16].includes(styleIndex);
  const showHalo = [5, 9, 17, 19, 20].includes(styleIndex);
  const showProgressLine = [6, 10, 18].includes(styleIndex);
  const showCrossPulse = [7, 16].includes(styleIndex);
  const showOrbit = styleIndex === 11;
  const showRays = [14, 19].includes(styleIndex);
  const showScriptureLines = [10, 18].includes(styleIndex);
  const showArc = isComboAC || [1, 13, 17].includes(styleIndex);
  const showSteepleScan = [12, 16].includes(styleIndex);
  const quiet = styleIndex === 20;
  const floatClass = [18].includes(styleIndex) ? "animate-[loaderPreviewFloat_3.2s_ease-in-out_infinite]" : "";
  const drawingClass = showLineDraw ? "animate-[loaderLineDraw_2.4s_ease-in-out_infinite]" : "";
  const medallionMotion = quiet ? "animate-[loaderQuietGlow_4.8s_ease-in-out_infinite]" : "animate-[loaderMedallionBreath_3.8s_ease-in-out_infinite]";

  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      {showHalo && (
        <>
          <div className="absolute h-32 w-32 animate-[loaderHaloRipple_3.6s_ease-out_infinite] rounded-full border border-amber-600/25"></div>
          <div className="absolute h-24 w-24 animate-[loaderHaloRipple_3.6s_ease-out_infinite_900ms] rounded-full border border-amber-700/20"></div>
        </>
      )}
      {showRays && (
        <div className="absolute inset-0 animate-[loaderPreviewGlow_3s_ease-in-out_infinite]">
          <div className="absolute left-1/2 top-1 h-32 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-amber-600/35 to-transparent"></div>
          <div className="absolute left-1/2 top-1 h-32 w-px -translate-x-1/2 rotate-45 bg-gradient-to-b from-transparent via-amber-600/25 to-transparent"></div>
          <div className="absolute left-1/2 top-1 h-32 w-px -translate-x-1/2 -rotate-45 bg-gradient-to-b from-transparent via-amber-600/25 to-transparent"></div>
          <div className="absolute left-1/2 top-1 h-32 w-px -translate-x-1/2 rotate-90 bg-gradient-to-b from-transparent via-amber-600/18 to-transparent"></div>
        </div>
      )}
      <div className="absolute h-32 w-32 rounded-full bg-amber-300/12 blur-2xl"></div>
      {showOuterSpin && <div className="absolute inset-0 animate-[loaderProgressSpin_3.8s_linear_infinite] rounded-full border border-transparent border-t-amber-700/75 border-r-amber-600/35"></div>}
      {showArc && <div className="absolute inset-2 animate-[loaderArcTrace_2.8s_ease-in-out_infinite] rounded-full border-2 border-transparent border-t-[#c2a24a] border-l-[#c2a24a]/35"></div>}
      {isComboAC && <div className="absolute inset-5 animate-[loaderReverseSpin_6.2s_linear_infinite] rounded-full border border-transparent border-b-[#3f2a1f]/22 border-l-[#3f2a1f]/12"></div>}
      {showCounterSpin && (
        <>
          <div className="absolute inset-0 animate-[loaderProgressSpin_4s_linear_infinite] rounded-full border border-transparent border-t-amber-700/70"></div>
          <div className="absolute inset-3 animate-[loaderReverseSpin_5.5s_linear_infinite] rounded-full border border-transparent border-b-[#3f2a1f]/35"></div>
        </>
      )}
      {showOrbit && (
        <div className="absolute inset-0 animate-[loaderProgressSpin_2.8s_linear_infinite]">
          <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-amber-600 shadow-[0_0_14px_rgba(194,162,74,.85)]"></div>
        </div>
      )}
      <div className={`absolute inset-1 rounded-full border border-[#3f2a1f]/25 bg-white/64 shadow-xl ${medallionMotion}`}></div>
      <div className="absolute inset-4 rounded-full border-2 border-amber-800/20"></div>
      <div className="absolute inset-6 rounded-full border border-dashed border-[#3f2a1f]/16"></div>
      {showSweep && <div className="absolute inset-0 overflow-hidden rounded-full"><div className="h-full w-2/3 animate-[loaderSealSweepWide_3.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent"></div></div>}
      {showSteepleScan && <div className="absolute left-1/2 top-4 h-24 w-8 -translate-x-1/2 animate-[loaderVerticalScan_2.6s_ease-in-out_infinite] bg-gradient-to-b from-transparent via-amber-200/55 to-transparent blur-sm"></div>}
      {showProgressLine && (
        <div className="absolute bottom-2 h-px w-24 overflow-hidden bg-[#3f2a1f]/10">
          <div className="h-full w-1/2 animate-[loaderProgressSlide_1.9s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-amber-700 to-transparent"></div>
        </div>
      )}
      <svg className={`relative h-24 w-24 ${floatClass}`} viewBox="0 0 96 96" aria-hidden="true">
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path className={`${drawingClass} ${showCrossPulse ? "animate-[loaderPreviewGlow_2.4s_ease-in-out_infinite]" : ""}`} d="M48 13v18M38 22h20" stroke="#c2a24a" strokeWidth="2.8" pathLength="1" />
          <path className={drawingClass} d="M25 57 48 36l23 21" stroke="#3f2a1f" strokeWidth="3.5" pathLength="1" />
          <path className={drawingClass} d="M31 57h34v24H31z" fill="rgba(255,255,255,.78)" stroke="#3f2a1f" strokeWidth="2.4" pathLength="1" />
          <path className={showCrossPulse ? "animate-[loaderPreviewGlow_2.4s_ease-in-out_infinite]" : ""} d="M43 81V69a5 5 0 0 1 10 0v12" fill="#3f2a1f" />
          {showScriptureLines && (
            <>
              <path className="animate-[loaderScriptureShimmer_2.8s_ease-in-out_infinite]" d="M35 64h9M52 64h9M35 69h7M54 69h7" stroke="#c2a24a" strokeWidth="1.5" />
              <path className="animate-[loaderScriptureShimmer_2.8s_ease-in-out_infinite]" d="M35 74h26" stroke="#c2a24a" strokeWidth="1.4" />
            </>
          )}
          <path d="M20 84h56" stroke="#3f2a1f" strokeWidth="2.4" />
        </g>
      </svg>
    </div>
  );
}

function LineArtChurchArt({ variant }) {
  const styleIndex = Number(variant.replace("lineart-", "")) || 1;
  const tall = [2, 8, 14].includes(styleIndex);
  const wide = [3, 10].includes(styleIndex);
  const minimal = [4, 12, 16].includes(styleIndex);
  const rounded = [6, 13].includes(styleIndex);
  const bolder = [9, 15].includes(styleIndex);
  const goldRoof = styleIndex === 5;
  const brighterWindows = [7, 11, 14].includes(styleIndex);
  const strokeWidth = bolder ? 3 : minimal ? 1.6 : 2.2;
  const bodyY = tall ? 56 : 61;
  const bodyHeight = tall ? 28 : 23;
  const bodyWidth = wide ? 60 : 48;
  const bodyX = 48 - bodyWidth / 2;
  const roofLeft = wide ? 18 : 24;
  const roofRight = wide ? 78 : 72;
  const steepleTop = tall ? 8 : 14;
  const steepleBase = tall ? 35 : 32;
  const roofStroke = goldRoof ? "#c2a24a" : "#3f2a1f";
  const fill = minimal ? "rgba(255,255,255,0.34)" : "rgba(255,255,255,0.78)";

  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <div className="absolute h-28 w-28 rounded-full bg-amber-300/15 blur-2xl"></div>
      {brighterWindows && <div className="absolute h-24 w-24 animate-pulse rounded-full bg-amber-300/16 blur-xl"></div>}
      <div className="absolute h-32 w-32 animate-[loaderProgressSpin_3.6s_linear_infinite] rounded-full border border-transparent border-t-amber-700/70 border-r-amber-600/30"></div>
      <div className="absolute bottom-4 h-px w-24 overflow-hidden bg-[#3f2a1f]/10">
        <div className="h-full w-1/2 animate-[loaderProgressSlide_1.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-amber-700 to-transparent"></div>
      </div>
      <svg className="relative h-28 w-32 drop-shadow-xl" viewBox="0 0 96 96" aria-hidden="true">
        <defs>
          <linearGradient id={`lineGold-${styleIndex}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#f8e4a6" />
            <stop offset="60%" stopColor="#c2a24a" />
            <stop offset="100%" stopColor="#8a641f" />
          </linearGradient>
        </defs>
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path className="animate-[loaderLineDraw_2.4s_ease-in-out_infinite]" d={`M48 ${steepleTop}v${steepleBase - steepleTop}M38 ${steepleTop + 10}h20`} stroke={`url(#lineGold-${styleIndex})`} strokeWidth={strokeWidth} pathLength="1" />
          {styleIndex === 14 && <path d="M42 34h12v12H42z" fill="rgba(244,212,122,.72)" stroke="#b88b2e" strokeWidth="1.2" />}
          <path className="animate-[loaderLineDraw_2.4s_ease-in-out_infinite]" d={`M${roofLeft} ${bodyY} 48 ${bodyY - 24} ${roofRight} ${bodyY}`} stroke={roofStroke} strokeWidth={strokeWidth + 0.7} pathLength="1" />
          <path
            className="animate-[loaderLineDraw_2.4s_ease-in-out_infinite]"
            d={rounded
              ? `M${bodyX} ${bodyY}h${bodyWidth}v${bodyHeight}H${bodyX}z`
              : `M${bodyX} ${bodyY}h${bodyWidth}v${bodyHeight}H${bodyX}z`
            }
            fill={fill}
            stroke="#3f2a1f"
            strokeWidth={strokeWidth}
            pathLength="1"
          />
          {styleIndex === 9 ? (
            <>
              <path className="animate-[loaderLineDraw_2.4s_ease-in-out_infinite]" d="M48 42v34M38 54h20" stroke="#3f2a1f" strokeWidth={strokeWidth + 0.4} pathLength="1" />
              <path d={`M${bodyX + 5} ${bodyY + bodyHeight}h${bodyWidth - 10}`} stroke="#3f2a1f" strokeWidth={strokeWidth} />
            </>
          ) : (
            <>
              <path className="animate-[loaderDoorPulse_2s_ease-in-out_infinite]" d={`M43 ${bodyY + bodyHeight}V${bodyY + 11}a5 5 0 0 1 10 0v${bodyHeight - 11}`} fill="#3f2a1f" stroke="#3f2a1f" strokeWidth={strokeWidth} />
              <path className="animate-[loaderPreviewGlow_2.4s_ease-in-out_infinite]" d={`M${bodyX + 9} ${bodyY + 8}h6v8h-6zM${bodyX + bodyWidth - 15} ${bodyY + 8}h6v8h-6z`} fill="#f4d47a" stroke="#b88b2e" strokeWidth="1.2" />
            </>
          )}
          <path d={`M${bodyX - 8} ${bodyY + bodyHeight}h${bodyWidth + 16}`} stroke="#3f2a1f" strokeWidth={strokeWidth} />
        </g>
      </svg>
    </div>
  );
}

function HeritageSealArt({ variant }) {
  const styleIndex = Number(variant.replace("heritage-", "")) || 1;
  const dark = styleIndex === 10;
  const minimal = [4, 16].includes(styleIndex);
  const thick = [3, 15].includes(styleIndex);
  const showBible = styleIndex === 7;
  const showWindow = [5, 14].includes(styleIndex);
  const showSun = styleIndex === 9;
  const showLaurel = styleIndex === 6;
  const showCrossForward = styleIndex === 12;
  const showThread = styleIndex === 13;
  const showHalo = [2, 11].includes(styleIndex);
  const bgClass = dark ? "bg-[#3f2a1f]" : minimal ? "bg-white/35" : "bg-white/62";
  const borderClass = dark ? "border-amber-300/45" : "border-[#3f2a1f]/25";
  const ink = dark ? "#f4d47a" : "#3f2a1f";
  const gold = dark ? "#f8e4a6" : "#c2a24a";

  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      {showHalo && <div className="absolute inset-2 animate-ping rounded-full border border-amber-600/20"></div>}
      {showSun && <div className="absolute h-28 w-28 animate-pulse rounded-full bg-amber-300/30 blur-xl"></div>}
      {showThread && <div className="absolute inset-0 animate-[loaderPreviewSlowSpin_14s_linear_infinite] rounded-full border border-dashed border-amber-700/45"></div>}
      <div className={`absolute inset-1 rounded-full border ${borderClass} ${bgClass} shadow-xl`}></div>
      <div className={`absolute inset-4 rounded-full border ${thick ? "border-2" : "border"} ${dark ? "border-amber-200/30" : "border-amber-800/20"}`}></div>
      {showLaurel && (
        <>
          <div className="absolute left-5 top-9 h-16 w-4 rotate-[-28deg] rounded-full border-l-2 border-amber-700/45"></div>
          <div className="absolute right-5 top-9 h-16 w-4 rotate-[28deg] rounded-full border-r-2 border-amber-700/45"></div>
        </>
      )}
      <svg className="relative h-24 w-24 animate-[loaderPreviewFloat_3.2s_ease-in-out_infinite]" viewBox="0 0 96 96" aria-hidden="true">
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {showCrossForward ? (
            <>
              <path d="M48 12v56M35 28h26" stroke={gold} strokeWidth="3" />
              <path d="M26 65h44v16H26z" fill={dark ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.62)"} stroke={ink} strokeWidth="2" />
            </>
          ) : (
            <>
              <path d="M48 13v18M38 22h20" stroke={gold} strokeWidth={thick ? "2.8" : "2.2"} />
              <path d="M24 58 48 36l24 22" stroke={ink} strokeWidth={thick ? "3.6" : "3"} />
              <path d="M30 58h36v24H30z" fill={dark ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.76)"} stroke={ink} strokeWidth={thick ? "2.4" : "2"} />
              <path d="M43 82V70a5 5 0 0 1 10 0v12" fill={ink} />
            </>
          )}
          {showWindow && <path className="animate-[loaderPreviewGlow_2.4s_ease-in-out_infinite]" d="M36 64h6v8h-6zM54 64h6v8h-6z" fill="#f4d47a" stroke="#b88b2e" strokeWidth="1.2" />}
          {showBible && (
            <>
              <path d="M28 79c7-4 14-4 20 0 6-4 13-4 20 0" stroke={gold} strokeWidth="2" />
              <path d="M48 75v8" stroke={gold} strokeWidth="1.5" />
            </>
          )}
          <path d="M20 84h56" stroke={ink} strokeWidth={thick ? "2.4" : "2"} />
        </g>
      </svg>
      <div className={`absolute bottom-3 text-[9px] font-bold uppercase tracking-[0.2em] ${dark ? "text-amber-100/70" : "text-[#3f2a1f]/45"}`}>
      </div>
    </div>
  );
}

function LoaderArt({ type }) {
  if (type.startsWith("lineart-")) {
    return <LineArtChurchArt variant={type} />;
  }

  if (type === "heritage-o-combo-ac") {
    return <HeritageSealOActiveArt variant={type} />;
  }

  if (type.startsWith("heritage-o-active-")) {
    return <HeritageSealOActiveArt variant={type} />;
  }

  if (type.startsWith("heritage-")) {
    return <HeritageSealArt variant={type} />;
  }

  if (type === "seal") {
    return (
      <div className="relative flex h-32 w-32 items-center justify-center">
        <div className="absolute inset-0 animate-[loaderPreviewSlowSpin_12s_linear_infinite] rounded-full border border-dashed border-amber-700/40"></div>
        <div className="absolute inset-3 rounded-full border border-[#3f2a1f]/25 bg-white/60 shadow-xl"></div>
        <svg className="relative h-20 w-20" viewBox="0 0 96 96" aria-hidden="true">
          <path d="M48 13v18M38 22h20" stroke="#c2a24a" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M24 58 48 36l24 22" fill="none" stroke="#3f2a1f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M30 58h36v24H30z" fill="rgba(255,255,255,.78)" stroke="#3f2a1f" strokeWidth="2" />
          <path d="M43 82V70a5 5 0 0 1 10 0v12" fill="#3f2a1f" />
        </svg>
      </div>
    );
  }

  if (type === "door") {
    return (
      <div className="relative flex h-32 w-32 items-end justify-center">
        <div className="absolute bottom-0 h-24 w-24 rounded-t-full bg-amber-300/25 blur-xl"></div>
        <div className="relative h-28 w-24 rounded-t-full border-2 border-[#3f2a1f]/65 bg-white/55 p-3 shadow-xl">
          <div className="absolute inset-x-4 bottom-3 top-9 overflow-hidden rounded-t-full bg-[#3f2a1f]">
            <div className="absolute inset-y-0 left-0 w-1/2 origin-left animate-[loaderDoorLeft_3s_ease-in-out_infinite] bg-[#6b4a35]"></div>
            <div className="absolute inset-y-0 right-0 w-1/2 origin-right animate-[loaderDoorRight_3s_ease-in-out_infinite] bg-[#6b4a35]"></div>
            <div className="absolute inset-0 -z-10 bg-amber-300/80"></div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "candle") {
    return (
      <div className="relative flex h-32 w-32 items-center justify-center">
        <div className="absolute h-24 w-24 animate-pulse rounded-full bg-amber-300/25 blur-xl"></div>
        <div className="relative mt-8 h-16 w-5 rounded-t-md bg-white shadow-lg"></div>
        <div className="absolute top-8 h-9 w-5 animate-[loaderPreviewGlow_2s_ease-in-out_infinite] rounded-full bg-amber-300"></div>
        <div className="absolute left-1/2 top-2 h-24 w-px -translate-x-1/2 bg-[#3f2a1f]"></div>
        <div className="absolute left-1/2 top-10 h-px w-12 -translate-x-1/2 bg-[#3f2a1f]"></div>
      </div>
    );
  }

  if (type === "bible") {
    return (
      <div className="relative flex h-32 w-36 items-center justify-center">
        <div className="absolute bottom-7 h-16 w-28 rounded-full bg-amber-300/25 blur-2xl"></div>
        <div className="relative mt-8 flex h-14 w-28 items-end justify-center">
          <div className="h-12 w-14 origin-right animate-[loaderPageLeft_3s_ease-in-out_infinite] rounded-l-md border border-[#3f2a1f]/45 bg-white/80"></div>
          <div className="h-12 w-14 origin-left animate-[loaderPageRight_3s_ease-in-out_infinite] rounded-r-md border border-[#3f2a1f]/45 bg-white/80"></div>
          <div className="absolute left-1/2 top-0 h-12 w-px bg-[#3f2a1f]/35"></div>
        </div>
        <div className="absolute top-4 h-12 w-px bg-amber-700"></div>
        <div className="absolute top-9 h-px w-9 bg-amber-700"></div>
      </div>
    );
  }

  if (type === "chapel") {
    return (
      <div className="relative flex h-32 w-36 items-end justify-center overflow-hidden">
        <div className="absolute bottom-8 h-24 w-24 animate-pulse rounded-full bg-amber-300/45"></div>
        <div className="absolute bottom-0 h-12 w-40 rounded-t-full bg-[#3f2a1f]/18"></div>
        <div className="relative mb-5 h-16 w-24">
          <div className="absolute left-1/2 top-0 h-5 w-px -translate-x-1/2 bg-[#3f2a1f]"></div>
          <div className="absolute left-1/2 top-2 h-px w-5 -translate-x-1/2 bg-[#3f2a1f]"></div>
          <div className="absolute bottom-8 left-1/2 h-8 w-7 -translate-x-1/2 rounded-t-full bg-white/80"></div>
          <div className="absolute bottom-5 left-1/2 h-4 w-20 -translate-x-1/2 rotate-12 bg-[#3f2a1f]"></div>
          <div className="absolute bottom-5 left-1/2 h-4 w-20 -translate-x-1/2 -rotate-12 bg-[#3f2a1f]"></div>
          <div className="absolute bottom-0 left-1/2 h-10 w-20 -translate-x-1/2 bg-white/80"></div>
        </div>
      </div>
    );
  }

  if (type === "presbyterian-window") {
    return (
      <div className="relative h-32 w-28 rounded-t-full border-2 border-[#3f2a1f]/70 bg-white/65 p-3 shadow-xl">
        <div className="grid h-full grid-cols-3 gap-1">
          {["bg-amber-200/80", "bg-[#3f2a1f]/35", "bg-emerald-800/45", "bg-white/70", "bg-amber-400/70", "bg-[#6b4a35]/40", "bg-emerald-900/40", "bg-amber-100/80", "bg-white/65"].map((color, index) => (
            <div key={index} className={`${color} animate-[loaderPreviewGlow_3s_ease-in-out_infinite] rounded-sm`} style={{ animationDelay: `${index * 90}ms` }}></div>
          ))}
        </div>
        <div className="absolute inset-y-3 left-1/3 w-px bg-[#3f2a1f]/20"></div>
        <div className="absolute inset-y-3 right-1/3 w-px bg-[#3f2a1f]/20"></div>
      </div>
    );
  }

  if (type === "halo") {
    return (
      <div className="relative flex h-32 w-32 items-center justify-center">
        <div className="absolute h-24 w-24 animate-ping rounded-full border border-amber-600/25"></div>
        <div className="absolute h-20 w-20 animate-pulse rounded-full bg-amber-300/20 blur-xl"></div>
        <div className="relative h-24 w-px bg-[#3f2a1f]"></div>
        <div className="absolute h-px w-16 bg-[#3f2a1f]"></div>
      </div>
    );
  }

  if (type === "steeple") {
    return (
      <div className="relative h-32 w-32 overflow-hidden">
        <div className="absolute inset-0 animate-[loaderPreviewSweep_3.6s_ease-in-out_infinite] bg-[linear-gradient(105deg,transparent_0_24%,rgba(255,255,255,.8)_42%,transparent_62%)]"></div>
        <div className="absolute left-1/2 top-4 h-7 w-px -translate-x-1/2 bg-[#3f2a1f]"></div>
        <div className="absolute left-1/2 top-13 h-px w-5 -translate-x-1/2 bg-[#3f2a1f]"></div>
        <div className="absolute bottom-5 left-1/2 h-20 w-11 -translate-x-1/2 rounded-t-full border border-[#3f2a1f]/65 bg-white/70"></div>
        <div className="absolute bottom-5 left-1/2 h-20 w-px -translate-x-1/2 bg-[#3f2a1f]/35"></div>
      </div>
    );
  }

  if (type === "hill") {
    return (
      <div className="relative flex h-32 w-36 items-end justify-center overflow-hidden">
        <div className="absolute bottom-8 h-24 w-24 animate-pulse rounded-full bg-amber-300/35"></div>
        <div className="absolute bottom-0 h-16 w-44 rounded-t-full bg-emerald-900/25"></div>
        <svg className="relative mb-8 h-16 w-24" viewBox="0 0 96 64" aria-hidden="true">
          <path d="M48 4v14M40 11h16" stroke="#3f2a1f" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 42 48 20l32 22" stroke="#3f2a1f" strokeWidth="3" fill="none" strokeLinejoin="round" />
          <path d="M24 42h48v20H24z" fill="rgba(255,255,255,.78)" stroke="#3f2a1f" strokeWidth="2" />
          <path d="M43 62V51a5 5 0 0 1 10 0v11" fill="#3f2a1f" />
        </svg>
      </div>
    );
  }

  if (type === "thread") {
    return (
      <div className="relative flex h-32 w-44 flex-col items-center justify-center">
        <div className="mb-4 h-px w-32 animate-[loaderPreviewSweep_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-amber-700 to-transparent"></div>
        <p className="text-center text-lg font-bold tracking-[0.18em] text-[#3f2a1f]">GOODWILL</p>
        <p className="mt-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800">Presbyterian Church, USA</p>
        <div className="mt-4 h-px w-24 bg-gradient-to-r from-transparent via-[#3f2a1f]/45 to-transparent"></div>
      </div>
    );
  }

  if (type === "glass") {
    return (
      <div className="relative h-28 w-28 overflow-hidden rounded-t-full border border-amber-800/25 bg-white/50 shadow-xl">
        <div className="absolute inset-0 grid grid-cols-3 gap-px p-2">
          {["bg-amber-300/70", "bg-emerald-700/50", "bg-white/70", "bg-[#6b4a35]/45", "bg-amber-500/60", "bg-emerald-900/45", "bg-white/65", "bg-amber-200/70", "bg-[#3f2a1f]/35"].map((color, index) => (
            <div key={index} className={`${color} animate-[loaderPreviewGlow_2.8s_ease-in-out_infinite] rounded-sm`} style={{ animationDelay: `${index * 120}ms` }} />
          ))}
        </div>
        <div className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-amber-900/25"></div>
        <div className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 bg-amber-900/20"></div>
      </div>
    );
  }

  if (type === "rays") {
    return (
      <div className="relative h-28 w-32">
        <div className="absolute inset-0 animate-[loaderPreviewSweep_3.4s_ease-in-out_infinite] bg-[linear-gradient(105deg,transparent_0_28%,rgba(255,255,255,.75)_42%,transparent_58%)]"></div>
        <div className="absolute left-1/2 top-5 h-20 w-px -translate-x-1/2 bg-[#3f2a1f]"></div>
        <div className="absolute left-1/2 top-12 h-px w-14 -translate-x-1/2 bg-[#3f2a1f]"></div>
        <div className="absolute bottom-2 left-1/2 h-16 w-24 -translate-x-1/2 rounded-full bg-amber-300/25 blur-2xl"></div>
      </div>
    );
  }

  if (type === "sunrise") {
    return (
      <div className="relative flex h-28 w-32 items-end justify-center overflow-hidden">
        <div className="absolute bottom-0 h-24 w-24 animate-pulse rounded-full bg-amber-300/45"></div>
        <div className="absolute bottom-0 h-14 w-36 bg-[#f8f1e5]"></div>
        <div className="absolute bottom-4 left-1/2 h-20 w-px -translate-x-1/2 bg-[#3f2a1f]"></div>
        <div className="absolute bottom-14 left-1/2 h-px w-14 -translate-x-1/2 bg-[#3f2a1f]"></div>
      </div>
    );
  }

  if (type === "window") {
    return (
      <div className="relative h-28 w-24 rounded-t-full border-2 border-[#3f2a1f]/70 bg-white/60 p-3 shadow-xl">
        <div className="grid h-full grid-cols-2 gap-1">
          <div className="rounded-tl-full bg-amber-300/70"></div>
          <div className="rounded-tr-full bg-emerald-800/50"></div>
          <div className="bg-[#6b4a35]/45"></div>
          <div className="bg-amber-200/80"></div>
        </div>
        <div className="absolute inset-y-3 left-1/2 w-px -translate-x-1/2 bg-[#3f2a1f]/35"></div>
        <div className="absolute inset-x-3 top-1/2 h-px bg-[#3f2a1f]/25"></div>
        <div className="absolute -inset-4 -z-10 animate-pulse rounded-full bg-amber-300/20 blur-xl"></div>
      </div>
    );
  }

  if (type === "wordmark") {
    return (
      <div className="relative flex h-28 w-40 flex-col items-center justify-center">
        <div className="absolute h-24 w-24 animate-ping rounded-full border border-amber-600/20"></div>
        <div className="mb-3 h-10 w-px bg-gradient-to-b from-transparent via-[#3f2a1f] to-transparent"></div>
        <p className="text-center text-sm font-bold tracking-[0.22em] text-[#3f2a1f]">GOODWILL</p>
        <p className="mt-1 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-800">Presbyterian Church</p>
      </div>
    );
  }

  return (
    <svg className="h-28 w-32 animate-[loaderPreviewFloat_3.2s_ease-in-out_infinite] drop-shadow-xl" viewBox="0 0 128 112" aria-hidden="true">
      <defs>
        <linearGradient id="previewGold" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#f8e4a6" />
          <stop offset="60%" stopColor="#c2a24a" />
          <stop offset="100%" stopColor="#8a641f" />
        </linearGradient>
      </defs>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M64 13v18M52 24h24" stroke="url(#previewGold)" strokeWidth="2.2" />
        <path d="M64 26 44 50h40L64 26Z" fill="rgba(255,255,255,0.72)" stroke="#3f2a1f" strokeWidth="2" />
        <path d="M24 66 64 38l40 28" stroke="#3f2a1f" strokeWidth="3" />
        <path d="M31 65h66v34H31z" fill="rgba(255,255,255,0.8)" stroke="#3f2a1f" strokeWidth="2" />
        <path d="M55 99V81a9 9 0 0 1 18 0v18" fill="#3f2a1f" stroke="#3f2a1f" strokeWidth="2" />
        <path className="animate-[loaderPreviewGlow_2.4s_ease-in-out_infinite]" d="M42 74h8v10h-8zM78 74h8v10h-8z" fill="#f4d47a" stroke="#b88b2e" strokeWidth="1.4" />
        <path d="M20 99h88" stroke="#3f2a1f" strokeWidth="2" />
      </g>
    </svg>
  );
}

export default function LoaderPreview() {
  return (
    <main className="min-h-screen bg-[#f8f1e5] px-4 py-10 text-[#3f2a1f] sm:px-6 lg:px-8">
      <style>
        {`
          @keyframes loaderPreviewFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }

          @keyframes loaderPreviewGlow {
            0%, 100% { opacity: .58; filter: brightness(1); }
            50% { opacity: 1; filter: brightness(1.25); }
          }

          @keyframes loaderPreviewSweep {
            0%, 100% { transform: translateX(-18%); opacity: .35; }
            50% { transform: translateX(18%); opacity: .9; }
          }

          @keyframes loaderProgressSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @keyframes loaderReverseSpin {
            from { transform: rotate(360deg); }
            to { transform: rotate(0deg); }
          }

          @keyframes loaderMedallionBreath {
            0%, 100% {
              transform: scale(1);
              box-shadow: 0 18px 48px rgba(75, 52, 42, .12);
            }
            50% {
              transform: scale(1.025);
              box-shadow: 0 22px 56px rgba(194, 162, 74, .18);
            }
          }

          @keyframes loaderQuietGlow {
            0%, 100% {
              transform: scale(1);
              box-shadow: 0 18px 48px rgba(75, 52, 42, .1);
            }
            50% {
              transform: scale(1.012);
              box-shadow: 0 20px 54px rgba(194, 162, 74, .14);
            }
          }

          @keyframes loaderHaloRipple {
            0% { transform: scale(.76); opacity: .5; }
            70% { opacity: .18; }
            100% { transform: scale(1.18); opacity: 0; }
          }

          @keyframes loaderArcTrace {
            0% { transform: rotate(-40deg); opacity: .45; }
            50% { transform: rotate(165deg); opacity: 1; }
            100% { transform: rotate(320deg); opacity: .45; }
          }

          @keyframes loaderSealSweepWide {
            0%, 100% { transform: translateX(-65%) skewX(-10deg); opacity: .18; }
            50% { transform: translateX(85%) skewX(-10deg); opacity: .8; }
          }

          @keyframes loaderVerticalScan {
            0%, 100% { transform: translateX(-50%) translateY(-18%); opacity: 0; }
            40%, 60% { opacity: .85; }
            100% { transform: translateX(-50%) translateY(22%); opacity: 0; }
          }

          @keyframes loaderScriptureShimmer {
            0%, 100% { opacity: .45; stroke-dasharray: 1 10; }
            50% { opacity: 1; stroke-dasharray: 10 1; }
          }

          @keyframes loaderProgressSlide {
            0% { transform: translateX(-120%); opacity: .2; }
            45%, 55% { opacity: 1; }
            100% { transform: translateX(240%); opacity: .2; }
          }

          @keyframes loaderLineDraw {
            0% { stroke-dasharray: 0 1; opacity: .55; }
            45%, 70% { stroke-dasharray: 1 0; opacity: 1; }
            100% { stroke-dasharray: 1 0; opacity: .72; }
          }

          @keyframes loaderDoorPulse {
            0%, 100% { filter: brightness(1); }
            50% { filter: brightness(1.18); }
          }

          @keyframes loaderPreviewSlowSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @keyframes loaderDoorLeft {
            0%, 100% { transform: perspective(80px) rotateY(0deg); }
            50% { transform: perspective(80px) rotateY(-24deg); }
          }

          @keyframes loaderDoorRight {
            0%, 100% { transform: perspective(80px) rotateY(0deg); }
            50% { transform: perspective(80px) rotateY(24deg); }
          }

          @keyframes loaderPageLeft {
            0%, 100% { transform: rotateY(0deg); }
            50% { transform: rotateY(12deg); }
          }

          @keyframes loaderPageRight {
            0%, 100% { transform: rotateY(0deg); }
            50% { transform: rotateY(-12deg); }
          }
        `}
      </style>

      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-amber-700">Homepage Loader Preview</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Heritage Seal O Active Motion Study</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6f6258]">
            Here are 20 active loading treatments based on Heritage Seal O. Each keeps the same formal church-seal foundation, but uses a different motion language so you can choose the one that feels most spiritual, modern, and professional.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[heritageSealOFeaturedOption, ...heritageSealOActiveOptions].map((option) => (
            <section key={option.name} className="overflow-hidden rounded-lg border border-amber-900/15 bg-white/72 shadow-[0_18px_48px_rgba(75,52,42,0.12)]">
              <div className="flex min-h-64 items-center justify-center bg-gradient-to-br from-[#fbf7f0] via-[#f3e5c3] to-[#d8c79f] p-8">
                <div className="flex flex-col items-center text-center">
                  <LoaderArt type={option.render} />
                  <h2 className="mt-5 text-lg font-bold leading-tight">Goodwill Presbyterian Church, USA</h2>
                  <p className="mt-2 text-sm font-semibold text-amber-800">Welcome.</p>
                </div>
              </div>
              <div className="border-t border-amber-900/10 p-4">
                <h3 className="text-base font-bold">{option.name}</h3>
                <p className="mt-1 text-sm leading-5 text-[#6f6258]">{option.description}</p>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-amber-700">Line-Art Church Study</p>
          <h2 className="mt-2 text-2xl font-bold md:text-3xl">16 Line-Art Church Variations</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6f6258]">
            These remain here for comparison with the style you selected earlier.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {lineArtChurchOptions.map((option) => (
            <section key={option.name} className="overflow-hidden rounded-lg border border-amber-900/15 bg-white/72 shadow-[0_18px_48px_rgba(75,52,42,0.12)]">
              <div className="flex min-h-64 items-center justify-center bg-gradient-to-br from-[#fbf7f0] via-[#f3e5c3] to-[#d8c79f] p-8">
                <div className="flex flex-col items-center text-center">
                  <LoaderArt type={option.render} />
                  <h2 className="mt-5 text-lg font-bold leading-tight">Goodwill Presbyterian Church, USA</h2>
                  <p className="mt-2 text-sm font-semibold text-amber-800">Welcome.</p>
                </div>
              </div>
              <div className="border-t border-amber-900/10 p-4">
                <h3 className="text-base font-bold">{option.name}</h3>
                <p className="mt-1 text-sm leading-5 text-[#6f6258]">{option.description}</p>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-amber-700">Heritage Seal Study</p>
          <h2 className="mt-2 text-2xl font-bold md:text-3xl">16 Heritage Seal Variations</h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {heritageSealOptions.map((option) => (
            <section key={option.name} className="overflow-hidden rounded-lg border border-amber-900/15 bg-white/72 shadow-[0_18px_48px_rgba(75,52,42,0.12)]">
              <div className="flex min-h-64 items-center justify-center bg-gradient-to-br from-[#fbf7f0] via-[#f3e5c3] to-[#d8c79f] p-8">
                <div className="flex flex-col items-center text-center">
                  <LoaderArt type={option.render} />
                  <h2 className="mt-5 text-lg font-bold leading-tight">Goodwill Presbyterian Church, USA</h2>
                  <p className="mt-2 text-sm font-semibold text-amber-800">Welcome.</p>
                </div>
              </div>
              <div className="border-t border-amber-900/10 p-4">
                <h3 className="text-base font-bold">{option.name}</h3>
                <p className="mt-1 text-sm leading-5 text-[#6f6258]">{option.description}</p>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-amber-700">Earlier Explorations</p>
          <h2 className="mt-2 text-2xl font-bold md:text-3xl">Original Loader Sets</h2>
        </div>

        <div className="mb-10 rounded-lg border border-amber-900/15 bg-white/60 p-5 shadow-[0_18px_48px_rgba(75,52,42,0.08)]">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-700">Current Favorite</p>
          <p className="mt-2 text-sm leading-6 text-[#6f6258]">Option 1, Line-Art Church, is your current selection. The challengers below are designed to beat it.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {loaderOptions.map((option) => (
            <section key={option.name} className="overflow-hidden rounded-lg border border-amber-900/15 bg-white/72 shadow-[0_18px_48px_rgba(75,52,42,0.12)]">
              <div className="flex min-h-64 items-center justify-center bg-gradient-to-br from-[#fbf7f0] via-[#f3e5c3] to-[#d8c79f] p-8">
                <div className="flex flex-col items-center text-center">
                  <LoaderArt type={option.render} />
                  <h2 className="mt-5 text-xl font-bold leading-tight">Goodwill Presbyterian Church, USA</h2>
                  <p className="mt-2 text-sm font-semibold text-amber-800">Welcome.</p>
                </div>
              </div>
              <div className="border-t border-amber-900/10 p-4">
                <h3 className="text-base font-bold">{option.name}</h3>
                <p className="mt-1 text-sm leading-5 text-[#6f6258]">{option.description}</p>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-amber-700">Challenger Set</p>
          <h2 className="mt-2 text-2xl font-bold md:text-3xl">10 More Options</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6f6258]">
            These are more refined alternatives. If any of them beats Line-Art Church, tell me the option number.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {challengerOptions.map((option) => (
            <section key={option.name} className="overflow-hidden rounded-lg border border-amber-900/15 bg-white/72 shadow-[0_18px_48px_rgba(75,52,42,0.12)]">
              <div className="flex min-h-64 items-center justify-center bg-gradient-to-br from-[#fbf7f0] via-[#f3e5c3] to-[#d8c79f] p-8">
                <div className="flex flex-col items-center text-center">
                  <LoaderArt type={option.render} />
                  <h2 className="mt-5 text-xl font-bold leading-tight">Goodwill Presbyterian Church, USA</h2>
                  <p className="mt-2 text-sm font-semibold text-amber-800">Welcome.</p>
                </div>
              </div>
              <div className="border-t border-amber-900/10 p-4">
                <h3 className="text-base font-bold">{option.name}</h3>
                <p className="mt-1 text-sm leading-5 text-[#6f6258]">{option.description}</p>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
