// Weight unit conversion utilities

const KG_TO_LBS = 2.20462;
const LBS_TO_KG = 0.453592;

export function convertWeight(
    weight: number,
    from: "kg" | "lbs",
    to: "kg" | "lbs",
): number {
    if (from === to) return weight;

    if (from === "kg" && to === "lbs") {
        return Math.round(weight * KG_TO_LBS * 10) / 10; // Round to 1 decimal
    }

    if (from === "lbs" && to === "kg") {
        return Math.round(weight * LBS_TO_KG * 10) / 10; // Round to 1 decimal
    }

    return weight;
}

export function formatWeight(weight: number, unit: "kg" | "lbs"): string {
    return `${weight} ${unit}`;
}