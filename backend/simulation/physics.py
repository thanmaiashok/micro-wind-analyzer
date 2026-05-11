"""Physics calculations for wind turbine power generation."""

import numpy as np
from typing import Dict


class TurbinePhysics:
    """Handles wind turbine physics and power calculations."""
    
    # Standard turbine parameters
    AIR_DENSITY = 1.225  # kg/m³ at sea level
    CP_MAX = 0.593  # Betz limit (theoretical maximum efficiency)
    
    def __init__(self, rotor_diameter: float = 80.0):
        """
        Initialize turbine physics.
        
        Args:
            rotor_diameter: Rotor diameter in meters
        """
        self.rotor_diameter = rotor_diameter
        self.rotor_area = np.pi * (rotor_diameter / 2) ** 2
    
    def calculate_power(
        self,
        wind_speed: float,
        cp: float = 0.35,
        efficiency: float = 0.9
    ) -> float:
        """
        Calculate power output for a turbine.
        
        Uses P = 0.5 * ρ * A * v³ * Cp * efficiency
        
        Args:
            wind_speed: Wind speed in m/s
            cp: Power coefficient (0-0.593)
            efficiency: Drivetrain efficiency (0-1)
        
        Returns:
            Power in watts
        """
        if not np.isfinite(wind_speed):
            return 0.0

        # Hard safety bound for physically realistic small/medium turbine modeling.
        wind_speed = float(np.clip(wind_speed, 0.0, 60.0))
        cp = np.clip(cp, 0, self.CP_MAX)
        efficiency = np.clip(efficiency, 0, 1)
        
        power = 0.5 * self.AIR_DENSITY * self.rotor_area * (wind_speed ** 3) * cp * efficiency
        
        return float(power)
    
    def calculate_thrust(self, wind_speed: float, ct: float = 0.8) -> float:
        """
        Calculate thrust force on turbine.
        
        Args:
            wind_speed: Wind speed in m/s
            ct: Thrust coefficient
        
        Returns:
            Thrust force in newtons
        """
        ct = np.clip(ct, 0, 2)
        thrust = 0.5 * self.AIR_DENSITY * self.rotor_area * (wind_speed ** 2) * ct
        
        return float(thrust)
    
    def get_turbine_efficiency(
        self,
        wind_speed: float,
        rated_speed: float = 12.0,
        cut_in_speed: float = 3.0,
        cut_out_speed: float = 25.0
    ) -> float:
        """
        Get power coefficient (Cp) based on wind speed using a realistic turbine curve.

        Three regions:
          - Below cut-in  : Cp = 0 (no generation)
          - Cut-in → rated: Smooth cubic S-curve (variable-speed MPPT, tracks optimal TSR)
          - Rated → cut-out: Cp drops as (v_rated/v)^3 — pitch control holds rated power constant

        CP_RATED = 0.38 is realistic for a modern small urban HAWT (well below Betz 0.593).
        """
        CP_RATED = 0.38  # realistic peak Cp for urban small-turbine HAWT

        if wind_speed < cut_in_speed or wind_speed > cut_out_speed:
            return 0.0

        if wind_speed <= rated_speed:
            # Smoothstep S-curve: f(x) = 3x² − 2x³  (0 at cut-in, 1.0 at rated)
            # Matches MPPT control that continuously tracks the optimal tip-speed ratio.
            x = (wind_speed - cut_in_speed) / (rated_speed - cut_in_speed)
            return CP_RATED * (3.0 * x ** 2 - 2.0 * x ** 3)
        else:
            # Above rated: pitch control keeps P = P_rated = const
            # => P = 0.5·ρ·A·v³·Cp  →  Cp = CP_RATED·(v_rated/v)³
            return CP_RATED * (rated_speed ** 3) / (wind_speed ** 3)
    
    def calculate_energy(self, power: float, time_hours: float) -> float:
        """
        Calculate energy produced over time.
        
        Args:
            power: Power in watts
            time_hours: Time in hours
        
        Returns:
            Energy in watt-hours
        """
        return float(power * time_hours)
