import models
import auth


def run_seed():
    """Run seed on startup - create demo user if not exists."""
    db = next(models.get_db())
    try:
        demo_user = db.query(models.User).filter(models.User.email == "demo@kaaj.io").first()
        if not demo_user:
            demo_user = models.User(
                email="demo@kaaj.io",
                hashed_password=auth.get_password_hash("demo123"),
                name="Demo User",
                role="broker"
            )
            db.add(demo_user)
            db.commit()
            print("Seed: Demo user created", flush=True)
        else:
            print("Seed: Demo user already exists", flush=True)
    finally:
        db.close()
