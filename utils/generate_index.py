from bs4 import BeautifulSoup
import re
import os
import glob

def convert_math_to_latex(math_element):
    """Convert math element to LaTeX format using alttext attribute"""
    if math_element.has_attr('alttext'):
        return f"${math_element['alttext']}$"
    return ""

def convert_link_to_markdown(link_element):
    """Convert a link element to markdown format"""
    if not link_element.has_attr('href') or not link_element.text.strip():
        return link_element.text
    
    href = link_element['href']
    # Clean up the href path
    if href.startswith('.././'):
        href = '../' + href[4:]
    elif href.startswith('../'):
        # Keep as is
        pass
    
    # Convert fragment links to markdown format
    if '#' in href:
        parts = href.split('#')
        base_path = parts[0]
        fragment = parts[1]
        
        # Convert path extension
        if base_path.endswith('.html'):
            base_path = base_path[:-5] + '.md'
        elif '.' not in os.path.basename(base_path) and base_path:
            # If no extension, add .md
            base_path = base_path + '.md'
        
        href = f"{base_path}#{fragment}"
    
    title = ""
    if link_element.has_attr('title'):
        title = f' "{link_element["title"]}"'
    
    return f"[{link_element.text.strip()}]({href}{title})"

def process_index_entry(entry, level=0):
    """Process an index entry and return markdown text"""
    result = []
    indent = "  " * level
    
    # Get the main phrase
    phrase_element = entry.find('span', class_='ltx_indexphrase')
    if not phrase_element:
        return ""
    
    # Process the phrase text, handling math elements
    phrase_text = ""
    for content in phrase_element.contents:
        if content.name == 'math':
            phrase_text += convert_math_to_latex(content)
        elif hasattr(content, 'string') and content.string:
            phrase_text += content.string
        elif isinstance(content, str):
            phrase_text += content
    
    # Get references if any
    refs = []
    refs_element = entry.find('span', class_='ltx_indexrefs')
    if refs_element:
        for link in refs_element.find_all('a', class_='ltx_ref'):
            refs.append(convert_link_to_markdown(link))
    
    # Format the entry
    entry_text = f"{indent}- {phrase_text.strip()}"
    if refs:
        entry_text += f" ({', '.join(refs)})"
    result.append(entry_text)
    
    # Process nested entries
    sublist = entry.find('ul', class_='ltx_indexlist')
    if sublist:
        for sub_entry in sublist.find_all('li', class_='ltx_indexentry', recursive=False):
            sub_result = process_index_entry(sub_entry, level + 1)
            if sub_result:
                result.append(sub_result)
    
    return "\n".join(result)

def html_to_markdown(html_content):
    """Convert HTML index entries to markdown"""
    soup = BeautifulSoup(html_content, 'html.parser')
    result = []
    
    # Find the main index list
    main_list = soup.find('ul', class_='ltx_indexlist')
    
    if main_list:
        # Find all top-level index entries within the main list
        for entry in main_list.find_all('li', class_='ltx_indexentry', recursive=False):
            markdown_entry = process_index_entry(entry)
            if markdown_entry:
                result.append(markdown_entry)
    else:
        # Fallback: try to find any index entries directly
        for entry in soup.find_all('li', class_='ltx_indexentry', recursive=False):
            markdown_entry = process_index_entry(entry)
            if markdown_entry:
                result.append(markdown_entry)
    
    return "\n".join(result)

def process_file(input_file, output_file):
    """Process an HTML file and write the markdown output"""
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        markdown_content = html_to_markdown(html_content)
        
        # Create output directory if it doesn't exist
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        
        if not markdown_content.strip():
            print(f"WARNING: No content found in {input_file}")
        
        input_file_name = os.path.basename(input_file).split('.')[0]
        if input_file_name == 'index':
            input_file_name = 'A'
        markdown_content = f"# Index: {input_file_name}\n\n{markdown_content}"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(markdown_content)
        
        print(f"Converted {input_file} to {output_file}")
    except Exception as e:
        print(f"Error processing {input_file}: {str(e)}")

def process_directory(input_dir, output_dir):
    """Process all HTML files in a directory and convert to markdown"""
    # Make sure input directory exists
    if not os.path.exists(input_dir):
        print(f"Input directory {input_dir} does not exist.")
        return
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Get all HTML files
    html_files = glob.glob(os.path.join(input_dir, "*.html"))
    
    if not html_files:
        print(f"No HTML files found in {input_dir}")
        return
    
    # Process each file
    for html_file in html_files:
        file_name = os.path.basename(html_file)
        output_file = os.path.join(output_dir, file_name.replace('.html', '.md'))
        process_file(html_file, output_file)
    
    print(f"Processed {len(html_files)} files from {input_dir} to {output_dir}")

# Main execution
if __name__ == "__main__":
    import sys
    
    input_dir = "../html/idx"
    output_dir = "../markdown/idx"
    
    # Allow command line overrides
    if len(sys.argv) >= 3:
        input_dir = sys.argv[1]
        output_dir = sys.argv[2]
    
    process_directory(input_dir, output_dir)