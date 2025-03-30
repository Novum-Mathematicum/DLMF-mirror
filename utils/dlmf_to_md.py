import re
from bs4 import BeautifulSoup

def postprocess(full_markdown):
    toc_sections = full_markdown.split("## Table of Contents")
    if len(toc_sections) > 1:
        # First part before any TOC
        result = toc_sections[0]
        
        # Add first TOC
        result += "## Table of Contents" + toc_sections[1]
        
        # Add remaining content without TOC headers
        for i in range(2, len(toc_sections)):
            # Find where the next section header starts
            section_lines = toc_sections[i].split('\n')
            section_start = 0
            
            for j, line in enumerate(section_lines):
                if line.startswith('##') and not "Table of Contents" in line:
                    section_start = j
                    break
            
            # Add content from that section onwards
            if section_start > 0:
                result += '\n' + '\n'.join(section_lines[section_start:])
            else:
                # If no section header found, just add everything after the next empty line
                for j, line in enumerate(section_lines):
                    if line.strip() == '':
                        section_start = j + 1
                        break
                
                if section_start > 0:
                    result += '\n' + '\n'.join(section_lines[section_start:])
    else:
        # No duplicate TOCs
        result = full_markdown
    
    # fix multiple newlines in TOCs
    result = re.sub(r'\#\# Table of Contents\n{4,}', '## Table of Contents\n\n', result)
    result = re.sub(r'\n{5,}- ', '\n- ', result)
    return result

def parse_dlmf_to_markdown(html_content):
    """
    Parse DLMF HTML content and convert it to markdown format.
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    markdown_content = []
    
    # Parse title
    title = soup.find('h1')
    if title:
        tag_span = title.find('span', class_=lambda c: c and ('ltx_tag_section' in c or 'ltx_tag_chapter' in c))
        if tag_span:
            section_num = tag_span.text.strip()
            title_text = title.get_text().replace(tag_span.get_text(), '').strip()
            markdown_content.append(f"# {section_num} {title_text}\n")
    
    # Get the main content area
    content_area = soup.find('div', class_='ltx_page_main') or soup
    
    # Process the content recursively
    process_content(content_area, markdown_content)
    result = '\n'.join(markdown_content)
    result = postprocess(result)
    return result

def parse_toc(toc_element):
    """
    Parse a table of contents element into markdown format, handling any depth of nesting.
    
    Args:
        toc_element: BeautifulSoup element containing the table of contents
        
    Returns:
        str: Markdown representation of the table of contents
    """
    if not toc_element:
        return ""
    
    result = []
    
    # Add a title for the TOC
    result.append("## Table of Contents\n")
    
    # Process the TOC recursively
    process_toc_list(toc_element, result, level=0)
    
    return "\n".join(result)

def process_toc_list(list_element, result, level=0):
    """
    Process a TOC list element recursively, handling any depth of nesting.
    
    Args:
        list_element: BeautifulSoup list element to process
        result: List to append markdown lines to
        level: Current nesting level (for indentation)
    """
    # Get all direct TOC entries in this list
    entries = list_element.find_all('li', class_='ltx_tocentry', recursive=False)
    
    for entry in entries:
        # Get entry ID if available
        entry_id = entry.get('id', '')
        
        # Check if this entry has a direct link or is a category
        link = entry.find('a', class_='ltx_ref', recursive=False)
        
        if link:
            # This is a linked entry (section, subsection, etc.)
            href = link.get('href', '')
            if href.endswith('.html'):
                href = href.replace('.html', '.md')
            
            ref_title = link.find('span', class_='ltx_ref_title')
            if not ref_title:
                continue
                
            tag_span = ref_title.find('span', class_='ltx_tag')
            section_num = tag_span.get_text().strip() if tag_span else ""
            
            # Extract title by handling both normal text and math elements
            section_title = ""
            for content in ref_title.contents:
                if content == tag_span:
                    continue
                    
                if isinstance(content, str):
                    section_title += content
                elif content.name == 'math':
                    # Extract alttext from math tag and wrap it in $ for LaTeX rendering
                    alt_text = content.get('alttext', '')
                    if alt_text:
                        section_title += f"${alt_text}$"
                else:
                    section_title += content.get_text()
            
            section_title = section_title.strip()
            
            # Format with proper indentation and add ID anchor if available
            indent = "  " * level
            if entry_id:
                result.append(f"{indent}- <a id=\"{entry_id}\"></a>[{section_num} - {section_title}](./{href})")
            else:
                if section_num:
                    result.append(f"{indent}- [{section_num} - {section_title}](./{href})")
                else:
                    result.append(f"{indent}- [{section_title}](./{href})")
        else:
            # This is a category/chapter title without direct link
            title_span = entry.find('span', class_='ltx_text', recursive=False)
            if not title_span:
                continue
                
            # Extract title by handling both normal text and math elements
            title = ""
            for content in title_span.contents:
                if isinstance(content, str):
                    title += content
                elif content.name == 'math':
                    # Extract alttext from math tag and wrap it in $ for LaTeX rendering
                    alt_text = content.get('alttext', '')
                    if alt_text:
                        title += f"${alt_text}$"
                else:
                    title += content.get_text()
            
            title = title.strip()
            
            # Format with proper indentation and add ID anchor if available
            indent = "  " * level
            if entry_id:
                result.append(f"{indent}- <a id=\"{entry_id}\"></a>**{title}**")
            else:
                result.append(f"{indent}- **{title}**")
        
        # Process any nested lists (recursively)
        nested_list = entry.find(['ol', 'ul'], class_='ltx_toclist')
        if nested_list:
            process_toc_list(nested_list, result, level + 1)

def parse_equation_group(equation_group_table):
    """
    Parse an equation group table by treating each row as an independent equation.
    
    Args:
        equation_group_table: BeautifulSoup table tag with class 'ltx_equationgroup'
        
    Returns:
        str: Markdown representation of the equations
    """
    if not equation_group_table:
        return ""
    
    # Get table ID if available for reference
    eq_group_id = equation_group_table.get('id', '')
    id_anchor = f"<a id=\"{eq_group_id}\"></a>\n" if eq_group_id else ""
    
    results = []
    if id_anchor:
        results.append(id_anchor)
    
    # Process each row in the equation group
    rows = equation_group_table.find_all('tr')
        
    for row in rows:
        # If this is an equation row, process it
        if 'ltx_equation' in row.get('class', []) and 'ltx_eqn_row' in row.get('class', []):
            # Get row ID if available
            row_id = row.get('id', '')
            row_anchor = f"<a id=\"{row_id}\"></a>\n" if row_id else ""
            
            # Extract equation tag if present
            equation_number = ""
            eqno_cell = row.find('td', class_='ltx_eqn_eqno')
            if eqno_cell:
                tag_span = eqno_cell.find('span', class_='ltx_tag')
                if tag_span:
                    equation_number = tag_span.get_text().strip()
            
            # Extract equation content from all cells
            equation_parts = []
            for cell in row.find_all('td', class_='ltx_eqn_cell'):
                # Skip cells that are just padding
                if ('ltx_eqn_center_padleft' in cell.get('class', []) or 
                    'ltx_eqn_center_padright' in cell.get('class', [])):
                    continue
                
                # Find and process math tag if present
                math_tag = cell.find('math')
                if math_tag:
                    math_content = parse_math_tag(math_tag).strip(' $')  # Remove the $ delimiters
                    if math_content:
                        equation_parts.append(math_content)
            
            # If we have equation content, format it
            if equation_parts:
                equation_content = " ".join(equation_parts)
                
                # Format with tag if present
                if equation_number:
                    equation_md = f"{row_anchor}$$\n{equation_content} \\tag{{{equation_number}}}\n$$\n"
                else:
                    equation_md = f"{row_anchor}$$\n{equation_content}\n$$\n"
                
                results.append(equation_md)
        
        # If this is an info content row, process it
        elif row.find('div', class_='ltx_infocontent'):
            info_div = row.find('div', class_='ltx_infocontent')
            if info_div:
                info_md = parse_info_content(info_div)
                if info_md:
                    results.append(info_md)
    
    return "\n".join(results)

def process_content(element, markdown_content):
    """
    Process content recursively, handling various element types.
    """
    # Skip if not an element
    if not element or not element.name:
        return
    
    # Process table of contents
    if element.name == 'ul' and 'ltx_toclist' in element.get('class', []):
        toc_md = parse_toc(element)
        if toc_md:
            markdown_content.append("## Table of Contents\n\n" + toc_md)
    
    # Process subsection headers
    # Process h2 subsection headers
    if element.name == 'h2' and 'ltx_title' in element.get('class', []):
        tag_span = element.find('span', class_='ltx_tag_subsection')
        if tag_span:
            subsection_num = tag_span.text.strip()
            subsection_text = element.get_text().replace(tag_span.get_text(), '').replace('\n', '').strip()
            markdown_content.append(f"\n## {subsection_num} {subsection_text}\n")
    
    # Process h3 subsubsection headers
    elif element.name == 'h3' and 'ltx_title' in element.get('class', []):
        tag_span = element.find('span', class_=lambda c: c and 'ltx_tag' in c)
        
        if tag_span:
            # Case with tag span (like "§1.5(ii)")
            subsection_num = tag_span.text.strip()
            subsection_text = element.get_text().replace(tag_span.get_text(), '').replace('\n', '').strip()
            markdown_content.append(f"\n### {subsection_num} {subsection_text}\n")
        else:
            # Case without tag span (like just "Double Integrals")
            subsection_text = element.get_text().strip().replace('\n', '').strip()
            markdown_content.append(f"\n### {subsection_text}\n")

    
    # Process info content
    elif element.name == 'div' and 'ltx_infocontent' in element.get('class', []):
        info_md = parse_info_content(element)
        if info_md:
            markdown_content.append(info_md)
    
    # Process paragraphs (only if not inside a list item)
    elif element.name == 'p' and 'ltx_p' in element.get('class', []) and not element.find_parent('li'):
        para_md = parse_paragraph(element)
        if para_md:
            markdown_content.append(para_md + '\n')
    
    # Process lists
    elif element.name == 'ul' and 'ltx_itemize' in element.get('class', []):
        list_md = parse_list(element)
        if list_md:
            markdown_content.append(list_md)
    
    # Process equation groups
    elif element.name == 'table' and 'ltx_equationgroup' in element.get('class', []):
        eq_group_md = parse_equation_group(element)
        if eq_group_md:
            markdown_content.append(eq_group_md)
    
    # Process individual equations
    elif element.name == 'table' and 'ltx_equation' in element.get('class', []) and 'ltx_equationgroup' not in element.get('class', []):
        eq_md = parse_equation(element)
        if eq_md:
            markdown_content.append(eq_md)
    
    # Process figures with images
    elif element.name == 'figure' and element.find('img'):
        figure_md = parse_figure(element)
        if figure_md:
            markdown_content.append(figure_md)
    # Also check for figures that have images within links
    elif element.name == 'figure' and element.find('a', class_='ltx_magnifiable') and element.find('a', class_='ltx_magnifiable').find('img'):
        figure_md = parse_figure(element)
        if figure_md:
            markdown_content.append(figure_md)
    
    # Process figures with tables
    elif element.name == 'figure' and element.find('table'):
        figure_md = parse_figure_with_table(element)
        if figure_md:
            markdown_content.append(figure_md)
    
    # Process standalone tables
    elif element.name == 'table' and 'ltx_tabular' in element.get('class', []):
        # Ensure this table is not inside a figure or used for equations
        if (not element.find_parent('figure') and 
            'ltx_equation' not in element.get('class', []) and
            'ltx_equationgroup' not in element.get('class', [])):
            table_md = parse_table(element)
            if table_md:
                markdown_content.append(table_md)
    
    # Process children recursively (if not already processed as a special case)
    skip_recursive = ['ul', 'figure', 'p', 'table']
    should_skip = element.name in skip_recursive
    
    # Special case for p: only skip if it's a paragraph we've already processed
    if element.name == 'p' and 'ltx_p' not in element.get('class', []):
        should_skip = False
    
    # Special case for table: only skip if it's a table we've already processed
    if element.name == 'table' and ('ltx_tabular' not in element.get('class', []) and 
                                'ltx_equation' not in element.get('class', []) and
                                'ltx_equationgroup' not in element.get('class', [])):
        should_skip = False
    
    if not should_skip:
        for child in element.children:
            if child.name:  # Skip text nodes
                process_content(child, markdown_content)


def parse_math_tag(math_tag):
    """
    Extract LaTeX from math tag using alttext attribute.
    """
    if not math_tag:
        return ""
    
    alttext = math_tag.get('alttext', '')
    # Remove '%\n' from equations
    alttext = alttext.replace('%\n', '')
    
    display = math_tag.get('display', 'inline')
    
    if display == 'inline':
        return f"${alttext}$"
    else:
        return f"$${alttext}$$"

def parse_info_content(info_div):
    """
    Parse the info content section into markdown.
    """
    result = []
    dl = info_div.find('dl')
    
    if not dl:
        return ""
    
    # Create a list to track items we need to keep
    items_to_keep = []
    
    # Iterate through all dt elements and their corresponding dd elements
    dts = dl.find_all('dt')
    for dt in dts:
        term = dt.get_text().strip()
        dd = dt.find_next_sibling('dd')
        
        # Skip Permalink and Encodings
        if term == "Permalink:" or term == "Encodings:":
            continue
        
        if dd:
            items_to_keep.append((term, dd))
    
    # Process the kept items
    for term, dd in items_to_keep:
        # Create a working copy of the dd
        dd_text = str(dd)
        dd_copy = BeautifulSoup(dd_text, 'html.parser')
        
        # ===== CITATION HANDLING =====
        # Process citations first
        cite_tags = dd_copy.find_all('cite')
        for cite in cite_tags:
            cite_text = str(cite)
            cite_md = parse_citation(cite)
            # Replace the citation in the text
            dd_text = dd_text.replace(cite_text, cite_md)
        
        # Re-parse after citation processing
        dd_copy = BeautifulSoup(dd_text, 'html.parser')
        
        # Remove links to search
        for a in dd_copy.find_all('a', href=lambda h: h and 'https://dlmf.nist.gov/search' in h):
            text = a.get_text()
            a.replace_with(text)
        
        # Process all math tags 
        for math in dd_copy.find_all('math'):
            latex_md = parse_math_tag(math)
            math.replace_with(latex_md)
        
        # Process links
        for a in dd_copy.find_all('a'):
            href = a.get('href', '')
            title = a.get('title', '')
            text = a.get_text().strip()
            
            # Handle italic text in links
            italic_spans = a.find_all('span', class_='ltx_font_italic')
            if italic_spans:
                for span in italic_spans:
                    italic_text = span.get_text().strip()
                    span.replace_with(f"*{italic_text}* ")  # Add space after italic
                text = a.get_text().strip()
            
            if href.startswith('http') or href.startswith('./'):
                if title:
                    a.replace_with(f"[{text}]({href} \"{title}\")")
                else:
                    a.replace_with(f"[{text}]({href})")
            else:
                # Convert HTML reference to markdown reference
                if href.endswith('.html'):
                    md_href = href.replace('.html', '.md')
                    if title:
                        a.replace_with(f"[{text}](./{md_href} \"{title}\")")
                    else:
                        a.replace_with(f"[{text}](./{md_href})")
                else:
                    a.replace_with(text)
        
        # Process italic spans outside of links
        for span in dd_copy.find_all('span', class_='ltx_font_italic'):
            italic_text = span.get_text().strip()
            span.replace_with(f"*{italic_text}* ")  # Add space after italic
        
        # Get the processed text
        definition_md = dd_copy.get_text(separator=' ', strip=True)
        definition_md = re.sub(r'\s+', ' ', definition_md)
        
        result.append(f"**{term}**")
        result.append(definition_md)
    
    if not result:  # Don't create an empty note block
        return ""
    
    return ':::{note}\n' + '\n\n'.join(result) + '\n:::\n'

def parse_paragraph(p_tag):
    """
    Parse a paragraph tag, handling math elements.
    """
    # Create a working copy to avoid modifying the original
    p_text = str(p_tag)
    soup = BeautifulSoup(p_text, 'html.parser')
    
    # Find all citation tags and replace them using parse_citation
    cite_tags = soup.find_all('cite')
    for cite in cite_tags:
        cite_text = str(cite)
        cite_md = parse_citation(cite)
        # Replace the citation in the paragraph text
        p_text = p_text.replace(cite_text, cite_md)
    
    # Parse the modified paragraph text
    soup = BeautifulSoup(p_text, 'html.parser')
    
    # Replace search links with just their text
    for a in soup.find_all('a', href=lambda h: h and 'https://dlmf.nist.gov/search' in h):
        text = a.get_text()
        a.replace_with(text)
    
    # Replace math tags with their LaTeX representation
    for math in soup.find_all('math'):
        latex_md = parse_math_tag(math)
        math.replace_with(latex_md)
    
    # Handle standard emphasis tags
    for em in soup.find_all('em'):
        text = em.get_text().strip()
        em.replace_with(f"*{text}* ")
    
    # Handle italic spans
    for span in soup.find_all('span', class_='ltx_font_italic'):
        italic_text = span.get_text().strip()
        span.replace_with(f"*{italic_text}* ")
    
    # Handle strong/bold tags
    for strong in soup.find_all('strong'):
        text = strong.get_text().strip()
        strong.replace_with(f"**{text}**")
    
    # Handle bold spans
    for span in soup.find_all('span', class_='ltx_font_bold'):
        bold_text = span.get_text().strip()
        span.replace_with(f"**{bold_text}**")
    
    # Convert all remaining links to markdown
    for a in soup.find_all('a'):
        href = a.get('href', '')
        title = a.get('title', '')
        text = a.get_text().strip()
        
        # Skip if no href
        if not href:
            continue
            
        # Convert link based on its type
        if href.endswith('.html'):
            md_href = href.replace('.html', '.md')
            if title:
                a.replace_with(f"[{text}](./{md_href} \"{title}\")")
            else:
                a.replace_with(f"[{text}](./{md_href})")
        elif href.startswith('http') or href.startswith('./'):
            if title:
                a.replace_with(f"[{text}]({href} \"{title}\")")
            else:
                a.replace_with(f"[{text}]({href})")
        else:
            a.replace_with(text)
    
    # Get the text representation of the transformed paragraph
    result = soup.get_text(separator=' ', strip=True)
    
    # Clean up whitespace
    result = re.sub(r'\s+', ' ', result).strip()
    
    return result

def parse_citation(cite_tag):
    """
    Parse a citation tag into markdown format.
    """
    # Get the original text to preserve structure
    original_text = cite_tag.get_text()
    
    # Find all links in the citation
    links = cite_tag.find_all('a')
    if not links:
        return original_text
    
    # Create a new soup from the citation for easier manipulation
    processed_html = str(cite_tag)
    
    # Process each link in the citation
    for link in links:
        href = link.get('href', '')
        title = link.get('title', '')
        year_text = link.get_text().strip()
        
        # Convert HTML extension to MD
        if href.endswith('.html'):
            href = href.replace('.html', '.md')
        
        # Create markdown link
        md_link = f"[{year_text}](./{href} \"{title}\")"
        
        # Replace just the link in the original HTML with the markdown link
        # We need to use a unique pattern that won't match other parts of the text
        link_pattern = str(link)
        processed_html = processed_html.replace(link_pattern, md_link)
    
    # Create soup from processed HTML and get text
    soup = BeautifulSoup(processed_html, 'html.parser')
    
    # Get the processed text after all link replacements
    return soup.get_text()

def parse_list(ul_tag):
    """
    Parse a list (ul) element to markdown format.
    """
    result = []
    
    # Process each list item
    list_items = ul_tag.find_all('li', recursive=False)
    for li in list_items:
        # Find the paragraph in the list item
        p_tag = li.find('p', class_='ltx_p')
        if p_tag:
            # Parse the paragraph content
            item_content = parse_paragraph(p_tag)
            if item_content:
                # Format as markdown list item
                result.append(f"* {item_content}")
        else:
            # If there's no dedicated paragraph, get the text content directly
            item_text = li.get_text(separator=' ', strip=True)
            if item_text:
                result.append(f"* {item_text}")
    
    return "\n".join(result) + "\n" if result else ""

def parse_equation(eq_table):
    """
    Parse an equation table to markdown format.
    """
    equation_number = ""
    
    # Get equation number
    tag_span = eq_table.find('span', class_='ltx_tag_equation')
    if tag_span:
        equation_number = tag_span.get_text().strip()
    
    # Get equation ID if available
    eq_id = eq_table.get('id', '')
    
    # Find the cell containing the equation
    eq_cell = eq_table.find('td', class_='ltx_eqn_cell ltx_align_center')
    if not eq_cell:
        # Try to find any equation cell
        eq_cell = eq_table.find('td', class_=lambda c: c and 'ltx_eqn_cell' in c and 'ltx_align_center' in c)
    
    # If we still don't have the cell, try the first non-tag cell
    if not eq_cell:
        for cell in eq_table.find_all('td'):
            if not cell.find('span', class_='ltx_tag_equation'):
                eq_cell = cell
                break
    
    if not eq_cell:
        return ""
    
    # Get LaTeX from math tags
    math_tags = eq_cell.find_all('math')
    if not math_tags:
        return ""
    
    equation_latex = ""
    for math in math_tags:
        latex = math.get('alttext', '')
        if latex:
            # Remove the '%\n' from equations
            latex = latex.replace('%\n', '')
            equation_latex += latex + " "
    
    # Add equation ID as an HTML anchor if available
    id_anchor = f"<a id=\"{eq_id}\"></a>\n" if eq_id else ""
    
    # Format as a numbered equation in markdown
    if equation_latex and equation_number:
        eq_md = f"\n{id_anchor}$$\n{equation_latex.strip()} \\tag{{{equation_number}}}\n$$\n"
    elif equation_latex:
        eq_md = f"\n{id_anchor}$$\n{equation_latex.strip()}\n$$\n"
    else:
        return ""
    
    return eq_md

def parse_figure(figure_tag):
    """
    Parse a figure element containing an image, handling captions and metadata.
    
    Args:
        figure_tag: BeautifulSoup figure tag
        
    Returns:
        str: Markdown representation of the figure
    """
    if not figure_tag:
        return ""
    
    result = []
    
    # Get figure ID if available
    fig_id = figure_tag.get('id', '')
    
    # Add HTML anchor for the figure ID
    if fig_id:
        result.append(f"<a id=\"{fig_id}\"></a>\n")
    
    # Find the image
    img = figure_tag.find('img')
    if not img:
        # Try to find image in a link
        img_link = figure_tag.find('a', class_='ltx_magnifiable')
        if img_link:
            img = img_link.find('img')
    
    if not img:
        return ""
    
    # Get image source
    img_src = img.get('src', '')
    if not img_src:
        return ""
    
    # Process caption
    caption_text = ""
    caption = figure_tag.find('figcaption')
    if caption:
        # Create a working copy to avoid modifying the original
        caption_soup = BeautifulSoup(str(caption), 'html.parser')
        
        # Process math tags in caption
        for math in caption_soup.find_all('math'):
            latex_md = parse_math_tag(math)
            math.replace_with(latex_md)
        
        # Remove magnify link if present
        magnify_link = caption_soup.find('a', class_='ltx_magnifiable')
        if magnify_link:
            magnify_link.decompose()
        
        # Get the processed caption text
        caption_text = caption_soup.get_text(separator=' ', strip=True)
        
        # Clean up whitespace
        caption_text = re.sub(r'\s+', ' ', caption_text).strip()
    
    # Create markdown image with caption
    result.append(f"![{caption_text}](../html/{img_src})")
    
    # Process metadata/information section if present
    info_div = figure_tag.find('div', class_='ltx_infocontent')
    if info_div:
        info_md = parse_info_content(info_div)
        result.append(info_md)
    
    return "\n".join(result)
    
def parse_table(table_tag):
    """
    Parse an HTML table to markdown format, handling complex structures with colspan.
    
    Args:
        table_tag: BeautifulSoup table tag
        
    Returns:
        str: Markdown representation of the table
    """
    # Check if we have a valid table
    if not table_tag:
        return ""
    
    # Find all rows in the table
    all_rows = table_tag.find_all('tr')
    if not all_rows:
        return ""
    
    # First, calculate the total number of columns in the table by examining all rows
    # and accounting for colspan attributes
    max_cols = 0
    for row in all_rows:
        col_count = 0
        for cell in row.find_all(['th', 'td']):
            colspan = int(cell.get('colspan', 1))
            col_count += colspan
        max_cols = max(max_cols, col_count)
    
    # Process each row into a list of markdown cells, respecting colspan
    md_table = []
    
    for row in all_rows:
        md_row = [''] * max_cols  # Initialize with empty cells
        col_index = 0
        
        for cell in row.find_all(['th', 'td']):
            # Get colspan (default is 1)
            colspan = int(cell.get('colspan', 1))
            
            # Process cell content
            cell_content = process_table_cell(cell)
            
            # Set content in the correct column, accounting for colspan
            if colspan == 1:
                md_row[col_index] = cell_content
            else:
                # For cells with colspan, distribute the content
                # Place content in the first cell of the span
                md_row[col_index] = cell_content
                
                # Fill the rest of the span with empty content
                for i in range(1, colspan):
                    if col_index + i < max_cols:
                        md_row[col_index + i] = ''
            
            # Move to the next column position
            col_index += colspan
        
        # Add the processed row
        md_table.append(md_row)
    
    # Generate markdown table
    result = []
    is_header_section = False
    
    for i, row in enumerate(md_table):
        # Check if this is part of a header section
        if i == 0 and all_rows[i].find_parent('thead'):
            is_header_section = True
            
        # If we're in a header row, make all cells bold
        if is_header_section:
            formatted_row = []
            for cell in row:
                if cell and not cell.startswith('**') and not cell.endswith('**'):
                    formatted_row.append(f"**{cell}**" if cell.strip() else '')
                else:
                    formatted_row.append(cell)
            row = formatted_row
        
        # Build the markdown row
        md_row = "| " + " | ".join(cell if cell.strip() else ' ' for cell in row) + " |"
        result.append(md_row)
        
        # Add separator after header section
        if i == 0 and is_header_section:
            separator = "|" + "|".join(["---"] * max_cols) + "|"
            result.append(separator)
        # Add separator after first row if no header
        elif i == 0 and not is_header_section and len(md_table) > 1:
            separator = "|" + "|".join(["---"] * max_cols) + "|"
            result.append(separator)
    
    # Return the complete table
    return "\n" + "\n".join(result) + "\n\n"

def process_table_cell(cell_tag):
    """
    Process the content of a table cell, handling math tags, links, etc.
    
    Args:
        cell_tag: BeautifulSoup cell tag (th or td)
        
    Returns:
        str: Processed cell content
    """
    # Create a working copy to avoid modifying the original
    cell_text = str(cell_tag)
    soup = BeautifulSoup(cell_text, 'html.parser')
    
    # Handle math tags
    for math in soup.find_all('math'):
        latex_md = parse_math_tag(math)
        math.replace_with(latex_md)
    
    # Handle links
    for a in soup.find_all('a'):
        href = a.get('href', '')
        title = a.get('title', '')
        text = a.get_text().strip()
        
        if href.endswith('.html'):
            md_href = href.replace('.html', '.md')
            if title:
                a.replace_with(f"[{text}](./{md_href} \"{title}\")")
            else:
                a.replace_with(f"[{text}](./{md_href})")
        elif href.startswith('http') or href.startswith('./'):
            if title:
                a.replace_with(f"[{text}]({href} \"{title}\")")
            else:
                a.replace_with(f"[{text}]({href})")
        else:
            a.replace_with(text)
    
    # Handle emphasis/italic
    for em in soup.find_all(['em', 'span'], class_=lambda c: c and 'ltx_font_italic' in c):
        text = em.get_text().strip()
        em.replace_with(f"*{text}*")
    
    # Handle strong/bold
    for strong in soup.find_all(['strong', 'span'], class_=lambda c: c and 'ltx_font_bold' in c):
        text = strong.get_text().strip()
        strong.replace_with(f"**{text}**")
    
    # Get the cell text
    content = soup.get_text(separator=' ', strip=True)
    
    # Clean up whitespace
    content = re.sub(r'\s+', ' ', content).strip()
    
    # Escape pipe characters in the cell content
    content = content.replace('|', '\\|')
    
    return content

def parse_figure_with_table(figure_tag):
    """
    Parse a figure containing a table, handling captions and metadata.
    
    Args:
        figure_tag: BeautifulSoup figure tag
        
    Returns:
        str: Markdown representation of the figure with table
    """
    if not figure_tag:
        return ""
    
    result = []
    
    # Get figure ID if available
    fig_id = figure_tag.get('id', '')
    
    # Add HTML anchor for the figure ID
    if fig_id:
        result.append(f"<a id=\"{fig_id}\"></a>\n")
        
    # Find and process the table
    table = figure_tag.find('table')
    if table:
        table_md = parse_table(table)
        result.append(table_md)
    caption = figure_tag.find('figcaption')
    result = [x.strip() for x in result]
    if caption:
        caption_text = caption.get_text(separator=' ', strip=True)
        result.append(f": {caption_text}\n")

    # Process metadata/information section if present
    info_div = figure_tag.find('div', class_='ltx_infocontent')
    if info_div:
        info_md = parse_info_content(info_div)
        result.append(info_md)
    
    return "\n".join(result)