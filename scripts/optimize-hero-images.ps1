$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$sourceDir = Join-Path $root "public\images\hero"
$outputDir = Join-Path $sourceDir "optimized"
$maxWidth = 1600
$jpegQuality = 78L

New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq "image/jpeg" }
$qualityParam = New-Object System.Drawing.Imaging.EncoderParameter(
  [System.Drawing.Imaging.Encoder]::Quality,
  $jpegQuality
)
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = $qualityParam

Get-ChildItem -Path $sourceDir -Filter "*.png" | ForEach-Object {
  $image = [System.Drawing.Image]::FromFile($_.FullName)
  try {
    $scale = [Math]::Min(1, $maxWidth / $image.Width)
    $width = [Math]::Max(1, [int][Math]::Round($image.Width * $scale))
    $height = [Math]::Max(1, [int][Math]::Round($image.Height * $scale))

    $bitmap = New-Object System.Drawing.Bitmap($width, $height)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.Clear([System.Drawing.Color]::White)
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.DrawImage($image, 0, 0, $width, $height)
      } finally {
        $graphics.Dispose()
      }

      $outputPath = Join-Path $outputDir "$($_.BaseName).jpg"
      $bitmap.Save($outputPath, $encoder, $encoderParams)

      $sourceSize = [Math]::Round($_.Length / 1KB, 1)
      $outputSize = [Math]::Round((Get-Item $outputPath).Length / 1KB, 1)
      Write-Output "$($_.Name): ${sourceSize}KB -> ${outputSize}KB"
    } finally {
      $bitmap.Dispose()
    }
  } finally {
    $image.Dispose()
  }
}
