try:
    import app.routers.api
    print("API SYNTAX OK")
except Exception as e:
    import traceback
    traceback.print_exc()
