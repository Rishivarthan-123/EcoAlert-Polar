import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app

async def test_all():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        print("--- 1. Health Checks ---")
        res = await client.get("/")
        assert res.status_code == 200, f"Root failed: {res.text}"
        assert "<!DOCTYPE html>" in res.text or "<html" in res.text.lower()
        print("Root GET / -> HTML Index Served (200 OK)")

        res = await client.get("/health")
        assert res.status_code == 200
        print("Health GET /health ->", res.json())

        print("\n--- 2. Station Telemetry ---")
        res = await client.get("/api/station/state")
        assert res.status_code == 200, res.text
        station_state = res.json()["station"]
        print("Station State -> connected:", station_state["telemetry"]["connected"])

        res = await client.get("/api/station/energy")
        assert res.status_code == 200, res.text
        energy_snapshot = res.json()["energy"]
        print("Energy Snapshot -> Demand:", energy_snapshot["currentDemand"], "kW, Renewable:", energy_snapshot["renewableGeneration"], "kW")

        # Test POST /api/station/telemetry
        update_payload = {
            "data": {
                "environment": {
                    "temperature": -22.5,
                    "windSpeed": 11.4
                },
                "energy": {
                    "currentDemand": 94.0
                }
            }
        }
        res = await client.post("/api/station/telemetry", json=update_payload)
        assert res.status_code == 200, res.text
        print("Telemetry Update ->", res.json()["message"])

        # Re-verify GET state has updated temperature
        res = await client.get("/api/station/state")
        assert res.json()["station"]["environment"]["temperature"] == -22.5
        print("Verified state updated temperature to -22.5 C")

        print("\n--- 3. AI Predictions ---")
        res = await client.post("/api/predictions/demand", json=energy_snapshot)
        assert res.status_code == 200, res.text
        print("Demand Prediction (XGBoost) ->", res.json())

        res = await client.post("/api/predictions/renewable", json=energy_snapshot)
        assert res.status_code == 200, res.text
        print("Renewable Prediction (XGBoost) ->", res.json())

        res = await client.post("/api/predictions/anomaly", json=energy_snapshot)
        assert res.status_code == 200, res.text
        print("Anomaly Detection (Isolation Forest) ->", res.json())

        res = await client.post("/api/predictions/analyze", json=energy_snapshot)
        assert res.status_code == 200, res.text
        print("Complete AI Analysis -> riskLevel:", res.json()["riskLevel"])

        res = await client.post("/api/predictions/forecast", json=energy_snapshot)
        assert res.status_code == 200, res.text
        print("Forecast Series (6 Hours) -> hours:", res.json()["forecast"]["hours"])

        print("\n--- 4. Crisis & Risk Engine ---")
        res = await client.post("/api/risk/analyze", json=energy_snapshot)
        assert res.status_code == 200, res.text
        risk_res = res.json()["risk"]
        print("Risk Level:", risk_res["riskLevel"], "| Score:", risk_res["riskScore"])
        print("Risk Reasons:", risk_res["reasons"])

        print("\n--- 5. Load Management ---")
        load_payload = {
            "lifeSupportLoadKw": 8.0,
            "communicationLoadKw": 5.0,
            "laboratoryLoadKw": 25.0,
            "heatingLoadKw": 35.0,
            "lightingLoadKw": 12.0,
            "auxiliaryLoadKw": 10.0,
            "availablePowerKw": 25.0
        }
        res = await client.post("/api/loads/analyze", json=load_payload)
        assert res.status_code == 200, res.text
        print("Load Management Mode ->", res.json()["loadManagement"]["operatingMode"])

        print("\n--- 6. Digital Twin Simulation ---")
        dt_payload = {
            "windGeneration": 15.0,
            "solarGeneration": 0.0,
            "generatorOutputKw": 0.0,
            "generatorCapacityKw": 150.0,
            "heatingLoadKw": 35.0,
            "laboratoryLoadKw": 25.0,
            "lightingLoadKw": 12.0,
            "auxiliaryLoadKw": 10.0,
            "lifeSupportLoadKw": 8.0,
            "communicationLoadKw": 5.0,
            "batterySoc": 35.0,
            "batteryAvailableKwh": 175.0,
            "batteryChargeRateKw": 0.0,
            "batteryDischargeRateKw": 65.0
        }
        res = await client.post("/api/digital-twin/simulate", json=dt_payload)
        assert res.status_code == 200, res.text
        print("Digital Twin Status ->", res.json()["digitalTwin"]["stationStatus"])

        print("\n--- 7. Safety Guardian & Operator Decision ---")
        safety_payload = {
            "riskLevel": "critical",
            "action": "reduce_load",
            "currentDemandKw": 90.0,
            "availablePowerKw": 25.0,
            "batterySoc": 35.0,
            "batteryHealth": 96.0,
            "fuelReservePercent": 82.0,
            "generatorCapacityKw": 150.0,
            "requestedPowerKw": 16.0
        }
        res = await client.post("/api/safety/evaluate", json=safety_payload)
        assert res.status_code == 200, res.text
        safety_res = res.json()["safety"]
        print("Safety Guardian Evaluation -> status:", safety_res["safetyStatus"], "| approvalRequired:", safety_res["approvalRequired"])

        approval_payload = {
            "safety": safety_res,
            "decision": "approve",
            "operatorName": "Cmdr. Elena Vance",
            "notes": "Approved reduction of non-critical auxiliary lighting load."
        }
        res = await client.post("/api/safety/approve", json=approval_payload)
        assert res.status_code == 200, res.text
        print("Operator Approval Result ->", res.json()["approval"]["decisionStatus"])

        print("\n--- 8. History & Blackbox Logs ---")
        res = await client.get("/api/history/logs")
        assert res.status_code == 200, res.text
        logs = res.json()["logs"]
        print(f"Retrieved {len(logs)} log entries from backend blackbox.")

        print("\n==========================================")
        print("ALL API & ML MODEL TESTS PASSED CLEANLY!")
        print("==========================================")

if __name__ == "__main__":
    asyncio.run(test_all())
