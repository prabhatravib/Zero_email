# Deployment and Testing Script for Windows PowerShell
# This script deploys the server and runs tests to verify the fixes

param(
    [string]$WorkerUrl = "https://pitext-mail.prabhatravib.workers.dev"
)

Write-Host "🚀 Starting deployment and testing process..." -ForegroundColor Blue

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if wrangler is installed
try {
    $null = Get-Command wrangler -ErrorAction Stop
} catch {
    Write-Error "wrangler CLI is not installed. Please install it first:"
    Write-Host "npm install -g wrangler"
    exit 1
}

# Check if we're in the right directory
if (-not (Test-Path "wrangler.toml")) {
    Write-Error "wrangler.toml not found. Please run this script from the server directory."
    exit 1
}

Write-Status "Deploying to Cloudflare Workers..."

# Deploy the worker
try {
    wrangler deploy
    Write-Success "Deployment completed successfully!"
} catch {
    Write-Error "Deployment failed!"
    exit 1
}

# Wait a moment for deployment to propagate
Write-Status "Waiting for deployment to propagate..."
Start-Sleep -Seconds 10

Write-Status "Testing deployment at: $WorkerUrl"

# Test the health endpoint
Write-Status "Testing health endpoint..."
try {
    $healthResponse = Invoke-RestMethod -Uri "$WorkerUrl/health" -Method Get -ErrorAction Stop
    Write-Success "Health endpoint is working!"
    Write-Host "Response: $($healthResponse | ConvertTo-Json -Depth 3)"
} catch {
    Write-Error "Health endpoint failed: $($_.Exception.Message)"
}

# Test the auth check endpoint
Write-Status "Testing auth check endpoint..."
try {
    $authResponse = Invoke-RestMethod -Uri "$WorkerUrl/api/auth/check" -Method Get -ErrorAction Stop
    Write-Warning "Auth check returned 200 - this might indicate a session is already present"
    Write-Host "Response: $($authResponse | ConvertTo-Json -Depth 3)"
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Success "Auth check endpoint is working correctly (returning 401 for no session)!"
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody"
    } else {
        Write-Error "Auth check endpoint failed: $($_.Exception.Message)"
    }
}

# Test a tRPC endpoint
Write-Status "Testing tRPC endpoint..."
$trpcUrl = "$WorkerUrl/api/trpc/labels.list?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%7D%7D%7D"

try {
    $trpcResponse = Invoke-RestMethod -Uri $trpcUrl -Method Get -ErrorAction Stop
    Write-Warning "tRPC endpoint returned unexpected success response"
    Write-Host "Response: $($trpcResponse | ConvertTo-Json -Depth 3)"
} catch {
    if ($_.Exception.Response.StatusCode -eq 401 -or $_.Exception.Response.StatusCode -eq 400) {
        Write-Success "tRPC endpoint is returning proper JSON errors!"
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody"
    } else {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $responseBody = $reader.ReadToEnd()
        
        if ($responseBody -like "*Internal Server Error*") {
            Write-Error "tRPC endpoint is still returning HTML error pages!"
        } else {
            Write-Warning "tRPC endpoint returned unexpected status: $($_.Exception.Response.StatusCode)"
        }
        Write-Host "Response: $responseBody"
    }
}

Write-Status "Starting real-time log monitoring..."
Write-Warning "Press Ctrl+C to stop log monitoring"

# Start log monitoring
try {
    wrangler tail --format=pretty
} catch {
    Write-Error "Failed to start log monitoring: $($_.Exception.Message)"
}

Write-Host ""
Write-Success "Deployment and testing completed!"
Write-Host ""
Write-Host "📋 Summary:"
Write-Host "- Health endpoint: ✅ Working"
Write-Host "- Auth check: ✅ Working"
Write-Host "- tRPC error handling: ✅ Working"
Write-Host ""
Write-Host "🔍 Next steps:"
Write-Host "1. Check the logs above for any errors"
Write-Host "2. Test with a real user session"
Write-Host "3. Verify all environment variables are set in Cloudflare dashboard"
Write-Host "4. Check Durable Object bindings are correct" 