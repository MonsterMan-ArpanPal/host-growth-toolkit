from dataclasses import dataclass
from datetime import date
from typing import Dict, List, Optional, Any

@dataclass
class EventDef:
    name: str
    event_type: str
    start_month: int
    start_day: int
    end_month: int
    end_day: int
    year: Optional[int] = None  # If None, it repeats yearly

# Simple configurable event calendar for major London short-term rental drivers
LONDON_EVENTS = [
    EventDef("New Year's Eve", "holiday", 12, 31, 12, 31),
    EventDef("New Year's Day", "holiday", 1, 1, 1, 1),
    EventDef("Valentine's Day", "holiday", 2, 14, 2, 14),
    EventDef("Chelsea Flower Show", "conference", 5, 19, 5, 23),
    EventDef("Wimbledon", "sports", 6, 29, 7, 12),
    EventDef("Notting Hill Carnival", "festival", 8, 30, 8, 31),
    EventDef("Christmas Eve", "holiday", 12, 24, 12, 24),
    EventDef("Christmas Day", "holiday", 12, 25, 12, 25),
    EventDef("Boxing Day", "holiday", 12, 26, 12, 26),
]

def get_season(month: int) -> str:
    """Return the season context for a given month."""
    if month in (12, 1, 2):
        return "Winter"
    elif month in (3, 4, 5):
        return "Spring"
    elif month in (6, 7, 8):
        return "Summer"
    else:
        return "Autumn"

def get_event_context(target_date: date) -> Dict[str, Any]:
    """
    Check the configurable event calendar for a given date.
    Returns the event name, type, active status, and season.
    """
    event_name = None
    event_type = None
    is_event = False
    
    for event in LONDON_EVENTS:
        if event.year and event.year != target_date.year:
            continue
            
        # Handle wrap-around events (e.g., Dec 30 - Jan 2)
        if event.start_month > event.end_month:
            # Event crosses the year boundary
            if (target_date.month == event.start_month and target_date.day >= event.start_day) or \
               (target_date.month == event.end_month and target_date.day <= event.end_day):
                event_name = event.name
                event_type = event.event_type
                is_event = True
                break
        else:
            # Standard within-year event
            after_start = (target_date.month > event.start_month) or \
                          (target_date.month == event.start_month and target_date.day >= event.start_day)
            before_end = (target_date.month < event.end_month) or \
                         (target_date.month == event.end_month and target_date.day <= event.end_day)
                         
            if after_start and before_end:
                event_name = event.name
                event_type = event.event_type
                is_event = True
                break
                
    month_name = target_date.strftime('%B')
    season = get_season(target_date.month)
    
    return {
        "event_active": is_event,
        "event_name": event_name,
        "event_type": event_type,
        "seasonality_context": f"{season} ({month_name})",
    }
