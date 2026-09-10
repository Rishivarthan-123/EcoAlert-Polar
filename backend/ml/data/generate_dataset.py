from pathlib import Path

import numpy as np
import pandas as pd


SEED = 42
NUMBER_OF_ROWS = 24 * 180

OUTPUT_FILE = (
    Path(__file__).resolve().parent / "ecoalert_training_data.csv"
)


def generate_dataset() -> pd.DataFrame:
    rng = np.random.default_rng(SEED)

    timestamps = pd.date_range(
        start="2026-01-01 00:00:00",
        periods=NUMBER_OF_ROWS,
        freq="h",
        tz="UTC",
    )

    df = pd.DataFrame(
        {
            "timestamp": timestamps,
        }
    )

    # -----------------------------------------------------
    # Time
    # -----------------------------------------------------

    df["hour"] = df["timestamp"].dt.hour.astype(int)
    df["day_of_week"] = df["timestamp"].dt.dayofweek.astype(int)
    df["month"] = df["timestamp"].dt.month.astype(int)
    df["season"] = "WINTER"

    row_number = np.arange(NUMBER_OF_ROWS)

    # -----------------------------------------------------
    # Environment
    # -----------------------------------------------------

    daily_temperature = (
        -22.0
        + 5.0
        * np.sin(
            2.0 * np.pi * (df["hour"].to_numpy() - 14.0) / 24.0
        )
    )

    slow_temperature_variation = (
        4.0
        * np.sin(
            2.0 * np.pi * row_number / (24.0 * 14.0)
        )
    )

    temperature = (
        daily_temperature
        + slow_temperature_variation
        + rng.normal(0.0, 1.5, NUMBER_OF_ROWS)
    )

    df["temperature"] = temperature.astype(float)

    wind_speed = np.clip(
        6.5
        + 3.0
        * np.sin(
            2.0 * np.pi * row_number / (24.0 * 5.0)
        )
        + rng.normal(0.0, 1.5, NUMBER_OF_ROWS),
        0.5,
        18.0,
    )

    df["windSpeed"] = wind_speed.astype(float)

    df["feelsLike"] = (
        df["temperature"].to_numpy()
        - 0.8 * df["windSpeed"].to_numpy()
    ).astype(float)

    solar_radiation = np.where(
        (df["hour"].to_numpy() >= 10)
        & (df["hour"].to_numpy() <= 14),
        rng.uniform(0.0, 3.0, NUMBER_OF_ROWS),
        0.0,
    )

    df["solarRadiation"] = solar_radiation.astype(float)

    # -----------------------------------------------------
    # Occupancy and activity
    # -----------------------------------------------------

    daytime = (
        (df["hour"].to_numpy() >= 7)
        & (df["hour"].to_numpy() <= 21)
    )

    occupancy = np.where(
        daytime,
        rng.integers(10, 21, NUMBER_OF_ROWS),
        rng.integers(4, 13, NUMBER_OF_ROWS),
    )

    df["occupancy"] = np.clip(
        occupancy,
        1,
        40,
    ).astype(int)

    df["activityLevel"] = np.select(
        [
            df["occupancy"].to_numpy() >= 17,
            df["occupancy"].to_numpy() >= 10,
        ],
        [
            "HIGH",
            "MEDIUM",
        ],
        default="LOW",
    )

    research_activity = np.clip(
        (
            df["occupancy"].to_numpy().astype(float) / 40.0
            + np.where(daytime, 0.25, -0.10)
            + rng.normal(0.0, 0.08, NUMBER_OF_ROWS)
        ),
        0.0,
        1.0,
    )

    # -----------------------------------------------------
    # Heating
    # -----------------------------------------------------

    heating_demand = np.clip(
        18.0
        + (-df["temperature"].to_numpy() - 10.0) * 1.15
        + np.where(df["occupancy"].to_numpy() > 15, 4.0, 0.0)
        + rng.normal(0.0, 2.0, NUMBER_OF_ROWS),
        10.0,
        55.0,
    )

    # -----------------------------------------------------
    # Total station demand
    # -----------------------------------------------------

    base_load = (
        35.0
        + 0.65 * df["occupancy"].to_numpy()
        + 12.0 * research_activity
    )

    daily_activity = np.where(
        daytime,
        8.0,
        -2.0,
    )

    current_demand = np.clip(
        base_load
        + heating_demand
        + daily_activity
        + rng.normal(0.0, 3.0, NUMBER_OF_ROWS),
        40.0,
        150.0,
    )

    df["currentDemand"] = current_demand.astype(float)
    df["nominalDemand"] = 75.0

    # -----------------------------------------------------
    # Renewable generation
    # -----------------------------------------------------

    wind_generation = np.clip(
        2.8 * df["windSpeed"].to_numpy()
        + rng.normal(0.0, 1.5, NUMBER_OF_ROWS),
        0.0,
        45.0,
    )

    solar_generation = np.clip(
        df["solarRadiation"].to_numpy() * 0.02
        + rng.normal(0.0, 0.15, NUMBER_OF_ROWS),
        0.0,
        2.0,
    )

    df["windGeneration"] = wind_generation.astype(float)
    df["solarGeneration"] = solar_generation.astype(float)

    renewable_generation = (
        wind_generation + solar_generation
    )

    df["renewableGeneration"] = renewable_generation.astype(float)

    # -----------------------------------------------------
    # Battery
    # -----------------------------------------------------

    battery_capacity_kwh = 500.0

    battery_soc = np.zeros(NUMBER_OF_ROWS, dtype=float)
    battery_soc[0] = 70.0

    for i in range(1, NUMBER_OF_ROWS):
        previous_demand = float(current_demand[i - 1])
        previous_renewable = float(
            renewable_generation[i - 1]
        )

        net_demand = (
            previous_demand
            - previous_renewable
        )

        soc_change = (
            -net_demand
            / battery_capacity_kwh
            * 100.0
        )

        if net_demand < 0.0:
            soc_change = (
                abs(net_demand)
                / battery_capacity_kwh
                * 100.0
            )

        battery_soc[i] = np.clip(
            battery_soc[i - 1] + soc_change,
            10.0,
            100.0,
        )

    df["batterySoc"] = battery_soc

    df["batteryAvailableKwh"] = (
        battery_capacity_kwh
        * battery_soc
        / 100.0
    )

    df["batteryHealth"] = np.clip(
        98.0
        - row_number * 0.002
        + rng.normal(0.0, 0.2, NUMBER_OF_ROWS),
        90.0,
        100.0,
    )

    df["batteryChargeRateKw"] = np.maximum(
        renewable_generation - current_demand,
        0.0,
    )

    df["batteryDischargeRateKw"] = np.maximum(
        current_demand - renewable_generation,
        0.0,
    )

    # -----------------------------------------------------
    # Generator
    # -----------------------------------------------------

    generator_random = rng.random(NUMBER_OF_ROWS)

    df["generatorStatus"] = np.select(
        [
            generator_random < 0.03,
            generator_random < 0.06,
        ],
        [
            "MAINTENANCE",
            "OFFLINE",
        ],
        default="AVAILABLE",
    )

    generator_capacity = np.where(
        df["generatorStatus"].to_numpy() == "OFFLINE",
        0.0,
        150.0,
    )

    df["generatorCapacityKw"] = generator_capacity

    fuel_reserve = np.clip(
        90.0
        - row_number * 0.015
        + rng.normal(0.0, 1.5, NUMBER_OF_ROWS),
        20.0,
        95.0,
    )

    df["fuelReservePercent"] = fuel_reserve

    df["fuelDaysRemaining"] = (
        fuel_reserve / 4.43
    )

    # -----------------------------------------------------
    # Station energy balance
    # -----------------------------------------------------

    df["energyBalanceKw"] = (
        renewable_generation
        + generator_capacity
        - current_demand
    )

    # -----------------------------------------------------
    # Existing frontend loads
    # -----------------------------------------------------

    df["heatingLoadKw"] = np.clip(
        heating_demand,
        10.0,
        55.0,
    )

    df["laboratoryLoadKw"] = np.clip(
        25.0
        + 4.0 * research_activity
        + rng.normal(0.0, 1.5, NUMBER_OF_ROWS),
        20.0,
        30.0,
    )

    df["lightingLoadKw"] = np.where(
        daytime,
        8.0,
        12.0,
    )

    df["auxiliaryLoadKw"] = np.clip(
        10.0
        + rng.normal(0.0, 1.0, NUMBER_OF_ROWS),
        7.0,
        12.0,
    )

    df["lifeSupportLoadKw"] = np.clip(
        8.0
        + rng.normal(0.0, 0.5, NUMBER_OF_ROWS),
        7.0,
        9.0,
    )

    df["communicationLoadKw"] = np.clip(
        5.0
        + rng.normal(0.0, 0.4, NUMBER_OF_ROWS),
        4.0,
        6.0,
    )

    # -----------------------------------------------------
    # Data provenance
    # -----------------------------------------------------

    df["data_source"] = "synthetic_polar_station"

    return df


def main() -> None:
    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    df = generate_dataset()

    df.to_csv(
        OUTPUT_FILE,
        index=False,
    )

    print(
        "EcoAlert Polar dataset generated successfully."
    )
    print(f"Rows: {len(df):,}")
    print(f"Columns: {len(df.columns)}")
    print(f"Output: {OUTPUT_FILE}")
    print()
    print("Missing values:")

    missing_values = df.isna().sum()

    print(missing_values.to_string())

    print()
    print("Dataset preview:")
    print(df.head(5).to_string(index=False))


if __name__ == "__main__":
    main()