try:
    import app.services.agent_engine
    print("SYNTAX OK")
except Exception as e:
    import traceback
    traceback.print_exc()
