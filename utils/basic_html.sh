#!/bin/bash

SOURCE_DIR="../html"
DEST_DIR="../basic_html"

if [ ! -d "$SOURCE_DIR" ]; then
  echo "Error: Source directory '$SOURCE_DIR' not found."
  exit 1
fi

mkdir -p "$DEST_DIR"

find "$SOURCE_DIR" -maxdepth 1 -type f -regextype posix-extended -regex ".*/[0-9]+(\.[0-9]+)?\.html" -exec cp -t "$DEST_DIR/" {} +
cp "$SOURCE_DIR/index.html" "$DEST_DIR/"

for dir in style lof lot not idx bib front; do
  if [ -d "$SOURCE_DIR/$dir" ]; then
    cp -a "$SOURCE_DIR/$dir" "$DEST_DIR/"
  fi
done

# find "$SOURCE_DIR" -maxdepth 1 -mindepth 1 -type d -regextype posix-extended -regex ".*/[0-9]+" -exec cp -a -t "$DEST_DIR/" {} +
# Remove the images.

echo "Finished compiling basic html folder."
exit 0