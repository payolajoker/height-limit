import urllib.parse
import urllib.request
import json
import ssl

# Ignore SSL certificate errors just in case
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

VWORLD_API_KEY = "9036E358-E38F-3C6F-9537-B03786AA1172"
VWORLD_DOMAIN = "localhost"
WFS_URL = "https://api.vworld.kr/req/wfs"
LAYER_NAME = "lt_c_ais_flight_safety_zone"

# BBOX for Seoul Center
# Try Lon,Lat order: 126.97,37.56,126.98,37.57
bbox = "126.97,37.56,126.98,37.57,EPSG:4326"

params = {
    "SERVICE": "WFS",
    "REQUEST": "GetFeature",
    "TYPENAME": LAYER_NAME,
    "BBOX": bbox,
    "VERSION": "1.1.0",
    "MAXFEATURES": "10",
    "SRSNAME": "EPSG:4326",
    "OUTPUT": "application/json",
    "KEY": VWORLD_API_KEY,
    "DOMAIN": VWORLD_DOMAIN
}

domains_to_test = ["payolajoker.github.io"] 
# 'WEB' is sometimes used or blank?

for dom in domains_to_test:
    print(f"\n--- Testing DOMAIN={dom} ---")
    params['DOMAIN'] = dom
    url = f"{WFS_URL}?{urllib.parse.urlencode(params)}"
    
    req = urllib.request.Request(url)
    req.add_header('Referer', f'https://{dom}')
    
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=5) as response:
            print(f"Status Code: {response.getcode()}")
            content = response.read().decode('utf-8')
            # Check for error XML
            if "ServiceException" in content:
                print("Error Response:", content.strip())
            else:
                print("Success! Response start:", content[:200])
                break # Found a working one
    except Exception as e:
        print(f"Request Failed: {e}")
