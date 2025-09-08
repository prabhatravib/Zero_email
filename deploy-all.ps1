# deploy-all.ps1 - Zero Email Deployment Script
#requires -Version 5.1
param(
    [string]$Root = $PSScriptRoot,
    [switch]$SkipBackend,
    [switch]$SkipFrontend,
    [switch]$SkipBuild,
    [switch]$Force,
    [string]$Environment = "production"
)

$ErrorActionPreference = 'Stop'
if (-not $Root) { $Root = (Get-Location).Path }

# Color functions for better output
function Write-Success { param($Message) Write-Host $Message -ForegroundColor Green }
function Write-Info { param($Message) Write-Host $Message -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host $Message -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host $Message -ForegroundColor Red }

# Configuration
$Config = @{
    FrontendApp = "infflow-email"
    BackendApp = "infflow-api-production"
    FrontendUrl = "https://infflow-email.prabhatravib.workers.dev"
    BackendUrl = "https://infflow-api-production.prabhatravib.workers.dev"
    FrontendDir = "apps\mail"
    BackendDir = "apps\server"
}


function Invoke-BuildProject {
    param(
        [string]$ProjectName,
        [string]$ProjectDir,
        [string]$BuildCommand = "build"
    )
    
    Write-Info "Building $ProjectName..."
    Push-Location $ProjectDir
    try {
        Write-Info "  Running: pnpm run $BuildCommand"
        & pnpm run $BuildCommand
        if ($LASTEXITCODE -ne 0) { 
            throw "$ProjectName build failed with exit code $LASTEXITCODE" 
        }
        Write-Success "[OK] $ProjectName built successfully"
    } catch {
        Write-Error "[ERROR] $ProjectName build failed: $_"
        throw
} finally {
    Pop-Location
}
}

function Invoke-DeployProject {
    param(
        [string]$ProjectName,
        [string]$ProjectDir,
        [string]$DeployCommand = "deploy",
        [string]$Environment = ""
    )
    
    Write-Info "Deploying $ProjectName..."
    Push-Location $ProjectDir
    try {
        if ($Environment -ne "") {
            Write-Info "  Running: pnpm run $DeployCommand --env=$Environment"
            & pnpm run $DeployCommand --env=$Environment
        } else {
            Write-Info "  Running: pnpm run $DeployCommand"
            & pnpm run $DeployCommand
        }
        if ($LASTEXITCODE -ne 0) { 
            throw "$ProjectName deployment failed with exit code $LASTEXITCODE" 
        }
        Write-Success "[OK] $ProjectName deployed successfully"
    } catch {
        Write-Error "[ERROR] $ProjectName deployment failed: $_"
        throw
    } finally {
        Pop-Location
    }
}

function Test-Deployment {
    param(
        [string]$Url,
        [string]$ProjectName
    )
    
    Write-Info "Testing $ProjectName deployment at $Url..."
    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 30 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Success "[OK] $ProjectName is responding correctly"
            return $true
        } else {
            Write-Warning "[WARNING] $ProjectName returned status code $($response.StatusCode)"
            return $false
        }
    } catch {
        Write-Warning "[WARNING] $ProjectName health check failed: $_"
        return $false
    }
}

function Show-DeploymentSummary {
    Write-Success "`n[SUCCESS] Deployment Summary"
    Write-Info "==================="
    Write-Info "Frontend: $($Config.FrontendUrl)"
    Write-Info "Backend:  $($Config.BackendUrl)"
    Write-Info "`nNext steps:"
    Write-Info "1. Test the application at: $($Config.FrontendUrl)"
    Write-Info "2. Check Cloudflare Workers dashboard for logs"
    Write-Info "3. Monitor application performance"
}

# Main execution
try {
    Write-Success "[START] Zero Email Deployment Process"
    Write-Info "============================================="
    Write-Info "Environment: $Environment"
    Write-Info "Force mode: $Force"
    Write-Info "Skip backend: $SkipBackend"
    Write-Info "Skip frontend: $SkipFrontend"
    Write-Info "Skip build: $SkipBuild"
    Write-Info ""

    # Step 1: Install dependencies
    Write-Info "Installing dependencies..."
    Push-Location $Root
    try {
        & pnpm install
        if ($LASTEXITCODE -ne 0) { throw "pnpm install failed with exit code $LASTEXITCODE" }
        Write-Success "[OK] Dependencies installed successfully"
} finally {
    Pop-Location
}

    # Step 2: Build projects (if not skipped)
    if (-not $SkipBuild) {
        Write-Info "`nBuilding projects..."
        
        # Build frontend only (backend doesn't need build step)
        if (-not $SkipFrontend) {
            Invoke-BuildProject -ProjectName "Frontend" -ProjectDir $Config.FrontendDir
        }
        
        Write-Info "[INFO] Backend uses Cloudflare Workers - no build step needed"
    } else {
        Write-Warning "[WARNING] Skipping build step"
    }

    # Step 3: Deploy backend first
    if (-not $SkipBackend) {
        Write-Info "`nDeploying backend..."
        try {
            Invoke-DeployProject -ProjectName "Backend" -ProjectDir $Config.BackendDir -Environment "production"
            Write-Success "[OK] Backend deployment completed"
        } catch {
            Write-Error "[ERROR] Backend deployment failed. Stopping deployment process."
            Write-Error "Please fix the backend issues before proceeding."
            exit 1
        }
    } else {
        Write-Warning "[WARNING] Skipping backend deployment"
    }

    # Step 4: Deploy frontend
    if (-not $SkipFrontend) {
        Write-Info "`nDeploying frontend..."
        try {
            Invoke-DeployProject -ProjectName "Frontend" -ProjectDir $Config.FrontendDir -Environment "production"
            Write-Success "[OK] Frontend deployment completed"
        } catch {
            Write-Error "[ERROR] Frontend deployment failed."
            Write-Error "Backend is deployed but frontend failed. Check the errors above."
            exit 1
        }
    } else {
        Write-Warning "[WARNING] Skipping frontend deployment"
    }

    # Step 5: Health checks (optional)
    if (-not $SkipBackend -and -not $SkipFrontend) {
        Write-Info "`nPerforming health checks..."
        $backendHealthy = Test-Deployment -Url $Config.BackendUrl -ProjectName "Backend"
        $frontendHealthy = Test-Deployment -Url $Config.FrontendUrl -ProjectName "Frontend"
        
        if ($backendHealthy -and $frontendHealthy) {
            Write-Success "[OK] All health checks passed"
        } else {
            Write-Warning "[WARNING] Some health checks failed, but deployment completed"
        }
    }

    # Step 6: Show summary
    Show-DeploymentSummary

} catch {
    Write-Error "`n[ERROR] Deployment failed: $_"
    Write-Error "Stack trace: $($_.ScriptStackTrace)"
    exit 1
}

Write-Success "`n[SUCCESS] Zero Email deployment process completed successfully!"
