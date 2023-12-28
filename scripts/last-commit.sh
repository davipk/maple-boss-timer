#!/bin/bash

if [ -d "./dist" ]; then
    cd "./dist"
    git_last_commit_date="$(git log -1 --format=%cd | date +%m/%d/%Y)"
    echo "Git last commit date: $git_last_commit_date"

    html_files="$(find . -type f -name "index.html")"

    for file in $html_files; do 
    echo "Inserting date into: $file" 
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i "" "s|<span id=\"git-last-commit-date\">*</span>|<span id=\"git-last-commit-date\">$git_last_commit_date</span>|g" "$file"
    else
        sed -i -e "s|<span id=\"git-last-commit-date\">*</span>|<span id=\"git-last-commit-date\">$git_last_commit_date</span>|g" "$file"
    fi
    done 
else
    echo "Directory dist does not exist."
fi
