"""Test that seed package exports all functions correctly."""



def test_seed_package_imports():
    """Test that all seed functions can be imported from app.seed package."""
    from app.seed import (
        seed_build_activities,
        seed_feed_events,
        seed_projects,
        seed_skills,
        seed_tribes,
        seed_users,
    )

    # Verify all functions are callable
    assert callable(seed_skills)
    assert callable(seed_users)
    assert callable(seed_projects)
    assert callable(seed_tribes)
    assert callable(seed_feed_events)
    assert callable(seed_build_activities)


def test_seed_package_all_list():
    """Test that __all__ is defined and contains all seed functions."""
    import app.seed

    assert hasattr(app.seed, "__all__")
    assert isinstance(app.seed.__all__, list)

    # Verify all expected functions are in __all__
    expected_functions = [
        "seed_skills",
        "seed_users",
        "seed_projects",
        "seed_tribes",
        "seed_feed_events",
        "seed_build_activities",
    ]
    assert set(app.seed.__all__) == set(expected_functions)


def test_seed_functions_are_actual_functions():
    """Test that imported seed functions are the actual implementations."""
    from app.seed import (
        seed_build_activities,
        seed_feed_events,
        seed_projects,
        seed_skills,
        seed_tribes,
        seed_users,
    )
    from app.seed.build_activities import seed_build_activities as actual_seed_build_activities
    from app.seed.feed_events import seed_feed_events as actual_seed_feed_events
    from app.seed.projects import seed_projects as actual_seed_projects
    from app.seed.skills import seed_skills as actual_seed_skills
    from app.seed.tribes import seed_tribes as actual_seed_tribes
    from app.seed.users import seed_users as actual_seed_users

    # Verify imports point to the actual implementations
    assert seed_skills is actual_seed_skills
    assert seed_users is actual_seed_users
    assert seed_projects is actual_seed_projects
    assert seed_tribes is actual_seed_tribes
    assert seed_feed_events is actual_seed_feed_events
    assert seed_build_activities is actual_seed_build_activities
