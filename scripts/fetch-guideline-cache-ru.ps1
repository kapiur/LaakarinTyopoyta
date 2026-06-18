param(
  [int]$PageSize = 50,
  [int]$MaxPages = 20,
  [int]$FromPage = 1,
  [Nullable[int]]$Limit = $null,
  [switch]$All,
  [string]$Output = ".\tmp\ru-guideline-cache.json"
)

$ErrorActionPreference = "Stop"

function Convert-HtmlEntities {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return "" }

  return $Value.
    Replace("&nbsp;", " ").
    Replace("&amp;", "&").
    Replace("&lt;", "<").
    Replace("&gt;", ">").
    Replace("&quot;", '"').
    Replace("&#39;", "'").
    Replace("&#x27;", "'").
    Replace("&#x2F;", "/")
}

function Convert-HtmlToText {
  param([string]$Html)
  if ([string]::IsNullOrWhiteSpace($Html)) { return "" }

  $text = $Html `
    -replace "(?is)<br\s*/?>", "`n" `
    -replace "(?is)</(p|div|section|article|li|ul|ol|h1|h2|h3|h4|h5|h6)>", "`n" `
    -replace "(?is)<[^>]+>", " "

  $text = Convert-HtmlEntities $text
  $text = $text -replace "`r", ""
  $text = $text -replace "[ \t]+`n", "`n"
  $text = $text -replace "`n{3,}", "`n`n"
  $text = $text -replace "[ \t]{2,}", " "
  return $text.Trim()
}

function Get-ReadableHtmlText {
  param([string]$Html)
  if ([string]::IsNullOrWhiteSpace($Html)) { return "" }

  $relevantHtml = $Html
  $articleMatch = [regex]::Match($Html, "(?is)<article[\s\S]*?</article>")
  if ($articleMatch.Success) {
    $relevantHtml = $articleMatch.Value
  } else {
    $mainMatch = [regex]::Match($Html, "(?is)<main[\s\S]*?</main>")
    if ($mainMatch.Success) {
      $relevantHtml = $mainMatch.Value
    } else {
      $bodyMatch = [regex]::Match($Html, "(?is)<body[\s\S]*?</body>")
      if ($bodyMatch.Success) {
        $relevantHtml = $bodyMatch.Value
      }
    }
  }

  $cleaned = $relevantHtml `
    -replace "(?is)<script[\s\S]*?</script>", " " `
    -replace "(?is)<style[\s\S]*?</style>", " " `
    -replace "(?is)<svg[\s\S]*?</svg>", " " `
    -replace "(?is)<noscript[\s\S]*?</noscript>", " " `
    -replace "(?is)<form[\s\S]*?</form>", " " `
    -replace "(?is)<nav[\s\S]*?</nav>", " " `
    -replace "(?is)<header[\s\S]*?</header>", " " `
    -replace "(?is)<footer[\s\S]*?</footer>", " " `
    -replace "(?is)<aside[\s\S]*?</aside>", " "

  $text = Convert-HtmlToText $cleaned
  $paragraphs = $text -split "(\n\s*\n)" |
    ForEach-Object { ($_ -replace "\s+", " ").Trim() } |
    Where-Object { $_.Length -ge 60 }

  return (($paragraphs | Select-Object -Unique) -join "`n`n").Trim()
}

function Truncate-Text {
  param(
    [string]$Value,
    [int]$MaxLength
  )

  if ([string]::IsNullOrWhiteSpace($Value)) { return "" }
  if ($Value.Length -le $MaxLength) { return $Value }

  $sliced = $Value.Substring(0, $MaxLength)
  $lastParagraph = $sliced.LastIndexOf("`n`n")
  $lastSentence = $sliced.LastIndexOf(". ")
  $lastBreak = [Math]::Max($lastParagraph, $lastSentence)

  if ($lastBreak -gt [Math]::Floor($MaxLength * 0.6)) {
    return $sliced.Substring(0, $lastBreak).Trim()
  }

  return $sliced.Trim()
}

function Normalize-Text {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return $null }

  $text = $Value -replace "`r", ""
  $text = $text -replace "[ \t]+`n", "`n"
  $text = $text -replace "`n{3,}", "`n`n"
  $text = $text -replace "[ \t]{2,}", " "
  $text = $text.Trim()

  if ([string]::IsNullOrWhiteSpace($text)) { return $null }
  return Truncate-Text -Value $text -MaxLength 12000
}

function Collect-JsonText {
  param(
    [Parameter(ValueFromPipeline = $true)]
    $Node,
    [int]$Depth = 0,
    [System.Collections.Generic.List[string]]$Output = $(New-Object 'System.Collections.Generic.List[string]')
  )

  if ($Depth -gt 8 -or $null -eq $Node -or $Output.Count -ge 120) {
    return $Output
  }

  if ($Node -is [string]) {
    $text = ($Node -replace "\s+", " ").Trim()
    if ($text.Length -ge 40) {
      $Output.Add($text)
    }
    return $Output
  }

  if ($Node -is [int] -or $Node -is [long] -or $Node -is [double] -or $Node -is [decimal] -or $Node -is [bool]) {
    return $Output
  }

  if ($Node -is [System.Collections.IEnumerable] -and -not ($Node -is [System.Collections.IDictionary])) {
    foreach ($item in $Node) {
      Collect-JsonText -Node $item -Depth ($Depth + 1) -Output $Output | Out-Null
    }
    return $Output
  }

  $excludedKeys = @("Id", "CodeVersion", "PrevCrId", "PublishDateStr", "Created", "Updated", "Version", "Status")

  if ($Node.PSObject -and $Node.PSObject.Properties) {
    foreach ($property in $Node.PSObject.Properties) {
      if ($excludedKeys -contains $property.Name) { continue }

      if ($property.Name -match "html" -and $property.Value -is [string]) {
        $htmlText = Truncate-Text -Value (Get-ReadableHtmlText $property.Value) -MaxLength 5000
        if (-not [string]::IsNullOrWhiteSpace($htmlText)) {
          $Output.Add($htmlText)
        }
        continue
      }

      Collect-JsonText -Node $property.Value -Depth ($Depth + 1) -Output $Output | Out-Null
    }
  }

  return $Output
}

function Invoke-MinzdravListPage {
  param(
    [int]$CurrentPage,
    [int]$CurrentPageSize
  )

  $body = @{
    filters = @(
      @{
        fieldName = "status"
        filterType = 1
        filterValueType = 2
        value1 = 0
        value2 = ""
        values = @()
      }
    )
    sortOption = @{
      fieldName = "publishdate"
      sortType = 2
    }
    pageSize = $CurrentPageSize
    currentPage = $CurrentPage
    useANDoperator = $true
    columns = @()
  } | ConvertTo-Json -Depth 6

  Invoke-RestMethod `
    -Uri "https://apicr.minzdrav.gov.ru/api.ashx?op=GetJsonClinrecsFilterV2" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body `
    -Headers @{
      "User-Agent" = "Mozilla/5.0"
      "Accept" = "application/json,text/plain,*/*"
    }
}

function Get-MinzdravGuidelineDetail {
  param([string]$CodeVersion)

  $detailUrls = @(
    "https://apicr.minzdrav.gov.ru/api.ashx?op=GetClinrec2&id=$([uri]::EscapeDataString($CodeVersion))",
    "https://apiapprovecr.minzdrav.gov.ru/api.ashx?op=GetClinrec2&id=$([uri]::EscapeDataString($CodeVersion))"
  )

  foreach ($url in $detailUrls) {
    try {
      $response = Invoke-RestMethod `
        -Uri $url `
        -Method Get `
        -Headers @{
          "User-Agent" = "Mozilla/5.0"
          "Accept" = "application/json,text/plain,*/*"
        }

      if ($response -is [string]) {
        $stripped = Truncate-Text -Value (Convert-HtmlToText $response) -MaxLength 6000
        if ($stripped.Length -ge 400) {
          return $stripped
        }
      }

      $collected = Collect-JsonText -Node $response
      $joined = Truncate-Text -Value (($collected | Select-Object -Unique) -join "`n`n") -MaxLength 6000
      if ($joined.Length -ge 400) {
        return $joined
      }
    } catch {
      Write-Host "[detail] failed $url"
    }
  }

  $previewUrl = "https://cr.minzdrav.gov.ru/preview-cr/$([uri]::EscapeDataString($CodeVersion))"
  try {
    $response = Invoke-WebRequest `
      -Uri $previewUrl `
      -Method Get `
      -Headers @{
        "User-Agent" = "Mozilla/5.0"
        "Accept" = "text/html,application/xhtml+xml,*/*"
      }

    $previewText = Truncate-Text -Value (Get-ReadableHtmlText $response.Content) -MaxLength 6000
    if ($previewText.Length -ge 400) {
      return $previewText
    }
  } catch {
    Write-Host "[preview] failed $previewUrl"
  }

  return ""
}

if (-not $All -and -not $Limit.HasValue) {
  $Limit = $PageSize * $MaxPages
}

$items = New-Object System.Collections.Generic.List[object]
$processed = 0
$cachedReady = 0
$skippedInvalid = 0
$failedPartial = 0
$registryTotal = 0

$limitLabel = if ($All -or -not $Limit.HasValue) { "all" } else { [string]$Limit.Value }
Write-Host "[guideline-cache:ru] start pageSize=$PageSize maxPages=$MaxPages fromPage=$FromPage limit=$limitLabel"

:outer for ($page = $FromPage; $page -lt ($FromPage + $MaxPages); $page++) {
  Write-Host "[guideline-cache:ru] listing page $page"
  $pageResult = Invoke-MinzdravListPage -CurrentPage $page -CurrentPageSize $PageSize
  $registryTotal = if ($null -ne $pageResult.TotalRecords) { [int]$pageResult.TotalRecords } else { 0 }

  if (-not $pageResult.Data -or $pageResult.Data.Count -eq 0) {
    Write-Host "[guideline-cache:ru] page $page returned no items, stop"
    break
  }

  foreach ($item in $pageResult.Data) {
    if ($Limit.HasValue -and $processed -ge $Limit.Value) {
      break outer
    }

    $codeVersion = if ($null -ne $item.CodeVersion) { [string]$item.CodeVersion } else { "" }
    $title = if ($null -ne $item.Name) { [string]$item.Name } else { "" }
    if ([string]::IsNullOrWhiteSpace($codeVersion) -or [string]::IsNullOrWhiteSpace($title)) {
      $skippedInvalid++
      continue
    }

    $processed++
    $sourceUrl = "https://cr.minzdrav.gov.ru/preview-cr/$([uri]::EscapeDataString($codeVersion))"
    Write-Host "[guideline-cache:ru] $processed. $codeVersion :: $title"

    try {
      $text = Get-MinzdravGuidelineDetail -CodeVersion $codeVersion
      if ([string]::IsNullOrWhiteSpace($text)) {
        $failedPartial++
        $items.Add([ordered]@{
          sourceId = "ru-minzdrav-clinical-recommendations"
          country = "RU"
          externalId = $codeVersion
          sourceUrl = $sourceUrl
          title = $title
          publishedAt = $(if ($item.PublishDateStr) { [string]$item.PublishDateStr } else { $null })
          syncStatus = "partial"
        }) | Out-Null
        continue
      }

      $cachedReady++
      $items.Add([ordered]@{
        sourceId = "ru-minzdrav-clinical-recommendations"
        country = "RU"
        externalId = $codeVersion
        sourceUrl = $sourceUrl
        title = $title
        publishedAt = $(if ($item.PublishDateStr) { [string]$item.PublishDateStr } else { $null })
        rawText = $text
        normalizedText = Normalize-Text $text
        syncStatus = "ready"
      }) | Out-Null
    } catch {
      $failedPartial++
      Write-Host "[guideline-cache:ru] failed $codeVersion"
      $items.Add([ordered]@{
        sourceId = "ru-minzdrav-clinical-recommendations"
        country = "RU"
        externalId = $codeVersion
        sourceUrl = $sourceUrl
        title = $title
        publishedAt = $(if ($item.PublishDateStr) { [string]$item.PublishDateStr } else { $null })
        syncStatus = "partial"
      }) | Out-Null
    }
  }
}

$snapshot = [ordered]@{
  format = "ru-guideline-cache-v1"
  exportedAt = [DateTime]::UtcNow.ToString("o")
  registryTotal = $registryTotal
  pageSize = $PageSize
  maxPages = $MaxPages
  fromPage = $FromPage
  limit = $(if ($All) { $null } else { $Limit })
  items = @($items)
}

$outputPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $Output))
$outputDirectory = Split-Path -Parent $outputPath
if (-not (Test-Path $outputDirectory)) {
  New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

$snapshot | ConvertTo-Json -Depth 8 | Set-Content -Path $outputPath -Encoding UTF8

Write-Host "[guideline-cache:ru:fetch] file written"
Write-Host "[guideline-cache:ru:fetch] output: $outputPath"
Write-Host "[guideline-cache:ru:fetch] total available in registry: $registryTotal"
Write-Host "[guideline-cache:ru:fetch] processed: $processed"
Write-Host "[guideline-cache:ru:fetch] cached ready: $cachedReady"
Write-Host "[guideline-cache:ru:fetch] skipped invalid: $skippedInvalid"
Write-Host "[guideline-cache:ru:fetch] failed/partial: $failedPartial"
