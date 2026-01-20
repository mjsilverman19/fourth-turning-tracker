import React from 'react';
import { stageConfigs } from '../utils/thresholds';

/**
 * Stage indicator component showing current crisis stage assessment
 */
function StageIndicator({ assessment, loading }) {
  if (loading) {
    return (
      <div className="stage-indicator stage-indicator-loading">
        <div className="stage-header">
          <h2>Current Assessment</h2>
        </div>
        <div className="stage-loading">
          Loading assessment...
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="stage-indicator stage-indicator-error">
        <div className="stage-header">
          <h2>Current Assessment</h2>
        </div>
        <div className="stage-error">
          Unable to load stage assessment
        </div>
      </div>
    );
  }

  const { stage, stageName, confidence, triggers } = assessment;
  const stageConfig = stageConfigs[stage] || stageConfigs[0];

  return (
    <div
      className="stage-indicator"
      style={{
        borderColor: stageConfig.color,
        backgroundColor: stageConfig.bgColor,
      }}
    >
      <div className="stage-header">
        <h2>Current Assessment</h2>
        <span
          className="stage-badge"
          style={{ backgroundColor: stageConfig.color }}
        >
          {stageConfig.shortName}
        </span>
      </div>

      <div className="stage-name">
        {stageName}
      </div>

      <div className="stage-confidence">
        <div className="confidence-bar-container">
          <div
            className="confidence-bar"
            style={{
              width: `${confidence}%`,
              backgroundColor: stageConfig.color,
            }}
          />
        </div>
        <span className="confidence-label">
          Confidence: {confidence}%
        </span>
      </div>

      {triggers && triggers.length > 0 && (
        <div className="stage-triggers">
          <h4>Primary Concerns:</h4>
          <ul>
            {triggers.map((trigger, index) => (
              <li key={index}>{trigger}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="stage-description">
        {stageConfig.description}
      </div>

      {/* Stage progression indicator */}
      <div className="stage-progression">
        {[0, 1, 2, 3, 4].map((s) => {
          const config = stageConfigs[s];
          const isActive = s === stage;
          const isPast = s < stage;

          return (
            <div
              key={s}
              className={`stage-step ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}`}
              title={config.name}
            >
              <div
                className="stage-step-dot"
                style={{
                  backgroundColor: isActive || isPast ? config.color : '#e5e7eb',
                }}
              />
              <span className="stage-step-label">
                {s === 0 ? 'Pre' : s}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StageIndicator;
