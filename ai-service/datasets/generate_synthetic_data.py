"""
datasets/generate_synthetic_data.py
Generates synthetic session data for training the no-show prediction model.
Uses Python's standard library (random, math, csv) so it runs instantly without dependencies.
"""

import random
import math
import csv
from pathlib import Path

random.seed(42)
N = 2000

OUTPUT_PATH = Path(__file__).parent / "synthetic_sessions.csv"


def sigmoid(x):
    return 1 / (1 + math.exp(-max(-50, min(50, x))))


def generate():
    records = []
    no_show_count = 0

    for _ in range(N):
        day_of_week = random.randint(0, 6)
        hour_of_day = random.choice(list(range(8, 21)))
        booking_lead = min(30.0, max(0.0, random.expovariate(1.0 / 5.0)))
        total_sessions = random.randint(0, 50)

        if total_sessions == 0:
            no_show_history_rate = random.betavariate(2, 5)
            days_since_last = ""
        else:
            no_show_history_rate = random.betavariate(1.5, 6)
            days_since_last = round(min(90.0, random.expovariate(1.0 / 14.0)), 1)

        is_video = 1 if random.random() < 0.7 else 0

        # Compute ground-truth no-show probability
        logit = -1.5
        if day_of_week in [0, 4]:  # Mon/Fri higher risk
            logit += 0.15
        logit += 0.05 * (booking_lead - 5.0) / 5.0
        logit += 3.0 * no_show_history_rate
        logit -= 0.02 * min(total_sessions, 20)
        if days_since_last != "" and float(days_since_last) > 30:
            logit += 0.10
        if is_video:
            logit -= 0.20

        prob = sigmoid(logit)
        no_show = 1 if random.random() < prob else 0
        if no_show == 1:
            no_show_count += 1

        records.append({
            "day_of_week": day_of_week,
            "hour_of_day": hour_of_day,
            "booking_lead_days": round(booking_lead, 2),
            "client_historical_no_show_rate": round(no_show_history_rate, 4),
            "client_total_sessions": total_sessions,
            "days_since_last_session": days_since_last,
            "is_video": is_video,
            "no_show": no_show,
        })

    # Write CSV
    with open(OUTPUT_PATH, mode="w", newline="", encoding="utf-8") as f:
        fieldnames = [
            "day_of_week",
            "hour_of_day",
            "booking_lead_days",
            "client_historical_no_show_rate",
            "client_total_sessions",
            "days_since_last_session",
            "is_video",
            "no_show",
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    rate = (no_show_count / N) * 100
    print(f"[OK] Generated {N} synthetic records -> {OUTPUT_PATH}")
    print(f"     No-show rate: {rate:.2f}%")
    print("NOTE: This is SYNTHETIC DATA only. Not real patient information.")


if __name__ == "__main__":
    generate()
