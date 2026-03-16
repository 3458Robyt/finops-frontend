import urllib.request
import os

urls = {
    "1_technical_console.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sX2M2NjBkZjYyZWFhMzRlNjI5MjBjZjRjYTZkNDI5N2E3EgsSBxCa6dPWzBgYAZIBIwoKcHJvamVjdF9pZBIVQhM5ODYwMDY1ODA3NjYzNDc2MDI4&filename=&opi=96797242",
    "2_resource_detail.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzBmY2QyOWVhZmY5ZTQ2ZDBhMzU2YWE0NzEzYWY3ODMzEgsSBxCa6dPWzBgYAZIBIwoKcHJvamVjdF9pZBIVQhM5ODYwMDY1ODA3NjYzNDc2MDI4&filename=&opi=96797242",
    "3_executive_dashboard.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzRiMTc2NzA2ZDhlYjQxYzA5MzExNDViYjM0YzY1MTA4EgsSBxCa6dPWzBgYAZIBIwoKcHJvamVjdF9pZBIVQhM5ODYwMDY1ODA3NjYzNDc2MDI4&filename=&opi=96797242",
    "4_history.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sX2M2MGQ3NmY1MjJmMDQ1ZWZhYzEzOWVlMjY0YzNhMmU2EgsSBxCa6dPWzBgYAZIBIwoKcHJvamVjdF9pZBIVQhM5ODYwMDY1ODA3NjYzNDc2MDI4&filename=&opi=96797242",
    "5_chat.html": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzEzNWZjMzNjMGU1ZTRhNzg4N2JlMDY4NTllOWYzMzU3EgsSBxCa6dPWzBgYAZIBIwoKcHJvamVjdF9pZBIVQhM5ODYwMDY1ODA3NjYzNDc2MDI4&filename=&opi=96797242"
}

out_dir = r"c:\Users\DAVID\OneDrive\Documentos\Antigravity\finops-app\stitch_screens"
os.makedirs(out_dir, exist_ok=True)

for name, url in urls.items():
    print(f"Downloading {name}...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        with open(os.path.join(out_dir, name), 'wb') as f:
            f.write(response.read())
print("Done")
