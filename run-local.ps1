$ErrorActionPreference = "Stop"

function Resolve-DockerCommand {
  $cmd = Get-Command docker -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }

  $candidateRoots = @(
    $Env:ProgramFiles,
    ${Env:ProgramFiles(x86)}
  )

  foreach ($rootPath in $candidateRoots) {
    if ([string]::IsNullOrWhiteSpace($rootPath)) {
      continue
    }

    $candidate = Join-Path $rootPath "Docker\Docker\resources\bin\docker.exe"
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  return $null
}

function Resolve-NpmCommand {
  $cmd = Get-Command npm -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }

  $candidateRoots = @(
    $Env:ProgramFiles,
    ${Env:ProgramFiles(x86)}
  )

  foreach ($rootPath in $candidateRoots) {
    if ([string]::IsNullOrWhiteSpace($rootPath)) {
      continue
    }

    $candidate = Join-Path $rootPath "nodejs\npm.cmd"
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  return $null
}

$root = $PSScriptRoot
$backend = Join-Path $root "backend\node-api"
$frontend = Join-Path $root "frontend"

Push-Location $backend
if (-not (Test-Path (Join-Path $backend ".env"))) {
  Copy-Item .env.example .env
}

$dockerCmd = Resolve-DockerCommand
if ($dockerCmd) {
  try {
    & $dockerCmd compose up -d
  } catch {
    Write-Warning "Docker was found but Postgres container startup failed. Ensure Docker Desktop is running, or start Postgres on localhost:5432."
  }
} else {
  Write-Warning "Docker was not found. Skipping Postgres container startup. Install Docker Desktop or start Postgres on localhost:5432."
}
Pop-Location

$npmCmd = Resolve-NpmCommand
if (-not $npmCmd) {
  throw "npm was not found. Install Node.js from https://nodejs.org/ and restart the terminal."
}

Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", "npm run dev") -WorkingDirectory $backend -NoNewWindow -PassThru
Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", "npm run dev") -WorkingDirectory $frontend -NoNewWindow -PassThru

Write-Host "Frontend: http://localhost:5000"
Write-Host "API:      http://localhost:3001"