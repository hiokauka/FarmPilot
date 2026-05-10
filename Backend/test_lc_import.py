try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    print("IMPORT SUCCESSFUL")
except Exception as e:
    print(f"IMPORT FAILED: {e}")
