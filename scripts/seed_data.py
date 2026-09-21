"""
Convenience script to seed a demo account with a few categories, topics,
knowledge items, and recall questions so you have something to click
around immediately after first boot.

Usage (with the backend running on localhost:8000):
    python scripts/seed_data.py
"""
import requests

BASE = "http://localhost:8000/api/v1"
EMAIL = "naga@recall.com"
PASSWORD = "naga123"


def main():
    requests.post(f"{BASE}/auth/register", json={"email": EMAIL, "password": PASSWORD, "display_name": "Demo"})
    token = requests.post(f"{BASE}/auth/login", json={"email": EMAIL, "password": PASSWORD}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    categories = requests.post(f"{BASE}/categories/seed-defaults", headers=headers).json()
    finance_id = next(c["id"] for c in categories if c["name"] == "Finance")

    topic = requests.post(f"{BASE}/topics", json={"category_id": finance_id, "name": "Investing"}, headers=headers).json()

    knowledge = requests.post(
        f"{BASE}/knowledge",
        json={
            "topic_id": topic["id"],
            "title": "Compound Interest",
            "description": "Interest calculated on the initial principal and also on the accumulated interest of previous periods.",
            "my_understanding": "Interest on interest — money grows faster the longer it compounds.",
            "example": "$1,000 at 5% annual compound interest becomes ~$1,628 after 10 years.",
            "tags": ["finance", "core-concept"],
        },
        headers=headers,
    ).json()

    requests.post(
        f"{BASE}/recall/questions",
        json={"knowledge_id": knowledge["id"], "question_text": "What is compound interest?"},
        headers=headers,
    )

    print(f"Seeded demo account: {EMAIL} / {PASSWORD}")
    print("Log in at http://localhost:5173 to see it.")


if __name__ == "__main__":
    main()
