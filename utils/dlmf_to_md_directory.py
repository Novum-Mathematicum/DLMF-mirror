import os
import re
from dlmf_to_md import parse_dlmf_to_markdown

def process_dlmf_files():
    """
    Process HTML files in the input folder:
    1. Convert HTML files matching pattern [0-9\.]+\.html to markdown in output folder
    2. Copy folders matching pattern [0-9]+ recursively to output folder
    """
    input_dir = '../html'
    output_dir = '../markdown'
    
    # Create output directory if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Process files in input directory
    for item in os.listdir(input_dir):
        input_path = os.path.join(input_dir, item)
        
        # Process HTML files matching the pattern
        if os.path.isfile(input_path) and re.match(r'[0-9\.]+\.html$', item):
            # Read HTML file
            with open(input_path, 'r', encoding='utf-8') as file:
                html_content = file.read()
            
            # Convert HTML to markdown
            markdown_content = parse_dlmf_to_markdown(html_content)
            
            # Write to output file with .md extension
            output_filename = item.replace('.html', '.md')
            output_path = os.path.join(output_dir, output_filename)
            
            with open(output_path, 'w', encoding='utf-8') as file:
                file.write(markdown_content)
            
            print(f"Converted {item} to {output_filename}")
        
if __name__ == "__main__":
    process_dlmf_files()