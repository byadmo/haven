import React from "react";

// Global "Scrubbable Timeline" state. The scrubber only updates `timelineIndex`;
// every consuming card reads `forecastData[timelineIndex]` from this context.
const ForecastContext = React.createContext(null);

export function useForecast() {
  return React.useContext(ForecastContext);
}

export function ForecastProvider({ forecastData, children }) {
  const [timelineIndex, setTimelineIndex] = React.useState(0);
  const len = forecastData?.length || 0;

  // clamp when the forecast array shrinks (e.g. data refresh)
  React.useEffect(() => {
    if (len > 0 && timelineIndex > len - 1) setTimelineIndex(0);
  }, [len, timelineIndex]);

  const safeIndex = len > 0 ? Math.min(timelineIndex, len - 1) : 0;
  const point = forecastData?.[safeIndex];

  const keyframes = React.useMemo(() => {
    if (!forecastData) return [];
    return forecastData
      .map((p, i) => (p?.keyframe ? i : null))
      .filter((k) => k !== null);
  }, [forecastData]);

  const value = {
    forecastData: forecastData || [],
    timelineIndex: safeIndex,
    setTimelineIndex,
    point,
    keyframes,
    isFuture: safeIndex > 0,
    max: Math.max(0, len - 1),
  };

  return <ForecastContext.Provider value={value}>{children}</ForecastContext.Provider>;
}