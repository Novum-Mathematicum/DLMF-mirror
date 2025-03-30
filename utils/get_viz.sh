#!/bin/bash

# Target page with list of figures
LOF_URL="https://dlmf.nist.gov/lof/"
OUTPUT_DIR="./viz_backup"
mkdir -p "$OUTPUT_DIR"

# Temporary file for the list of figures page
LOF_FILE="$OUTPUT_DIR/lof_temp.html"

echo "Downloading List of Figures page..."
curl -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8" \
     -H "Accept-Language: en-US,en;q=0.5" \
     -H "Accept-Encoding: gzip, deflate, br" \
     -H "Connection: keep-alive" \
     -H "Upgrade-Insecure-Requests: 1" \
     -H "Sec-Fetch-Dest: document" \
     -H "Sec-Fetch-Mode: navigate" \
     -H "Sec-Fetch-Site: none" \
     -H "Sec-Fetch-User: ?1" \
     -H "Cache-Control: max-age=0" \
     -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0" \
     --compressed -L -o "$LOF_FILE" "$LOF_URL"

if [ ! -s "$LOF_FILE" ]; then
    echo "Failed to download List of Figures page. Exiting."
    exit 1
fi

echo "Extracting visualization links..."

# Use grep to find all links ending with the pattern [0-9]+\.[0-9]+\.F[0-9]+\.viz
# Then extract the actual URLs using sed
VIZ_LINKS=$(grep -o 'href="[^"]*[0-9]\+\.[0-9]\+\.F[0-9]\+[a-z]*\.viz"' "$LOF_FILE" | sed 's/href="\([^"]*\)"/\1/g')

# Count the total number of links
TOTAL_LINKS=$(echo "$VIZ_LINKS" | wc -l)
echo "Found $TOTAL_LINKS visualization links to download"

# Process each link
CURRENT=0
for LINK in $VIZ_LINKS; do
    CURRENT=$((CURRENT+1))
    
    # Construct the full URL if it's a relative path
    if [[ "$LINK" == /* ]]; then
        URL="https://dlmf.nist.gov$LINK"
    elif [[ "$LINK" != http* ]]; then
        URL="https://dlmf.nist.gov/$LINK"
    else
        URL="$LINK"
    fi
    
    # Extract filename from URL
    FILENAME=$(basename "$URL")
    OUTPUT_FILE="$OUTPUT_DIR/$FILENAME.html"
    
    echo "[$CURRENT/$TOTAL_LINKS] Downloading $URL"
    
    # Download with full browser emulation headers
    curl -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8" \
         -H "Accept-Language: en-US,en;q=0.5" \
         -H "Accept-Encoding: gzip, deflate, br" \
         -H "Connection: keep-alive" \
         -H "Upgrade-Insecure-Requests: 1" \
         -H "Sec-Fetch-Dest: document" \
         -H "Sec-Fetch-Mode: navigate" \
         -H "Sec-Fetch-Site: none" \
         -H "Sec-Fetch-User: ?1" \
         -H "Cache-Control: max-age=0" \
         -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0" \
         --compressed -L -o "$OUTPUT_FILE" "$URL"
    
    # Check if download was successful
    if [ -s "$OUTPUT_FILE" ]; then
        # Count the number of IndexedFaceSet elements for logging
        FACE_SETS=$(grep -o "<IndexedFaceSet coordIndex" "$OUTPUT_FILE" | wc -l)
        echo "  ✓ Download complete. Contains $FACE_SETS IndexedFaceSet elements."
    else
        echo "  ✗ Download failed or empty file."
    fi
    
    # Add a small delay to avoid hammering the server
    sleep 1
done

echo "Download process complete! Files saved to $OUTPUT_DIR/"

# Clean up the temporary file
rm -f "$LOF_FILE"
