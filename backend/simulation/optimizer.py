"""Turbine placement optimization — zone-aware, category-classified."""

import numpy as np
from typing import List, Dict, Tuple


# ──────────────────────────────────────────────────────────────────────────────
# Category definitions
# ──────────────────────────────────────────────────────────────────────────────
CATEGORY_ROOFTOP     = "ROOFTOP"       # elevation ≥ 60th percentile
CATEGORY_ELEVATED    = "ELEVATED"      # elevation 30th–60th percentile
CATEGORY_GROUND      = "GROUND_FLOOR"  # elevation < 30th percentile


def _classify(elevation_pct: float) -> str:
    if elevation_pct >= 0.60:
        return CATEGORY_ROOFTOP
    elif elevation_pct >= 0.30:
        return CATEGORY_ELEVATED
    return CATEGORY_GROUND


# ──────────────────────────────────────────────────────────────────────────────
class TurbinePlacementOptimizer:
    """
    Optimises wind turbine placement for maximum energy production.

    Zone-based algorithm:
      1. Classify every grid cell as ROOFTOP / ELEVATED / GROUND_FLOOR using
         terrain elevation percentiles.
      2. Run a greedy best-first search independently in each zone so the
         results always span all three installation types.
      3. Guarantee minimum inter-turbine spacing within and across zones.
    """

    # How many turbines to allocate per zone (ratios of 8-turbine default)
    ZONE_SPLITS = {
        CATEGORY_ROOFTOP:  0.40,   # 40 % → rooftop (highest energy)
        CATEGORY_ELEVATED: 0.30,   # 30 % → mid-level
        CATEGORY_GROUND:   0.30,   # 30 % → ground floor
    }

    def __init__(self, grid_size: int = 100, min_distance: float = 350.0):
        """
        Args:
            grid_size:    Size of the placement grid (cells).
            min_distance: Minimum centre-to-centre distance in metres.
                          350 m → 35-cell exclusion on a 10 m/cell grid.
        """
        self.grid_size = grid_size
        self.min_distance = min_distance

    # ── public helpers ────────────────────────────────────────────────────────

    def calculate_wind_power_map(
        self,
        wind_speed_field: np.ndarray,
        terrain: np.ndarray,
        wind_direction_field: np.ndarray = None,
        scale_meters_per_grid: float = 10.0,
    ) -> np.ndarray:
        """Calculate potential power (∝ v³) adjusted for terrain and direction."""
        power_map = wind_speed_field ** 3

        # Terrain height bonus: elevated sites capture faster, less-turbulent wind
        terrain_norm = (terrain - np.min(terrain)) / (
            np.max(terrain) - np.min(terrain) + 1e-9
        )
        terrain_factor = 1.0 + terrain_norm          # 1 at ground, up to 2 at peak
        power_map = power_map * terrain_factor

        # Directional exposure bonus
        if wind_direction_field is not None:
            grad_y, grad_x = np.gradient(terrain)
            terrain_orientation = (
                np.degrees(np.arctan2(grad_y, grad_x)) + 360.0
            ) % 360.0
            diff_rad = np.radians(wind_direction_field - terrain_orientation)
            directional_factor = np.clip(1.0 + 0.25 * np.cos(diff_rad), 0.6, 1.4)
            power_map = power_map * directional_factor

        return power_map

    def find_optimal_locations(
        self,
        power_map: np.ndarray,
        num_turbines: int = 8,
        terrain: np.ndarray = None,
    ) -> List[Tuple[int, int]]:
        """
        Find optimal locations using zone-aware greedy search.

        If terrain is supplied the grid is split into ROOFTOP / ELEVATED /
        GROUND_FLOOR zones and turbines are distributed across all three.
        Falls back to simple greedy if terrain=None.
        """
        if terrain is None:
            return self._greedy(power_map, num_turbines, existing=[])

        return self._zone_aware(power_map, terrain, num_turbines)

    def classify_location(self, x: int, y: int, terrain: np.ndarray) -> Dict:
        """Return category metadata for a single grid position."""
        elev = float(terrain[int(y), int(x)])
        t_min, t_max = float(np.min(terrain)), float(np.max(terrain))
        elev_pct = (elev - t_min) / (t_max - t_min + 1e-9)
        category = _classify(elev_pct)
        return {
            "placement_category": category,
            "elevation_m":        round(elev, 2),
            "elevation_pct":      round(elev_pct, 3),
        }

    def evaluate_placement(
        self,
        locations: List[Tuple[int, int]],
        power_values: List[float],
    ) -> Dict:
        total_power = sum(power_values)
        avg_power   = total_power / len(power_values) if power_values else 0

        if len(locations) > 1:
            min_spacing = min(
                np.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
                for i, (x1, y1) in enumerate(locations)
                for x2, y2 in locations[i + 1:]
            )
        else:
            min_spacing = 0.0

        return {
            "total_power":      float(total_power),
            "average_power":    float(avg_power),
            "turbine_count":    len(locations),
            "min_spacing":      float(min_spacing),
            "power_per_turbine": float(total_power / len(locations)) if locations else 0,
        }

    # ── private helpers ───────────────────────────────────────────────────────

    def _min_cells(self) -> int:
        return max(1, int(self.min_distance / 10.0))

    def _exclude(self, working: np.ndarray, x: int, y: int, radius: int):
        """Zero out cells within `radius` of (x, y)."""
        y0 = max(0, y - radius);  y1 = min(working.shape[0], y + radius)
        x0 = max(0, x - radius);  x1 = min(working.shape[1], x + radius)
        working[y0:y1, x0:x1] = 0

    def _greedy(
        self,
        power_map: np.ndarray,
        n: int,
        existing: List[Tuple[int, int]],
    ) -> List[Tuple[int, int]]:
        """Standard greedy best-first with spacing enforcement."""
        radius = self._min_cells()
        working = power_map.copy()

        # Exclude around already-placed turbines
        for (ex, ey) in existing:
            self._exclude(working, ex, ey, radius)

        locs = []
        for _ in range(n):
            if working.max() == 0:
                break
            y, x = np.unravel_index(np.argmax(working), working.shape)
            locs.append((int(x), int(y)))
            self._exclude(working, x, y, radius)

        return locs

    def _zone_aware(
        self,
        power_map: np.ndarray,
        terrain: np.ndarray,
        num_turbines: int,
    ) -> List[Tuple[int, int]]:
        """
        Split grid into three elevation zones, allocate turbines proportionally,
        then run independent greedy search in each zone.
        """
        t_min = float(np.min(terrain))
        t_max = float(np.max(terrain))
        elev_norm = (terrain - t_min) / (t_max - t_min + 1e-9)  # 0–1

        # Zone masks
        roof_mask   = elev_norm >= 0.60
        elev_mask   = (elev_norm >= 0.30) & (elev_norm < 0.60)
        ground_mask = elev_norm <  0.30

        # Allocate turbine counts per zone (round-robin remainder distribution)
        counts = {
            CATEGORY_ROOFTOP:  max(1, round(num_turbines * self.ZONE_SPLITS[CATEGORY_ROOFTOP])),
            CATEGORY_ELEVATED: max(1, round(num_turbines * self.ZONE_SPLITS[CATEGORY_ELEVATED])),
            CATEGORY_GROUND:   max(1, round(num_turbines * self.ZONE_SPLITS[CATEGORY_GROUND])),
        }
        # Correct rounding errors
        while sum(counts.values()) > num_turbines:
            counts[CATEGORY_ELEVATED] -= 1
        while sum(counts.values()) < num_turbines:
            counts[CATEGORY_ROOFTOP] += 1

        all_locs: List[Tuple[int, int]] = []
        radius = self._min_cells()

        for mask, cat, n in [
            (roof_mask,   CATEGORY_ROOFTOP,  counts[CATEGORY_ROOFTOP]),
            (elev_mask,   CATEGORY_ELEVATED, counts[CATEGORY_ELEVATED]),
            (ground_mask, CATEGORY_GROUND,   counts[CATEGORY_GROUND]),
        ]:
            if n <= 0:
                continue
            # Restrict power map to this zone only
            zone_map = np.where(mask, power_map, 0.0)

            # Also apply exclusion from already-placed turbines (cross-zone spacing)
            working = zone_map.copy()
            for (px, py) in all_locs:
                self._exclude(working, px, py, radius)

            locs = self._greedy(working, n, existing=[])
            all_locs.extend(locs)

        return all_locs
