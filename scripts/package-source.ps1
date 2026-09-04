$ErrorActionPreference = "Stop"

$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputPath = Join-Path $repositoryRoot "cofrin-source.zip"
$temporaryRoot = Join-Path ([IO.Path]::GetTempPath()) ("cofrin-source-" + [Guid]::NewGuid().ToString("N"))
$packageRoot = Join-Path $temporaryRoot "Cofrin"

$sourcePaths = @(
  "frontend/src", "frontend/e2e", "frontend/index.html", "frontend/package.json",
  "frontend/tsconfig.json", "frontend/tsconfig.app.json", "frontend/vite.config.ts",
  "frontend/vitest.config.ts", "frontend/playwright.config.ts", "frontend/eslint.config.js",
  "frontend/.env.example", "backend/src", "backend/tests", "backend/package.json",
  "backend/tsconfig.json", "backend/eslint.config.js", "backend/.env.example", "docs",
  "supabase", "scripts", ".gitignore", ".npmignore", "package.json", "package-lock.json", "README.md"
)

New-Item -ItemType Directory -Path $packageRoot | Out-Null
try {
  foreach ($relativePath in $sourcePaths) {
    $source = Join-Path $repositoryRoot $relativePath
    if (-not (Test-Path -LiteralPath $source)) { continue }
    $destination = Join-Path $packageRoot $relativePath
    $destinationParent = Split-Path $destination -Parent
    New-Item -ItemType Directory -Force -Path $destinationParent | Out-Null
    Copy-Item -LiteralPath $source -Destination $destination -Recurse -Force
  }

  if (Test-Path -LiteralPath $outputPath) { Remove-Item -LiteralPath $outputPath -Force }
  Compress-Archive -Path $packageRoot -DestinationPath $outputPath -CompressionLevel Optimal
  Write-Host "Pacote criado em $outputPath"
}
finally {
  $resolvedTemporaryRoot = [IO.Path]::GetFullPath($temporaryRoot)
  $systemTemporaryRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
  if ($resolvedTemporaryRoot.StartsWith($systemTemporaryRoot, [StringComparison]::OrdinalIgnoreCase) -and
      (Split-Path $resolvedTemporaryRoot -Leaf).StartsWith("cofrin-source-")) {
    Remove-Item -LiteralPath $resolvedTemporaryRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
