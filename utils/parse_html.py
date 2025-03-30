#!/usr/bin/env python3
import os
from bs4 import BeautifulSoup, Comment

def fix_local_link(val):
    if not val or val[:4] == "http":
        return val

    # Separate out any fragment.
    if "#" in val:
        main_part, fragment = val.split("#", 1)
        fragment = "#" + fragment
    else:
        main_part, fragment = val, ""
    
    # If the main part ends with '/', append "index.html"
    if main_part.endswith("/"):
        main_part = main_part + "index.html"
    else:
        # Allowed file extensions.
        allowed_exts = ("bib", "css", "jpeg", "jpg", "js", "mws", "pdf", "png", "html")
        if not main_part.lower().endswith(allowed_exts):
            main_part = main_part + ".html"
    return main_part + fragment

def process_html_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f, "html.parser")

    # For *.viz.html files, fix local links in "href" and "src" attributes.
    if filepath.endswith(".viz.html"):
        for tag in soup.find_all(True):
            for attr in ["href", "src"]:
                if tag.has_attr(attr):
                    val = tag[attr]
                    # If the attribute is empty, do nothing.
                    if not val:
                        continue
                    tag[attr] = fix_local_link(val)

    # Fix erroneous href/src links (as before).
    for tag in soup.find_all(True):
        for attr in ["href", "src"]:
            if tag.has_attr(attr):
                val = tag[attr]
                for ext in "bib css jpeg jpg js mws pdf png".split():
                    if val.endswith(f"{ext}.html"):
                        tag[attr] = val[:-5]

    # Remove tracking scripts.
    keywords = ["dap.digitalgov.gov", "gtag", "Universal-Federated-Analytics"]
    for script in soup.find_all("script"):
        if (
            script.get("id") == "_fed_an_ua_tag" or
            any(keyword in script.get("src", "") for keyword in keywords) or
            (script.string and "gtag" in script.string)
        ):
            script.decompose()

    # Remove comments containing "GOOGLE BOOTSTRAP".
    for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
        if "GOOGLE BOOTSTRAP" in comment:
            comment.extract()

    # Write back changes.
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(str(soup))

def process_directory(root_dir):
    for subdir, _, files in os.walk(root_dir):
        for filename in files:
            if filename.endswith(".html"):
                filepath = os.path.join(subdir, filename)
                print(f"Processing: {filepath}")
                process_html_file(filepath)

if __name__ == "__main__":
    root_directory = "."
    process_directory(root_directory)
