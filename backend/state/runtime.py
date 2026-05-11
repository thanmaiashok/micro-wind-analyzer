"""Runtime state management for the simulation."""

from typing import Dict, Optional
from dataclasses import dataclass, field
from datetime import datetime
import threading
import time


@dataclass
class RuntimeState:
    """Manages the runtime state of the simulation."""
    
    is_running: bool = False
    is_paused: bool = False
    current_time: float = 0.0
    start_time: Optional[datetime] = None
    pause_time: Optional[datetime] = None
    simulation_speed: float = 1.0  # 1.0 = real-time
    total_steps: int = 0
    lock: threading.Lock = field(default_factory=threading.Lock)
    
    def start(self):
        """Start or resume the simulation."""
        with self.lock:
            self.is_running = True
            self.is_paused = False
            if self.start_time is None:
                self.start_time = datetime.now()
    
    def pause(self):
        """Pause the simulation."""
        with self.lock:
            self.is_paused = True
            self.pause_time = datetime.now()
    
    def resume(self):
        """Resume a paused simulation."""
        with self.lock:
            self.is_paused = False
            if self.pause_time is not None:
                # Account for pause duration
                pause_duration = (datetime.now() - self.pause_time).total_seconds()
                if self.start_time is not None:
                    self.start_time = datetime.fromtimestamp(
                        self.start_time.timestamp() + pause_duration
                    )
    
    def stop(self):
        """Stop the simulation."""
        with self.lock:
            self.is_running = False
            self.is_paused = False
            self.start_time = None
    
    def reset(self):
        """Reset the simulation state."""
        with self.lock:
            self.is_running = False
            self.is_paused = False
            self.current_time = 0.0
            self.start_time = None
            self.pause_time = None
            self.total_steps = 0
    
    def update_time(self, delta_time: float):
        """
        Update simulation time.
        
        Args:
            delta_time: Time delta in seconds
        """
        with self.lock:
            if self.is_running and not self.is_paused:
                self.current_time += delta_time * self.simulation_speed
                self.total_steps += 1
    
    def set_speed(self, speed: float):
        """
        Set simulation speed multiplier.
        
        Args:
            speed: Speed multiplier (e.g., 2.0 = 2x speed)
        """
        with self.lock:
            self.simulation_speed = max(0.1, speed)
    
    def get_status(self) -> Dict:
        """
        Get current runtime status.
        
        Returns:
            Dictionary with status information
        """
        with self.lock:
            return {
                "is_running": self.is_running,
                "is_paused": self.is_paused,
                "current_time": self.current_time,
                "simulation_speed": self.simulation_speed,
                "total_steps": self.total_steps,
                "start_time": self.start_time.isoformat() if self.start_time else None
            }
