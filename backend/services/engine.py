"""Simulation engine that orchestrates the entire pipeline."""

from typing import Dict, List, Optional, Tuple
import numpy as np
from datetime import datetime
import sys
import os

# Add backend to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from simulation.wind import WindGenerator
from simulation.terrain import TerrainGenerator
from simulation.physics import TurbinePhysics
from simulation.optimizer import TurbinePlacementOptimizer


class SimulationEngine:
    """Main engine that runs the wind turbine simulation."""
    
    def __init__(self):
        """Initialize simulation engine with all components."""
        self.wind_gen = WindGenerator(grid_size=100)
        self.terrain_gen = TerrainGenerator(grid_size=100)
        self.optimizer = TurbinePlacementOptimizer(grid_size=100)
        self.physics = TurbinePhysics(rotor_diameter=18.0)

        self.is_running = False
        self.current_time = 0.0
        self.turbine_locations: List[Tuple[int, int]] = []
        self.total_power = 0.0

        self.terrain: Optional[np.ndarray] = None
        self.wind_speed: Optional[np.ndarray] = None
        self.wind_direction: Optional[np.ndarray] = None
        self.base_wind_speed_field: Optional[np.ndarray] = None

        # Ornstein-Uhlenbeck wind variation state (persists across update_step calls)
        self._wind_variation: float = 1.0
    
    def initialize(self, grid_size: int = 100):
        """
        Initialize the simulation environment.
        
        Args:
            grid_size: Size of the simulation grid
        """
        self.wind_gen = WindGenerator(grid_size=grid_size)
        self.terrain_gen = TerrainGenerator(grid_size=grid_size)
        self.optimizer = TurbinePlacementOptimizer(grid_size=grid_size)
        
        # Generate initial terrain
        self.terrain = self.terrain_gen.generate_terrain(scale=50.0)
        
        # Generate initial wind
        self.wind_speed, self.wind_direction = self.wind_gen.generate_wind_field()
        self.base_wind_speed_field = self.wind_speed.copy()
    
    def start_simulation(self, num_turbines: int = 10):
        """
        Start a simulation run.
        
        Args:
            num_turbines: Number of turbines to place
        """
        if self.terrain is None:
            self.initialize()
        
        self.is_running = True
        self.current_time = 0.0
        
        # Calculate power potential map
        power_map = self.optimizer.calculate_wind_power_map(
            self.wind_speed,
            self.terrain
        )
        
        # Find optimal turbine locations
        self.turbine_locations = self.optimizer.find_optimal_locations(
            power_map,
            num_turbines=num_turbines
        )
        
        self._update_power_output()
    
    def stop_simulation(self):
        """Stop the simulation."""
        self.is_running = False
    
    def update_step(self, delta_time: float = 1.0):
        """
        Update simulation by one time step.
        
        Args:
            delta_time: Time step in seconds
        """
        if not self.is_running:
            return
        
        self.current_time += delta_time

        # ── Ornstein-Uhlenbeck stochastic wind variation ────────────────────────
        # Models realistic atmospheric turbulence: mean-reverting random walk.
        # dX = θ(μ - X)dt + σ√dt · dW
        #   θ = 0.03  — gentle mean-reversion (wind doesn't snap back instantly)
        #   σ = 0.06  — 6% turbulence intensity (typical IEC Class B urban site)
        theta = 0.03
        sigma = 0.06
        noise = float(np.random.normal(0.0, 1.0)) * sigma * np.sqrt(delta_time)
        self._wind_variation += theta * (1.0 - self._wind_variation) * delta_time + noise
        # Clamp to ±45% of mean — consistent with real urban wind gust factors
        self._wind_variation = float(np.clip(self._wind_variation, 0.55, 1.45))

        # Apply variation against stable base field (prevents runaway growth)
        if self.base_wind_speed_field is None:
            self.base_wind_speed_field = self.wind_speed.copy()

        self.wind_speed = np.clip(self.base_wind_speed_field * self._wind_variation, 0.0, 40.0)
        
        self._update_power_output()
    
    def _update_power_output(self):
        """Update total power output based on current conditions."""
        total_power = 0.0
        
        for x, y in self.turbine_locations:
            wind_speed = self.wind_gen.get_wind_at_location(
                x, y, self.wind_speed, self.wind_direction
            )["speed"]
            
            cp = self.physics.get_turbine_efficiency(wind_speed)
            power = self.physics.calculate_power(wind_speed, cp=cp)
            total_power += power
        
        self.total_power = total_power
    
    def get_turbine_data(self) -> List[Dict]:
        """
        Get detailed data for all turbines.
        
        Returns:
            List of turbine data dictionaries
        """
        turbines = []
        
        for x, y in self.turbine_locations:
            wind_data = self.wind_gen.get_wind_at_location(
                x, y, self.wind_speed, self.wind_direction
            )
            
            cp = self.physics.get_turbine_efficiency(wind_data["speed"])
            power = self.physics.calculate_power(wind_data["speed"], cp=cp)
            
            elevation = self.terrain_gen.get_elevation_at(x, y, self.terrain)
            slope = self.terrain_gen.get_slope_at(x, y, self.terrain)
            
            turbines.append({
                "x": x,
                "y": y,
                "power": power,
                "wind_speed": wind_data["speed"],
                "wind_direction": wind_data["direction"],
                "elevation": elevation,
                "slope": slope
            })
        
        return turbines
    
    def get_status(self) -> Dict:
        """
        Get current simulation status.
        
        Returns:
            Dictionary with status information
        """
        return {
            "is_running": self.is_running,
            "current_time": self.current_time,
            "total_power": self.total_power,
            "turbine_count": len(self.turbine_locations),
            "timestamp": datetime.now().isoformat()
        }
