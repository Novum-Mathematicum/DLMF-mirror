#!/bin/bash

shopt -s extglob

target_dir="../markdown"

# Ensure target base directory exists
mkdir -p "$target_dir"

for file_path in "$target_dir"/+([0-9]).md "$target_dir"/+([0-9]).+([0-9]).md; do
  if [[ -f "$file_path" ]]; then
    # Extract filename from path
    file_name=$(basename "$file_path")
    # Extract number part for directory name
    dir_num="${file_name%%.*}"
    # Define the full path for the target directory
    dest_dir="$target_dir/$dir_num"
    # Create target directory inside target_dir
    mkdir -p "$dest_dir"
    # Move the file into the target directory
    mv "$file_path" "$dest_dir/"
  fi
done
