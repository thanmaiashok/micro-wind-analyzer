"""FastAPI main application for wind simulator backend."""

from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import numpy as np
from datetime import datetime
import sys
import os

# Add backend to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.schemas import (
    SimulationParams, SimulationStartRequest, SimulationStatus,
    WindFieldResponse, TerrainResponse, OptimizationResult,
    HealthCheckResponse, TurbineLocation
)
from services.engine import SimulationEngine
from state.runtime import RuntimeState
from simulation.physics import TurbinePhysics


# Global simulation state
simulation_engine: SimulationEngine = None
runtime_state: RuntimeState = None
simulation_task: asyncio.Task = None


async def simulation_loop():
    """Background simulation loop."""
    global simulation_engine, runtime_state
    
    while runtime_state.is_running:
        if not runtime_state.is_paused:
            simulation_engine.update_step(delta_time=0.1)
            runtime_state.update_time(0.1)
        
        await asyncio.sleep(0.016)  # ~60 FPS


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global simulation_engine, runtime_state
    
    # Initialize on startup
    simulation_engine = SimulationEngine()
    runtime_state = RuntimeState()
    
    print("Wind Simulator Backend Started")
    yield
    
    # Cleanup on shutdown
    if runtime_state:
        runtime_state.stop()
    print("Wind Simulator Backend Shutdown")


# Create FastAPI app
app = FastAPI(
    title="Wind Simulator API",
    description="API for wind turbine simulation and optimization",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Health & Status Endpoints
# ============================================================================

@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Health check endpoint."""
    return HealthCheckResponse(status="healthy", version="1.0.0")


@app.get("/status", response_model=SimulationStatus)
async def get_status():
    """Get current simulation status."""
    status = runtime_state.get_status()
    return SimulationStatus(
        is_running=status["is_running"],
        current_time=status["current_time"],
        total_power=simulation_engine.total_power,
        turbine_count=len(simulation_engine.turbine_locations),
        timestamp=datetime.now().isoformat()
    )


# ============================================================================
# Simulation Control Endpoints
# ============================================================================

@app.post("/simulation/start")
async def start_simulation(request: SimulationStartRequest):
    """Start a new simulation."""
    global simulation_task
    
    params = request.params
    
    # Initialize engine with parameters
    simulation_engine.initialize(grid_size=params.grid_size)
    
    # Configure physics
    simulation_engine.physics = __import__(
        'simulation.physics', fromlist=['TurbinePhysics']
    ).TurbinePhysics(rotor_diameter=params.rotor_diameter)

    # Regenerate wind field based on selected runtime parameters
    simulation_engine.wind_speed, simulation_engine.wind_direction = simulation_engine.wind_gen.generate_wind_field(
        base_speed=params.base_wind_speed,
        turbulence=params.turbulence,
        base_direction=params.base_wind_direction,
        direction_variability=max(8.0, params.turbulence * 90.0)
    )
    simulation_engine.base_wind_speed_field = simulation_engine.wind_speed.copy()
    
    # Start simulation
    simulation_engine.start_simulation(num_turbines=params.num_turbines)
    runtime_state.start()
    
    # Start background simulation task if not already running
    if simulation_task is None or simulation_task.done():
        simulation_task = asyncio.create_task(simulation_loop())
    
    return {
        "message": "Simulation started",
        "params": params.model_dump(),
        "turbine_count": len(simulation_engine.turbine_locations)
    }


@app.post("/simulation/stop")
async def stop_simulation():
    """Stop the simulation."""
    simulation_engine.stop_simulation()
    runtime_state.stop()
    
    return {"message": "Simulation stopped"}


@app.post("/simulation/pause")
async def pause_simulation():
    """Pause the simulation."""
    runtime_state.pause()
    return {"message": "Simulation paused"}


@app.post("/simulation/resume")
async def resume_simulation():
    """Resume a paused simulation."""
    runtime_state.resume()
    return {"message": "Simulation resumed"}


@app.post("/simulation/reset")
async def reset_simulation():
    """Reset the simulation."""
    runtime_state.reset()
    simulation_engine.stop_simulation()
    simulation_engine.total_power = 0.0
    
    return {"message": "Simulation reset"}


# ============================================================================
# Data Endpoints
# ============================================================================

@app.get("/terrain", response_model=TerrainResponse)
async def get_terrain():
    """Get terrain data."""
    if simulation_engine.terrain is None:
        simulation_engine.initialize()
    
    terrain = simulation_engine.terrain
    
    return TerrainResponse(
        grid_size=simulation_engine.terrain_gen.grid_size,
        elevation=terrain.tolist(),
        min_elevation=float(np.min(terrain)),
        max_elevation=float(np.max(terrain))
    )


@app.get("/wind", response_model=WindFieldResponse)
async def get_wind():
    """Get wind field data."""
    if simulation_engine.wind_speed is None:
        simulation_engine.initialize()
    
    return WindFieldResponse(
        grid_size=simulation_engine.wind_gen.grid_size,
        wind_speed=simulation_engine.wind_speed.tolist(),
        wind_direction=simulation_engine.wind_direction.tolist(),
        time_step=int(runtime_state.current_time)
    )


@app.get("/wind/miss-zones")
async def get_wind_miss_zones(top_n: int = 12):
    """
    Return the top N high-potential wind spots that have NO turbine placed on them.
    These are the 'missed' zones — good wind but no harvesting.
    """
    if simulation_engine.wind_speed is None:
        simulation_engine.initialize()

    # Build power map (same physics as optimizer)
    power_map = simulation_engine.optimizer.calculate_wind_power_map(
        simulation_engine.wind_speed,
        simulation_engine.terrain,
        wind_direction_field=simulation_engine.wind_direction
    )

    # Mask out cells near existing turbines (20-cell exclusion radius)
    masked = power_map.copy()
    exclusion = 20
    for tx, ty in simulation_engine.turbine_locations:
        y_min = max(0, ty - exclusion)
        y_max = min(masked.shape[0], ty + exclusion)
        x_min = max(0, tx - exclusion)
        x_max = min(masked.shape[1], tx + exclusion)
        masked[y_min:y_max, x_min:x_max] = 0

    # Find top-N uncovered high-potential spots (greedy, spaced apart)
    miss_zones = []
    working = masked.copy()
    for _ in range(top_n):
        if working.max() == 0:
            break
        y, x = np.unravel_index(np.argmax(working), working.shape)
        wind_data = simulation_engine.wind_gen.get_wind_at_location(
            int(x), int(y), simulation_engine.wind_speed, simulation_engine.wind_direction
        )
        miss_zones.append({
            "x": int(x),
            "y": int(y),
            "wind_speed": float(wind_data["speed"]),
            "wind_direction": float(wind_data["direction"]),
            "power_potential": float(power_map[y, x]),
        })
        # Space out results (18-cell spacing so beacons spread across map)
        r = 18
        ym = max(0, y - r); yM = min(working.shape[0], y + r)
        xm = max(0, x - r); xM = min(working.shape[1], x + r)
        working[ym:yM, xm:xM] = 0

    # Normalise power_potential to 0-1 for easy colouring in the frontend
    if miss_zones:
        max_pot = max(z["power_potential"] for z in miss_zones)
        for z in miss_zones:
            z["intensity"] = round(z["power_potential"] / max_pot, 3) if max_pot > 0 else 0

    return {"miss_zones": miss_zones, "count": len(miss_zones)}


@app.get("/turbines")
async def get_turbines():
    """Get current turbine data and performance."""
    turbines = simulation_engine.get_turbine_data()
    
    return {
        "turbines": turbines,
        "total_power": simulation_engine.total_power,
        "average_power": simulation_engine.total_power / len(turbines) if turbines else 0,
        "turbine_count": len(turbines)
    }


@app.post("/optimize")
async def optimize_placement(params: SimulationParams):
    """
    Run turbine placement optimization.
    
    Returns optimal placement for given parameters.
    """
    if simulation_engine.terrain is None:
        simulation_engine.initialize(grid_size=params.grid_size)

    # Build optimization physics from current request (micro-turbine sizing).
    optimize_physics = TurbinePhysics(rotor_diameter=params.rotor_diameter)

    # Build an optimization-specific wind field that reflects current UI controls.
    opt_wind_speed, opt_wind_direction = simulation_engine.wind_gen.generate_wind_field(
        base_speed=params.base_wind_speed,
        turbulence=params.turbulence,
        base_direction=params.base_wind_direction,
        direction_variability=max(8.0, params.turbulence * 90.0)
    )
    
    # Calculate power map
    power_map = simulation_engine.optimizer.calculate_wind_power_map(
        opt_wind_speed,
        simulation_engine.terrain,
        wind_direction_field=opt_wind_direction
    )
    
    # Find optimal locations — zone-aware (ROOFTOP/ELEVATED/GROUND_FLOOR)
    locations = simulation_engine.optimizer.find_optimal_locations(
        power_map,
        num_turbines=params.num_turbines,
        terrain=simulation_engine.terrain
    )
    
    # Evaluate placement
    power_values = [
        optimize_physics.calculate_power(
            simulation_engine.wind_gen.get_wind_at_location(
                x, y, opt_wind_speed, opt_wind_direction
            )["speed"],
            cp=optimize_physics.get_turbine_efficiency(
                simulation_engine.wind_gen.get_wind_at_location(
                    x, y, opt_wind_speed, opt_wind_direction
                )["speed"]
            )
        )
        for x, y in locations
    ]
    
    evaluation = simulation_engine.optimizer.evaluate_placement(locations, power_values)
    
    # Build response with zone category per turbine
    turbine_locs = []
    for (x, y), power in zip(locations, power_values):
        wind_data = simulation_engine.wind_gen.get_wind_at_location(
            x, y, opt_wind_speed, opt_wind_direction
        )
        cat = simulation_engine.optimizer.classify_location(
            x, y, simulation_engine.terrain
        )
        turbine_locs.append(TurbineLocation(
            x=x, y=y,
            power_output=power,
            wind_speed=wind_data["speed"],
            wind_direction=wind_data["direction"],
            placement_category=cat["placement_category"],
            elevation_m=cat["elevation_m"],
            elevation_pct=cat["elevation_pct"],
        ))

    return OptimizationResult(
        turbines=turbine_locs,
        total_power=evaluation["total_power"],
        average_power=evaluation["average_power"],
        efficiency=evaluation["power_per_turbine"] / 1000.0  # Normalized
    )


# ============================================================================
# WebSocket Endpoint (for real-time updates)
# ============================================================================

@app.websocket("/ws/simulation")
async def websocket_simulation(websocket: WebSocket):
    """WebSocket endpoint for real-time simulation updates."""
    await websocket.accept()
    
    try:
        while True:
            # Send status update every 100ms
            status = runtime_state.get_status()
            
            await websocket.send_json({
                "type": "status",
                "data": {
                    "current_time": status["current_time"],
                    "is_running": status["is_running"],
                    "total_power": simulation_engine.total_power,
                    "turbine_count": len(simulation_engine.turbine_locations)
                }
            })
            
            await asyncio.sleep(0.1)
    
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await websocket.close()


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )
