from pathlib import Path

import pandas as pd


DATASET_FILE = (
    Path(__file__).resolve().parent
    / "ecoalert_training_data.csv"
)


REQUIRED_COLUMNS = [
    "timestamp",
    "hour",
    "day_of_week",
    "month",
    "season",
    "temperature",
    "feelsLike",
    "windSpeed",
    "solarRadiation",
    "occupancy",
    "activityLevel",
    "currentDemand",
    "nominalDemand",
    "windGeneration",
    "solarGeneration",
    "renewableGeneration",
    "batterySoc",
    "batteryAvailableKwh",
    "batteryHealth",
    "batteryChargeRateKw",
    "batteryDischargeRateKw",
    "generatorStatus",
    "generatorCapacityKw",
    "fuelReservePercent",
    "fuelDaysRemaining",
    "energyBalanceKw",
    "heatingLoadKw",
    "laboratoryLoadKw",
    "lightingLoadKw",
    "auxiliaryLoadKw",
    "lifeSupportLoadKw",
    "communicationLoadKw",
    "data_source",
]


def check_columns(df: pd.DataFrame) -> bool:
    print("\n[1] COLUMN CHECK")

    missing = [
        column
        for column in REQUIRED_COLUMNS
        if column not in df.columns
    ]

    if missing:
        print("FAILED")
        print("Missing columns:")
        for column in missing:
            print(f"  - {column}")
        return False

    print("PASSED")
    print(f"Required columns: {len(REQUIRED_COLUMNS)}")

    return True


def check_missing_values(df: pd.DataFrame) -> bool:
    print("\n[2] MISSING VALUE CHECK")

    missing = df.isna().sum()
    total_missing = int(missing.sum())

    if total_missing > 0:
        print("FAILED")
        print(missing[missing > 0])
        return False

    print("PASSED")
    print("No missing values found.")

    return True


def check_duplicates(df: pd.DataFrame) -> bool:
    print("\n[3] DUPLICATE CHECK")

    duplicate_count = int(
        df["timestamp"].duplicated().sum()
    )

    if duplicate_count > 0:
        print("FAILED")
        print(
            f"Duplicate timestamps: {duplicate_count}"
        )
        return False

    print("PASSED")
    print("No duplicate timestamps.")

    return True


def check_ranges(df: pd.DataFrame) -> bool:
    print("\n[4] RANGE CHECK")

    checks = {
        "temperature": (-80, 10),
        "windSpeed": (0, 25),
        "solarRadiation": (0, 1500),
        "occupancy": (0, 40),
        "currentDemand": (0, 200),
        "renewableGeneration": (0, 100),
        "batterySoc": (0, 100),
        "batteryHealth": (0, 100),
        "fuelReservePercent": (0, 100),
    }

    passed = True

    for column, (minimum, maximum) in checks.items():
        actual_min = float(df[column].min())
        actual_max = float(df[column].max())

        valid = (
            actual_min >= minimum
            and actual_max <= maximum
        )

        status = "OK" if valid else "FAILED"

        print(
            f"{status:6} "
            f"{column:25} "
            f"min={actual_min:.2f} "
            f"max={actual_max:.2f}"
        )

        if not valid:
            passed = False

    return passed


def check_energy_relationships(
    df: pd.DataFrame,
) -> bool:
    print("\n[5] ENERGY RELATIONSHIP CHECK")

    expected_renewable = (
        df["windGeneration"]
        + df["solarGeneration"]
    )

    renewable_error = (
        expected_renewable
        - df["renewableGeneration"]
    ).abs().max()

    expected_balance = (
        df["renewableGeneration"]
        + df["generatorCapacityKw"]
        - df["currentDemand"]
    )

    balance_error = (
        expected_balance
        - df["energyBalanceKw"]
    ).abs().max()

    renewable_ok = renewable_error < 0.000001
    balance_ok = balance_error < 0.000001

    print(
        f"Renewable calculation: "
        f"{'OK' if renewable_ok else 'FAILED'}"
    )

    print(
        f"Energy balance calculation: "
        f"{'OK' if balance_ok else 'FAILED'}"
    )

    return renewable_ok and balance_ok


def check_generator_values(
    df: pd.DataFrame,
) -> bool:
    print("\n[6] GENERATOR CHECK")

    offline = (
        df["generatorStatus"] == "OFFLINE"
    )

    invalid_offline = (
        df.loc[offline, "generatorCapacityKw"] != 0
    ).sum()

    available = ~offline

    invalid_available = (
        df.loc[available, "generatorCapacityKw"] != 150
    ).sum()

    if invalid_offline or invalid_available:
        print("FAILED")
        print(
            f"Invalid OFFLINE records: {invalid_offline}"
        )
        print(
            f"Invalid AVAILABLE/MAINTENANCE records: "
            f"{invalid_available}"
        )
        return False

    print("PASSED")
    return True


def print_statistics(df: pd.DataFrame) -> None:
    print("\n[7] DATASET STATISTICS")

    numeric_columns = [
        "temperature",
        "windSpeed",
        "solarRadiation",
        "occupancy",
        "currentDemand",
        "renewableGeneration",
        "batterySoc",
        "batteryAvailableKwh",
        "generatorCapacityKw",
        "fuelReservePercent",
        "energyBalanceKw",
    ]

    print(
        df[numeric_columns]
        .describe()
        .round(2)
        .to_string()
    )


def main() -> None:
    print("=" * 60)
    print("ECOALERT POLAR DATASET VALIDATION")
    print("=" * 60)

    if not DATASET_FILE.exists():
        print("\nERROR:")
        print(f"Dataset not found: {DATASET_FILE}")
        return

    df = pd.read_csv(
        DATASET_FILE,
        parse_dates=["timestamp"],
    )

    print(f"\nDataset: {DATASET_FILE}")
    print(f"Rows: {len(df):,}")
    print(f"Columns: {len(df.columns)}")

    results = [
        check_columns(df),
        check_missing_values(df),
        check_duplicates(df),
        check_ranges(df),
        check_energy_relationships(df),
        check_generator_values(df),
    ]

    print_statistics(df)

    print("\n" + "=" * 60)

    if all(results):
        print("DATASET VALIDATION: PASSED")
        print("=" * 60)
        print(
            "\nThe dataset is ready for ML preprocessing."
        )
    else:
        print("DATASET VALIDATION: FAILED")
        print("=" * 60)
        print(
            "\nFix the failed checks before training."
        )


if __name__ == "__main__":
    main()