import React from 'react';
import { formatDate } from '../utils/formatting';

/**
 * Upcoming events calendar component
 */
function EventCalendar({ events, loading }) {
  // Default events structure when API doesn't provide data
  const defaultEvents = [
    {
      type: 'auction',
      title: 'Treasury Auctions',
      description: 'Check treasurydirect.gov for upcoming auction schedule',
      link: 'https://www.treasurydirect.gov/auctions/upcoming/',
    },
    {
      type: 'tic',
      title: 'TIC Data Release',
      description: 'Monthly release, typically around 15th of month',
      link: 'https://home.treasury.gov/data/treasury-international-capital-tic-system',
    },
    {
      type: 'fomc',
      title: 'FOMC Meetings',
      description: 'Check Federal Reserve calendar for dates',
      link: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
    },
  ];

  const displayEvents = events?.length > 0 ? events : defaultEvents;

  if (loading) {
    return (
      <div className="event-calendar event-calendar-loading">
        <h3>Upcoming Events</h3>
        <div className="event-loading">Loading events...</div>
      </div>
    );
  }

  return (
    <div className="event-calendar">
      <h3>Upcoming Events</h3>

      <div className="event-list">
        {displayEvents.map((event, index) => (
          <EventItem key={index} event={event} />
        ))}
      </div>

      <div className="event-sources">
        <h4>Data Sources</h4>
        <ul>
          <li>
            <a
              href="https://www.treasurydirect.gov/auctions/upcoming/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Treasury Auction Schedule
            </a>
          </li>
          <li>
            <a
              href="https://home.treasury.gov/data/treasury-international-capital-tic-system"
              target="_blank"
              rel="noopener noreferrer"
            >
              TIC Data Release Calendar
            </a>
          </li>
          <li>
            <a
              href="https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm"
              target="_blank"
              rel="noopener noreferrer"
            >
              FOMC Meeting Calendar
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Individual event item
 */
function EventItem({ event }) {
  const {
    type,
    title,
    description,
    date,
    time,
    link,
    maturity,
    amount,
  } = event;

  const typeColors = {
    auction: '#3b82f6',
    tic: '#8b5cf6',
    fomc: '#10b981',
    debt: '#ef4444',
    default: '#6b7280',
  };

  const typeColor = typeColors[type] || typeColors.default;

  return (
    <div className="event-item" style={{ borderLeftColor: typeColor }}>
      <div className="event-item-header">
        <span
          className="event-type-badge"
          style={{ backgroundColor: typeColor }}
        >
          {type?.toUpperCase() || 'EVENT'}
        </span>
        {date && (
          <span className="event-date">
            {formatDate(date, 'short')}
            {time && ` ${time}`}
          </span>
        )}
      </div>

      <div className="event-title">{title}</div>

      {description && (
        <div className="event-description">{description}</div>
      )}

      {/* Auction-specific details */}
      {type === 'auction' && maturity && (
        <div className="event-details">
          <span className="event-detail">
            <strong>Maturity:</strong> {maturity}
          </span>
          {amount && (
            <span className="event-detail">
              <strong>Amount:</strong> ${amount}B
            </span>
          )}
        </div>
      )}

      {link && (
        <a
          href={link}
          className="event-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          More info →
        </a>
      )}
    </div>
  );
}

export default EventCalendar;
