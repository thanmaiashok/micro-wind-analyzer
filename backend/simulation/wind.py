"""Wind generation module for wind simulation."""

import numpy as np
from typing import Tuple, Dict


class WindGenerator:
    """Generates wind patterns for the simulation."""
    
    def __init__(self, grid_size: int = 100, seed: int = 42):
        """
        Initialize wind generator.
        
        Args:
            grid_size: Size of the wind grid
            seed: Random seed for reproducibility
        """
        self.grid_size = grid_size
        np.random.seed(seed)
    
    def generate_wind_field(
        self,
        time_step: int = 0,
        base_speed: float = 3.5,   # Real Hyderabad annual mean (Open-Meteo/ERA5 2023)
        turbulence: float = 0.2,
        base_direction: float = 185.0,   # Real dominant direction (SSW)
        direction_variability: float = 35.0
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Generate wind speed and direction fields.
        Uses a local RandomState seeded by the inputs to ensure 
        deterministic outputs for the same configurations.
        """
        # Create a deterministic seed based on inputs so same config = same spots
        seed_val = hash((time_step, base_speed, turbulence, base_direction)) % (2**32)
        rng = np.random.RandomState(seed_val)

        # Create base wind field
        wind_speed = np.ones((self.grid_size, self.grid_size)) * base_speed
        
        # Add turbulence using Perlin-like noise
        noise = rng.normal(0, turbulence, (self.grid_size, self.grid_size))
        wind_speed = wind_speed + noise
        wind_speed = np.clip(wind_speed, 0, None)
        
        # Generate wind direction (in degrees)
        if base_direction is None:
            wind_direction = rng.uniform(0, 360, (self.grid_size, self.grid_size))
        else:
            directional_noise = rng.normal(0, direction_variability, (self.grid_size, self.grid_size))
            wind_direction = (base_direction + directional_noise) % 360
        
        return wind_speed, wind_direction
    
    def get_wind_at_location(
        self,
        x: int,
        y: int,
        wind_speed: np.ndarray,
        wind_direction: np.ndarray
    ) -> Dict[str, float]:
        """
        Get wind speed and direction at a specific location.
        
        Args:
            x: X coordinate
            y: Y coordinate
            wind_speed: Wind speed field
            wind_direction: Wind direction field
        
        Returns:
            Dictionary with speed and direction
        """
        x = int(np.clip(x, 0, self.grid_size - 1))
        y = int(np.clip(y, 0, self.grid_size - 1))
        
        return {
            "speed": float(wind_speed[y, x]),
            "direction": float(wind_direction[y, x])
        }
