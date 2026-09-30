<p align="center"><img src="docs/flow-3.svg" alt="Animated Wind Turbine Sim pipeline: Terrain → Wind → Physics → Optimize → Stream → Visualize" width="100%"/></p>

<p align="center"><sub>10-second tour: Terrain → Wind → Physics → Optimize → Stream → Visualize</sub></p>

<p align="center"><img src="docs/px3/intro.svg" width="100%" alt="An interactive web app for simulating and optimizing wind turbine placement using computational physics and optimization."/></p>

<p align="center"><img src="docs/px3/features.svg" width="100%" alt="Key features"/></p>

<a id="overview"></a>
<h2><img src="docs/px3/h2-overview.svg" width="100%" alt="Overview"/></h2>

<p align="center"><img src="docs/px3/t-01.svg" width="100%" alt="This project provides a comprehensive platform for: Simulation: Real-time wind turbine farm simulation with physics-based power calculations Visualization: 3D terrain mapping, wind flow visualization, and turbine placement Optimization: Intelligent turbine placement algorithms to maximize energy production Analysis: Performance metrics, power generation analysis, and efficiency tracking"/></p>

<a id="project-structure"></a>
<h2><img src="docs/px3/h2-project-structure.svg" width="100%" alt="Project Structure"/></h2>

<p align="center"><img src="docs/px3/c-01.svg" width="100%" alt="code: wind-simulator/ ├── backend/ # Python FastAPI backend │ ├── simulation/ # Physics simulation modules │ │ ├── wind.py # Wind field generation │ │ ├── terrain.py "/></p>

<a id="features"></a>
<h2><img src="docs/px3/h2-features.svg" width="100%" alt="Features"/></h2>

<a id="backend-features"></a>
<h3><img src="docs/px3/h3-backend-features.svg" width="100%" alt="Backend Features"/></h3>

<p align="center"><img src="docs/px3/t-02.svg" width="100%" alt="Wind Generation: Realistic wind speed and direction field generation with turbulence Terrain Mapping: Procedural terrain generation with elevation and slope calculations Physics Engine: Power output calculations using Betz limit theory Thrust force calculations Efficiency curves based on wind speed Energy production over time Optimization: Greedy algorithm for optimal turbine placement Real-time Simulation: Continuous simulation with configurable speed WebSocket Support: Real-time data streaming to frontend"/></p>

<a id="frontend-features"></a>
<h3><img src="docs/px3/h3-frontend-features.svg" width="100%" alt="Frontend Features"/></h3>

<p align="center"><img src="docs/px3/t-03.svg" width="100%" alt="Interactive Visualization: Terrain heatmap with elevation coloring Wind flow visualization with directional arrows Turbine placement markers Control Panel: Start/stop/pause/resume simulation Configure number of turbines and wind speed Real-time status updates Performance Dashboard: Total power generation output Per-turbine power analysis Wind speed statistics Performance charts using Recharts Responsive Design: Works on desktop and tablet devices"/></p>

<a id="technology-stack"></a>
<h2><img src="docs/px3/h2-technology-stack.svg" width="100%" alt="Technology Stack"/></h2>

<a id="backend"></a>
<h3><img src="docs/px3/h3-backend.svg" width="100%" alt="Backend"/></h3>

<p align="center"><img src="docs/px3/t-04.svg" width="100%" alt="Framework: FastAPI (Python) Server: Uvicorn Libraries: NumPy, SciPy, Pydantic Architecture: RESTful API with WebSocket support"/></p>

<a id="frontend"></a>
<h3><img src="docs/px3/h3-frontend.svg" width="100%" alt="Frontend"/></h3>

<p align="center"><img src="docs/px3/t-05.svg" width="100%" alt="Framework: React 18 Build Tool: Vite Visualization: Canvas 2D (Terrain &amp; Wind), Three.js ready Charts: Recharts HTTP Client: Axios"/></p>

<a id="quick-start"></a>
<h2><img src="docs/px3/h2-quick-start.svg" width="100%" alt="Quick Start"/></h2>

<p align="center"><img src="docs/px3/t-06.svg" width="100%" alt="Prerequisites: Python 3.8+, Node.js 16+"/></p>

<p align="center"><img src="docs/px3/c-02.svg" width="100%" alt="code: # 1. Clone and enter the repo git clone https://github.com/thanmaiashok/micro-wind-analyzer.git cd micro-wind-analyzer # 2. One-time setup (installs all deps) chmod +x setup.sh start.sh kill.sh ./setup.sh "/></p>

<p align="center"><img src="docs/px3/t-07.svg" width="100%" alt="Service | URL Frontend | http://localhost:5173 Backend | http://localhost:8000 API Docs | http://localhost:8000/docs"/></p>

<a id="getting-started-manual"></a>
<h2><img src="docs/px3/h2-getting-started-manual.svg" width="100%" alt="Getting Started (Manual)"/></h2>

<a id="prerequisites"></a>
<h3><img src="docs/px3/h3-prerequisites.svg" width="100%" alt="Prerequisites"/></h3>

<p align="center"><img src="docs/px3/t-08.svg" width="100%" alt="Python 3.8+ Node.js 16+ npm or yarn"/></p>

<a id="backend-setup"></a>
<h3><img src="docs/px3/h3-backend-setup.svg" width="100%" alt="Backend Setup"/></h3>

<p align="center"><img src="docs/px3/t-09.svg" width="100%" alt="Navigate to the backend directory:"/></p>

<p align="center"><img src="docs/px3/c-03.svg" width="100%" alt="code: cd backend "/></p>

<p align="center"><img src="docs/px3/t-10.svg" width="100%" alt="Create a Python virtual environment:"/></p>

<p align="center"><img src="docs/px3/c-04.svg" width="100%" alt="code: python3 -m venv ../.venv source ../.venv/bin/activate "/></p>

<p align="center"><img src="docs/px3/t-11.svg" width="100%" alt="Install dependencies:"/></p>

<p align="center"><img src="docs/px3/c-05.svg" width="100%" alt="code: pip install -r requirements.txt "/></p>

<p align="center"><img src="docs/px3/t-12.svg" width="100%" alt="Run the server:"/></p>

<p align="center"><img src="docs/px3/c-06.svg" width="100%" alt="code: python main.py "/></p>

<p align="center"><img src="docs/px3/t-13.svg" width="100%" alt="The API will be available at http://localhost:8000 API Documentation: http://localhost:8000/docs"/></p>

<a id="frontend-setup"></a>
<h3><img src="docs/px3/h3-frontend-setup.svg" width="100%" alt="Frontend Setup"/></h3>

<p align="center"><img src="docs/px3/t-14.svg" width="100%" alt="Navigate to the frontend directory:"/></p>

<p align="center"><img src="docs/px3/c-07.svg" width="100%" alt="code: cd frontend "/></p>

<p align="center"><img src="docs/px3/t-15.svg" width="100%" alt="Install dependencies:"/></p>

<p align="center"><img src="docs/px3/c-08.svg" width="100%" alt="code: npm install "/></p>

<p align="center"><img src="docs/px3/t-16.svg" width="100%" alt="Run the development server:"/></p>

<p align="center"><img src="docs/px3/c-09.svg" width="100%" alt="code: npm run dev "/></p>

<p align="center"><img src="docs/px3/t-17.svg" width="100%" alt="The application will be available at http://localhost:5173"/></p>

<a id="api-endpoints"></a>
<h2><img src="docs/px3/h2-api-endpoints.svg" width="100%" alt="API Endpoints"/></h2>

<a id="health--status"></a>
<h3><img src="docs/px3/h3-health-status.svg" width="100%" alt="Health &amp; Status"/></h3>

<p align="center"><img src="docs/px3/t-18.svg" width="100%" alt="GET /health - Health check GET /status - Current simulation status"/></p>

<a id="simulation-control"></a>
<h3><img src="docs/px3/h3-simulation-control.svg" width="100%" alt="Simulation Control"/></h3>

<p align="center"><img src="docs/px3/t-19.svg" width="100%" alt="POST /simulation/start - Start simulation with parameters POST /simulation/stop - Stop simulation POST /simulation/pause - Pause simulation POST /simulation/resume - Resume simulation POST /simulation/reset - Reset simulation"/></p>

<a id="data-retrieval"></a>
<h3><img src="docs/px3/h3-data-retrieval.svg" width="100%" alt="Data Retrieval"/></h3>

<p align="center"><img src="docs/px3/t-20.svg" width="100%" alt="GET /terrain - Get terrain elevation map GET /wind - Get wind field data GET /turbines - Get turbine data and performance POST /optimize - Run placement optimization"/></p>

<a id="websocket"></a>
<h3><img src="docs/px3/h3-websocket.svg" width="100%" alt="WebSocket"/></h3>

<p align="center"><img src="docs/px3/t-21.svg" width="100%" alt="WS /ws/simulation - Real-time simulation updates"/></p>

<a id="simulation-parameters"></a>
<h2><img src="docs/px3/h2-simulation-parameters.svg" width="100%" alt="Simulation Parameters"/></h2>

<p align="center"><img src="docs/px3/t-22.svg" width="100%" alt="Default parameters can be customized: grid_size: Size of simulation grid (default: 100) num_turbines: Number of turbines to place (default: 10) base_wind_speed: Starting wind speed in m/s (default: 10.0) turbulence: Turbulence factor 0-1 (default: 0.2) rotor_diameter: Turbine rotor diameter in meters (default: 80.0)"/></p>

<a id="physics-model"></a>
<h2><img src="docs/px3/h2-physics-model.svg" width="100%" alt="Physics Model"/></h2>

<p align="center"><img src="docs/px3/t-23.svg" width="100%" alt="The simulation uses the following physics models:"/></p>

<a id="power-calculation"></a>
<h3><img src="docs/px3/h3-power-calculation.svg" width="100%" alt="Power Calculation"/></h3>

<p align="center"><img src="docs/px3/t-24.svg" width="100%" alt="$$P = 0.5 \times \rho \times A \times v^3 \times C_p \times \eta$$ Where: = air density (1.225 kg/m) A = rotor swept area v = wind speed (m/s) Cp = power coefficient (&lt;= 0.593 Betz limit) = drivetrain efficiency"/></p>

<a id="thrust-force"></a>
<h3><img src="docs/px3/h3-thrust-force.svg" width="100%" alt="Thrust Force"/></h3>

<p align="center"><img src="docs/px3/t-25.svg" width="100%" alt="$$F = 0.5 \times \rho \times A \times v^2 \times C_t$$ Where Ct is the thrust coefficient."/></p>

<a id="usage-example"></a>
<h2><img src="docs/px3/h2-usage-example.svg" width="100%" alt="Usage Example"/></h2>

<p align="center"><img src="docs/px3/t-26.svg" width="100%" alt="Start the Application: Run both backend and frontend servers Open http://localhost:5173 in browser Configure Simulation: Set desired number of turbines (1-50) Adjust base wind speed (1-25 m/s) Run Simulation: Click &quot;Start Simulation&quot; Watch turbines being placed optimally Monitor power generation in real-time Analyze Results: View terrain and wind visualization Check individual turbine performance Review power output metrics"/></p>

<a id="performance-optimization"></a>
<h2><img src="docs/px3/h2-performance-optimization.svg" width="100%" alt="Performance Optimization"/></h2>

<p align="center"><img src="docs/px3/t-27.svg" width="100%" alt="Greedy placement algorithm: O(n x m) where n=turbines, m=grid cells Real-time updates at 60 FPS WebSocket for efficient data streaming Terrain/wind caching to reduce computation"/></p>

<a id="known-limitations"></a>
<h2><img src="docs/px3/h2-known-limitations.svg" width="100%" alt="Known Limitations"/></h2>

<p align="center"><img src="docs/px3/t-28.svg" width="100%" alt="2D visualization (canvas-based) - can be enhanced with Three.js Simplified wake effect modeling Single optimization algorithm (could add genetic algorithm option) Basic turbulence model"/></p>

<a id="future-enhancements"></a>
<h2><img src="docs/px3/h2-future-enhancements.svg" width="100%" alt="Future Enhancements"/></h2>

<p align="center"><img src="docs/px3/t-29.svg" width="100%" alt="[ ] Full 3D visualization with Three.js [ ] Advanced wake effect modeling [ ] Genetic algorithm optimization [ ] Historical data storage and replay [ ] Multiple wind farm scenarios [ ] Advanced terrain features (obstacles, forests) [ ] Real weather data integration [ ] Export results to PDF/CSV"/></p>

<a id="contributing"></a>
<h2><img src="docs/px3/h2-contributing.svg" width="100%" alt="Contributing"/></h2>

<p align="center"><img src="docs/px3/t-30.svg" width="100%" alt="This is an open-source project. Contributions are welcome! Please: Fork the repository Create a feature branch Commit your changes Push to the branch Create a Pull Request"/></p>

<a id="license"></a>
<h2><img src="docs/px3/h2-license.svg" width="100%" alt="License"/></h2>

<p align="center"><img src="docs/px3/t-31.svg" width="100%" alt="MIT License - Feel free to use this project for educational and commercial purposes."/></p>

<a id="contact"></a>
<h2><img src="docs/px3/h2-contact.svg" width="100%" alt="Contact"/></h2>

<p align="center"><img src="docs/px3/t-32.svg" width="100%" alt="For questions or suggestions, please open an issue on the repository. Built with for renewable energy enthusiasts"/></p>

<p align="center"><a href="https://github.com/thanmaiashok"><img src="docs/px3/footer.svg" width="100%" alt="Built by Thanmai A, founder of FoxynAI"/></a></p>
