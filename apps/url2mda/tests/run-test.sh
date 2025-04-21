#!/bin/bash

# Load environment variables from .env.local if it exists
if [ -f "$(dirname "$0")/../.env.local" ]; then
  set -a
  source "$(dirname "$0")/../.env.local"
  set +a
fi

if [[ "$*" == *"--prod"* ]]; then
    echo "Running in testing production mode"
    WORKER_URL="https://url2md.sno.ai"
else
    echo "Running in testing development mode"
    WORKER_URL="http://localhost:8787"
fi
TEST_FILE="tests/common-test.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "Starting URL tests..."

# Extract URLs from the test file (handles http and https)
urls=$(grep -Eo '(http|https)://[^ >]+' "$TEST_FILE")

if [ -z "$urls" ]; then
    echo "Error: No URLs found in $TEST_FILE"
    exit 1
fi

# Loop through each URL
while IFS= read -r url; do
    # URL encode the target URL for the query parameter
    encoded_url=$(printf %s "$url" | jq -s -R -r @uri)

    # Check URL patterns for specific handling
    is_youtube=$(echo "$url" | grep -qE 'youtube.com|youtu.be' && echo "true" || echo "false")
    is_blog=$(echo "$url" | grep -qE 'blog|medium.com|dev.to' && echo "true" || echo "false")
    is_docs=$(echo "$url" | grep -qE 'docs|documentation|github.com|gitlab.com' && echo "true" || echo "false")
    
    # Build query parameters based on URL type
    query_params="url=$encoded_url"
    
    # YouTube videos get detailed response for better metadata
    if [ "$is_youtube" = "true" ]; then
        query_params="$query_params&enableDetailedResponse=true"
        echo "Testing YouTube URL with detailed response: $url"
    # Blog posts get subpages and LLM filtering
    elif [ "$is_blog" = "true" ]; then
        query_params="$query_params&subpages=true&llmFilter=true"
        echo "Testing blog URL with subpages and LLM filtering: $url"
    # Documentation pages get detailed response and subpages
    elif [ "$is_docs" = "true" ]; then
        query_params="$query_params&enableDetailedResponse=true&subpages=true"
        echo "Testing documentation URL with detailed response and subpages: $url"
    else
        echo "Testing URL with default parameters: $url"
    fi

    # Make the request to the worker with Authorization header to bypass rate limiting
    response=$(curl -sS -X GET "$WORKER_URL/?$query_params" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $BACKEND_SECURITY_TOKEN")
    exit_code=$?

    if [ $exit_code -ne 0 ]; then
        echo -e "${RED}Error: curl command failed for URL: $url (Exit code: $exit_code)${NC}"
        continue
    fi

    # Check if the response is valid JSON
    echo "$response" | jq -e '.' >/dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Invalid JSON response for URL: $url${NC}"
        echo "  Response: $response"
        continue
    fi

    # Special handling for YouTube to diagnose issues
    if [ "$is_youtube" = "true" ]; then
        youtube_md=$(echo "$response" | jq -r '.[0].md')
        echo "YouTube Response (with detailed mode):"
        echo "$youtube_md" | head -10
        
        # Flag for YouTube specific errors
        youtube_error=false

        # Check for undefined values
        if echo "$youtube_md" | grep -q "undefined"; then
            echo -e "${RED}Error: YouTube response contains undefined values${NC}"
            youtube_error=true
        fi

        # Check for common error patterns as well
        error_check_yt=$(echo "$response" | jq -e '.[0] | (.error == true or (.md | type == "string" and (contains("Failed to") or contains("Rate limit"))))' 2>/dev/null)
        jq_exit_code_yt=$?

        if [ $jq_exit_code_yt -eq 0 ]; then
            error_message_yt=$(echo "$response" | jq -r '.[0].md // (.[0].errorDetails // "Unknown error")' 2>/dev/null)
            echo -e "${RED}Error detected in YouTube response for URL: $url${NC}"
            echo "  Message: $error_message_yt"
            youtube_error=true
        fi

        # Report overall YouTube status
        if [ "$youtube_error" = false ]; then
            echo -e "${GREEN}YouTube extraction OK with detailed response!${NC}"
        fi

        echo "----------------------------------------"
        continue
    fi

    # Check specifically for Worker's rate limit error
    worker_rate_limit_check=$(echo "$response" | jq -e '.[0] | (.error == true and .md == "Rate limit exceeded")' 2>/dev/null)
    wrl_exit_code=$?
    
    # Check for other errors (failed fetch, external rate limits, etc.)
    other_error_check=$(echo "$response" | jq -e '.[0] | (.error == true or (.md | type == "string" and contains("Failed to")))' 2>/dev/null)
    jq_exit_code=$?

    if [ $wrl_exit_code -eq 0 ]; then
        # Worker rate limit triggered
        error_message=$(echo "$response" | jq -r '.[0].md // "Unknown error"' 2>/dev/null)
        echo -e "${RED}Error for URL: $url - Worker Rate Limit Hit${NC}"
        echo "  Message: $error_message"
    elif [ $jq_exit_code -eq 0 ]; then
        # jq ran successfully and found an error indicator
        error_message=$(echo "$response" | jq -r '.[0].md // (.[0].errorDetails // "Unknown error")' 2>/dev/null)
        echo -e "${RED}Error processing URL: $url - Likely External Issue${NC}"
        echo "  Message: $error_message"
    else
        # No errors detected for this general URL
        if [ "$is_blog" = "true" ]; then
            echo -e "${GREEN}Test OK for blog URL: $url (with subpages and LLM filtering)${NC}"
        elif [ "$is_docs" = "true" ]; then
            echo -e "${GREEN}Test OK for documentation URL: $url (with detailed response and subpages)${NC}"
        else
            echo -e "${GREEN}Test OK for URL: $url${NC}"
        fi
    fi

    # Pause between requests to avoid hitting the worker rate limit
    sleep 3

done <<< "$urls"

echo "URL tests finished."
