"""Terrain generation module for simulation environment."""

import numpy as np
from typing import Tuple


class TerrainGenerator:
    """Generates terrain elevation maps."""
    
    def __init__(self, grid_size: int = 100):
        """
        Initialize terrain generator.
        
        Args:
            grid_size: Size of the terrain grid
        """
        self.grid_size = grid_size
    
    def generate_terrain(self, scale: float = 50.0) -> np.ndarray:
        """
        Generate a terrain elevation map using random height distribution.
        
        Args:
            scale: Height scale in meters
        
        Returns:
            2D array of terrain elevations
        """
        # Create base terrain with hills
        x = np.linspace(0, 4 * np.pi, self.grid_size)
        y = np.linspace(0, 4 * np.pi, self.grid_size)
        X, Y = np.meshgrid(x, y)
        
        # Create undulating terrain using sine waves
        terrain = scale * (
            0.5 * np.sin(X / 10) * np.cos(Y / 10) +
            0.3 * np.sin(X / 20) +
            0.2 * np.cos(Y / 15)
        )
        
        # Ensure non-negative heights
        terrain = np.maximum(terrain, 0)
        
        return terrain
    
    def get_elevation_at(self, x: int, y: int, terrain: np.ndarray) -> float:
        """
        Get elevation at a specific location.
        
        Args:
            x: X coordinate
            y: Y coordinate
            terrain: Terrain elevation map
        
        Returns:
            Elevation in meters
        """
        x = int(np.clip(x, 0, self.grid_size - 1))
        y = int(np.clip(y, 0, self.grid_size - 1))
        
        return float(terrain[y, x])
    
    def get_slope_at(self, x: int, y: int, terrain: np.ndarray) -> float:
        """
        Calculate terrain slope at a location.
        
        Args:
            x: X coordinate
            y: Y coordinate
            terrain: Terrain elevation map
        
        Returns:
            Slope angle in degrees
        """
        x = int(np.clip(x, 1, self.grid_size - 2))
        y = int(np.clip(y, 1, self.grid_size - 2))
        
        # Calculate gradient
        dx = terrain[y, x + 1] - terrain[y, x - 1]
        dy = terrain[y + 1, x] - terrain[y - 1, x]
        
        slope = np.arctan(np.sqrt(dx**2 + dy**2) / 2)
        
        return float(np.degrees(slope))
