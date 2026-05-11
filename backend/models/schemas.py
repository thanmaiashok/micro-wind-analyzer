"""Pydantic schemas for request/response validation."""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Tuple


class WindFieldResponse(BaseModel):
    """Response for wind field data."""
    
    grid_size: int = Field(..., description="Size of the wind grid")
    wind_speed: List[List[float]] = Field(..., description="Wind speed field")
    wind_direction: List[List[float]] = Field(..., description="Wind direction field in degrees")
    time_step: int = Field(default=0, description="Simulation time step")


class TerrainResponse(BaseModel):
    """Response for terrain data."""
    
    grid_size: int = Field(..., description="Size of the terrain grid")
    elevation: List[List[float]] = Field(..., description="Terrain elevation map")
    min_elevation: float = Field(..., description="Minimum elevation")
    max_elevation: float = Field(..., description="Maximum elevation")


class TurbineLocation(BaseModel):
    """Single turbine location and data."""

    x: int = Field(..., description="X coordinate")
    y: int = Field(..., description="Y coordinate")
    power_output: float = Field(..., description="Power output in watts")
    wind_speed: float = Field(..., description="Wind speed at location")
    wind_direction: float = Field(..., description="Wind direction in degrees")
    # Category metadata — populated by /optimize, absent on live-turbine endpoints
    placement_category: Optional[str] = Field(None, description="ROOFTOP | ELEVATED | GROUND_FLOOR")
    elevation_m: Optional[float] = Field(None, description="Terrain elevation in metres")
    elevation_pct: Optional[float] = Field(None, description="Elevation percentile 0-1")



class OptimizationResult(BaseModel):
    """Result of turbine placement optimization."""
    
    turbines: List[TurbineLocation] = Field(..., description="List of turbine placements")
    total_power: float = Field(..., description="Total power output in watts")
    average_power: float = Field(..., description="Average power per turbine")
    efficiency: float = Field(..., description="Overall efficiency metric")


class SimulationParams(BaseModel):
    """Simulation parameters."""
    
    grid_size: int = Field(default=100, description="Grid size")
    num_turbines: int = Field(default=10, description="Number of turbines to place")
    base_wind_speed: float = Field(default=10.0, description="Base wind speed m/s")
    base_wind_direction: float = Field(default=270.0, description="Base wind direction in degrees")
    turbulence: float = Field(default=0.2, description="Turbulence factor 0-1")
    rotor_diameter: float = Field(default=18.0, description="Turbine rotor diameter meters")


class SimulationStatus(BaseModel):
    """Current simulation status."""
    
    is_running: bool = Field(..., description="Is simulation running")
    current_time: float = Field(..., description="Current simulation time")
    total_power: float = Field(..., description="Total power output")
    turbine_count: int = Field(..., description="Number of active turbines")
    timestamp: str = Field(..., description="Current timestamp")


class SimulationStartRequest(BaseModel):
    """Request to start a simulation."""
    
    params: SimulationParams = Field(default_factory=SimulationParams)


class HealthCheckResponse(BaseModel):
    """Health check response."""
    
    status: str = Field(default="healthy", description="Service status")
    version: str = Field(default="1.0.0", description="API version")
