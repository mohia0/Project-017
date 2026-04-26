
import sys
import re

def check_balance(filename, start_line, end_line):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    content = "".join(lines[start_line-1:end_line])
    
    # Strip comments
    content = re.sub(r'\{/\*.*?\*/\}', '', content, flags=re.S)
    
    tags = []
    braces = 0
    parens = 0
    
    # regex for tags, braces, parens
    # Handle self-closing tags like <br /> or <Eye />
    tokens = re.finditer(r'<([a-zA-Z\.]+)[^>]*?(/>)|<(/?[a-zA-Z\.]+)|(\{|\})|(\(|\))', content)
    
    for match in tokens:
        if match.group(1) and match.group(2): # Self-closing tag <Tag />
            # Skip
            pass
        elif match.group(3): # Tag <Tag or </Tag
            tag = match.group(3)
            if tag.startswith('/'):
                tag_name = tag[1:]
                if not tags:
                    print(f"Error: unmatched closing tag <{tag}>")
                else:
                    last = tags.pop()
                    if last != tag_name:
                        print(f"Error: tag mismatch <{last}> vs <{tag}> at end of tag search")
                        tags.append(last) # Put it back to keep tracking
            else:
                tags.append(tag)
        elif match.group(4): # Brace
            if match.group(4) == '{': braces += 1
            else: braces -= 1
        elif match.group(5): # Paren
            if match.group(5) == '(': parens += 1
            else: parens -= 1
            
    print(f"Final counts: Braces={braces}, Parens={parens}, OpenTags={tags}")

if __name__ == "__main__":
    check_balance(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]))
