import os
import re
import glob

def extract_chapter_info(file_path):
    """Extract chapter title and table of contents from a markdown file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract the chapter title
    title_match = re.search(r'^# Chapter [0-9]+ (.*?)$', content, re.MULTILINE)
    if not title_match:
        return None, None
    
    chapter_title = title_match.group(1)
    
    # Extract the table of contents section
    toc_match = re.search(r'## Table of Contents\s+(.*?)(?=^#|\Z)', 
                         content, re.MULTILINE | re.DOTALL)
    if not toc_match:
        return chapter_title, None
    
    toc_content = toc_match.group(1).strip()
    
    return chapter_title, toc_content

def clean_toc_entry(entry, chapter_num):
    """Clean a table of contents entry."""
    # Remove the <a id="..."></a> tags
    entry = re.sub(r'<a id="[^"]*"></a>', '', entry)
    
    # Replace the link format
    entry = re.sub(r'\[(\d+\.\d+) - (.*?)\]\(./(\d+\.\d+)\.md\)', 
                  r'[\1 - \2](./\3.md)', entry)
    
    return entry

if __name__ == "__main__":
    base_dir = '..\\markdown'
    chapter_dirs = glob.glob(os.path.join(base_dir, '[0-9]*'))
    
    # Sort directories numerically
    chapter_dirs.sort(key=lambda x: int(os.path.basename(x)))
    
    full_toc = ["# Table of Contents (Full)\n"]
    simple_toc = ["# Table of Contents\n"]
    
    for chapter_dir in chapter_dirs:
        chapter_num = os.path.basename(chapter_dir)
        chapter_file = os.path.join(chapter_dir, f"{chapter_num}.md")
        
        if not os.path.exists(chapter_file):
            continue
        
        chapter_title, toc_content = extract_chapter_info(chapter_file)
        if not chapter_title:
            continue
        
        # Add to simple TOC
        simple_toc.append(f"- {chapter_num} - {chapter_title}")
        
        # Process full TOC
        chapter_line = f"- {chapter_num} - {chapter_title}"
        full_toc.append(chapter_line)
        
        if toc_content:
            # Clean and process each line of the TOC
            lines = toc_content.split('\n')
            for line in lines:
                if line.strip():
                    # If it's a main section (contains **) indent by 2 spaces
                    if '**' in line:
                        # Remove the PT anchor and keep the section title
                        cleaned_line = clean_toc_entry(line, chapter_num)
                        # Indented by 2 spaces
                        full_toc.append("  " + cleaned_line)
                    else:
                        # Regular entry, indented by 4 spaces
                        cleaned_line = clean_toc_entry(line, chapter_num)
                        full_toc.append("    " + cleaned_line)
    
    full_toc = '\n'.join(full_toc)
    full_toc = re.sub(r'\n    ([A-z].*\]\(./\d+\.\d+\.md\))', r' \1', full_toc)
    full_toc = re.sub(r'\[(.*)\]\(./\d+\.\d+\.md\)', r'\1', full_toc)
    
    # Write the results to files
    with open(os.path.join(base_dir, 'toc_full.md'), 'w', encoding='utf-8') as f:
        f.write(full_toc)
    
    with open(os.path.join(base_dir, 'toc.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(simple_toc))
