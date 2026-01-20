import React from 'react';
import { calculateGaugePosition, getZoneColor } from '../utils/formatting';

/**
 * Visual gauge component for displaying indicator value within threshold zones
 */
function IndicatorGauge({ value, config, zone }) {
  const { gaugeMin, gaugeMax, thresholds, unit = '' } = config;
  const position = calculateGaugePosition(value, gaugeMin, gaugeMax);

  // Calculate zone segments
  const segments = [];
  const range = gaugeMax - gaugeMin;

  // Build segments from thresholds
  const zoneOrder = ['normal', 'warning', 'danger', 'critical'];
  const zoneConfigs = [];

  zoneOrder.forEach(zoneName => {
    const t = thresholds[zoneName];
    if (!t) return;

    let start, end;
    if (t.min !== undefined && t.max !== undefined) {
      start = ((t.min - gaugeMin) / range) * 100;
      end = ((t.max - gaugeMin) / range) * 100;
    } else if (t.min !== undefined) {
      start = ((t.min - gaugeMin) / range) * 100;
      end = 100;
    } else if (t.max !== undefined) {
      start = 0;
      end = ((t.max - gaugeMin) / range) * 100;
    }

    if (start !== undefined && end !== undefined) {
      zoneConfigs.push({
        zone: zoneName,
        start: Math.max(0, Math.min(100, start)),
        end: Math.max(0, Math.min(100, end)),
        color: getZoneColor(zoneName.toUpperCase()),
      });
    }
  });

  // Sort by start position
  zoneConfigs.sort((a, b) => a.start - b.start);

  return (
    <div className="indicator-gauge">
      <div className="gauge-track">
        {/* Zone segments */}
        {zoneConfigs.map((seg, i) => (
          <div
            key={i}
            className="gauge-segment"
            style={{
              left: `${seg.start}%`,
              width: `${seg.end - seg.start}%`,
              backgroundColor: seg.color,
              opacity: zone?.toLowerCase() === seg.zone ? 1 : 0.4,
            }}
          />
        ))}

        {/* Current value marker */}
        {value !== null && value !== undefined && (
          <div
            className="gauge-marker"
            style={{ left: `${position}%` }}
          >
            <div className="gauge-marker-line" />
            <div className="gauge-marker-dot" />
          </div>
        )}
      </div>

      {/* Scale labels */}
      <div className="gauge-labels">
        <span className="gauge-label gauge-label-min">
          {gaugeMin}{unit}
        </span>
        <span className="gauge-label gauge-label-max">
          {gaugeMax}{unit}
        </span>
      </div>
    </div>
  );
}

export default IndicatorGauge;
