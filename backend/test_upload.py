import requests

def test_upload():
    url = "http://127.0.0.1:8000/api/v1/compliance/documents/upload"
    files = {"file": ("test.txt", "This is a test document for compliance grounding.")}
    data = {"company_id": "test_company_id"}
    
    try:
        response = requests.post(url, files=files, data=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_upload()
