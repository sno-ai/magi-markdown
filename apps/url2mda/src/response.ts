export const html = `<!DOCTYPE html>
<html>
<head>
    <title>URL2MD - Convert Websites to Markdown</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body {
            /* Updated gradient: blue-500 to black, top to bottom */
            background: linear-gradient(to bottom, #3b82f6, #000000);
        }
        .code-block {
            /* Darker background, adjusted text color */
            background-color: #1f2937; /* gray-800 */
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 0.375rem; /* rounded-md */
            padding: 1rem; /* p-4 */
            font-family: monospace;
            color: #d1d5db; /* gray-300 */
            overflow-x: auto;
            white-space: pre-wrap; /* Allow wrapping */
            word-wrap: break-word; /* Break long words */
        }
        .card {
             background-color: rgba(0, 0, 0, 0.3); /* Slightly darker card background */
             backdrop-filter: blur(10px);
             border: 1px solid rgba(255, 255, 255, 0.1);
        }
    </style>
</head>
<body class="text-gray-100">
    <main class="flex flex-col items-center justify-center min-h-screen px-4 py-12">
        <div class="max-w-4xl w-full space-y-8">
            <div class="text-center space-y-3">
                <h1 class="text-5xl font-extrabold tracking-tight text-white drop-shadow-lg">URL2MD</h1>
                <p class="text-xl text-blue-100">
                    A fast tool to convert any website into LLM-ready markdown data, 
                    <span class="font-semibold">with enhanced extraction for sites like YouTube, Twitter, and GitHub.</span>
                </p>
            </div>

            <div class="card rounded-xl shadow-2xl w-full p-8 space-y-6">
                <script>
                    function redirectToMD(event) {
                        event.preventDefault();
                        const url = document.getElementById('urlInput').value;
                        const enableDetailed = document.getElementById('enableDetailedCheckbox').checked;
                        let redirectUrl = '/?url=' + encodeURIComponent(url);
                        // Always include enableDetailedResponse based on checkbox state
                        redirectUrl += '&enableDetailedResponse=' + enableDetailed;
                        
                        // You might want to add logic here to get values for subpages/llmFilter if you add controls for them
                        // For now, they are only controllable via query params

                        window.location.href = redirectUrl;
                    }
                </script>

                <form class="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3" onsubmit="redirectToMD(event)">
                    <input id="urlInput"
                        class="flex h-11 w-full text-gray-900 rounded-lg border border-gray-300 bg-white px-4 py-2 text-base ring-offset-background placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex-1 transition duration-150 ease-in-out"
                        type="url" placeholder="Enter website URL (e.g., https://example.com)" required />
                    <button type="submit"
                        class="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-base font-semibold ring-offset-background transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 h-11 px-6 py-2 w-full sm:w-auto">
                        Convert
                    </button>
                </form>
                 <div class="flex items-center space-x-2 pt-2">
                    <input id="enableDetailedCheckbox" type="checkbox" class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-gray-700 border-gray-600">
                    <label for="enableDetailedCheckbox" class="text-sm font-medium text-gray-300">Enable Detailed Response (capture full page structure)</label>
                </div>

                <!-- Usage Examples -->
                <div class="pt-4 space-y-4">
                    <h2 class="text-2xl font-bold text-white">Usage Examples</h2>
                    <!-- Curl Example -->
                    <div>
                        <h3 class="text-lg font-semibold text-blue-100 mb-2">Using curl:</h3>
                        <pre class="code-block"><code>$ curl 'https://url2md.sno.ai/?url=https://example.com'</code></pre>
                    </div>
                    <!-- TypeScript Example -->
                    <div>
                        <h3 class="text-lg font-semibold text-blue-100 mb-2">Using TypeScript (fetch):</h3>
                        <pre class="code-block"><code>import fetch from 'node-fetch'; // Or use browser fetch

const apiUrl = 'https://url2md.sno.ai';
const targetUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Example YouTube URL

async function getMarkdown() {
  try {
    const fetchUrl = apiUrl + '?url=' + encodeURIComponent(targetUrl);
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error('HTTP error! status: ' + response.status);
    }
    const markdown = await response.text();
    console.log(markdown);
  } catch (error) {
    console.error('Error fetching markdown:', error);
  }
}

getMarkdown();</code></pre>
                    </div>
                    <!-- Python Example -->
                     <div>
                        <h3 class="text-lg font-semibold text-blue-100 mb-2">Using Python (requests):</h3>
                        <pre class="code-block"><code>import requests
import urllib.parse

api_url = 'https://url2md.sno.ai'
target_url = 'https://github.com/openai/gpt-3' # Example GitHub URL

params = {'url': target_url}

try:
    response = requests.get(api_url, params=params)
    response.raise_for_status() # Raise exception for bad status codes
    markdown = response.text
    print(markdown)
except requests.exceptions.RequestException as e:
    print(f"Error fetching markdown: {e}")</code></pre>
                    </div>
                </div>

                <!-- Parameters -->
                <div class="pt-4 space-y-4">
                    <h2 class="text-2xl font-bold text-white">Parameters</h2>
                    <!-- Required Parameters -->
                    <div>
                        <h3 class="text-lg font-semibold text-blue-100 mb-2">Required:</h3>
                        <ul class="list-disc list-inside space-y-1 text-blue-100">
                            <li><code class="font-semibold text-white bg-gray-700 px-1 rounded">url</code> (string): The website URL to convert.</li>
                        </ul>
                    </div>
                    <!-- Optional Parameters -->
                    <div>
                        <h3 class="text-lg font-semibold text-blue-100 mb-2">Optional:</h3>
                        <ul class="list-disc list-inside space-y-3 text-blue-100">
                            <li>
                                <code class="font-semibold text-white bg-gray-700 px-1 rounded">enableDetailedResponse</code> (boolean, default: <code class="text-white">false</code>): 
                                Captures more of the raw page structure instead of relying solely on Readability.js for main content extraction.
                                <pre class="code-block mt-1"><code># Example (curl)
$ curl 'https://url2md.sno.ai/?url=https://example.com&enableDetailedResponse=true'</code></pre>
                            </li>
                             <li>
                                <code class="font-semibold text-white bg-gray-700 px-1 rounded">subpages</code> (boolean, default: <code class="text-white">false</code>): 
                                Attempts to crawl and return markdown for up to 10 linked subpages found on the provided URL.
                                 <pre class="code-block mt-1"><code># Example (curl)
$ curl 'https://url2md.sno.ai/?url=https://example.com/blog&subpages=true'</code></pre>
                            </li>
                             <li>
                                <code class="font-semibold text-white bg-gray-700 px-1 rounded">llmFilter</code> (boolean, default: <code class="text-white">false</code>): 
                                Processes the extracted markdown through an LLM to filter out boilerplate, ads, and other non-essential content.
                                 <pre class="code-block mt-1"><code># Example (curl)
$ curl 'https://url2md.sno.ai/?url=https://example.com&llmFilter=true'</code></pre>
                            </li>
                        </ul>
                    </div>
                </div>

                <!-- Response Types -->
                <div class="pt-4">
                     <h2 class="text-2xl font-bold text-white mb-3">Response Types</h2>
                     <ul class="list-disc list-inside space-y-2 text-blue-100">
                        <li>Default: Returns plain text markdown (<code class="text-white bg-gray-700 px-1 rounded">Content-Type: text/plain</code>).</li>
                        <li>Use <code class="text-white bg-gray-700 px-1 rounded">Accept: application/json</code> header for JSON response containing the markdown under a <code class="text-white bg-gray-700 px-1 rounded">markdown</code> key.</li>
                    </ul>
                </div>
            </div>
        </div>
    </main>
</body>
</html>
`;

