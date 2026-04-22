from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Tuple
from drone_delivery_solver import DroneInstance, DroneRoutingSolver

app = FastAPI()

# Autoriser les appels depuis le front local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class MissionRequest(BaseModel):
    depot: Tuple[float, float, float]
    clients: List[Tuple[float, float, float]]
    demands: List[int]
    notam_zones: List[List[Tuple[float, float]]]
    num_drones: int
    battery_capacity: int
    max_load: int

@app.post("/solve")
async def solve_mission(req: MissionRequest):
    # Conversion vers la dataclass du solveur
    instance = DroneInstance(
        depot=req.depot,
        clients=req.clients,
        demands=req.demands,
        notam_zones=req.notam_zones,
        num_drones=req.num_drones,
        battery_capacity=req.battery_capacity,
        max_load=req.max_load
    )
    
    solver = DroneRoutingSolver(instance)
    routes = solver.solve()
    
    return {
        "status": "success" if routes else "failed",
        "routes": routes,
        "depot": req.depot,
        "clients": req.clients,
        "zones": req.notam_zones
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
