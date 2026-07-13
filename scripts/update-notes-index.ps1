param(
  [string]$NotesRoot = "notes",
  [string]$OutputPath = "data/notes.json"
)

$ErrorActionPreference = "Stop"

$coverByCategory = @{
  vlm = "./assets/images/project-vision.svg"
  interview = "./assets/images/project-diffusion.svg"
  projects = "./assets/images/project-dashboard.svg"
  agent = "./assets/images/project-nexus.svg"
  rl = "./assets/images/project-dashboard.svg"
  infra = "./assets/images/project-nexus.svg"
}

$labelByCategory = @{
  vlm = "VLM"
  interview = "Interview"
  projects = "Projects"
  agent = "Agent"
  rl = "RL"
  infra = "Infra"
}

$existingByPath = @{}
if (Test-Path -LiteralPath $OutputPath) {
  try {
    $existing = Get-Content -LiteralPath $OutputPath -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($note in @($existing.notes)) {
      if ($note.path -and $note.key) {
        $existingByPath[$note.path] = $note.key
      }
    }
  } catch {
    $existingByPath = @{}
  }
}

function Get-ShortHash([string]$Value) {
  $sha1 = [System.Security.Cryptography.SHA1]::Create()
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Value)
  $hash = $sha1.ComputeHash($bytes)
  -join ($hash[0..3] | ForEach-Object { $_.ToString("x2") })
}

function Get-NoteKey([string]$Category, [string]$BaseName, [string]$RelativePath) {
  $ascii = ($BaseName.ToLowerInvariant() -replace "[^a-z0-9]+", "-").Trim("-")
  if ([string]::IsNullOrWhiteSpace($ascii)) {
    $ascii = Get-ShortHash $RelativePath
  }
  "$Category-$ascii"
}

function Get-RelativePathCompat([string]$BasePath, [string]$TargetPath) {
  $baseFull = [System.IO.Path]::GetFullPath($BasePath)
  if (-not $baseFull.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
    $baseFull += [System.IO.Path]::DirectorySeparatorChar
  }
  $targetFull = [System.IO.Path]::GetFullPath($TargetPath)
  $baseUri = [Uri]$baseFull
  $targetUri = [Uri]$targetFull
  [Uri]::UnescapeDataString($baseUri.MakeRelativeUri($targetUri).ToString()).Replace([char]92, [char]47)
}

function Read-FrontMatter([string[]]$Lines) {
  $meta = @{}
  if ($Lines.Count -lt 3 -or $Lines[0].Trim() -ne "---") {
    return $meta
  }

  for ($i = 1; $i -lt $Lines.Count; $i += 1) {
    if ($Lines[$i].Trim() -eq "---") { break }
    if ($Lines[$i] -match "^\s*([^:]+):\s*(.+?)\s*$") {
      $key = $Matches[1].Trim()
      $value = $Matches[2].Trim().Trim([char]34).Trim([char]39)
      $meta[$key] = $value
    }
  }
  $meta
}

function Get-FirstHeading([string[]]$Lines, [string]$Fallback) {
  foreach ($line in $Lines) {
    if ($line -match "^\s*#{1,6}\s+(.+?)\s*$") {
      return $Matches[1].Trim()
    }
  }
  $Fallback
}

function Get-Excerpt([string[]]$Lines) {
  foreach ($line in $Lines) {
    $text = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($text)) { continue }
    if ($text -match '^---$') { continue }
    if ($text -match '^\s*#{1,6}\s+') { continue }
    if ($text.StartsWith('|')) { continue }
    $plain = $text -replace '\*\*|__|~~', ''
    if ($plain.Length -gt 96) {
      return $plain.Substring(0, 96) + '...'
    }
    return $plain
  }
  'No excerpt.'
}

$root = Resolve-Path $NotesRoot
$files = Get-ChildItem -Path $root -Recurse -File -Filter '*.md' | Sort-Object FullName
$notes = foreach ($file in $files) {
  $relative = Get-RelativePathCompat (Get-Location).Path $file.FullName
  $category = Split-Path (Get-RelativePathCompat $root.Path $file.DirectoryName) -Leaf
  if ([string]::IsNullOrWhiteSpace($category) -or $category -eq '.') {
    $category = 'uncategorized'
  }
  $lines = Get-Content -LiteralPath $file.FullName -Encoding UTF8
  $meta = Read-FrontMatter $lines
  $title = if ($meta.ContainsKey('title')) { $meta['title'] } else { Get-FirstHeading $lines $file.BaseName }
  $path = "./$relative"
  $key = if ($meta.ContainsKey('key')) {
    $meta['key']
  } elseif ($existingByPath.ContainsKey($path)) {
    $existingByPath[$path]
  } else {
    Get-NoteKey $category $file.BaseName $relative
  }
  $tags = if ($meta.ContainsKey('tags')) {
    $meta['tags'].Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ }
  } else {
    @($labelByCategory[$category], $file.BaseName) | Where-Object { $_ }
  }

  [ordered]@{
    key = $key
    title = $title
    category = $category
    categoryLabel = if ($labelByCategory.ContainsKey($category)) { $labelByCategory[$category] } else { $category }
    type = if ($meta.ContainsKey('type')) { $meta['type'] } else { 'Note' }
    path = $path
    cover = if ($meta.ContainsKey('cover')) { $meta['cover'] } elseif ($coverByCategory.ContainsKey($category)) { $coverByCategory[$category] } else { './assets/images/project-nexus.svg' }
    excerpt = if ($meta.ContainsKey('excerpt')) { $meta['excerpt'] } else { Get-Excerpt $lines }
    tags = @($tags)
  }
}

$payload = [ordered]@{ notes = @($notes) }
$json = $payload | ConvertTo-Json -Depth 8
$output = Split-Path $OutputPath -Parent
if ($output) {
  New-Item -ItemType Directory -Force -Path $output | Out-Null
}
[System.IO.File]::WriteAllText((Join-Path (Get-Location) $OutputPath), $json, [System.Text.UTF8Encoding]::new($false))
Write-Host "Generated $OutputPath with $($notes.Count) notes."
